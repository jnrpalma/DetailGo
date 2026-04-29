import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const PLAN_AMOUNT = 89.00;
const PLAN_DESCRIPTION = 'DetailGo Pro - Plano Mensal';

// Lê o Access Token da secret configurada no Firebase
// Para configurar: firebase functions:secrets:set MP_ACCESS_TOKEN
function getMpClient(): MercadoPagoConfig {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurado.');
  return new MercadoPagoConfig({ accessToken: token });
}

export const createPixCharge = functions
  .runWith({ secrets: ['MP_ACCESS_TOKEN'] })
  .https.onCall(async (data: { shopId: string }, context) => {

    // Verifica autenticação
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { shopId } = data;
    if (!shopId) {
      throw new functions.https.HttpsError('invalid-argument', 'shopId é obrigatório.');
    }

    const db = admin.firestore();

    // Busca dados da loja
    const shopSnap = await db.doc(`shops/${shopId}`).get();
    if (!shopSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Loja não encontrada.');
    }

    const shop = shopSnap.data() as { name: string; ownerId: string };

    // Verifica que quem está chamando é o dono da loja
    if (shop.ownerId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Acesso negado.');
    }

    // Busca dados do proprietário
    const userSnap = await db.doc(`users/${context.auth.uid}`).get();
    const user = (userSnap.data() ?? {}) as { email?: string; firstName?: string; lastName?: string };

    // Cria cobrança PIX no Mercado Pago
    const mpClient = getMpClient();
    const payment = new Payment(mpClient);

    const paymentData = await payment.create({
      body: {
        transaction_amount: PLAN_AMOUNT,
        description: `${PLAN_DESCRIPTION} - ${shop.name}`,
        payment_method_id: 'pix',
        payer: {
          email: user.email ?? `${context.auth.uid}@detailgo.app`,
          first_name: user.firstName ?? 'Proprietário',
          last_name: user.lastName ?? '',
        },
        // Validade de 24 horas
        date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          shop_id: shopId,
          shop_name: shop.name,
        },
      },
    });

    const paymentId = paymentData.id!.toString();
    const qrCode = paymentData.point_of_interaction?.transaction_data?.qr_code ?? '';
    const qrCodeBase64 = paymentData.point_of_interaction?.transaction_data?.qr_code_base64 ?? '';
    const expiresAt = paymentData.date_of_expiration ?? '';

    // Salva no Firestore para o webhook encontrar o shopId depois
    await db.doc(`payments/${paymentId}`).set({
      paymentId,
      shopId,
      shopName: shop.name,
      amount: PLAN_AMOUNT,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      payment_id: paymentId,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      expires_at: expiresAt,
      amount: PLAN_AMOUNT,
    };
  });

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const mpAccessToken = defineSecret('MP_ACCESS_TOKEN');

const PLAN_AMOUNT = 89.0;
const PLAN_DESCRIPTION = 'DetailGo Pro - Plano Mensal';

export const createPixCharge = onCall(
  { secrets: [mpAccessToken] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { shopId } = request.data as { shopId: string };
    if (!shopId) {
      throw new HttpsError('invalid-argument', 'shopId é obrigatório.');
    }

    const db = admin.firestore();

    const shopSnap = await db.doc(`shops/${shopId}`).get();
    if (!shopSnap.exists) {
      throw new HttpsError('not-found', 'Loja não encontrada.');
    }

    const shop = shopSnap.data() as { name: string; ownerId: string };

    if (shop.ownerId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Acesso negado.');
    }

    const userSnap = await db.doc(`users/${request.auth.uid}`).get();
    const user = (userSnap.data() ?? {}) as {
      email?: string;
      firstName?: string;
      lastName?: string;
    };

    const mpClient = new MercadoPagoConfig({
      accessToken: mpAccessToken.value(),
    });
    const payment = new Payment(mpClient);

    const paymentData = await payment.create({
      body: {
        transaction_amount: PLAN_AMOUNT,
        description: `${PLAN_DESCRIPTION} - ${shop.name}`,
        payment_method_id: 'pix',
        payer: {
          email: user.email ?? `${request.auth.uid}@detailgo.app`,
          first_name: user.firstName ?? 'Proprietário',
          last_name: user.lastName ?? '',
        },
        date_of_expiration: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        metadata: {
          shop_id: shopId,
          shop_name: shop.name,
        },
      },
    });

    const paymentId = paymentData.id!.toString();
    const qrCode =
      paymentData.point_of_interaction?.transaction_data?.qr_code ?? '';
    const qrCodeBase64 =
      paymentData.point_of_interaction?.transaction_data?.qr_code_base64 ?? '';
    const expiresAt = paymentData.date_of_expiration ?? '';

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
  },
);

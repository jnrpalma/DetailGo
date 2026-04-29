import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { MercadoPagoConfig, Payment } from 'mercadopago';

function getMpClient(): MercadoPagoConfig {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurado.');
  return new MercadoPagoConfig({ accessToken: token });
}

export const mercadoPagoWebhook = functions
  .runWith({ secrets: ['MP_ACCESS_TOKEN'] })
  .https.onRequest(async (req, res) => {

    // Mercado Pago só envia POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const { type, data } = req.body;

      // Só processa notificações de pagamento
      if (type !== 'payment' || !data?.id) {
        res.status(200).send('ok');
        return;
      }

      const paymentId = data.id.toString();

      // Busca detalhes do pagamento no Mercado Pago
      const mpClient = getMpClient();
      const paymentClient = new Payment(mpClient);
      const paymentData = await paymentClient.get({ id: paymentId });

      const status = paymentData.status;
      const shopIdFromMeta = paymentData.metadata?.shop_id as string | undefined;

      // Atualiza status do pagamento no Firestore
      const db = admin.firestore();

      // Tenta encontrar o shopId via metadata do MP ou via coleção payments
      let shopId = shopIdFromMeta;
      if (!shopId) {
        const paymentDoc = await db.doc(`payments/${paymentId}`).get();
        if (paymentDoc.exists) {
          shopId = (paymentDoc.data() as { shopId: string }).shopId;
        }
      }

      // Atualiza o documento de pagamento
      if (await db.doc(`payments/${paymentId}`).get().then(s => s.exists)) {
        await db.doc(`payments/${paymentId}`).update({
          status: status ?? 'unknown',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Se pagamento aprovado → ativa assinatura
      if (status === 'approved' && shopId) {
        const activeUntil = new Date();
        activeUntil.setDate(activeUntil.getDate() + 30);

        await db.doc(`shops/${shopId}`).update({
          subscriptionStatus: 'active',
          activeUntil: admin.firestore.Timestamp.fromDate(activeUntil),
          lastPaymentId: paymentId,
          lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info(`✅ Assinatura ativada para shop: ${shopId} até ${activeUntil.toISOString()}`);
      }

      res.status(200).send('ok');
    } catch (error) {
      functions.logger.error('Erro no webhook MP:', error);
      // Retorna 200 para o MP não retentar infinitamente
      res.status(200).send('error handled');
    }
  });

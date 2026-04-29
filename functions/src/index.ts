import * as admin from 'firebase-admin';

admin.initializeApp();

export { createPixCharge } from './payment/createPixCharge';
export { mercadoPagoWebhook } from './payment/mercadoPagoWebhook';

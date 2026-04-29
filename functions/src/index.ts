import * as admin from 'firebase-admin';

admin.initializeApp();

export { createPixCharge } from './createPixCharge';
export { mercadoPagoWebhook } from './mercadoPagoWebhook';

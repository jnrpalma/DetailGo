"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mercadoPagoWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const mercadopago_1 = require("mercadopago");
const mpAccessToken = (0, params_1.defineSecret)('MP_ACCESS_TOKEN');
exports.mercadoPagoWebhook = (0, https_1.onRequest)({ secrets: [mpAccessToken] }, async (req, res) => {
    var _a;
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const { type, data } = req.body;
        if (type !== 'payment' || !(data === null || data === void 0 ? void 0 : data.id)) {
            res.status(200).send('ok');
            return;
        }
        const paymentId = data.id.toString();
        const mpClient = new mercadopago_1.MercadoPagoConfig({
            accessToken: mpAccessToken.value(),
        });
        const paymentClient = new mercadopago_1.Payment(mpClient);
        const paymentData = await paymentClient.get({ id: paymentId });
        const status = paymentData.status;
        const shopIdFromMeta = (_a = paymentData.metadata) === null || _a === void 0 ? void 0 : _a.shop_id;
        const db = admin.firestore();
        let shopId = shopIdFromMeta;
        if (!shopId) {
            const paymentDoc = await db.doc(`payments/${paymentId}`).get();
            if (paymentDoc.exists) {
                shopId = paymentDoc.data().shopId;
            }
        }
        const paymentDocRef = db.doc(`payments/${paymentId}`);
        const paymentDocSnap = await paymentDocRef.get();
        if (paymentDocSnap.exists) {
            await paymentDocRef.update({
                status: status !== null && status !== void 0 ? status : 'unknown',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        if (status === 'approved' && shopId) {
            const activeUntil = new Date();
            activeUntil.setDate(activeUntil.getDate() + 30);
            await db.doc(`shops/${shopId}`).update({
                subscriptionStatus: 'active',
                activeUntil: admin.firestore.Timestamp.fromDate(activeUntil),
                lastPaymentId: paymentId,
                lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            v2_1.logger.info(`✅ Assinatura ativada: shop=${shopId} até ${activeUntil.toISOString()}`);
        }
        res.status(200).send('ok');
    }
    catch (error) {
        v2_1.logger.error('Erro no webhook MP:', error);
        res.status(200).send('error handled');
    }
});
//# sourceMappingURL=mercadoPagoWebhook.js.map
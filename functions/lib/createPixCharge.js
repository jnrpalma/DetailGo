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
exports.createPixCharge = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const mercadopago_1 = require("mercadopago");
const mpAccessToken = (0, params_1.defineSecret)('MP_ACCESS_TOKEN');
const PLAN_AMOUNT = 89.0;
const PLAN_DESCRIPTION = 'DetailGo Pro - Plano Mensal';
exports.createPixCharge = (0, https_1.onCall)({ secrets: [mpAccessToken] }, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado.');
    }
    const { shopId } = request.data;
    if (!shopId) {
        throw new https_1.HttpsError('invalid-argument', 'shopId é obrigatório.');
    }
    const db = admin.firestore();
    const shopSnap = await db.doc(`shops/${shopId}`).get();
    if (!shopSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Loja não encontrada.');
    }
    const shop = shopSnap.data();
    if (shop.ownerId !== request.auth.uid) {
        throw new https_1.HttpsError('permission-denied', 'Acesso negado.');
    }
    const userSnap = await db.doc(`users/${request.auth.uid}`).get();
    const user = ((_a = userSnap.data()) !== null && _a !== void 0 ? _a : {});
    const mpClient = new mercadopago_1.MercadoPagoConfig({
        accessToken: mpAccessToken.value(),
    });
    const payment = new mercadopago_1.Payment(mpClient);
    const paymentData = await payment.create({
        body: {
            transaction_amount: PLAN_AMOUNT,
            description: `${PLAN_DESCRIPTION} - ${shop.name}`,
            payment_method_id: 'pix',
            payer: {
                email: (_b = user.email) !== null && _b !== void 0 ? _b : `${request.auth.uid}@detailgo.app`,
                first_name: (_c = user.firstName) !== null && _c !== void 0 ? _c : 'Proprietário',
                last_name: (_d = user.lastName) !== null && _d !== void 0 ? _d : '',
            },
            date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
                shop_id: shopId,
                shop_name: shop.name,
            },
        },
    });
    const paymentId = paymentData.id.toString();
    const qrCode = (_g = (_f = (_e = paymentData.point_of_interaction) === null || _e === void 0 ? void 0 : _e.transaction_data) === null || _f === void 0 ? void 0 : _f.qr_code) !== null && _g !== void 0 ? _g : '';
    const qrCodeBase64 = (_k = (_j = (_h = paymentData.point_of_interaction) === null || _h === void 0 ? void 0 : _h.transaction_data) === null || _j === void 0 ? void 0 : _j.qr_code_base64) !== null && _k !== void 0 ? _k : '';
    const expiresAt = (_l = paymentData.date_of_expiration) !== null && _l !== void 0 ? _l : '';
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
//# sourceMappingURL=createPixCharge.js.map
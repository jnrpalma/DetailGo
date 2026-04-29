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
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const mercadopago_1 = require("mercadopago");
const mpAccessToken = (0, params_1.defineSecret)('MP_ACCESS_TOKEN');
const PLAN_AMOUNT = 0.01; // ← TESTE: mudar para 89.0 em produção
const PLAN_DESCRIPTION = 'DetailGo Pro - Plano Mensal';
exports.createPixCharge = (0, https_1.onRequest)({ secrets: [mpAccessToken], cors: true }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }
    try {
        // Verifica autenticação via Bearer token
        const authHeader = (_a = req.headers.authorization) !== null && _a !== void 0 ? _a : '';
        const idToken = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : null;
        if (!idToken) {
            res.status(401).json({ error: 'Token não fornecido.' });
            return;
        }
        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;
        const { shopId } = req.body;
        if (!shopId) {
            res.status(400).json({ error: 'shopId é obrigatório.' });
            return;
        }
        const db = admin.firestore();
        const shopSnap = await db.doc(`shops/${shopId}`).get();
        if (!shopSnap.exists) {
            res.status(404).json({ error: 'Loja não encontrada.' });
            return;
        }
        const shop = shopSnap.data();
        if (shop.ownerId !== uid) {
            res.status(403).json({ error: 'Acesso negado.' });
            return;
        }
        const userSnap = await db.doc(`users/${uid}`).get();
        const user = ((_b = userSnap.data()) !== null && _b !== void 0 ? _b : {});
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
                    email: (_c = user.email) !== null && _c !== void 0 ? _c : `owner_${uid}@detailgo.app`,
                    first_name: (_d = user.firstName) !== null && _d !== void 0 ? _d : 'Proprietario',
                    last_name: (_e = user.lastName) !== null && _e !== void 0 ? _e : 'DetailGo',
                },
                date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                metadata: {
                    shop_id: shopId,
                    shop_name: shop.name,
                },
            },
        });
        const paymentId = paymentData.id.toString();
        const qrCode = (_h = (_g = (_f = paymentData.point_of_interaction) === null || _f === void 0 ? void 0 : _f.transaction_data) === null || _g === void 0 ? void 0 : _g.qr_code) !== null && _h !== void 0 ? _h : '';
        const qrCodeBase64 = (_l = (_k = (_j = paymentData.point_of_interaction) === null || _j === void 0 ? void 0 : _j.transaction_data) === null || _k === void 0 ? void 0 : _k.qr_code_base64) !== null && _l !== void 0 ? _l : '';
        await db.doc(`payments/${paymentId}`).set({
            paymentId,
            shopId,
            shopName: shop.name,
            amount: PLAN_AMOUNT,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        v2_1.logger.info(`PIX criado: ${paymentId} para shop: ${shopId}`);
        res.status(200).json({
            payment_id: paymentId,
            qr_code: qrCode,
            qr_code_base64: qrCodeBase64,
            expires_at: (_m = paymentData.date_of_expiration) !== null && _m !== void 0 ? _m : '',
            amount: PLAN_AMOUNT,
        });
    }
    catch (error) {
        v2_1.logger.error('Erro ao criar PIX:', error);
        res.status(500).json({
            error: (_o = error === null || error === void 0 ? void 0 : error.message) !== null && _o !== void 0 ? _o : 'Erro interno ao gerar PIX.',
        });
    }
});
//# sourceMappingURL=createPixCharge.js.map
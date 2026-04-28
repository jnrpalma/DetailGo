import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock,
  CheckCircle2,
  MessageCircle,
  Copy,
  Zap,
  Shield,
  TrendingUp,
  LogOut,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

import { colors, spacing, radii } from '@shared/theme';
import { useShop } from '@features/shops/context/ShopContext';
import { useAuth } from '@features/auth';

// ── Configure sua chave Pix aqui ───────────────────────────────────────────
const PIX_KEY = '41270298895'; // ← TROQUE pela sua chave Pix
const PIX_NAME = 'DetailGo';
const PLAN_PRICE = 'R$ 89,00/mês';
const WHATSAPP_NUMBER = '5511996784399'; // ← TROQUE pelo seu WhatsApp (com DDI)
// ────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  'Agendamentos ilimitados',
  'Dashboard completo de agendamentos',
  'Histórico detalhado',
  'Código de convite para clientes',
  'Configuração de horários e capacidade',
  'Suporte via WhatsApp',
];

export default function SubscriptionScreen() {
  const { shop, trialDaysLeft, signOut: _ } = { ...useShop(), signOut: useAuth().signOut };
  const { signOut } = useAuth();

  const isTrialActive = trialDaysLeft > 0;

  const pixMessage = `DetailGo - Plano Pro\nLoja: ${shop?.name ?? ''}\nCódigo da loja: ${shop?.code ?? ''}\nValor: ${PLAN_PRICE}`;

  const handleCopyPix = async () => {
    await Share.share({ message: `Chave Pix: ${PIX_KEY}\n\n${pixMessage}` });
  };

  const handleWhatsApp = async () => {
    const text = encodeURIComponent(
      `Olá! Acabei de fazer o pagamento do DetailGo Pro.\n\n` +
      `Loja: ${shop?.name ?? ''}\nCódigo: ${shop?.code ?? ''}\n\nPode ativar meu plano?`,
    );
    const url = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${text}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp não encontrado', `Entre em contato pelo número: ${WHATSAPP_NUMBER}`);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.main} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <LinearGradient
            colors={[colors.primary.main, colors.secondary.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerTop}>
              <Text style={styles.brand}>DETAILGO</Text>
              <TouchableOpacity onPress={signOut} style={styles.logoutBtn} activeOpacity={0.7}>
                <LogOut size={20} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>

            {isTrialActive ? (
              <>
                <View style={styles.trialBadge}>
                  <Clock size={14} color="#F97316" />
                  <Text style={styles.trialBadgeText}>
                    Trial gratuito · {trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'} restantes
                  </Text>
                </View>
                <Text style={styles.headerTitle}>Seu trial está ativo</Text>
                <Text style={styles.headerSubtitle}>
                  Aproveite todos os recursos. Assine antes de expirar para não perder o acesso.
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.trialBadge, styles.expiredBadge]}>
                  <Clock size={14} color={colors.status.error} />
                  <Text style={[styles.trialBadgeText, styles.expiredBadgeText]}>
                    Trial expirado
                  </Text>
                </View>
                <Text style={styles.headerTitle}>Ative seu plano</Text>
                <Text style={styles.headerSubtitle}>
                  Para continuar recebendo agendamentos, ative o plano Pro.
                </Text>
              </>
            )}

            <View style={styles.priceBox}>
              <Text style={styles.price}>R$ 89</Text>
              <View>
                <Text style={styles.pricePer}>/mês</Text>
                <Text style={styles.priceSub}>sem contrato</Text>
              </View>
            </View>
          </LinearGradient>

          {/* ── Funcionalidades ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Zap size={18} color={colors.primary.main} />
              <Text style={styles.cardTitle}>O que está incluído</Text>
            </View>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <CheckCircle2 size={16} color={colors.status.success} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* ── Como pagar ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Shield size={18} color={colors.primary.main} />
              <Text style={styles.cardTitle}>Como assinar</Text>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
              <Text style={styles.stepText}>
                Faça um Pix de <Text style={styles.bold}>R$ 89,00</Text> para a chave abaixo
              </Text>
            </View>

            <View style={styles.pixBox}>
              <View style={styles.pixInfo}>
                <Text style={styles.pixLabel}>Chave Pix</Text>
                <Text style={styles.pixValue}>{PIX_KEY}</Text>
                <Text style={styles.pixLabel}>Favorecido</Text>
                <Text style={styles.pixValue}>{PIX_NAME}</Text>
              </View>
              <TouchableOpacity style={styles.pixCopyBtn} onPress={handleCopyPix} activeOpacity={0.8}>
                <Copy size={16} color={colors.primary.main} />
                <Text style={styles.pixCopyText}>Compartilhar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
              <Text style={styles.stepText}>
                No campo de mensagem do Pix, coloque{' '}
                <Text style={styles.bold}>"{shop?.name ?? 'nome da sua loja'}"</Text>
              </Text>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
              <Text style={styles.stepText}>
                Avise pelo WhatsApp que o pagamento foi feito. Ativamos em até 1 hora!
              </Text>
            </View>

            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={handleWhatsApp}
              activeOpacity={0.85}
            >
              <MessageCircle size={20} color="#FFFFFF" />
              <Text style={styles.whatsappBtnText}>Avisar que paguei no WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {/* ── Nota ── */}
          <View style={styles.noteBox}>
            <TrendingUp size={14} color={colors.text.tertiary} />
            <Text style={styles.noteText}>
              Renovação mensal. Cancele quando quiser sem multa.
            </Text>
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: 32,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.white,
    letterSpacing: 1.5,
  },
  logoutBtn: {
    padding: spacing.xs,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFF7ED',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  expiredBadge: {
    backgroundColor: '#FEF2F2',
  },
  trialBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },
  expiredBadgeText: {
    color: colors.status.error,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.white,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text.white,
    lineHeight: 40,
  },
  pricePer: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  priceSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.main,
    shadowColor: colors.text.primary,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.white,
  },
  stepText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    flex: 1,
  },
  bold: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  pixBox: {
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  pixInfo: {
    gap: 4,
  },
  pixLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  pixValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  pixCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    marginTop: spacing.xs,
  },
  pixCopyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.main,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#25D366',
    borderRadius: radii.md,
    paddingVertical: 14,
    marginTop: spacing.xs,
  },
  whatsappBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  noteText: {
    fontSize: 12,
    color: colors.text.tertiary,
    flex: 1,
  },
});

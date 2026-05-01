import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Copy,
  Share2,
  MessageCircle,
  Store,
  Clock,
  Users,
  Check,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';

import { colors, spacing, radii } from '@shared/theme';
import { formatUtils } from '@shared/utils/format.utils';
import { useShop } from '@features/shops/context/ShopContext';
import { updateShopName } from '@features/shops/services/shop.service';
import {
  getShopSettings,
  updateShopSettings,
  type ShopSettings,
} from '@features/settings/services/shopSettings.service';

const SLOT_STEP_OPTIONS = [15, 30, 45, 60];

export default function AdminManageScreen() {
  const navigation = useNavigation();
  const { shopId, shop } = useShop();

  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  const [shopName, setShopName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (shop?.name) setShopName(shop.name);
  }, [shop?.name]);

  useEffect(() => {
    if (!shopId) return;
    setLoadingSettings(true);
    getShopSettings(shopId)
      .then(s => setSettings(s))
      .catch(() => Alert.alert('Erro', 'Falha ao carregar configurações.'))
      .finally(() => setLoadingSettings(false));
  }, [shopId]);

  const handleSaveName = async () => {
    if (!shopId || !shopName.trim()) return;
    setSavingName(true);
    try {
      await updateShopName(shopId, shopName);
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2000);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao salvar nome.');
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!shopId || !settings) return;
    if (settings.openHour >= settings.closeHour) {
      Alert.alert('Atenção', 'Horário de abertura deve ser anterior ao fechamento.');
      return;
    }
    setSavingSettings(true);
    try {
      const updated = await updateShopSettings(shopId, settings);
      setSettings(updated);
      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 2000);
    } catch {
      Alert.alert('Erro', 'Falha ao salvar configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!shop) return;
    const message =
      `Olá! Use o código *${shop.code}* para agendar serviços na *${shop.name}* pelo app DetailGo.\n\n` +
      `Baixe o app e cadastre-se como cliente usando esse código.`;

    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
    } else {
      handleShare();
    }
  };

  const handleShare = async () => {
    if (!shop) return;
    await Share.share({
      message:
        `Agende serviços na *${shop.name}*!\n\n` +
        `Use o código *${shop.code}* ao se cadastrar no app DetailGo.`,
    });
  };

  const handleCopyCode = async () => {
    if (!shop) return;
    await Share.share({ message: shop.code });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stepHour = (field: 'openHour' | 'closeHour', dir: 1 | -1) => {
    if (!settings) return;
    const val = settings[field] + dir;
    if (val < 0 || val > 23) return;
    setSettings(prev => (prev ? { ...prev, [field]: val } : prev));
  };

  const stepCapacity = (dir: 1 | -1) => {
    if (!settings) return;
    const val = settings.parallelCapacity + dir;
    if (val < 1 || val > 10) return;
    setSettings(prev => (prev ? { ...prev, parallelCapacity: val } : prev));
  };

  const HourStepper = ({ label, field }: { label: string; field: 'openHour' | 'closeHour' }) => (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => stepHour(field, -1)}
          activeOpacity={0.7}
        >
          <ChevronDown size={18} color={colors.primary.main} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{formatUtils.padZero(settings?.[field] ?? 0)}:00</Text>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => stepHour(field, 1)}
          activeOpacity={0.7}
        >
          <ChevronUp size={18} color={colors.primary.main} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gerenciar Loja</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── Código de convite ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#FFF7ED' }]}>
                <MessageCircle size={18} color="#F97316" />
              </View>
              <Text style={styles.cardTitle}>Código de convite</Text>
            </View>
            <Text style={styles.cardDesc}>
              Compartilhe este código com seus clientes para que eles possam se cadastrar na sua
              loja.
            </Text>

            <View style={styles.codeBox}>
              {shop?.code ? (
                shop.code.split('').map((char, i) => (
                  <View key={i} style={styles.codeLetter}>
                    <Text style={styles.codeLetterText}>{char}</Text>
                  </View>
                ))
              ) : (
                <ActivityIndicator color={colors.primary.main} />
              )}
            </View>

            <View style={styles.codeActions}>
              <TouchableOpacity
                style={styles.codeActionBtn}
                onPress={handleCopyCode}
                activeOpacity={0.8}
              >
                {copied ? (
                  <Check size={16} color={colors.status.success} />
                ) : (
                  <Copy size={16} color={colors.primary.main} />
                )}
                <Text style={[styles.codeActionText, copied && { color: colors.status.success }]}>
                  {copied ? 'Compartilhado!' : 'Compartilhar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.codeActionBtn, styles.whatsappBtn]}
                onPress={handleShareWhatsApp}
                activeOpacity={0.8}
              >
                <MessageCircle size={16} color="#FFFFFF" />
                <Text style={[styles.codeActionText, { color: '#FFFFFF' }]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Nome da loja ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconWrap, { backgroundColor: colors.primary.light }]}>
                <Store size={18} color={colors.primary.main} />
              </View>
              <Text style={styles.cardTitle}>Nome da loja</Text>
            </View>

            <TextInput
              style={styles.nameInput}
              value={shopName}
              onChangeText={setShopName}
              placeholder="Ex: Auto Detailing São Paulo"
              placeholderTextColor={colors.text.disabled}
              editable={!savingName}
              maxLength={60}
            />

            <TouchableOpacity
              style={[styles.saveBtn, (!shopName.trim() || savingName) && styles.saveBtnDisabled]}
              onPress={handleSaveName}
              disabled={!shopName.trim() || savingName}
              activeOpacity={0.8}
            >
              {savingName ? (
                <ActivityIndicator size="small" color={colors.text.white} />
              ) : savedName ? (
                <>
                  <Check size={16} color={colors.text.white} />
                  <Text style={styles.saveBtnText}>Salvo!</Text>
                </>
              ) : (
                <Text style={styles.saveBtnText}>Salvar nome</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Horários e capacidade ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Clock size={18} color="#2563EB" />
              </View>
              <Text style={styles.cardTitle}>Horário de funcionamento</Text>
            </View>

            {loadingSettings ? (
              <ActivityIndicator
                color={colors.primary.main}
                style={{ marginVertical: spacing.lg }}
              />
            ) : settings ? (
              <>
                <HourStepper label="Abertura" field="openHour" />
                <View style={styles.divider} />
                <HourStepper label="Fechamento" field="closeHour" />

                <View style={styles.divider} />

                <View style={styles.stepperRow}>
                  <Text style={styles.stepperLabel}>Passo entre slots</Text>
                  <View style={styles.pillGroup}>
                    {SLOT_STEP_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.pill, settings.slotStepMin === opt && styles.pillActive]}
                        onPress={() =>
                          setSettings(prev => (prev ? { ...prev, slotStepMin: opt } : prev))
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            settings.slotStepMin === opt && styles.pillTextActive,
                          ]}
                        >
                          {opt}min
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.stepperRow}>
                  <View style={styles.stepperLabelWrap}>
                    <Users size={14} color={colors.text.tertiary} />
                    <Text style={styles.stepperLabel}>Atendimentos simultâneos</Text>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => stepCapacity(-1)}
                      activeOpacity={0.7}
                    >
                      <ChevronDown size={18} color={colors.primary.main} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{settings.parallelCapacity}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => stepCapacity(1)}
                      activeOpacity={0.7}
                    >
                      <ChevronUp size={18} color={colors.primary.main} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, savingSettings && styles.saveBtnDisabled]}
                  onPress={handleSaveSettings}
                  disabled={savingSettings}
                  activeOpacity={0.8}
                >
                  {savingSettings ? (
                    <ActivityIndicator size="small" color={colors.text.white} />
                  ) : savedSettings ? (
                    <>
                      <Check size={16} color={colors.text.white} />
                      <Text style={styles.saveBtnText}>Salvo!</Text>
                    </>
                  ) : (
                    <Text style={styles.saveBtnText}>Salvar configurações</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.main,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.main,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
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
    marginBottom: spacing.sm,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  codeBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  codeLetter: {
    width: 44,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.primary.light,
    borderWidth: 2,
    borderColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeLetterText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary.main,
    letterSpacing: 0,
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    backgroundColor: colors.background.card,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  codeActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.main,
  },
  nameInput: {
    borderWidth: 1.5,
    borderColor: colors.border.main,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text.primary,
    backgroundColor: colors.background.surface,
    marginBottom: spacing.md,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    backgroundColor: colors.primary.main,
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  saveBtnDisabled: {
    backgroundColor: colors.text.disabled,
  },
  saveBtnText: {
    color: colors.text.white,
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.main,
    marginVertical: spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.main,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  stepperBtn: {
    padding: 4,
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    minWidth: 52,
    textAlign: 'center',
  },
  pillGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border.main,
    backgroundColor: colors.background.surface,
  },
  pillActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  pillTextActive: {
    color: colors.text.white,
  },
});

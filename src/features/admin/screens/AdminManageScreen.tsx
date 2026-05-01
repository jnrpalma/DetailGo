import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
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
  MessageCircle,
  Store,
  Clock,
  Users,
  Check,
  ChevronUp,
  ChevronDown,
  Scissors,
  Pencil,
  Trash2,
  Plus,
  X,
} from 'lucide-react-native';

import { colors, spacing, radii } from '@shared/theme';
import { formatUtils } from '@shared/utils/format.utils';
import { useShop } from '@features/shops/context/ShopContext';
import { updateShopName } from '@features/shops/services/shop.service';
import {
  getShopSettings,
  updateShopSettings,
  updateShopServices,
  type ShopSettings,
  type ShopService,
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

  // ── Serviços ──
  const [editingService, setEditingService] = useState<string | null>(null);
  const [savingServices, setSavingServices] = useState(false);
  const [savedServices, setSavedServices] = useState(false);

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

  const toggleService = (id: string) => {
    setSettings(prev =>
      prev
        ? {
            ...prev,
            services: prev.services.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
          }
        : prev,
    );
  };

  const updateServiceField = (id: string, field: keyof ShopService, value: string | number) => {
    setSettings(prev =>
      prev
        ? {
            ...prev,
            services: prev.services.map(s => (s.id === id ? { ...s, [field]: value } : s)),
          }
        : prev,
    );
  };

  const deleteService = (id: string) => {
    Alert.alert('Excluir serviço', 'Tem certeza que deseja excluir este serviço?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          setSettings(prev =>
            prev ? { ...prev, services: prev.services.filter(s => s.id !== id) } : prev,
          );
          if (editingService === id) setEditingService(null);
        },
      },
    ]);
  };

  const addService = () => {
    const newId = `custom_${Date.now()}`;
    const newService: ShopService = {
      id: newId,
      label: 'Novo serviço',
      description: 'Descrição do serviço',
      price: 0,
      durationMin: 30,
      enabled: true,
    };
    setSettings(prev => (prev ? { ...prev, services: [...prev.services, newService] } : prev));
    setEditingService(newId);
  };

  const handleSaveServices = async () => {
    if (!shopId || !settings) return;
    const hasEmpty = settings.services.some(s => !s.label.trim());
    if (hasEmpty) {
      Alert.alert('Atenção', 'Preencha o nome de todos os serviços.');
      return;
    }
    setSavingServices(true);
    setEditingService(null);
    try {
      await updateShopServices(shopId, settings.services);
      setSavedServices(true);
      setTimeout(() => setSavedServices(false), 2000);
    } catch {
      Alert.alert('Erro', 'Falha ao salvar serviços.');
    } finally {
      setSavingServices(false);
    }
  };

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

          {/* ── Serviços disponíveis ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Scissors size={18} color={colors.status.success} />
              </View>
              <Text style={styles.cardTitle}>Serviços disponíveis</Text>
            </View>

            <Text style={styles.svcCardDesc}>
              Configure os serviços que sua estética oferece. O cliente verá apenas os serviços
              ativos.
            </Text>

            {loadingSettings ? (
              <ActivityIndicator
                color={colors.primary.main}
                style={{ marginVertical: spacing.lg }}
              />
            ) : (
              <>
                {(settings?.services ?? []).map((svc, idx, arr) => (
                  <View key={svc.id}>
                    {/* ── Card do serviço ── */}
                    <View style={styles.svcCard}>
                      {/* Cabeçalho: toggle + nome + ações */}
                      <View style={styles.svcHeader}>
                        <Switch
                          value={svc.enabled}
                          onValueChange={() => toggleService(svc.id)}
                          trackColor={{ false: colors.border.main, true: colors.primary.light }}
                          thumbColor={svc.enabled ? colors.primary.main : colors.text.disabled}
                        />

                        {editingService === svc.id ? (
                          <TextInput
                            style={styles.svcNameInput}
                            value={svc.label}
                            onChangeText={v => updateServiceField(svc.id, 'label', v)}
                            placeholder="Nome do serviço"
                            placeholderTextColor={colors.text.disabled}
                            autoFocus
                          />
                        ) : (
                          <Text
                            style={[styles.svcName, !svc.enabled && styles.svcNameOff]}
                            numberOfLines={1}
                          >
                            {svc.label}
                          </Text>
                        )}

                        <View style={styles.svcActions}>
                          <TouchableOpacity
                            style={styles.svcActionBtn}
                            onPress={() =>
                              setEditingService(editingService === svc.id ? null : svc.id)
                            }
                            activeOpacity={0.7}
                          >
                            {editingService === svc.id ? (
                              <X size={15} color={colors.text.tertiary} />
                            ) : (
                              <Pencil size={15} color={colors.primary.main} />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.svcActionBtn}
                            onPress={() => deleteService(svc.id)}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={15} color={colors.status.error} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Campos de edição */}
                      {editingService === svc.id ? (
                        <View style={styles.svcEditFields}>
                          <View style={styles.svcFieldRow}>
                            <Text style={styles.svcFieldLabel}>Descrição</Text>
                            <TextInput
                              style={styles.svcFieldInput}
                              value={svc.description}
                              onChangeText={v => updateServiceField(svc.id, 'description', v)}
                              placeholder="Ex: Limpeza completa interna e externa"
                              placeholderTextColor={colors.text.disabled}
                              multiline
                            />
                          </View>

                          <View style={styles.svcFieldsRow}>
                            <View style={[styles.svcFieldRow, { flex: 1 }]}>
                              <Text style={styles.svcFieldLabel}>Preço (R$)</Text>
                              <TextInput
                                style={styles.svcFieldInput}
                                value={String(svc.price)}
                                onChangeText={v =>
                                  updateServiceField(svc.id, 'price', Number(v) || 0)
                                }
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={colors.text.disabled}
                              />
                            </View>
                            <View style={[styles.svcFieldRow, { flex: 1 }]}>
                              <Text style={styles.svcFieldLabel}>Duração (min)</Text>
                              <TextInput
                                style={styles.svcFieldInput}
                                value={String(svc.durationMin)}
                                onChangeText={v =>
                                  updateServiceField(svc.id, 'durationMin', Number(v) || 0)
                                }
                                keyboardType="numeric"
                                placeholder="30"
                                placeholderTextColor={colors.text.disabled}
                              />
                            </View>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.svcSummary}>
                          {svc.description ? `${svc.description} · ` : ''}
                          <Text style={{ color: colors.primary.main, fontWeight: '700' }}>
                            R$ {svc.price}
                          </Text>
                          {' · '}
                          {svc.durationMin}min
                        </Text>
                      )}
                    </View>

                    {idx < arr.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}

                {/* Botão adicionar novo serviço */}
                <TouchableOpacity
                  style={styles.addServiceBtn}
                  onPress={addService}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color={colors.primary.main} />
                  <Text style={styles.addServiceText}>Adicionar serviço</Text>
                </TouchableOpacity>

                {/* Botão salvar */}
                <TouchableOpacity
                  style={[styles.saveBtn, savingServices && styles.saveBtnDisabled]}
                  onPress={handleSaveServices}
                  disabled={savingServices}
                  activeOpacity={0.8}
                >
                  {savingServices ? (
                    <ActivityIndicator size="small" color={colors.text.white} />
                  ) : savedServices ? (
                    <>
                      <Check size={16} color={colors.text.white} />
                      <Text style={styles.saveBtnText}>Salvo!</Text>
                    </>
                  ) : (
                    <Text style={styles.saveBtnText}>Salvar serviços</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
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

  // ── Serviços
  svcCardDesc: {
    fontSize: 12,
    color: colors.text.tertiary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  svcCard: {
    paddingVertical: spacing.sm,
  },
  svcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  svcName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  svcNameOff: {
    color: colors.text.disabled,
  },
  svcNameInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary.main,
    paddingVertical: 2,
  },
  svcActions: {
    flexDirection: 'row',
    gap: 4,
  },
  svcActionBtn: {
    padding: spacing.xs,
  },
  svcSummary: {
    fontSize: 12,
    color: colors.text.tertiary,
    lineHeight: 18,
    paddingLeft: 52,
  },
  svcEditFields: {
    paddingLeft: 52,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  svcFieldsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  svcFieldRow: {
    gap: 4,
  },
  svcFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  svcFieldInput: {
    fontSize: 13,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    backgroundColor: colors.background.surface,
  },
  addServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    backgroundColor: colors.primary.light,
  },
  addServiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.main,
  },
});

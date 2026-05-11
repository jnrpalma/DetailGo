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
  Pencil,
  Trash2,
  LogOut,
} from 'lucide-react-native';

import { getAuth } from '@react-native-firebase/auth';
import { colors, spacing, radii } from '@shared/theme';
import { formatUtils } from '@shared/utils/format.utils';
import {
  useShop,
  useShopServices,
  updateShopName,
  deleteShopService,
  getShopServiceIcon,
  updateShopService,
} from '@features/shops';
import type { ShopService } from '@features/shops';
import { getShopSettings, updateShopSettings, type ShopSettings } from '@features/settings';

const SLOT_STEP_OPTIONS = [15, 30, 45, 60];

type ServiceDraft = {
  name: string;
  title: string;
  description: string;
  includes: string;
  note: string;
  durationMin: string;
  price: string;
  recommendedFor: string;
};

function toServiceDraft(service: ShopService): ServiceDraft {
  return {
    name: service.name,
    title: service.title ?? service.name,
    description: service.description ?? '',
    includes: (service.includes ?? []).join('\n'),
    note: service.note ?? '',
    durationMin: String(service.durationMin),
    price: String(service.price),
    recommendedFor: (service.recommendedFor ?? []).join('\n'),
  };
}

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

export default function AdminManageScreen() {
  const navigation = useNavigation();
  const { shopId, shop } = useShop();
  const auth = getAuth();

  const handleSignOut = async () => {
    Alert.alert('Sair da conta', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth.signOut();
          } catch {
            Alert.alert('Erro', 'Falha ao sair da conta.');
          }
        },
      },
    ]);
  };

  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  const [shopName, setShopName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);

  const [copied, setCopied] = useState(false);
  const { loading: loadingServices, items: services } = useShopServices({
    shopId,
    ensureDefaults: true,
  });
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, ServiceDraft>>({});
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [savedServiceId, setSavedServiceId] = useState<string | null>(null);

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

  useEffect(() => {
    setServiceDrafts(prev => {
      const next = { ...prev };
      services.forEach(service => {
        if (!next[service.id]) next[service.id] = toServiceDraft(service);
      });
      return next;
    });
  }, [services]);

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

  const handleToggleService = async (serviceId: string, active: boolean) => {
    if (!shopId) return;
    try {
      await updateShopService(shopId, serviceId, { active });
    } catch {
      Alert.alert('Erro', 'Falha ao atualizar serviço.');
    }
  };

  const handleEditService = (service: ShopService) => {
    setServiceDrafts(prev => ({
      ...prev,
      [service.id]: toServiceDraft(service),
    }));
    setEditingServiceId(service.id);
  };

  const updateServiceDraft = (serviceId: string, field: keyof ServiceDraft, value: string) => {
    setServiceDrafts(prev => ({
      ...prev,
      [serviceId]: {
        ...(prev[serviceId] ?? {
          name: '',
          title: '',
          description: '',
          includes: '',
          note: '',
          durationMin: '',
          price: '',
          recommendedFor: '',
        }),
        [field]: value,
      },
    }));
  };

  const handleSaveService = async (service: ShopService) => {
    if (!shopId) return;
    const draft = serviceDrafts[service.id] ?? toServiceDraft(service);
    const name = draft.name.trim();
    const title = draft.title.trim();
    const description = draft.description.trim();
    const includes = parseLines(draft.includes);
    const note = draft.note.trim();
    const durationMin = Number(draft.durationMin.replace(',', '.'));
    const price = Number(draft.price.replace(',', '.'));
    const recommendedFor = parseLines(draft.recommendedFor);

    if (!name) {
      Alert.alert('Atenção', 'Informe o nome do serviço.');
      return;
    }

    if (!durationMin || durationMin < 5) {
      Alert.alert('Atenção', 'Informe uma duração válida para o serviço.');
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      Alert.alert('Atenção', 'Informe um preço válido para o serviço.');
      return;
    }

    setSavingServiceId(service.id);
    try {
      await updateShopService(shopId, service.id, {
        name,
        title: title || name,
        description: description || null,
        includes,
        note: note || null,
        durationMin,
        price,
        recommendedFor,
      });
      setEditingServiceId(null);
      setSavedServiceId(service.id);
      setTimeout(() => setSavedServiceId(null), 2000);
    } catch {
      Alert.alert('Erro', 'Falha ao salvar serviço.');
    } finally {
      setSavingServiceId(null);
    }
  };

  const handleDeleteService = (service: ShopService) => {
    if (!shopId) return;

    Alert.alert(
      'Excluir serviço',
      `Deseja excluir "${service.name}"? Clientes não verão mais este serviço para novos agendamentos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShopService(shopId, service.id);
              setEditingServiceId(current => (current === service.id ? null : current));
            } catch {
              Alert.alert('Erro', 'Falha ao excluir serviço.');
            }
          },
        },
      ],
    );
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

  const renderHourStepper = (label: string, field: 'openHour' | 'closeHour') => (
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
                {renderHourStepper('Abertura', 'openHour')}
                <View style={styles.divider} />
                {renderHourStepper('Fechamento', 'closeHour')}

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

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconWrap, { backgroundColor: colors.primary.light }]}>
                <Store size={18} color={colors.primary.main} />
              </View>
              <Text style={styles.cardTitle}>Serviços disponíveis</Text>
            </View>
            <Text style={styles.cardDesc}>
              Escolha quais serviços aparecem para os clientes vinculados à sua estética.
            </Text>

            {loadingServices ? (
              <ActivityIndicator
                color={colors.primary.main}
                style={{ marginVertical: spacing.lg }}
              />
            ) : (
              <View style={styles.servicesList}>
                {services.map(service => {
                  const ServiceIcon = getShopServiceIcon(service);
                  const draft = serviceDrafts[service.id] ?? toServiceDraft(service);
                  const isSavingService = savingServiceId === service.id;
                  const isSavedService = savedServiceId === service.id;
                  const isEditingService = editingServiceId === service.id;
                  return (
                    <View key={service.id} style={styles.serviceEditor}>
                      <View style={styles.serviceEditorHeader}>
                        <View style={styles.serviceRowLeft}>
                          <View style={styles.serviceIconWrap}>
                            <ServiceIcon size={18} color={colors.primary.main} />
                          </View>
                          <View style={styles.serviceTexts}>
                            <Text style={styles.serviceName}>{service.name}</Text>
                            <Text style={styles.serviceMeta}>
                              {service.durationMin}min · {formatUtils.currency(service.price)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.serviceStatus}>
                          <Text style={styles.serviceStatusText}>
                            {service.active ? 'Ativo' : 'Oculto'}
                          </Text>
                          <Switch
                            value={service.active}
                            onValueChange={active => handleToggleService(service.id, active)}
                            thumbColor={service.active ? colors.primary.main : colors.text.disabled}
                            trackColor={{
                              false: colors.border.main,
                              true: colors.primary.light,
                            }}
                          />
                        </View>
                      </View>

                      {isEditingService ? (
                        <View style={styles.serviceForm}>
                          <Text style={styles.inputLabel}>Nome na home</Text>
                          <TextInput
                            style={styles.serviceInput}
                            value={draft.name}
                            onChangeText={value => updateServiceDraft(service.id, 'name', value)}
                            placeholder="Ex: Lavagem premium"
                            placeholderTextColor={colors.text.disabled}
                            editable={!isSavingService}
                            maxLength={40}
                          />

                          <Text style={styles.inputLabel}>Título do serviço</Text>
                          <TextInput
                            style={styles.serviceInput}
                            value={draft.title}
                            onChangeText={value => updateServiceDraft(service.id, 'title', value)}
                            placeholder="Ex: Lavagem completa premium"
                            placeholderTextColor={colors.text.disabled}
                            editable={!isSavingService}
                            maxLength={60}
                          />

                          <Text style={styles.inputLabel}>Descrição</Text>
                          <TextInput
                            style={[styles.serviceInput, styles.serviceTextarea]}
                            value={draft.description}
                            onChangeText={value =>
                              updateServiceDraft(service.id, 'description', value)
                            }
                            placeholder="Descreva o que está incluso neste serviço"
                            placeholderTextColor={colors.text.disabled}
                            editable={!isSavingService}
                            multiline
                            maxLength={160}
                          />

                          <Text style={styles.inputLabel}>Inclui</Text>
                          <TextInput
                            style={[styles.serviceInput, styles.serviceTextarea]}
                            value={draft.includes}
                            onChangeText={value =>
                              updateServiceDraft(service.id, 'includes', value)
                            }
                            placeholder={'Um item por linha\nEx: Lavagem externa\nAspiração rápida'}
                            placeholderTextColor={colors.text.disabled}
                            editable={!isSavingService}
                            multiline
                            maxLength={260}
                          />

                          <Text style={styles.inputLabel}>Recomendado para</Text>
                          <TextInput
                            style={[styles.serviceInput, styles.serviceTextareaSmall]}
                            value={draft.recommendedFor}
                            onChangeText={value =>
                              updateServiceDraft(service.id, 'recommendedFor', value)
                            }
                            placeholder={'Um item por linha\nEx: Uso diário\nManutenção'}
                            placeholderTextColor={colors.text.disabled}
                            editable={!isSavingService}
                            multiline
                            maxLength={180}
                          />

                          <Text style={styles.inputLabel}>Observação</Text>
                          <TextInput
                            style={styles.serviceInput}
                            value={draft.note}
                            onChangeText={value => updateServiceDraft(service.id, 'note', value)}
                            placeholder="Ex: Ideal para manutenção semanal"
                            placeholderTextColor={colors.text.disabled}
                            editable={!isSavingService}
                            maxLength={120}
                          />

                          <View style={styles.serviceInlineFields}>
                            <View style={styles.inlineField}>
                              <Text style={styles.inputLabel}>Duração</Text>
                              <TextInput
                                style={styles.serviceInput}
                                value={draft.durationMin}
                                onChangeText={value =>
                                  updateServiceDraft(service.id, 'durationMin', value)
                                }
                                placeholder="30"
                                placeholderTextColor={colors.text.disabled}
                                keyboardType="numeric"
                                editable={!isSavingService}
                              />
                            </View>
                            <View style={styles.inlineField}>
                              <Text style={styles.inputLabel}>Preço</Text>
                              <TextInput
                                style={styles.serviceInput}
                                value={draft.price}
                                onChangeText={value =>
                                  updateServiceDraft(service.id, 'price', value)
                                }
                                placeholder="80"
                                placeholderTextColor={colors.text.disabled}
                                keyboardType="numeric"
                                editable={!isSavingService}
                              />
                            </View>
                          </View>

                          <View style={styles.serviceEditActions}>
                            <TouchableOpacity
                              style={styles.serviceCancelBtn}
                              onPress={() => setEditingServiceId(null)}
                              disabled={isSavingService}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.serviceCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.serviceSaveBtn,
                                isSavingService && styles.saveBtnDisabled,
                              ]}
                              onPress={() => handleSaveService(service)}
                              disabled={isSavingService}
                              activeOpacity={0.8}
                            >
                              {isSavingService ? (
                                <ActivityIndicator size="small" color={colors.text.white} />
                              ) : isSavedService ? (
                                <>
                                  <Check size={16} color={colors.text.white} />
                                  <Text style={styles.serviceSaveText}>Salvo!</Text>
                                </>
                              ) : (
                                <Text style={styles.serviceSaveText}>Salvar serviço</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.serviceActions}>
                          <TouchableOpacity
                            style={styles.serviceEditBtn}
                            onPress={() => handleEditService(service)}
                            activeOpacity={0.8}
                          >
                            <Pencil size={14} color={colors.primary.main} />
                            <Text style={styles.serviceEditText}>Editar serviço</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.serviceDeleteBtn}
                            onPress={() => handleDeleteService(service)}
                            activeOpacity={0.8}
                          >
                            <Trash2 size={14} color={colors.status.error} />
                            <Text style={styles.serviceDeleteText}>Excluir</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
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
  servicesList: {
    gap: spacing.md,
  },
  serviceEditor: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.background.surface,
  },
  serviceEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  serviceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  serviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTexts: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  serviceMeta: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  serviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  serviceStatusText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: '700',
  },
  serviceForm: {
    gap: spacing.xs,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  serviceEditBtn: {
    flex: 1,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    backgroundColor: colors.background.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  serviceEditText: {
    color: colors.primary.main,
    fontSize: 13,
    fontWeight: '700',
  },
  serviceDeleteBtn: {
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.status.error,
    backgroundColor: colors.background.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  serviceDeleteText: {
    color: colors.status.error,
    fontSize: 13,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  serviceInput: {
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.background.card,
  },
  serviceTextarea: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  serviceTextareaSmall: {
    minHeight: 62,
    textAlignVertical: 'top',
  },
  serviceInlineFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineField: {
    flex: 1,
  },
  serviceSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 42,
    backgroundColor: colors.primary.main,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },
  serviceEditActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  serviceCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCancelText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  serviceSaveText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '700',
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
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.status.error,
    backgroundColor: colors.background.card,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.status.error,
  },
});

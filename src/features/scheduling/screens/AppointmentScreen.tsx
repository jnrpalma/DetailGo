// src/features/scheduling/screens/AppointmentScreen.tsx
// VERSÃO FINAL - COM DETALHES COMPLETOS DO SERVIÇO

import React, { useMemo, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  View,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Calendar, Clock, Car, Info, ChevronRight } from 'lucide-react-native';

import type { RootStackParamList } from '@app/types';
import {
  getAvailableSlotsForDay,
  createAppointmentWithCapacityCheck,
  type Slot,
} from '@features/scheduling/services/availability.service';
import type { VehicleType, CarCategory } from '@features/appointments/domain/appointment.types';
import { getBasePriceForAppointment } from '@features/appointments/domain/appointment.pricing';

// Paleta DetailGo
const colors = {
  primary: '#175676',
  secondary: '#4BA3C3',
  error: '#D62839',
  success: '#16A34A',
  warning: '#2563EB',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#64748B',
    disabled: '#94A3B8',
    white: '#FFFFFF',
  }
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const CAR_CATEGORIES: CarCategory[] = ['Hatch', 'Sedan', 'SUV', 'Picape cabine dupla'];

const SERVICES = [
  { label: 'Lavagem simples', durationMin: 30 },
  { label: 'Lavagem completa', durationMin: 60 },
  { label: 'Polimento', durationMin: 120 },
  { label: 'Lavagem de motor', durationMin: 45 },
] as const;

type ServiceLabel = (typeof SERVICES)[number]['label'];

type ServiceDetails = {
  title: string;
  includes: string[];
  notIncluded?: string[];
  note?: string;
};

const SERVICE_DETAILS: Record<ServiceLabel, ServiceDetails> = {
  'Lavagem simples': {
    title: 'Lavagem simples',
    includes: [
      'Limpeza externa: carroceria, vidros e rodas',
      'Remoção de sujeira superficial (poeira, lama leve)',
      'Aspiração interna superficial (bancos e carpetes)',
      'Acabamento simples: pretinho nos pneus (quando aplicável)',
    ],
    notIncluded: [
      'Higienização profunda de estofados/carpete',
      'Limpeza minuciosa de cantos/frestas com pincéis',
      'Descontaminação/polimento técnico',
      'Lavagem detalhada de motor/assoalho',
    ],
    note: 'Serviço de rotina, focado em limpeza rápida e manutenção do dia a dia.',
  },
  'Lavagem completa': {
    title: 'Lavagem completa',
    includes: [
      'Limpeza externa completa: carroceria, vidros, rodas e caixas de roda',
      'Aspiração interna mais caprichada',
      'Acabamento: pneus e finalização geral',
    ],
    notIncluded: [
      'Higienização profunda (extração) de bancos e carpetes',
      'Polimento técnico/remoção de riscos',
      'Descontaminação pesada',
    ],
    note: 'Mais detalhada que a simples, ideal para manter o carro sempre bem apresentado.',
  },
  Polimento: {
    title: 'Polimento',
    includes: [
      'Etapa de correção/realce de brilho na pintura (nível conforme avaliação)',
      'Acabamento para melhorar reflexo e aparência',
    ],
    notIncluded: ['Repintura', 'Correção de danos profundos (dependendo do caso)'],
    note: 'Recomendado para recuperar brilho e melhorar o aspecto da pintura.',
  },
  'Lavagem de motor': {
    title: 'Lavagem de motor',
    includes: [
      'Limpeza do cofre do motor com cuidados básicos',
      'Remoção de sujeira superficial e acabamento',
    ],
    notIncluded: [
      'Reparos mecânicos',
      'Remoção de sujeira extremamente pesada sem avaliação prévia',
    ],
    note: 'Feita com cuidado para evitar danos — pode exigir avaliação antes, dependendo do estado.',
  },
};

const formatHour = (ms: number) => {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDayBR = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatCurrencyBRL = (v: number) => {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function SelectModal<T extends string>(props: {
  visible: boolean;
  title: string;
  options: readonly T[];
  selected: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const { visible, title, options, selected, onSelect, onClose } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((opt) => {
            const isSelected = opt === selected;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                onPress={() => {
                  onSelect(opt);
                  onClose();
                }}
              >
                <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

export default function AppointmentScreen() {
  const auth = getAuth();
  const navigation = useNavigation<NavProp>();
  const uid = auth.currentUser?.uid;

  const [vehicleType, setVehicleType] = useState<VehicleType>('Carro');
  const [carCategory, setCarCategory] = useState<CarCategory | null>('Hatch');
  const [serviceLabel, setServiceLabel] = useState<ServiceLabel | null>(null);
  
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceReviewOpen, setServiceReviewOpen] = useState(false);

  const [day, setDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedService = useMemo(
    () => SERVICES.find((s) => s.label === serviceLabel) ?? null,
    [serviceLabel],
  );

  const basePrice = useMemo(() => {
    const price = getBasePriceForAppointment(
      vehicleType,
      vehicleType === 'Carro' ? carCategory : null,
    );
    return typeof price === 'number' ? price : 0;
  }, [vehicleType, carCategory]);

  const finalPrice = basePrice;

  if (!uid) {
    setTimeout(() => {
      Alert.alert('Sessão expirada', 'Faça login novamente.');
      navigation.replace('Login');
    }, 0);
    return null;
  }

  const refreshSlots = async (nextDay: Date, nextService = selectedService) => {
    if (!nextService) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    try {
      setLoadingSlots(true);
      const list = await getAvailableSlotsForDay(nextDay, nextService.durationMin);
      setSlots(list);
      setSelectedSlot(null);
    } catch (error) {
      console.error(error);
      setSlots([]);
      setSelectedSlot(null);
      Alert.alert('Erro', 'Não foi possível carregar os horários.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDayChange = async (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowDayPicker(false);
      return;
    }
    setShowDayPicker(false);
    if (!selected) return;

    const next = new Date(selected);
    next.setHours(0, 0, 0, 0);
    setDay(next);
    await refreshSlots(next, selectedService);
  };

  const handleSelectService = async (service: ServiceLabel) => {
    setServiceLabel(service);
    setServiceReviewOpen(true);
    const svc = SERVICES.find((s) => s.label === service)!;
    await refreshSlots(day, svc);
  };

  const handleSave = async () => {
    if (!selectedService) {
      Alert.alert('Atenção', 'Selecione um serviço.');
      return;
    }

    if (vehicleType === 'Carro' && !carCategory) {
      Alert.alert('Atenção', 'Selecione a categoria do veículo.');
      return;
    }

    if (!selectedSlot) {
      Alert.alert('Atenção', 'Selecione um horário.');
      return;
    }

    try {
      setSubmitting(true);
      await createAppointmentWithCapacityCheck({
        customerUid: uid,
        vehicleType,
        carCategory: vehicleType === 'Carro' ? carCategory : null,
        serviceLabel: selectedService.label,
        durationMin: selectedService.durationMin,
        price: finalPrice,
        startAtMs: selectedSlot.startAtMs,
        endAtMs: selectedSlot.endAtMs,
      });

      Alert.alert('Sucesso', 'Agendamento confirmado!', [
        { text: 'OK', onPress: () => navigation.replace('Dashboard') }
      ]);
    } catch (error: any) {
      if (error?.code === 'SLOT_FULL') {
        Alert.alert('Ops', 'Horário ocupado. Atualizando...');
        await refreshSlots(day, selectedService);
      } else {
        Alert.alert('Erro', 'Falha ao agendar.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = !!selectedService && !!selectedSlot && !submitting;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header padrão DetailGo */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Calendar size={22} color={colors.primary} />
            <Text style={styles.headerTitle}>Agendar Serviço</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Modais de seleção */}
        <SelectModal
          visible={categoryModalOpen}
          title="Categoria"
          options={CAR_CATEGORIES}
          selected={carCategory}
          onSelect={(value) => setCarCategory(value)}
          onClose={() => setCategoryModalOpen(false)}
        />

        <SelectModal
          visible={serviceModalOpen}
          title="Serviço"
          options={SERVICES.map(s => s.label)}
          selected={serviceLabel}
          onSelect={handleSelectService}
          onClose={() => setServiceModalOpen(false)}
        />

        {/* Modal de detalhes do serviço - VERSÃO COMPLETA */}
        <Modal visible={serviceReviewOpen} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setServiceReviewOpen(false)}>
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>
                  {serviceLabel ? SERVICE_DETAILS[serviceLabel].title : ''}
                </Text>
                <TouchableOpacity onPress={() => setServiceReviewOpen(false)}>
                  <Text style={styles.reviewClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>Valor do serviço</Text>
                <Text style={styles.priceValue}>{formatCurrencyBRL(finalPrice)}</Text>
              </View>

              {serviceLabel && (
                <>
                  <View style={styles.reviewSection}>
                    <Text style={styles.reviewSectionTitle}>✓ O que contempla</Text>
                    {SERVICE_DETAILS[serviceLabel].includes.map((item, idx) => (
                      <Text key={`inc-${idx}`} style={styles.reviewItem}>
                        • {item}
                      </Text>
                    ))}
                  </View>

                  {SERVICE_DETAILS[serviceLabel].notIncluded && 
                   SERVICE_DETAILS[serviceLabel].notIncluded!.length > 0 && (
                    <View style={styles.reviewSection}>
                      <Text style={[styles.reviewSectionTitle, styles.reviewSectionTitleExcluded]}>
                        ✕ Não incluso
                      </Text>
                      {SERVICE_DETAILS[serviceLabel].notIncluded!.map((item, idx) => (
                        <Text key={`exc-${idx}`} style={styles.reviewItemExcluded}>
                          • {item}
                        </Text>
                      ))}
                    </View>
                  )}

                  {SERVICE_DETAILS[serviceLabel].note && (
                    <View style={styles.reviewNoteBox}>
                      <Info size={16} color={colors.text.tertiary} />
                      <Text style={styles.reviewNote}>{SERVICE_DETAILS[serviceLabel].note}</Text>
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity 
                style={styles.reviewButton}
                onPress={() => setServiceReviewOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.reviewButtonText}>Entendi</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Formulário COM BOTÃO NO FINAL */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Data */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Data</Text>
            <TouchableOpacity
              style={styles.select}
              onPress={() => setShowDayPicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectContent}>
                <Calendar size={18} color={colors.text.tertiary} />
                <Text style={styles.selectText}>{formatDayBR(day)}</Text>
              </View>
              <ChevronRight size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {showDayPicker && (
            <DateTimePicker
              value={day}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleDayChange}
              minimumDate={new Date()}
            />
          )}

          {/* Tipo de veículo */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Tipo de veículo</Text>
            <View style={styles.vehicleRow}>
              <TouchableOpacity
                style={[styles.vehicleButton, vehicleType === 'Carro' && styles.vehicleButtonSelected]}
                onPress={() => {
                  setVehicleType('Carro');
                  if (!carCategory) setCarCategory('Hatch');
                }}
              >
                <Car size={16} color={vehicleType === 'Carro' ? colors.text.white : colors.text.tertiary} />
                <Text style={[styles.vehicleButtonText, vehicleType === 'Carro' && styles.vehicleButtonTextSelected]}>
                  Carro
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.vehicleButton, vehicleType === 'Moto' && styles.vehicleButtonSelected]}
                onPress={() => {
                  setVehicleType('Moto');
                  setCarCategory(null);
                }}
              >
                <Car size={16} color={vehicleType === 'Moto' ? colors.text.white : colors.text.tertiary} />
                <Text style={[styles.vehicleButtonText, vehicleType === 'Moto' && styles.vehicleButtonTextSelected]}>
                  Moto
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Categoria (apenas Carro) */}
          {vehicleType === 'Carro' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Categoria</Text>
              <TouchableOpacity
                style={styles.select}
                onPress={() => setCategoryModalOpen(true)}
                activeOpacity={0.7}
              >
                <View style={styles.selectContent}>
                  <Car size={18} color={colors.text.tertiary} />
                  <Text style={[styles.selectText, !carCategory && styles.selectPlaceholder]}>
                    {carCategory ?? 'Selecione a categoria'}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Serviço */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Serviço</Text>
            <TouchableOpacity
              style={styles.select}
              onPress={() => setServiceModalOpen(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectContent}>
                <Clock size={18} color={colors.text.tertiary} />
                <Text style={[styles.selectText, !serviceLabel && styles.selectPlaceholder]}>
                  {serviceLabel ?? 'Selecione o serviço'}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Link de detalhes */}
          {serviceLabel && (
            <TouchableOpacity
              style={styles.detailsLink}
              onPress={() => setServiceReviewOpen(true)}
              activeOpacity={0.7}
            >
              <Info size={14} color={colors.primary} />
              <Text style={styles.detailsLinkText}>Ver detalhes do serviço</Text>
            </TouchableOpacity>
          )}

          {/* Horários disponíveis */}
          <View style={[styles.fieldGroup, { marginTop: 8 }]}>
            <Text style={styles.label}>Horários disponíveis</Text>
            
            {!selectedService ? (
              <View style={styles.emptySlots}>
                <Clock size={18} color={colors.text.disabled} />
                <Text style={styles.emptySlotsText}>Selecione um serviço</Text>
              </View>
            ) : loadingSlots ? (
              <View style={styles.emptySlots}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.emptySlotsText}>Carregando horários...</Text>
              </View>
            ) : slots.length === 0 ? (
              <View style={styles.emptySlots}>
                <Calendar size={18} color={colors.text.disabled} />
                <Text style={styles.emptySlotsText}>Nenhum horário disponível</Text>
              </View>
            ) : (
              <FlatList
                horizontal
                data={slots}
                keyExtractor={(item) => String(item.startAtMs)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.slotsList}
                renderItem={({ item }) => {
                  const selected = selectedSlot?.startAtMs === item.startAtMs;
                  return (
                    <TouchableOpacity
                      style={[styles.slotChip, selected && styles.slotChipSelected]}
                      onPress={() => setSelectedSlot(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.slotChipText, selected && styles.slotChipTextSelected]}>
                        {formatHour(item.startAtMs)}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          {/* Botão Confirmar - HARMONIOSAMENTE DEPOIS DOS HORÁRIOS */}
          <TouchableOpacity
            style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
            onPress={handleSave}
            disabled={!canConfirm || submitting}
            activeOpacity={0.8}
          >
            <View style={styles.confirmContent}>
              <Text style={styles.confirmButtonText}>Confirmar Agendamento</Text>
              <Text style={styles.confirmButtonPrice}>{formatCurrencyBRL(finalPrice)}</Text>
            </View>
          </TouchableOpacity>
          
          {/* Espaço extra no final */}
          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header padrão DetailGo
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
  },
  // Campos - ESPAÇAMENTO AJUSTADO
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectText: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  selectPlaceholder: {
    color: colors.text.disabled,
  },
  // Vehicle buttons
  vehicleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vehicleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  vehicleButtonTextSelected: {
    color: colors.text.white,
  },
  // Details link
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  detailsLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // Empty slots
  emptySlots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptySlotsText: {
    fontSize: 14,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  // Slots list
  slotsList: {
    gap: 8,
    paddingVertical: 4,
  },
  slotChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  slotChipTextSelected: {
    color: colors.text.white,
  },
  // Botão Confirmar - DENTRO DO SCROLLVIEW
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    marginTop: 24,
    marginBottom: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  confirmContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.white,
  },
  confirmButtonPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.white,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.text.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  // Modais
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 20,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  modalItemTextSelected: {
    color: colors.text.white,
  },
  // Review modal - VERSÃO COMPLETA
  reviewCard: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  reviewClose: {
    fontSize: 24,
    color: colors.text.tertiary,
    padding: 4,
  },
  priceBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
  },
  reviewSection: {
    marginBottom: 20,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 12,
  },
  reviewSectionTitleExcluded: {
    color: colors.error,
  },
  reviewItem: {
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: 8,
    lineHeight: 22,
    paddingLeft: 4,
  },
  reviewItemExcluded: {
    fontSize: 15,
    color: colors.text.tertiary,
    marginBottom: 8,
    lineHeight: 22,
    paddingLeft: 4,
  },
  reviewNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  reviewNote: {
    flex: 1,
    fontSize: 14,
    color: colors.text.tertiary,
    lineHeight: 20,
  },
  reviewButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.white,
  },
});
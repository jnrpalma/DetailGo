import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, radii, spacing } from '@shared/theme';
import type { RootStackParamList } from '@app/types';

import {
  getAvailableSlotsForDay,
  createAppointmentWithCapacityCheck,
  type Slot,
} from '@features/scheduling/services/availability.service';

import type { VehicleType, CarCategory } from '@features/appointments/domain/appointment.types';
import { getBasePriceForAppointment } from '@features/appointments/domain/appointment.pricing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

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

function formatHour(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDayBR(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Dropdown simples (Modal) */
function SelectField<T extends string>(props: {
  label: string;
  placeholder: string;
  value: T | null;
  options: readonly T[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const { label, placeholder, value, options, onChange, disabled } = props;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.select, disabled && { opacity: 0.6 }]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Text style={[styles.selectText, !value && { color: '#9AA6B2' }]}>
          {value ?? placeholder}
        </Text>
        <Text style={styles.chev}>›</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{label}</Text>

            {options.map((opt) => {
              const selected = opt === value;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.modalItem, selected && styles.modalItemSelected]}
                  activeOpacity={0.85}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selected && styles.modalItemTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** Modal de detalhes do serviço (review) */
function ServiceReviewModal(props: {
  visible: boolean;
  serviceLabel: ServiceLabel | null;
  onClose: () => void;
}) {
  const { visible, serviceLabel, onClose } = props;
  if (!serviceLabel) return null;

  const details = SERVICE_DETAILS[serviceLabel];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.reviewCard} onPress={() => {}}>
          <Text style={styles.reviewTitle}>{details.title}</Text>

          <Text style={styles.reviewSection}>O que contempla</Text>
          {details.includes.map((it, idx) => (
            <Text key={`inc-${idx}`} style={styles.reviewItem}>
              • {it}
            </Text>
          ))}

          {!!details.notIncluded?.length && (
            <>
              <Text style={[styles.reviewSection, { marginTop: 12 }]}>O que não está incluso</Text>
              {details.notIncluded.map((it, idx) => (
                <Text key={`no-${idx}`} style={styles.reviewItemMuted}>
                  • {it}
                </Text>
              ))}
            </>
          )}

          {!!details.note && <Text style={styles.reviewNote}>{details.note}</Text>}

          <TouchableOpacity style={styles.reviewBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.reviewBtnText}>Entendi</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function AppointmentScreen() {
  const auth = getAuth();
  const navigation = useNavigation<Nav>();
  const uid = auth.currentUser?.uid;

  const [vehicleType, setVehicleType] = useState<VehicleType>('Carro');
  const [carCategory, setCarCategory] = useState<CarCategory | null>('Hatch');
  const [serviceLabel, setServiceLabel] = useState<ServiceLabel | null>(null);

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

  // continua calculando preço pra persistir no agendamento
  const basePrice = useMemo(
    () => getBasePriceForAppointment(vehicleType, vehicleType === 'Carro' ? carCategory : null),
    [vehicleType, carCategory],
  );

  const finalPrice = basePrice;

  if (!uid) {
    setTimeout(() => {
      Alert.alert('Sessão expirada', 'Faça login novamente.');
      navigation.replace('Login' as any);
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
    } catch (e) {
      console.error(e);
      setSlots([]);
      setSelectedSlot(null);
      Alert.alert('Erro', 'Não foi possível carregar os horários disponíveis.');
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

  const handleSave = async () => {
    if (!selectedService) {
      Alert.alert('Atenção', 'Selecione um serviço.');
      return;
    }

    if (vehicleType === 'Carro' && !carCategory) {
      Alert.alert('Atenção', 'Selecione a categoria do carro.');
      return;
    }

    if (!selectedSlot) {
      Alert.alert('Atenção', 'Selecione um horário disponível.');
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

      Alert.alert('Sucesso', 'Agendamento confirmado!');
      navigation.replace('Dashboard' as any);
    } catch (e: any) {
      if (e?.code === 'SLOT_FULL') {
        Alert.alert('Ops', 'Esse horário acabou de ser ocupado. Vou atualizar a lista.');
        await refreshSlots(day, selectedService);
        return;
      }
      console.error(e);
      Alert.alert('Erro', 'Falha ao agendar o serviço.');
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = !!selectedService && !!selectedSlot && !submitting;

  return (
    <SafeAreaView style={styles.safe}>
      <ServiceReviewModal
        visible={serviceReviewOpen}
        serviceLabel={serviceLabel}
        onClose={() => setServiceReviewOpen(false)}
      />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backIcon}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.backIconText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Agendar Serviço</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Escolha um serviço</Text>

        <Text style={styles.label}>Dia</Text>
        <TouchableOpacity
          style={styles.select}
          onPress={() => setShowDayPicker(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.selectText}>{formatDayBR(day)}</Text>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>

        {showDayPicker && (
          <DateTimePicker
            value={day}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleDayChange}
          />
        )}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Tipo de veículo</Text>
        <View style={styles.row}>
          {(['Carro', 'Moto'] as VehicleType[]).map((opt) => {
            const selected = vehicleType === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => {
                  setVehicleType(opt);
                  if (opt === 'Moto') setCarCategory(null);
                  if (opt === 'Carro' && !carCategory) setCarCategory('Hatch');
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {vehicleType === 'Carro' && (
          <View style={{ marginTop: spacing.lg }}>
            <SelectField<CarCategory>
              label="Categoria"
              placeholder="Selecione"
              value={carCategory}
              options={CAR_CATEGORIES}
              onChange={(v) => setCarCategory(v)}
            />
          </View>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <SelectField<ServiceLabel>
            label="Serviço"
            placeholder="Selecione"
            value={serviceLabel}
            options={SERVICES.map((s) => s.label)}
            onChange={async (v) => {
              setServiceLabel(v);

              // abre o review automaticamente ao selecionar
              setServiceReviewOpen(true);

              const svc = SERVICES.find((s) => s.label === v)!;
              await refreshSlots(day, svc);
            }}
          />

          {!!serviceLabel && (
            <TouchableOpacity
              onPress={() => setServiceReviewOpen(true)}
              activeOpacity={0.85}
              style={{ alignSelf: 'flex-start', marginTop: 10 }}
            >
              <Text style={styles.detailsLink}>Ver detalhes do serviço</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Horários disponíveis</Text>

        {!selectedService ? (
          <Text style={styles.helperText}>Selecione um serviço para ver os horários.</Text>
        ) : loadingSlots ? (
          <Text style={styles.helperText}>Carregando horários...</Text>
        ) : slots.length === 0 ? (
          <Text style={styles.helperText}>Sem horários disponíveis nesse dia.</Text>
        ) : (
          <FlatList
            horizontal
            data={slots}
            keyExtractor={(it) => String(it.startAtMs)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
            renderItem={({ item }) => {
              const selected = selectedSlot?.startAtMs === item.startAtMs;
              return (
                <TouchableOpacity
                  style={[styles.timeChip, selected && styles.timeChipSelected]}
                  onPress={() => setSelectedSlot(item)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
                    {formatHour(item.startAtMs)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && { opacity: 0.45 }]}
          onPress={handleSave}
          disabled={!canConfirm}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmText}>
            {submitting ? 'Salvando...' : 'Confirmar Agendamento'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0B2A4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIconText: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: -2 },
  topTitle: { fontSize: 22, fontWeight: '900', color: colors.text },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  sectionTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  label: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 10 },
  helperText: { color: '#6B7280', fontWeight: '700', marginTop: 2 },

  select: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  selectText: { fontSize: 16, fontWeight: '700', color: colors.text },
  chev: { fontSize: 22, fontWeight: '900', color: '#94A3B8' },

  row: { flexDirection: 'row', gap: 12 },
  pill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  pillSelected: { backgroundColor: colors.primary },
  pillText: { fontWeight: '900', color: colors.text, fontSize: 16 },
  pillTextSelected: { color: colors.bg },

  detailsLink: { fontWeight: '900', color: colors.primary, textDecorationLine: 'underline' },

  timeChip: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  timeChipSelected: { backgroundColor: colors.primary },
  timeChipText: { fontWeight: '900', color: colors.text, fontSize: 15 },
  timeChipTextSelected: { color: colors.bg },

  confirmBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmText: { color: colors.bg, fontSize: 16, fontWeight: '900' },

  cancelBtn: { marginTop: spacing.md, alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: '#6B7280', fontWeight: '800', fontSize: 16 },

  // dropdown modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 10 },
  modalItem: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#F3F6FA',
  },
  modalItemSelected: { backgroundColor: colors.primary },
  modalItemText: { fontSize: 15, fontWeight: '800', color: colors.text },
  modalItemTextSelected: { color: colors.bg },
  modalClose: { marginTop: 6, alignItems: 'center', paddingVertical: 10 },
  modalCloseText: { fontWeight: '900', color: '#6B7280' },

  // review modal
  reviewCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
  },
  reviewTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 10 },
  reviewSection: { fontSize: 14, fontWeight: '900', color: colors.text, marginTop: 4, marginBottom: 8 },
  reviewItem: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
  reviewItemMuted: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  reviewNote: { marginTop: 12, fontSize: 13, fontWeight: '800', color: '#6B7280' },
  reviewBtn: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reviewBtnText: { color: colors.bg, fontSize: 15, fontWeight: '900' },
});

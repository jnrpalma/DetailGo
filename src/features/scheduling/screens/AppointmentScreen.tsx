// AppointmentScreen.tsx (o seu arquivo de agendamento - sem mudanças de regra, só mantive igual ao que você mandou)
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  FlatList,
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

type Nav = NativeStackNavigationProp<RootStackParamList>;
type VehicleType = 'Carro' | 'Moto';
type CarCategory = 'Hatch' | 'Sedan' | 'Caminhonete';

const SERVICES = [
  { label: 'Lavagem simples', durationMin: 30, price: 40 },
  { label: 'Lavagem completa', durationMin: 60, price: 80 },
  { label: 'Polimento', durationMin: 120, price: 150 },
  { label: 'Lavagem de motor', durationMin: 45, price: 60 },
] as const;

type ServiceLabel = (typeof SERVICES)[number]['label'];

function formatHour(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDay(d: Date) {
  return d.toLocaleDateString();
}

export default function AppointmentScreen() {
  const auth = getAuth();
  const navigation = useNavigation<Nav>();

  const uid = auth.currentUser?.uid;

  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [carCategory, setCarCategory] = useState<CarCategory | null>(null);
  const [serviceLabel, setServiceLabel] = useState<ServiceLabel | null>(null);

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
    [serviceLabel]
  );

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

  const handleSelectService = async (label: ServiceLabel) => {
    setServiceLabel(label);
    const svc = SERVICES.find((s) => s.label === label)!;
    await refreshSlots(day, svc);
  };

  const openDayPicker = () => setShowDayPicker(true);

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
    if (!vehicleType || !selectedService) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
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
        price: selectedService.price,
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Agendar Serviço</Text>

        <Text style={styles.label}>Tipo de veículo</Text>
        <View style={styles.row}>
          {(['Carro', 'Moto'] as VehicleType[]).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.option, vehicleType === opt && styles.optionSelected]}
              onPress={() => {
                setVehicleType(opt);
                if (opt === 'Moto') setCarCategory(null);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.optionText, vehicleType === opt && styles.optionTextSelected]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {vehicleType === 'Carro' && (
          <>
            <Text style={[styles.label, { marginTop: spacing.md }]}>Categoria</Text>
            <View style={styles.row}>
              {(['Hatch', 'Sedan', 'Caminhonete'] as CarCategory[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.option, carCategory === opt && styles.optionSelected]}
                  onPress={() => setCarCategory(opt)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.optionText, carCategory === opt && styles.optionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.label, { marginTop: spacing.md }]}>Serviço</Text>
        <View style={styles.rowWrap}>
          {SERVICES.map((s) => (
            <TouchableOpacity
              key={s.label}
              style={[styles.optionService, serviceLabel === s.label && styles.optionSelected]}
              onPress={() => handleSelectService(s.label)}
              activeOpacity={0.85}
            >
              <Text style={[styles.optionText, serviceLabel === s.label && styles.optionTextSelected]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedService && (
          <Text style={[styles.priceText, { marginTop: spacing.sm }]}>
            Valor: R$ {selectedService.price.toFixed(2).replace('.', ',')} • Duração: {selectedService.durationMin} min
          </Text>
        )}

        <Text style={[styles.label, { marginTop: spacing.md }]}>Dia</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={openDayPicker} activeOpacity={0.85}>
          <Text style={styles.dateText}>{formatDay(day)}</Text>
        </TouchableOpacity>

        {showDayPicker && (
          <DateTimePicker
            value={day}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleDayChange}
          />
        )}

        <Text style={[styles.label, { marginTop: spacing.md }]}>Horários disponíveis</Text>

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
            contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
            renderItem={({ item }) => {
              const selected = selectedSlot?.startAtMs === item.startAtMs;
              return (
                <TouchableOpacity
                  style={[styles.slot, selected && styles.slotSelected]}
                  onPress={() => setSelectedSlot(item)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.slotText, selected && styles.slotTextSelected]}>
                    {formatHour(item.startAtMs)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <TouchableOpacity
          style={[styles.saveBtn, (submitting || !selectedSlot) && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={submitting || !selectedSlot}
        >
          <Text style={styles.saveText}>{submitting ? 'Salvando...' : 'Confirmar Agendamento'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.backText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.lg },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  label: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  helperText: { color: '#6B7280', fontWeight: '600', marginTop: 4 },
  row: { flexDirection: 'row', gap: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  optionService: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.text, fontWeight: '600' },
  optionTextSelected: { color: colors.bg },
  priceText: { color: colors.text, fontWeight: '700' },
  dateBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  dateText: { fontSize: 16, fontWeight: '600', color: colors.text },

  slot: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  slotSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { color: colors.text, fontWeight: '800' },
  slotTextSelected: { color: colors.bg },

  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  saveText: { color: colors.bg, fontSize: 16, fontWeight: '800' },
  backBtn: { marginTop: spacing.md, alignItems: 'center' },
  backText: { color: '#6B7280', fontWeight: '600' },
});

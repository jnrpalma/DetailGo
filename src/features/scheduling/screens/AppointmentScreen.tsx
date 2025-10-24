import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing, typography } from '@shared/theme';
import type { RootStackParamList } from '@app/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AppointmentScreen() {
  const auth = getAuth();
  const uid = auth.currentUser?.uid!;
  const navigation = useNavigation<Nav>();

  const [vehicleType, setVehicleType] = useState<'Carro' | 'Moto' | null>(null);
  const [carCategory, setCarCategory] = useState<'Hatch' | 'Sedan' | 'Caminhonete' | null>(null);
  const [serviceLabel, setServiceLabel] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!vehicleType || !serviceLabel || !date) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSubmitting(true);
      const db = getFirestore();
      await addDoc(collection(db, 'users', uid, 'appointments'), {
        vehicleType,
        carCategory: vehicleType === 'Carro' ? carCategory : null,
        serviceLabel,
        price:
          serviceLabel === 'Lavagem simples' ? 40 :
          serviceLabel === 'Lavagem completa' ? 80 :
          serviceLabel === 'Polimento' ? 150 :
          serviceLabel === 'Lavagem de motor' ? 60 : null,
        whenMs: date.getTime(),
        createdAt: serverTimestamp(),
      });

      Alert.alert('Sucesso', 'Serviço agendado com sucesso!');
      navigation.replace('Dashboard');
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao agendar o serviço.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateChange = (_: any, selected?: Date) => {
    setShowPicker(false);
    if (selected) setDate(selected);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Agendar Serviço</Text>

        {/* VEÍCULO */}
        <Text style={styles.label}>Tipo de veículo</Text>
        <View style={styles.row}>
          {['Carro', 'Moto'].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.option, vehicleType === opt && styles.optionSelected]}
              onPress={() => setVehicleType(opt as any)}
              activeOpacity={0.85}
            >
              <Text style={[styles.optionText, vehicleType === opt && styles.optionTextSelected]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CATEGORIA DO CARRO */}
        {vehicleType === 'Carro' && (
          <>
            <Text style={[styles.label, { marginTop: spacing.md }]}>Categoria</Text>
            <View style={styles.row}>
              {['Hatch', 'Sedan', 'Caminhonete'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.option, carCategory === opt && styles.optionSelected]}
                  onPress={() => setCarCategory(opt as any)}
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

        {/* SERVIÇO */}
        <Text style={[styles.label, { marginTop: spacing.md }]}>Serviço</Text>
        <View style={styles.rowWrap}>
          {['Lavagem simples', 'Lavagem completa', 'Polimento', 'Lavagem de motor'].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.optionService, serviceLabel === opt && styles.optionSelected]}
              onPress={() => setServiceLabel(opt)}
              activeOpacity={0.85}
            >
              <Text style={[styles.optionText, serviceLabel === opt && styles.optionTextSelected]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* DATA */}
        <Text style={[styles.label, { marginTop: spacing.md }]}>Data e Hora</Text>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.dateText}>
            {date.toLocaleDateString()} - {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            mode="datetime"
            value={date}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleDateChange}
          />
        )}

        {/* BOTÃO SALVAR */}
        <TouchableOpacity
          style={[styles.saveBtn, submitting && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={submitting}
        >
          <Text style={styles.saveText}>{submitting ? 'Salvando...' : 'Confirmar Agendamento'}</Text>
        </TouchableOpacity>

        {/* VOLTAR */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.backText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
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
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: colors.bg,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  saveText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '800',
  },
  backBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  backText: {
    color: '#6B7280',
    fontWeight: '600',
  },
});

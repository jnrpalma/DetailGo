import React from 'react';
import { 
  ActivityIndicator, 
  FlatList, 
  StyleSheet, 
  Text, 
  View,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth';
import { ArrowLeft } from 'lucide-react-native';

import { colors, spacing, surfaces } from '@shared/theme';

import { useUserAppointments } from '../hooks/useUserAppointments';
import type { UserAppointment } from '../domain/appointment.types';
import { HISTORY_APPOINTMENT_SET } from '../domain/appointment.constants';

import { formatDatePtBR, formatHour } from '@shared/utils/date';
import { formatCurrencyBRL } from '@shared/utils/money';

export default function HistoryScreen() {
  const navigation = useNavigation();
  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  const { loading, items } = useUserAppointments({
    uid,
    statusIn: HISTORY_APPOINTMENT_SET,
    limitN: 50,
  });

  const renderItem = ({ item }: { item: UserAppointment }) => {
    const subtitle =
      item.vehicleType === 'Carro' && item.carCategory
        ? `Carro • ${item.carCategory}`
        : item.vehicleType;

    const statusLabel = item.status === 'done' ? 'Concluído' : 'Não realizado';
    const statusColor = item.status === 'done' ? '#16A34A' : '#DC2626';

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.serviceLabel ?? 'Serviço'}</Text>

          <Text style={styles.sub}>
            {subtitle} • {formatDatePtBR(item.startAtMs)} • {formatHour(item.startAtMs)}
          </Text>

          <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.price}>+{formatCurrencyBRL(item.price)}</Text>
        </View>
      </View>
    );
  };

  if (!uid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      {/* Header com botão voltar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Histórico</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={{ flex: 1, padding: spacing.lg }}>
        {loading ? (
          <View style={{ paddingTop: 30 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: '#6B7280' }}>Sem registros.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: spacing.xs,
    borderRadius: 8,
    backgroundColor: surfaces.card,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 6 },
  sub: { color: '#616E7C', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  status: { fontWeight: '900' },
  price: { color: colors.primary, fontWeight: '900' },
});
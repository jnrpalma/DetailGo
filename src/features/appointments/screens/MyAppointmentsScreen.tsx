import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth';

import { colors, spacing, surfaces } from '@shared/theme';

import { useUserAppointments } from '../hooks/useUserAppointments';
import type { UserAppointment } from '../domain/appointment.types';
import { ACTIVE_APPOINTMENT_SET } from '../domain/appointment.constants';

import { formatDatePtBR, formatHour } from '@shared/utils/date';
import { formatCurrencyBRL } from '@shared/utils/money';

export default function MyAppointmentsScreen() {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  const { loading, items } = useUserAppointments({
    uid,
    statusIn: ACTIVE_APPOINTMENT_SET,
    limitN: 50,
  });

  const renderItem = ({ item }: { item: UserAppointment }) => {
    const subtitle =
      item.vehicleType === 'Carro' && item.carCategory
        ? `Carro • ${item.carCategory}`
        : item.vehicleType;

    const statusLabel = item.status === 'in_progress' ? 'Em andamento' : 'Agendado';
    const statusColor = item.status === 'in_progress' ? '#2563EB' : '#6B7280';

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
      <View style={{ flex: 1, padding: spacing.lg }}>
        <Text style={styles.screenTitle}>Meus agendamentos</Text>

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
              <Text style={{ textAlign: 'center', color: '#6B7280' }}>
                Você não tem agendamentos ativos.
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
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

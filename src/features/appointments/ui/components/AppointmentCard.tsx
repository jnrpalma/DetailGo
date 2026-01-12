import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, surfaces } from '@shared/theme';
import type { DashboardAppointment } from '@features/appointments/hooks/useDashboardAppointments';

type Props = {
  item: DashboardAppointment;
};

function formatCurrency(v: number | null) {
  return typeof v === 'number' ? `R$ ${v.toFixed(2).replace('.', ',')}` : '--';
}
function formatDate(ms: number) {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function formatHour(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AppointmentCard({ item }: Props) {
  const subtitle =
    item.vehicleType === 'Carro' && item.carCategory
      ? `Carro • ${item.carCategory}`
      : item.vehicleType;

  const statusLabel =
    item.status === 'scheduled'
      ? 'Agendado'
      : item.status === 'in_progress'
      ? 'Em andamento'
      : item.status === 'done'
      ? 'Concluído'
      : 'Não realizado';

  const statusColor =
    item.status === 'done'
      ? '#16A34A'
      : item.status === 'in_progress'
      ? '#2563EB'
      : item.status === 'no_show'
      ? '#DC2626'
      : '#6B7280';

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle}>{item.serviceLabel ?? 'Serviço'}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      <View style={styles.cardRight}>
        <Text style={styles.cardPrice}>+{formatCurrency(item.price)}</Text>
        <Text style={styles.cardDate}>
          {formatDate(item.whenMs)} • {formatHour(item.whenMs)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },

  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: { color: '#616E7C', fontSize: 15 },
  status: { fontWeight: '900', marginTop: 6 },

  cardPrice: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardDate: { color: '#616E7C', fontSize: 15 },
});

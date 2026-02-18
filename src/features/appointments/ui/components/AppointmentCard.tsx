import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@shared/theme/colors';
import { dateUtils } from '@shared/utils/date.utils';
import { formatUtils } from '@shared/utils/format.utils';
import type { UserAppointment } from '../../domain/appointment.types';

type Props = {
  item: UserAppointment;
};

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
      ? colors.status.success
      : item.status === 'in_progress'
      ? colors.status.warning
      : item.status === 'no_show'
      ? colors.status.error
      : colors.text.disabled;

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle}>{item.serviceLabel ?? 'Serviço'}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
        <Text style={[styles.status, { color: statusColor }]}>
          {statusLabel}
        </Text>
      </View>

      <View style={styles.cardRight}>
        <Text style={styles.cardPrice}>
          +{formatUtils.currencyCompact(item.price)}
        </Text>
        <Text style={styles.cardDate}>
          {dateUtils.formatDate(item.startAtMs)} •{' '}
          {dateUtils.formatHour(item.startAtMs)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },

  cardTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: colors.text.tertiary,
    fontSize: 15,
  },
  status: {
    fontWeight: '900',
    marginTop: 6,
  },

  cardPrice: {
    color: colors.primary.main,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardDate: {
    color: colors.text.tertiary,
    fontSize: 15,
  },
});

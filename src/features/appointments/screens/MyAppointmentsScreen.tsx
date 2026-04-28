import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CalendarCheck,
  Car,
  XCircle,
  CalendarRange,
} from 'lucide-react-native';

import type { RootStackParamList } from '@app/types';
import { useShop } from '@features/shops/context/ShopContext';
import { useUserAppointments } from '../hooks/useUserAppointments';
import type { UserAppointment } from '../domain/appointment.types';
import { ACTIVE_APPOINTMENT_SET } from '../domain/appointment.constants';
import {
  cancelAppointment,
  getAppointmentRules,
} from '../services/appointment.service';

import { dateUtils } from '@shared/utils/date.utils';
import { formatUtils } from '@shared/utils/format.utils';
import { colors } from '@shared/theme/colors';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function MyAppointmentsScreen() {
  const navigation = useNavigation<NavProp>();
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  const { shopId } = useShop();

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  const { loading, items, mutate } = useUserAppointments({
    uid,
    shopId,
    statusIn: ACTIVE_APPOINTMENT_SET,
    limitN: 50,
  });

  const handleCancel = (item: UserAppointment) => {
    const rules = getAppointmentRules(item);

    if (!rules.canCancel) {
      Alert.alert(
        'Não é possível cancelar',
        rules.message || 'Cancelamento não permitido.',
      );
      return;
    }

    Alert.alert(
      'Cancelar agendamento',
      'Tem certeza que deseja cancelar este agendamento?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: () => executeCancel(item),
        },
      ],
    );
  };

  const handleReschedule = (item: UserAppointment) => {
    const rules = getAppointmentRules(item);

    if (!rules.canReschedule) {
      Alert.alert(
        'Não é possível reagendar',
        rules.message || 'Reagendamento não permitido.',
      );
      return;
    }

    let message = '';
    if (item.status === 'no_show') {
      message =
        'Você não compareceu a este agendamento. Deseja criar um novo agendamento?';
    } else if (rules.isExpired) {
      message =
        'Este agendamento já passou do horário. Deseja criar um novo agendamento baseado neste?';
    } else {
      message =
        'Ao reagendar, o agendamento atual será cancelado e você poderá escolher um novo horário. Deseja continuar?';
    }

    Alert.alert('Reagendar', message, [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, continuar',
        onPress: () => executeReschedule(item, rules.isExpired),
      },
    ]);
  };

  const executeReschedule = async (
    item: UserAppointment,
    isExpired: boolean,
  ) => {
    setReschedulingId(item.id);

    if (!isExpired) {
      const cancelResult = await cancelAppointment(item.id, uid!, shopId ?? '');

      if (!cancelResult.ok) {
        Alert.alert(
          'Erro',
          cancelResult.message ||
            'Não foi possível cancelar o agendamento atual.',
        );
        setReschedulingId(null);
        return;
      }
    }

    navigation.navigate('Appointment', {
      mode: 'reschedule',
      originalAppointmentId: item.id,
      vehicleType: item.vehicleType,
      carCategory: item.carCategory,
      serviceLabel: item.serviceLabel,
      isExpired,
    });

    setReschedulingId(null);
  };

  const executeCancel = async (item: UserAppointment) => {
    setCancellingId(item.id);

    const result = await cancelAppointment(item.id, uid!, shopId ?? '');

    if (result.ok) {
      Alert.alert('Sucesso', result.message);
      mutate();
    } else {
      Alert.alert('Erro', result.message);
    }

    setCancellingId(null);
  };

  const renderItem = ({ item }: { item: UserAppointment }) => {
    const subtitle =
      item.vehicleType === 'Carro' && item.carCategory
        ? `${item.vehicleType} • ${item.carCategory}`
        : item.vehicleType;

    const isInProgress = item.status === 'in_progress';
    const statusLabel = isInProgress
      ? 'Em andamento'
      : item.status === 'cancelled'
      ? 'Cancelado'
      : 'Agendado';
    const statusColor = isInProgress
      ? colors.status.warning
      : item.status === 'cancelled'
      ? colors.text.disabled
      : colors.text.tertiary;
    const StatusIcon = isInProgress ? CalendarCheck : Calendar;

    const isCancelling = cancellingId === item.id;
    const isRescheduling = reschedulingId === item.id;
    const isLoading = isCancelling || isRescheduling;

    const rules = getAppointmentRules(item);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>
              {item.serviceLabel ?? 'Serviço'}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColor}10` },
              ]}
            >
              <StatusIcon size={14} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.price}>{formatUtils.currency(item.price)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Calendar size={16} color={colors.text.tertiary} />
            <Text style={styles.infoText}>
              {dateUtils.formatDate(item.startAtMs)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={16} color={colors.text.tertiary} />
            <Text style={styles.infoText}>
              {dateUtils.formatHour(item.startAtMs)}
            </Text>
          </View>
          <View style={styles.vehicleBadge}>
            <Car size={14} color={colors.text.tertiary} />
            <Text style={styles.vehicleText}>{subtitle}</Text>
          </View>
        </View>

        {/* Ações do agendamento */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              (!rules.canReschedule || isLoading) &&
                styles.actionButtonDisabled,
            ]}
            onPress={() => handleReschedule(item)}
            disabled={!rules.canReschedule || isLoading}
            activeOpacity={0.7}
          >
            {isRescheduling ? (
              <ActivityIndicator size="small" color={colors.text.secondary} />
            ) : (
              <>
                <CalendarRange size={16} color={colors.text.secondary} />
                <Text style={styles.actionButtonText}>Reagendar</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.actionButtonCancel,
              (!rules.canCancel || isLoading) && styles.actionButtonDisabled,
            ]}
            onPress={() => handleCancel(item)}
            disabled={!rules.canCancel || isLoading}
            activeOpacity={0.7}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={colors.status.error} />
            ) : (
              <>
                <XCircle size={16} color={colors.status.error} />
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.actionButtonTextCancel,
                  ]}
                >
                  Cancelar
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Mensagens de status */}
        {rules.isExpired && item.status === 'scheduled' && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⏰ Horário já passou. Você pode reagendar, mas não cancelar.
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!uid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.main}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meus agendamentos</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIcon}>
                    <Calendar size={48} color={colors.text.disabled} />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    Nenhum agendamento ativo
                  </Text>
                  <Text style={styles.emptyStateText}>
                    Você não tem serviços agendados no momento.{'\n'}
                    Que tal agendar agora mesmo?
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => navigation.navigate('Appointment', {})}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyStateButtonText}>
                      Agendar serviço
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.main,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.main,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.main,
    shadowColor: colors.text.primary,
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
    gap: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.main,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.main,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.main,
    gap: 6,
  },
  vehicleText: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.main,
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  actionButtonCancel: {
    backgroundColor: colors.background.main,
    borderColor: colors.status.error,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  actionButtonTextCancel: {
    color: colors.status.error,
  },
  warningBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.status.warning + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.status.warning,
  },
  warningText: {
    fontSize: 12,
    color: colors.status.warning,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: colors.primary.main,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  emptyStateButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

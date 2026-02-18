import React from 'react';
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
} from 'lucide-react-native';

import type { RootStackParamList } from '@app/types';
import { useUserAppointments } from '../hooks/useUserAppointments';
import type { UserAppointment } from '../domain/appointment.types';
import { ACTIVE_APPOINTMENT_SET } from '../domain/appointment.constants';

import { dateUtils } from '@shared/utils/date.utils';
import { formatUtils } from '@shared/utils/format.utils';
import { colors } from '@shared/theme/colors';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function MyAppointmentsScreen() {
  const navigation = useNavigation<NavProp>();
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
        ? `${item.vehicleType} • ${item.carCategory}`
        : item.vehicleType;

    const isInProgress = item.status === 'in_progress';
    const statusLabel = isInProgress ? 'Em andamento' : 'Agendado';

    const statusColor = isInProgress
      ? colors.status.warning
      : colors.text.tertiary;
    const StatusIcon = isInProgress ? CalendarCheck : Calendar;

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
            style={styles.actionButton}
            onPress={() => Alert.alert('Reagendar', 'Em breve')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>Reagendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonCancel]}
            onPress={() =>
              Alert.alert('Cancelar', 'Deseja cancelar este agendamento?')
            }
            activeOpacity={0.7}
          >
            <Text
              style={[styles.actionButtonText, styles.actionButtonTextCancel]}
            >
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
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
          <View style={styles.headerTitleContainer}>
            <Calendar size={22} color={colors.primary.main} />
            <Text style={styles.headerTitle}>Meus agendamentos</Text>
          </View>
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
                    onPress={() => navigation.navigate('Appointment')}
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
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  actionButtonCancel: {
    backgroundColor: colors.background.main,
    borderColor: colors.status.error,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  actionButtonTextCancel: {
    color: colors.status.error,
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
// src/features/history/screens/HistoryScreen.tsx
import React from 'react';
import {
  ActivityIndicator,
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
import { ArrowLeft, History, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react-native';

import type { RootStackParamList } from '@app/types';
import { useUserAppointments } from '../hooks/useUserAppointments';
import type { UserAppointment } from '../domain/appointment.types';
import { HISTORY_APPOINTMENT_SET } from '../domain/appointment.constants';

import { formatDatePtBR, formatHour } from '@shared/utils/date';
import { formatCurrencyBRL } from '@shared/utils/money';

// Paleta DetailGo
const colors = {
  primary: '#175676', // Baltic Blue
  secondary: '#4BA3C3', // Turquoise Surf
  error: '#D62839', // Classic Crimson
  errorLight: '#BA324F', // Rosewood
  success: '#16A34A',
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

export default function HistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  const { loading, items } = useUserAppointments({
    uid,
    statusIn: HISTORY_APPOINTMENT_SET,
    limitN: 50,
  });

  const renderItem = ({ item }: { item: UserAppointment }) => {
    const subtitle = item.vehicleType === 'Carro' && item.carCategory
      ? `${item.vehicleType} • ${item.carCategory}`
      : item.vehicleType;

    const isDone = item.status === 'done';
    const statusLabel = isDone ? 'Concluído' : 'Não realizado';
    const statusColor = isDone ? colors.success : colors.error;
    const StatusIcon = isDone ? CheckCircle : XCircle;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{item.serviceLabel ?? 'Serviço'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}10` }]}>
              <StatusIcon size={14} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.price}>{formatCurrencyBRL(item.price)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Calendar size={16} color={colors.text.tertiary} />
            <Text style={styles.infoText}>{formatDatePtBR(item.startAtMs)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={16} color={colors.text.tertiary} />
            <Text style={styles.infoText}>{formatHour(item.startAtMs)}</Text>
          </View>
          <View style={styles.vehicleBadge}>
            <Text style={styles.vehicleText}>{subtitle}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!uid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
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
            <History size={22} color={colors.primary} />
            <Text style={styles.headerTitle}>Histórico</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIcon}>
                    <History size={48} color={colors.text.disabled} />
                  </View>
                  <Text style={styles.emptyStateTitle}>Nenhum histórico</Text>
                  <Text style={styles.emptyStateText}>
                    Seus serviços concluídos e não realizados{'\n'}
                    aparecerão aqui
                  </Text>
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
    backgroundColor: colors.background,
  },
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
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
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
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleText: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: '500',
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
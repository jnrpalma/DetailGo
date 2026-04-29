// src/features/appointments/screens/HistoryScreen.tsx
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
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
  CheckCircle2,
  XCircle,
  Ban,
  History,
  TrendingUp,
} from 'lucide-react-native';

import type { RootStackParamList } from '@app/types';
import { useShop } from '@features/shops/context/ShopContext';
import { useUserAppointments } from '../hooks/useUserAppointments';
import { dateUtils } from '@shared/utils/date.utils';
import { formatUtils } from '@shared/utils/format.utils';
import { HISTORY_APPOINTMENT_SET } from '../domain/appointment.constants';
import type { AppointmentStatus, UserAppointment } from '../domain/appointment.types';
import { colors, spacing, radii } from '@shared/theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type FilterId = 'all' | 'done' | 'no_show' | 'cancelled';

const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'done', label: 'Concluídos' },
  { id: 'no_show', label: 'Não realizados' },
  { id: 'cancelled', label: 'Cancelados' },
];

const STATUS_CONFIG: Partial<
  Record<
    AppointmentStatus,
    {
      label: string;
      color: string;
      icon: any;
    }
  >
> = {
  done: { label: 'Concluído', color: colors.status.success, icon: CheckCircle2 },
  no_show: { label: 'Não realizado', color: colors.status.error, icon: XCircle },
  cancelled: { label: 'Cancelado', color: colors.text.disabled, icon: Ban },
};

export default function HistoryScreen() {
  const navigation = useNavigation<NavProp>();
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  const { shopId } = useShop();
  const [filter, setFilter] = useState<FilterId>('all');

  const { loading, items } = useUserAppointments({
    uid,
    shopId,
    statusIn: HISTORY_APPOINTMENT_SET,
    limitN: 50,
  });

  const filteredItems = filter === 'all' ? items : items.filter(it => it.status === filter);

  const totalDone = items.filter(i => i.status === 'done').length;
  const totalSpent = items
    .filter(i => i.status === 'done')
    .reduce((acc, i) => acc + (i.price ?? 0), 0);

  const renderItem = ({ item }: { item: UserAppointment }) => {
    const subtitle =
      item.vehicleType === 'Carro' && item.carCategory
        ? `Carro • ${item.carCategory}`
        : item.vehicleType;

    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.cancelled!;
    const StatusIcon = cfg.icon;

    return (
      <View style={[styles.card, { borderLeftColor: cfg.color }]}>
        <View style={styles.cardTop}>
          <Text style={styles.cardService} numberOfLines={1}>
            {item.serviceLabel ?? 'Serviço'}
          </Text>
          <Text style={[styles.cardPrice, item.status !== 'done' && styles.cardPriceMuted]}>
            {formatUtils.currencyCompact(item.price)}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}15` }]}>
          <StatusIcon size={12} color={cfg.color} />
          <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Calendar size={13} color={colors.text.tertiary} />
            <Text style={styles.metaText}>{dateUtils.formatDate(item.startAtMs)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={13} color={colors.text.tertiary} />
            <Text style={styles.metaText}>{dateUtils.formatHour(item.startAtMs)}</Text>
          </View>
          <View style={styles.vehicleChip}>
            <Text style={styles.vehicleChipText}>{subtitle}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!uid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.main} />
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
          <Text style={styles.headerTitle}>Histórico</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Resumo */}
        {!loading && totalDone > 0 && (
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <TrendingUp size={15} color={colors.primary.main} />
              <Text style={styles.summaryValue}>{totalDone}</Text>
              <Text style={styles.summaryLabel}>serviços concluídos</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatUtils.currency(totalSpent)}</Text>
              <Text style={styles.summaryLabel}>investidos</Text>
            </View>
          </View>
        )}

        {/* Filtros em ScrollView horizontal */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {FILTER_OPTIONS.map(opt => {
              const active = filter === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setFilter(opt.id)}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Lista */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary.main} />
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <History size={36} color={colors.text.disabled} />
                  </View>
                  <Text style={styles.emptyTitle}>Nenhum registro</Text>
                  <Text style={styles.emptyText}>
                    {filter === 'all'
                      ? 'Seus serviços finalizados aparecerão aqui.'
                      : 'Nenhum registro para este filtro.'}
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
  safe: { flex: 1, backgroundColor: colors.background.main },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ─── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.main,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.main,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
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
  headerRight: { width: 40 },

  // ─── Resumo ──────────────────────────────────────────────────────────────
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.primary.light,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.primary.main}20`,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: `${colors.primary.main}30`,
    marginHorizontal: spacing.md,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary.main,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.primary.main,
    fontWeight: '500',
    opacity: 0.7,
  },

  // ─── Filtros ─────────────────────────────────────────────────────────────
  filtersWrapper: {
    marginTop: spacing.lg,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border.main,
    backgroundColor: colors.background.surface,
  },
  filterPillActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterPillTextActive: {
    color: colors.text.white,
    fontWeight: '700',
  },

  // ─── Content / Lista ─────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  listContent: { paddingBottom: spacing.xl },

  // ─── Card ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderLeftWidth: 4,
    shadowColor: colors.text.primary,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardService: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.xs,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary.main,
  },
  cardPriceMuted: { color: colors.text.tertiary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: spacing.md,
  },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border.main,
    marginBottom: spacing.md,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  vehicleChip: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  vehicleChipText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: '500',
  },

  // ─── Empty ───────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

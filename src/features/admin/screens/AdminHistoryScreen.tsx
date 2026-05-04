// src/features/admin/screens/AdminHistoryScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  History,
  TrendingUp,
  User,
} from 'lucide-react-native';

import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import { dateUtils } from '@shared/utils/date.utils';
import { formatUtils } from '@shared/utils/format.utils';
import { colors, spacing, radii } from '@shared/theme';
import { useCustomerName } from '@shared/hooks/useFirestoreCache';
import { useShop } from '@features/shops';

import type { AppointmentStatus } from '@features/appointments';
import type { AdminAppointment } from '../domain/adminAppointment.types';
import { normalizeAdminAppointmentFromGlobal } from '../data/adminAppointment.normalizers';

type QDoc = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

interface FirebaseError extends Error {
  code?: string;
}

const ALL_HISTORY_STATUSES: AppointmentStatus[] = ['done', 'no_show', 'cancelled'];

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

const PAGE_SIZE = 30;

export default function AdminHistoryScreen() {
  const navigation = useNavigation();
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();
  const { shopId } = useShop();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminAppointment[]>([]);
  const [filter, setFilter] = useState<FilterId>('all');
  const [loadingMore, setLoadingMore] = useState(false);

  // 👈 ARMAZENA OS TOTAIS DO ÚLTIMO CARREGAMENTO COMPLETO
  const [totals, setTotals] = useState({ done: 0, revenue: 0 });

  const lastDocRef = useRef<QDoc | null>(null);
  const canLoadMoreRef = useRef(true);

  const { fetchCustomerName } = useCustomerName();

  const statusSet = useMemo((): AppointmentStatus[] => {
    if (filter === 'done') return ['done'];
    if (filter === 'no_show') return ['no_show'];
    if (filter === 'cancelled') return ['cancelled'];
    return ALL_HISTORY_STATUSES;
  }, [filter]);

  // 👈 ATUALIZA OS TOTAIS SEMPRE QUE ITEMS MUDAR
  useEffect(() => {
    const doneCount = items.filter(i => i.status === 'done').length;
    const revenue = items
      .filter(i => i.status === 'done')
      .reduce((acc, i) => acc + (i.price ?? 0), 0);

    setTotals({ done: doneCount, revenue });
  }, [items]);

  const enrichWithNames = async (list: AdminAppointment[]): Promise<AdminAppointment[]> =>
    Promise.all(
      list.map(async it => {
        if (it.customerName && it.customerName !== 'Cliente') return it;
        const name = await fetchCustomerName(it.customerUid);
        return { ...it, customerName: name };
      }),
    );

  useEffect(() => {
    if (!user?.uid || !shopId) return;

    setLoading(true);
    setItems([]);
    lastDocRef.current = null;
    canLoadMoreRef.current = true;

    const qy = query(
      collection(db, 'shops', shopId, 'appointments'),
      where('status', 'in', statusSet),
      orderBy('startAtMs', 'desc'),
      limit(PAGE_SIZE),
    );

    const unsub = onSnapshot(
      qy,
      async snap => {
        const base = snap.docs
          .map((d: QDoc) => normalizeAdminAppointmentFromGlobal(d))
          .filter(Boolean) as AdminAppointment[];

        lastDocRef.current = (snap.docs[snap.docs.length - 1] as QDoc | undefined) ?? null;
        canLoadMoreRef.current = snap.docs.length >= PAGE_SIZE;

        const withNames = await enrichWithNames(base);
        setItems(withNames);
        setLoading(false);
      },
      (error: FirebaseError) => {
        console.error('AdminHistory snapshot error:', error);

        if (error.code === 'failed-precondition') {
          Alert.alert(
            '⚠️ Índice necessário',
            'O Firestore precisa de um índice para esta consulta. Acesse o console do Firebase e crie um índice composto com status (ascendente) e startAtMs (descendente).',
          );
        } else {
          Alert.alert('Erro', 'Falha ao carregar histórico.');
        }
        setLoading(false);
      },
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, shopId, statusSet]);

  const loadMore = async () => {
    if (loadingMore || !canLoadMoreRef.current || !lastDocRef.current || !shopId) return;
    try {
      setLoadingMore(true);
      const qy = query(
        collection(db, 'shops', shopId, 'appointments'),
        where('status', 'in', statusSet),
        orderBy('startAtMs', 'desc'),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE),
      );
      const snap = await getDocs(qy);
      const base = snap.docs
        .map((d: QDoc) => normalizeAdminAppointmentFromGlobal(d))
        .filter(Boolean) as AdminAppointment[];

      lastDocRef.current =
        (snap.docs[snap.docs.length - 1] as QDoc | undefined) ?? lastDocRef.current;
      canLoadMoreRef.current = snap.docs.length >= PAGE_SIZE;

      const withNames = await enrichWithNames(base);
      setItems(prev => [...prev, ...withNames]);
    } catch {
      Alert.alert('Erro', 'Falha ao carregar mais itens.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFilterChange = (newFilter: FilterId) => {
    if (newFilter === filter) return;
    setFilter(newFilter);
  };

  const renderItem = ({ item }: { item: AdminAppointment }) => {
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

        <View style={styles.clientRow}>
          <User size={13} color={colors.text.tertiary} />
          <Text style={styles.clientName} numberOfLines={1}>
            {item.customerName}
          </Text>
        </View>

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

  if (!user?.uid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  // 👈 FILTRA OS ITENS PARA EXIBIÇÃO NA LISTA
  const displayItems = filter === 'all' ? items : items.filter(item => item.status === filter);

  // 👈 RESUMO SEMPRE VISÍVEL, usando totals (que são persistentes)
  const showSummary = totals.done > 0;

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
          <Text style={styles.headerTitle}>Histórico Admin</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Resumo - SEMPRE VISÍVEL, nunca some */}
        {showSummary && (
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <TrendingUp size={15} color={colors.primary.main} />
              <Text style={styles.summaryValue}>{totals.done}</Text>
              <Text style={styles.summaryLabel}>concluídos</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatUtils.currency(totals.revenue)}</Text>
              <Text style={styles.summaryLabel}>faturados</Text>
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
                  onPress={() => handleFilterChange(opt.id)}
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
          {loading && displayItems.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary.main} />
            </View>
          ) : (
            <FlatList
              data={displayItems}
              keyExtractor={it => it.id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onEndReachedThreshold={0.4}
              onEndReached={loadMore}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator size="small" color={colors.primary.main} />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <History size={36} color={colors.text.disabled} />
                  </View>
                  <Text style={styles.emptyTitle}>Nenhum registro</Text>
                  <Text style={styles.emptyText}>
                    {filter === 'all'
                      ? 'Nenhum serviço finalizado ainda.'
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
    fontWeight: '800',
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
  footerLoading: { paddingVertical: spacing.lg, alignItems: 'center' },

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
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    flex: 1,
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

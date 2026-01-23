import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  StyleSheet, 
  Text, 
  View,
  TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';

import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDoc,
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

import { colors, spacing, surfaces } from '@shared/theme';

import type { AppointmentStatus } from '@features/appointments/domain/appointment.types';
import type { AdminAppointment } from '../domain/adminAppointment.types';
import { normalizeAdminAppointmentFromGlobal } from '../data/adminAppointment.normalizers';

import { formatDatePtBR, formatHour } from '@shared/utils/date';
import { formatCurrencyBRL } from '@shared/utils/money';

type QDoc = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

export default function AdminHistoryScreen() {
  const navigation = useNavigation();
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminAppointment[]>([]);
  const [filter, setFilter] = useState<'all' | 'done' | 'no_show'>('all');

  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef<QDoc | null>(null);
  const canLoadMoreRef = useRef(true);

  const nameCacheRef = useRef<Map<string, string>>(new Map());

  const statusSet = useMemo(() => {
    if (filter === 'done') return ['done'] as AppointmentStatus[];
    if (filter === 'no_show') return ['no_show'] as AppointmentStatus[];
    return ['done', 'no_show'] as AppointmentStatus[];
  }, [filter]);

  const resolveCustomerNameSafe = async (customerUid: string): Promise<string> => {
    const cached = nameCacheRef.current.get(customerUid);
    if (cached) return cached;

    try {
      const snap = await getDoc(doc(db, 'users', customerUid));
      const data = (snap.data() ?? {}) as { firstName?: string; lastName?: string };
      const name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || 'Cliente';
      nameCacheRef.current.set(customerUid, name);
      return name;
    } catch {
      return 'Cliente';
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    lastDocRef.current = null;
    canLoadMoreRef.current = true;

    const qy = query(
      collection(db, 'appointments'),
      where('status', 'in', statusSet),
      orderBy('startAtMs', 'desc'),
      limit(30),
    );

    const unsub = onSnapshot(
      qy,
      async (snap) => {
        const base = snap.docs
          .map((d: QDoc) => normalizeAdminAppointmentFromGlobal(d))
          .filter(Boolean) as AdminAppointment[];

        lastDocRef.current = (snap.docs?.[snap.docs.length - 1] as QDoc | undefined) ?? null;
        canLoadMoreRef.current = snap.docs.length >= 30;

        const withNames = await Promise.all(
          base.map(async (it) => {
            if (it.customerName && it.customerName !== 'Cliente') return it;
            const name = await resolveCustomerNameSafe(it.customerUid);
            return { ...it, customerName: name };
          }),
        );

        setItems(withNames);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsub();
  }, [user?.uid, statusSet, db]);

  const loadMore = async () => {
    if (loadingMore) return;
    if (!canLoadMoreRef.current) return;
    if (!lastDocRef.current) return;

    try {
      setLoadingMore(true);

      const qy = query(
        collection(db, 'appointments'),
        where('status', 'in', statusSet),
        orderBy('startAtMs', 'desc'),
        startAfter(lastDocRef.current),
        limit(30),
      );

      const snap = await getDocs(qy);

      const base = snap.docs
        .map((d: QDoc) => normalizeAdminAppointmentFromGlobal(d))
        .filter(Boolean) as AdminAppointment[];

      lastDocRef.current =
        (snap.docs?.[snap.docs.length - 1] as QDoc | undefined) ?? lastDocRef.current;
      canLoadMoreRef.current = snap.docs.length >= 30;

      const withNames = await Promise.all(
        base.map(async (it) => {
          if (it.customerName && it.customerName !== 'Cliente') return it;
          const name = await resolveCustomerNameSafe(it.customerUid);
          return { ...it, customerName: name };
        }),
      );

      setItems((prev) => [...prev, ...withNames]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao carregar mais itens.');
    } finally {
      setLoadingMore(false);
    }
  };

  const renderItem = ({ item }: { item: AdminAppointment }) => {
    const subtitle =
      item.vehicleType === 'Carro' && item.carCategory ? `Carro • ${item.carCategory}` : item.vehicleType;

    const statusLabel = item.status === 'done' ? 'Concluído' : 'Não realizado';
    const statusColor = item.status === 'done' ? '#16A34A' : '#DC2626';

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.serviceLabel ?? 'Serviço'}</Text>
          <Text style={styles.client}>👤 {item.customerName}</Text>

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

  const FilterBtn = ({ id, label }: { id: 'all' | 'done' | 'no_show'; label: string }) => {
    const active = filter === id;
    return (
      <TouchableOpacity 
        onPress={() => setFilter(id)} 
        style={[styles.filterBtn, active && styles.filterBtnActive]}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  if (!user?.uid) {
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
        <Text style={styles.screenTitle}>Histórico Admin</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={{ flex: 1, padding: spacing.lg }}>
        {/* Filtros */}
        <View style={styles.filtersRow}>
          <FilterBtn id="all" label="Todos" />
          <FilterBtn id="done" label="Concluídos" />
          <FilterBtn id="no_show" label="Não realizados" />
        </View>

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
            onEndReachedThreshold={0.4}
            onEndReached={loadMore}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 20 }}>
                Sem registros para o filtro selecionado.
              </Text>
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
  filtersRow: { 
    flexDirection: 'row', 
    gap: 10, 
    justifyContent: 'center', 
    marginBottom: spacing.lg 
  },
  filterBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: surfaces.card,
  },
  filterBtnActive: { 
    backgroundColor: colors.primary, 
    borderColor: colors.primary 
  },
  filterText: { 
    color: colors.text, 
    fontWeight: '800',
    fontSize: 14,
  },
  filterTextActive: { 
    color: colors.bg 
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
  title: { 
    color: colors.text, 
    fontSize: 16, 
    fontWeight: '900', 
    marginBottom: 4 
  },
  client: { 
    color: '#111827', 
    fontWeight: '900', 
    marginBottom: 6,
    fontSize: 14,
  },
  sub: { 
    color: '#616E7C', 
    fontSize: 13, 
    fontWeight: '700', 
    marginBottom: 6 
  },
  status: { 
    fontWeight: '900',
    fontSize: 14,
  },
  price: { 
    color: colors.primary, 
    fontWeight: '900',
    fontSize: 16,
  },
});
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import { colors, spacing, surfaces } from '@shared/theme';
import type { AppointmentStatus } from '@features/scheduling/services/availability.service';

type QDoc = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

type Appointment = {
  id: string;
  vehicleType: 'Carro' | 'Moto';
  carCategory: 'Hatch' | 'Sedan' | 'Caminhonete' | null;
  serviceLabel: string | null;
  price: number | null;
  whenMs: number;
  status: AppointmentStatus;
};

function formatHour(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(ms: number) {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function formatCurrency(v: number | null) {
  return typeof v === 'number' ? `R$ ${v.toFixed(2).replace('.', ',')}` : '--';
}

const HISTORY_SET: AppointmentStatus[] = ['done', 'no_show'];

export default function HistoryScreen() {
  const auth = getAuth();
  const user = auth.currentUser;
  const uid = user?.uid;
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Appointment[]>([]);

  const fallbackOnceRef = useRef(false);

  useEffect(() => {
    if (!uid) return;

    setLoading(true);
    fallbackOnceRef.current = false;

    const qy = query(collection(db, 'users', uid, 'appointments'), orderBy('whenMs', 'desc'));

    const unsub = onSnapshot(
      qy,
      async (snap) => {
        const arr: Appointment[] = snap.docs
          .map((d: QDoc) => {
            const v = d.data() as any;
            if (typeof v?.whenMs !== 'number') return null;

            return {
              id: d.id,
              vehicleType: v.vehicleType ?? 'Carro',
              carCategory: v.carCategory ?? null,
              serviceLabel: v.serviceLabel ?? null,
              price: typeof v.price === 'number' ? v.price : null,
              whenMs: v.whenMs,
              status: (v.status ?? 'scheduled') as AppointmentStatus,
            } as Appointment;
          })
          .filter(Boolean) as Appointment[];

        const history = arr.filter((it) => HISTORY_SET.includes(it.status));

        if (snap.docs.length > 0) {
          setItems(history);
          setLoading(false);
          return;
        }

        if (!fallbackOnceRef.current) {
          fallbackOnceRef.current = true;
          try {
            const globalQy = query(
              collection(db, 'appointments'),
              where('customerUid', '==', uid),
              where('status', 'in', HISTORY_SET),
              orderBy('startAtMs', 'desc'),
              limit(50)
            );

            const globalSnap = await getDocs(globalQy);

            const fromGlobal: Appointment[] = globalSnap.docs
              .map((gd: QDoc) => {
                const v = gd.data() as any;
                const startAtMs = Number(v?.startAtMs ?? 0);
                if (!startAtMs) return null;

                return {
                  id: gd.id,
                  vehicleType: v.vehicleType ?? 'Carro',
                  carCategory: v.carCategory ?? null,
                  serviceLabel: v.serviceLabel ?? null,
                  price: typeof v.price === 'number' ? v.price : null,
                  whenMs: startAtMs,
                  status: (v.status ?? 'scheduled') as AppointmentStatus,
                } as Appointment;
              })
              .filter(Boolean) as Appointment[];

            setItems(fromGlobal);
          } catch {
            setItems([]);
          } finally {
            setLoading(false);
          }
          return;
        }

        setItems([]);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [db, uid]);

  const renderItem = ({ item }: { item: Appointment }) => {
    const subtitle = item.vehicleType === 'Carro' && item.carCategory ? `Carro • ${item.carCategory}` : item.vehicleType;

    const statusLabel = item.status === 'done' ? 'Concluído' : 'Não realizado';
    const statusColor = item.status === 'done' ? '#16A34A' : '#DC2626';

    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.serviceLabel ?? 'Serviço'}</Text>
          <Text style={styles.sub}>
            {subtitle} • {formatDate(item.whenMs)} • {formatHour(item.whenMs)}
          </Text>
          <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.price}>+{formatCurrency(item.price)}</Text>
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
        <Text style={styles.screenTitle}>Histórico</Text>

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
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#6B7280' }}>Sem registros.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenTitle: { fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 12 },

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

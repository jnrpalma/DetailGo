import { useEffect, useRef, useState } from 'react';

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

import type { AppointmentStatus } from '@features/scheduling/services/availability.service';

export type DashboardAppointment = {
  id: string;
  vehicleType: 'Carro' | 'Moto';
  carCategory: 'Hatch' | 'Sedan' | 'Caminhonete' | null;
  serviceLabel: string | null;
  price: number | null;
  whenMs: number;
  status: AppointmentStatus;
};

type QDoc =
  FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

type Params = {
  uid: string;
  limitN?: number;
  markNoShow?: (appointmentId: string, customerUid: string) => Promise<void>;
};

const NO_SHOW_GRACE_MS = 15 * 60 * 1000;

function normalizeFromUserSubcollectionDoc(d: QDoc): DashboardAppointment | null {
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
  };
}

function normalizeFromGlobalDoc(d: QDoc): DashboardAppointment | null {
  const v = d.data() as any;
  const startAtMs = Number(v?.startAtMs ?? 0);
  if (!startAtMs) return null;

  return {
    id: d.id,
    vehicleType: v.vehicleType ?? 'Carro',
    carCategory: v.carCategory ?? null,
    serviceLabel: v.serviceLabel ?? null,
    price: typeof v.price === 'number' ? v.price : null,
    whenMs: startAtMs,
    status: (v.status ?? 'scheduled') as AppointmentStatus,
  };
}

export function useDashboardAppointments({ uid, limitN = 30, markNoShow }: Params) {
  const [items, setItems] = useState<DashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const markedRef = useRef<Set<string>>(new Set());
  const fallbackOnceRef = useRef(false);

  // ✅ CRÍTICO: estabiliza a referência da função
  const markNoShowRef = useRef<typeof markNoShow>(markNoShow);
  useEffect(() => {
    markNoShowRef.current = markNoShow;
  }, [markNoShow]);

  useEffect(() => {
    if (!uid) return;

    const db = getFirestore();

    // ✅ só entra loading=true quando uid/limit mudam (não a cada render)
    setLoading(true);
    fallbackOnceRef.current = false;

    const qUser = query(
      collection(db, 'users', uid, 'appointments'),
      orderBy('whenMs', 'desc'),
      limit(limitN),
    );

    const unsub = onSnapshot(
      qUser,
      async (snap) => {
        const arr = snap.docs
          .map((d: QDoc) => normalizeFromUserSubcollectionDoc(d))
          .filter(Boolean) as DashboardAppointment[];

        // Atualiza UI rápido
        if (snap.docs.length > 0) {
          setItems(arr);
          setLoading(false);

          // no_show em background (sem mexer em loading)
          const fn = markNoShowRef.current;
          if (fn) {
            const now = Date.now();
            const shouldMark = arr.filter((it) => (
              it.status === 'scheduled' &&
              now > it.whenMs + NO_SHOW_GRACE_MS &&
              !markedRef.current.has(it.id)
            ));

            if (shouldMark.length > 0) {
              shouldMark.forEach((it) => markedRef.current.add(it.id));
              await Promise.all(
                shouldMark.map(async (it) => {
                  try {
                    await fn(it.id, uid);
                  } catch {
                    markedRef.current.delete(it.id);
                  }
                })
              );
            }
          }

          return;
        }

        // fallback global só 1x enquanto a subcollection estiver vazia
        if (fallbackOnceRef.current) {
          setItems([]);
          setLoading(false);
          return;
        }

        fallbackOnceRef.current = true;

        try {
          const qGlobal = query(
            collection(db, 'appointments'),
            where('customerUid', '==', uid),
            orderBy('startAtMs', 'desc'),
            limit(limitN),
          );

          const globalSnap = await getDocs(qGlobal);

          const fromGlobal = globalSnap.docs
            .map((d: QDoc) => normalizeFromGlobalDoc(d))
            .filter(Boolean) as DashboardAppointment[];

          setItems(fromGlobal);
          setLoading(false);

          const fn = markNoShowRef.current;
          if (fn) {
            const now = Date.now();
            const shouldMark = fromGlobal.filter((it) => (
              it.status === 'scheduled' &&
              now > it.whenMs + NO_SHOW_GRACE_MS &&
              !markedRef.current.has(it.id)
            ));

            if (shouldMark.length > 0) {
              shouldMark.forEach((it) => markedRef.current.add(it.id));
              await Promise.all(
                shouldMark.map(async (it) => {
                  try {
                    await fn(it.id, uid);
                  } catch {
                    markedRef.current.delete(it.id);
                  }
                })
              );
            }
          }
        } catch (e) {
          console.log('Fallback global appointments failed:', e);
          setItems([]);
          setLoading(false);
        }
      },
      () => setLoading(false),
    );

    return () => unsub();
  }, [uid, limitN]); // ✅ markNoShow saiu daqui

  return { items, loading };
}

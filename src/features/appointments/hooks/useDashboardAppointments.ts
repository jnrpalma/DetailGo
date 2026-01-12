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

import type { UserAppointment } from '../domain/appointment.types';

import { NO_SHOW_GRACE_MS } from '../domain/appointment.constants';

import {
  normalizeUserAppointmentFromSubcollection,
  normalizeUserAppointmentFromGlobal,
} from '../data/appointment.normalizers';

export type DashboardAppointment = UserAppointment;

type QDoc =
  FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

type Params = {
  uid: string;
  limitN?: number;
  markNoShow?: (appointmentId: string, customerUid: string) => Promise<void>;
};

export function useDashboardAppointments({
  uid,
  limitN = 30,
  markNoShow,
}: Params) {
  const [items, setItems] = useState<DashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const markedRef = useRef<Set<string>>(new Set());
  const fallbackOnceRef = useRef(false);

  const markNoShowRef = useRef<typeof markNoShow>(markNoShow);
  useEffect(() => {
    markNoShowRef.current = markNoShow;
  }, [markNoShow]);

  useEffect(() => {
    if (!uid) return;

    const db = getFirestore();
    setLoading(true);
    fallbackOnceRef.current = false;

    const qUser = query(
      collection(db, 'users', uid, 'appointments'),
      orderBy('whenMs', 'desc'),
      limit(limitN),
    );

    const unsub = onSnapshot(
      qUser,
      async snap => {
        const arr = snap.docs
          .map((d: QDoc) => normalizeUserAppointmentFromSubcollection(d))
          .filter(Boolean) as DashboardAppointment[];

        // se subcollection tem dados: usa ela
        if (snap.docs.length > 0) {
          setItems(arr);
          setLoading(false);

          const fn = markNoShowRef.current;
          if (fn) {
            const now = Date.now();
            const shouldMark = arr.filter(
              it =>
                it.status === 'scheduled' &&
                now > it.startAtMs + NO_SHOW_GRACE_MS &&
                !markedRef.current.has(it.id),
            );

            if (shouldMark.length > 0) {
              shouldMark.forEach(it => markedRef.current.add(it.id));
              await Promise.all(
                shouldMark.map(async it => {
                  try {
                    await fn(it.id, uid);
                  } catch {
                    markedRef.current.delete(it.id);
                  }
                }),
              );
            }
          }

          return;
        }

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
            .map((d: QDoc) => normalizeUserAppointmentFromGlobal(d))
            .filter(Boolean) as DashboardAppointment[];

          setItems(fromGlobal);
          setLoading(false);
        } catch {
          setItems([]);
          setLoading(false);
        }
      },
      () => setLoading(false),
    );

    return () => unsub();
  }, [uid, limitN]);

  return { items, loading };
}

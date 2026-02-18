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
import { normalizeUserAppointmentFromGlobal, normalizeUserAppointmentFromSubcollection } from '../data/appointment.normalizers';
import { NO_SHOW_GRACE_MS } from '../domain/appointment.constants';

export type DashboardAppointment = UserAppointment;

type QDoc = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

type Params = {
  uid: string;
  limitN?: number;
};

export function useDashboardAppointments({
  uid,
  limitN = 30,
}: Params) {
  const [items, setItems] = useState<DashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const fallbackOnceRef = useRef(false);

  useEffect(() => {
    if (!uid) return;

    const db = getFirestore();
    setLoading(true);
    fallbackOnceRef.current = false;

    const qUser = query(
      collection(db, 'users', uid, 'appointments'),
      orderBy('whenMs', 'asc'), 
      limit(limitN),
    );

    const unsub = onSnapshot(
      qUser,
      async snap => {
        const arr = snap.docs
          .map((d: QDoc) => normalizeUserAppointmentFromSubcollection(d))
          .filter(Boolean) as DashboardAppointment[];

        const now = Date.now();
        
        const updatedList = arr.map(item => {
          if (item.status === 'scheduled' && 
              now > item.startAtMs + NO_SHOW_GRACE_MS) {
            return {
              ...item,
              status: 'no_show' as const
            };
          }
          return item;
        });

        const activeAppointments = updatedList.filter(
          item => item.status === 'scheduled' || item.status === 'in_progress'
        );

        if (snap.docs.length > 0) {
          setItems(activeAppointments); 
          setLoading(false);
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
            where('status', 'in', ['scheduled', 'in_progress']), 
            orderBy('startAtMs', 'asc'), 
            limit(limitN),
          );

          const globalSnap = await getDocs(qGlobal);

          const fromGlobal = globalSnap.docs
            .map((d: QDoc) => normalizeUserAppointmentFromGlobal(d))
            .filter(Boolean) as DashboardAppointment[];

          const updatedGlobal = fromGlobal.map(item => {
            if (item.status === 'scheduled' && 
                now > item.startAtMs + NO_SHOW_GRACE_MS) {
              return {
                ...item,
                status: 'no_show' as const
              };
            }
            return item;
          });

        
          const activeGlobal = updatedGlobal.filter(
            item => item.status === 'scheduled' || item.status === 'in_progress'
          );

          setItems(activeGlobal);
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
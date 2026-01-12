import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, getDocs } from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import type { Appointment, AppointmentStatus } from '../model/appointment';

type QDoc = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

function normalizeUserAppointmentDoc(d: QDoc, uid: string): Appointment | null {
  const v = d.data() as any;
  if (typeof v?.whenMs !== 'number') return null;

  return {
    id: d.id,
    customerUid: uid,
    customerName: String(v.customerName ?? 'Cliente'),
    vehicleType: v.vehicleType ?? 'Carro',
    carCategory: v.carCategory ?? null,
    serviceLabel: v.serviceLabel ?? null,
    price: typeof v.price === 'number' ? v.price : null,
    startAtMs: v.whenMs,
    status: (v.status ?? 'scheduled') as AppointmentStatus,
    dayKey: v.dayKey,
  };
}

function normalizeGlobalAppointmentDoc(d: QDoc): Appointment | null {
  const v = d.data() as any;

  const startAtMs = Number(v?.startAtMs ?? 0);
  if (!startAtMs) return null;

  const customerUid = String(v?.customerUid ?? '');
  if (!customerUid) return null;

  return {
    id: d.id,
    customerUid,
    customerName: String(v.customerName ?? 'Cliente'),
    vehicleType: v.vehicleType ?? 'Carro',
    carCategory: v.carCategory ?? null,
    serviceLabel: v.serviceLabel ?? null,
    price: typeof v.price === 'number' ? v.price : null,
    startAtMs,
    endAtMs: typeof v.endAtMs === 'number' ? v.endAtMs : undefined,
    status: (v.status ?? 'scheduled') as AppointmentStatus,
    dayKey: v.dayKey,
  };
}

/**
 * Observa a subcollection do usuário.
 * Se estiver vazia, roda 1 fallback global (getDocs) e entrega esses itens.
 */
export function watchUserAppointmentsWithFallback(params: {
  uid: string;
  limitN?: number;
  onChange: (items: Appointment[]) => void;
  onError?: (err: unknown) => void;
}) {
  const db = getFirestore();
  const { uid, limitN = 50, onChange, onError } = params;

  let fallbackDone = false;

  const qy = query(
    collection(db, 'users', uid, 'appointments'),
    orderBy('whenMs', 'desc'),
    limit(limitN),
  );

  const unsub = onSnapshot(
    qy,
    async (snap) => {
      const list = snap.docs
        .map((d: QDoc) => normalizeUserAppointmentDoc(d, uid))
        .filter(Boolean) as Appointment[];

      if (snap.docs.length > 0) {
        onChange(list);
        return;
      }

      if (fallbackDone) {
        onChange([]);
        return;
      }

      fallbackDone = true;

      try {
        const globalQy = query(
          collection(db, 'appointments'),
          where('customerUid', '==', uid),
          orderBy('startAtMs', 'desc'),
          limit(limitN),
        );

        const globalSnap = await getDocs(globalQy);
        const fromGlobal = globalSnap.docs
          .map((d: QDoc) => normalizeGlobalAppointmentDoc(d))
          .filter(Boolean) as Appointment[];

        onChange(fromGlobal);
      } catch (e) {
        onError?.(e);
        onChange([]);
      }
    },
    (err) => onError?.(err),
  );

  return unsub;
}

/**
 * Busca global por UID + statusSet (útil para telas de histórico/ativos).
 * Você usa isso quando quiser filtrar sem depender da subcollection.
 */
export async function fetchUserAppointmentsGlobal(params: {
  uid: string;
  statusIn?: AppointmentStatus[];
  limitN?: number;
}) {
  const db = getFirestore();
  const { uid, statusIn, limitN = 50 } = params;

  let qy = query(
    collection(db, 'appointments'),
    where('customerUid', '==', uid),
    orderBy('startAtMs', 'desc'),
    limit(limitN),
  );

  if (statusIn?.length) {
    qy = query(
      collection(db, 'appointments'),
      where('customerUid', '==', uid),
      where('status', 'in', statusIn),
      orderBy('startAtMs', 'desc'),
      limit(limitN),
    );
  }

  const snap = await getDocs(qy);
  return snap.docs
    .map((d: QDoc) => normalizeGlobalAppointmentDoc(d))
    .filter(Boolean) as Appointment[];
}

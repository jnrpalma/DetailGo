import { AppointmentStatus } from '@features/appointments';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

const NO_SHOW_GRACE_MIN = 15;
const NO_SHOW_GRACE_MS = NO_SHOW_GRACE_MIN * 60 * 1000;

export async function updateAppointmentStatus(params: {
  shopId: string;
  appointmentId: string;
  customerUid: string;
  status: AppointmentStatus;
}) {
  const db = getFirestore();
  const { shopId, appointmentId, customerUid, status } = params;

  const globalRef = doc(db, 'shops', shopId, 'appointments', appointmentId);
  const globalSnap = await getDoc(globalRef);
  const globalData = (globalSnap.data() ?? {}) as any;

  const startAtMs = Number(globalData.startAtMs ?? 0);
  const currentStatus = (globalData.status ?? 'scheduled') as AppointmentStatus;

  if (startAtMs) {
    const expired = Date.now() > startAtMs + NO_SHOW_GRACE_MS;

    if (
      expired &&
      currentStatus === 'scheduled' &&
      (status === 'in_progress' || status === 'done')
    ) {
      const err: any = new Error(
        'Agendamento expirado. Deve ser marcado como não realizado.',
      );
      err.code = 'APPOINTMENT_EXPIRED';
      throw err;
    }
  }

  const userCol = collection(db, 'users', customerUid, 'appointments');
  const qy = query(userCol, where('appointmentId', '==', appointmentId));
  const snap = await getDocs(qy);

  const payload: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === 'in_progress') payload.startedAt = serverTimestamp();
  if (status === 'done') payload.doneAt = serverTimestamp();
  if (status === 'no_show') payload.noShowAt = serverTimestamp();

  const updates: Promise<void>[] = [updateDoc(globalRef, payload)];

  snap.docs.forEach(
    (
      d: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
    ) => {
      updates.push(updateDoc(d.ref, payload));
    },
  );

  await Promise.all(updates);
}

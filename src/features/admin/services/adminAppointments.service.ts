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

import type { AppointmentStatus } from '@features/scheduling/services/availability.service';

const NO_SHOW_GRACE_MIN = 15;
const NO_SHOW_GRACE_MS = NO_SHOW_GRACE_MIN * 60 * 1000;

export async function updateAppointmentStatus(params: {
  appointmentId: string;
  customerUid: string;
  status: AppointmentStatus;
}) {
  const db = getFirestore();
  const globalRef = doc(db, 'appointments', params.appointmentId);

  const globalSnap = await getDoc(globalRef);
  const globalData = (globalSnap.data() ?? {}) as any;

  const startAtMs = Number(globalData.startAtMs ?? 0);
  const currentStatus = (globalData.status ?? 'scheduled') as AppointmentStatus;

  if (startAtMs) {
    const expired = Date.now() > startAtMs + NO_SHOW_GRACE_MS;

    if (
      expired &&
      currentStatus === 'scheduled' &&
      (params.status === 'in_progress' || params.status === 'done')
    ) {
      const err: any = new Error(
        'Agendamento expirado. Deve ser marcado como não realizado.',
      );
      err.code = 'APPOINTMENT_EXPIRED';
      throw err;
    }
  }

  const userCol = collection(db, 'users', params.customerUid, 'appointments');
  const qy = query(userCol, where('appointmentId', '==', params.appointmentId));
  const snap = await getDocs(qy);

  const payload: Record<string, unknown> = {
    status: params.status,
    updatedAt: serverTimestamp(),
  };

  if (params.status === 'in_progress')
    (payload as any).startedAt = serverTimestamp();
  if (params.status === 'done') (payload as any).doneAt = serverTimestamp();
  if (params.status === 'no_show')
    (payload as any).noShowAt = serverTimestamp();

  const updates: Promise<void>[] = [updateDoc(globalRef, payload)];

  snap.docs.forEach((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
    updates.push(updateDoc(d.ref, payload));
  });

  await Promise.all(updates);
}

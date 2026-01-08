import {
  doc,
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

export async function updateAppointmentStatus(params: {
  appointmentId: string;
  customerUid: string;
  status: AppointmentStatus; // 'done' | 'canceled' | 'scheduled'
}) {
  const db = getFirestore();

  const globalRef = doc(db, 'appointments', params.appointmentId);

  // ✅ encontra o doc espelhado do usuário pelo campo appointmentId
  const userCol = collection(db, 'users', params.customerUid, 'appointments');
  const qy = query(userCol, where('appointmentId', '==', params.appointmentId));
  const snap = await getDocs(qy);

  const payload: Record<string, unknown> = {
    status: params.status,
    updatedAt: serverTimestamp(),
  };

  if (params.status === 'done') (payload as any).doneAt = serverTimestamp();
  if (params.status === 'canceled') (payload as any).canceledAt = serverTimestamp();

  const updates: Promise<void>[] = [updateDoc(globalRef, payload)];

  snap.docs.forEach((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
    updates.push(updateDoc(d.ref, payload));
  });

  await Promise.all(updates);
}

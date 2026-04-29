import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import type { AppointmentStatus } from '@features/appointments/domain/appointment.types';
import type { AdminAppointment } from '../domain/adminAppointment.types';

type QDoc = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

export function normalizeAdminAppointmentFromGlobal(d: QDoc): AdminAppointment | null {
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

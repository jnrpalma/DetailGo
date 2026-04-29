import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { AppointmentStatus, UserAppointment } from '../domain/appointment.types';

type QDoc = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

const VALID_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'in_progress',
  'done',
  'no_show',
  'cancelled',
];

function validateStatus(status: any): AppointmentStatus {
  if (VALID_STATUSES.includes(status)) {
    return status as AppointmentStatus;
  }
  return 'scheduled';
}

export function normalizeUserAppointmentFromSubcollection(d: QDoc): UserAppointment | null {
  const v = d.data() as any;

  if (typeof v?.whenMs !== 'number') return null;

  return {
    id: d.id,
    vehicleType: v.vehicleType ?? 'Carro',
    carCategory: v.carCategory ?? null,
    serviceLabel: v.serviceLabel ?? null,
    price: typeof v.price === 'number' ? v.price : null,
    startAtMs: v.whenMs,
    status: validateStatus(v.status),
    dayKey: v.dayKey,
  };
}

export function normalizeUserAppointmentFromGlobal(d: QDoc): UserAppointment | null {
  const v = d.data() as any;

  const startAtMs = Number(v?.startAtMs ?? 0);
  if (!startAtMs) return null;

  return {
    id: d.id,
    vehicleType: v.vehicleType ?? 'Carro',
    carCategory: v.carCategory ?? null,
    serviceLabel: v.serviceLabel ?? null,
    price: typeof v.price === 'number' ? v.price : null,
    startAtMs,
    status: validateStatus(v.status),
    dayKey: v.dayKey,
  };
}

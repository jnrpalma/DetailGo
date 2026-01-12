// src/features/appointments/data/appointment.normalizers.ts

import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { AppointmentStatus, UserAppointment } from '../domain/appointment.types';

type QDoc =
  FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

/**
 * users/{uid}/appointments  -> whenMs
 */
export function normalizeUserAppointmentFromSubcollection(
  d: QDoc,
): UserAppointment | null {
  const v = d.data() as any;
  if (typeof v?.whenMs !== 'number') return null;

  return {
    id: d.id,
    vehicleType: v.vehicleType ?? 'Carro',
    carCategory: v.carCategory ?? null,
    serviceLabel: v.serviceLabel ?? null,
    price: typeof v.price === 'number' ? v.price : null,
    startAtMs: v.whenMs,
    status: (v.status ?? 'scheduled') as AppointmentStatus,
    dayKey: v.dayKey,
  };
}

/**
 * appointments (global) -> startAtMs
 * Obs: aqui é "visão do usuário", então não inclui customerUid/customerName.
 */
export function normalizeUserAppointmentFromGlobal(
  d: QDoc,
): UserAppointment | null {
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
    status: (v.status ?? 'scheduled') as AppointmentStatus,
    dayKey: v.dayKey,
  };
}

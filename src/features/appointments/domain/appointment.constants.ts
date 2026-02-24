// src/features/appointments/domain/appointment.constants.ts
import { AppointmentStatus } from "./appointment.types";

export type VehicleType = 'Carro' | 'Moto';

export type CarCategory = 'Hatch' | 'Sedan' | 'SUV' | 'Picape cabine dupla';

export const ACTIVE_APPOINTMENT_SET = ['scheduled', 'in_progress'] as const satisfies readonly AppointmentStatus[];
export const HISTORY_APPOINTMENT_SET = ['done', 'no_show', 'cancelled'] as const satisfies readonly AppointmentStatus[];

export const CAR_CATEGORY_BASE_PRICE: Record<CarCategory, number> = {
  Hatch: 80,
  Sedan: 85,
  SUV: 90,
  'Picape cabine dupla': 110,
};

export const MOTO_BASE_PRICE = 70;

export const NO_SHOW_GRACE_MS = 15 * 60 * 1000; // 15 minutos
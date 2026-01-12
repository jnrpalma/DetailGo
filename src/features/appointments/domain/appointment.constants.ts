// src/features/appointments/domain/appointment.constants.ts

import type { AppointmentStatus } from './appointment.types';

export const NO_SHOW_GRACE_MIN = 15;
export const NO_SHOW_GRACE_MS = NO_SHOW_GRACE_MIN * 60 * 1000;

export const ACTIVE_APPOINTMENT_SET: AppointmentStatus[] = [
  'scheduled',
  'in_progress',
];

export const HISTORY_APPOINTMENT_SET: AppointmentStatus[] = [
  'done',
  'no_show',
];

import type { AppointmentStatus } from './appointment';

export const ACTIVE_SET: AppointmentStatus[] = ['scheduled', 'in_progress'];
export const HISTORY_SET: AppointmentStatus[] = ['done', 'no_show'];

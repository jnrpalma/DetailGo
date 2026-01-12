import { NO_SHOW_GRACE_MS } from '../domain/appointment.constants';
import type { AppointmentStatus } from '../domain/appointment.types';

/**
 * Verifica se um appointment expirou (scheduled + passou do tempo)
 */
export function isExpiredAppointment(
  startAtMs: number,
  status: AppointmentStatus,
): boolean {
  if (status !== 'scheduled') return false;
  return Date.now() > startAtMs + NO_SHOW_GRACE_MS;
}

/**
 * Status que deve ser exibido na UI
 */
export function resolveDisplayStatus(
  startAtMs: number,
  status: AppointmentStatus,
): AppointmentStatus {
  if (isExpiredAppointment(startAtMs, status)) {
    return 'no_show';
  }
  return status;
}

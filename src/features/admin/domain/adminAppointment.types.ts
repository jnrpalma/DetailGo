import type { AppointmentStatus, CarCategory, VehicleType } from '@features/appointments';

export type AdminAppointment = {
  id: string;
  customerUid: string;
  customerName: string;
  vehicleType: VehicleType;
  carCategory: CarCategory | null;
  serviceLabel: string | null;
  price: number | null;
  startAtMs: number;
  endAtMs?: number;
  status: AppointmentStatus;
  dayKey?: string;
};

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'done' | 'no_show' | 'cancelled';

export type VehicleType = 'Carro' | 'Moto';

export type CarCategory = 'Hatch' | 'Sedan' | 'SUV' | 'Picape cabine dupla';

export type UserAppointment = {
  id: string;
  vehicleType: VehicleType;
  carCategory: CarCategory | null;
  serviceLabel: string | null;
  price: number | null;
  startAtMs: number;
  status: AppointmentStatus;
  dayKey?: string;
};

export type Appointment = {
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

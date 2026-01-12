export type AppointmentStatus =
  | 'scheduled'
  | 'in_progress'
  | 'done'
  | 'no_show';

export type VehicleType = 'Carro' | 'Moto';
export type CarCategory = 'Hatch' | 'Sedan' | 'Caminhonete';

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

export type Appointment = UserAppointment;

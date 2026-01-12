export type AppointmentStatus = 'scheduled' | 'in_progress' | 'done' | 'no_show';

export type VehicleType = 'Carro' | 'Moto';
export type CarCategory = 'Hatch' | 'Sedan' | 'Caminhonete';

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

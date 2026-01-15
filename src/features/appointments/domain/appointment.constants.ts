export type VehicleType = 'Carro' | 'Moto';

export type CarCategory = 'Hatch' | 'Sedan' | 'SUV' | 'PicapeDupla';

export const CAR_CATEGORY_BASE_PRICE: Record<CarCategory, number> = {
  Hatch: 80,
  Sedan: 85,
  SUV: 90,
  PicapeDupla: 110,
};

export const MOTO_BASE_PRICE = 70;

export const ACTIVE_APPOINTMENT_SET = ['scheduled', 'in_progress'] as const;
export const HISTORY_APPOINTMENT_SET = ['done', 'no_show'] as const;

export const NO_SHOW_GRACE_MS = 15 * 60 * 1000;

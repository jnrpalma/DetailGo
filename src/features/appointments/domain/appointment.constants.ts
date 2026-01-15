// src/features/appointments/domain/appointment.constants.ts

export type VehicleType = 'Carro' | 'Moto';

/**
 * Categorias de carro usadas no app
 */
export type CarCategory = 'Hatch' | 'Sedan' | 'SUV' | 'PicapeDupla';

/**
 * Preço base por categoria (mercado)
 */
export const CAR_CATEGORY_BASE_PRICE: Record<CarCategory, number> = {
  Hatch: 80,
  Sedan: 85,
  SUV: 90,
  PicapeDupla: 110,
};

/**
 * Preço base para Moto (você pode ajustar depois)
 */
export const MOTO_BASE_PRICE = 70;

/**
 * Sets de status
 */
export const ACTIVE_APPOINTMENT_SET = ['scheduled', 'in_progress'] as const;
export const HISTORY_APPOINTMENT_SET = ['done', 'no_show'] as const;

/**
 * No-show grace
 */
export const NO_SHOW_GRACE_MS = 15 * 60 * 1000;

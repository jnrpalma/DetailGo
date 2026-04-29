// src/features/appointments/domain/appointment.constants.ts
import type { AppointmentStatus } from './appointment.types';

/**
 * Tipos de veículo disponíveis
 */
export type VehicleType = 'Carro' | 'Moto';

/**
 * Categorias de carro disponíveis
 */
export type CarCategory = 'Hatch' | 'Sedan' | 'SUV' | 'Picape cabine dupla';

/**
 * Configurações de agendamento
 */
export const APPOINTMENT = {
  // Grace period para não comparecimento
  NO_SHOW_GRACE_MIN: 15,
  NO_SHOW_GRACE_MS: 15 * 60 * 1000,

  // Limites padrão
  DEFAULT_LIMIT: 50,
  MAX_CAPACITY: 10,

  // Listas de valores válidos
  CAR_CATEGORIES: ['Hatch', 'Sedan', 'SUV', 'Picape cabine dupla'] as const,
  VEHICLE_TYPES: ['Carro', 'Moto'] as const,
} as const;

/**
 * Status de agendamentos ativos (que ainda estão em andamento ou agendados)
 */
export const ACTIVE_APPOINTMENT_SET = [
  'scheduled',
  'in_progress',
] as const satisfies readonly AppointmentStatus[];

/**
 * Status de agendamentos históricos (já finalizados)
 */
export const HISTORY_APPOINTMENT_SET = [
  'done',
  'no_show',
  'cancelled',
] as const satisfies readonly AppointmentStatus[];

/**
 * Agrupamento de status por categoria (mantido para compatibilidade)
 */
export const STATUS = {
  ACTIVE: ['scheduled', 'in_progress'] as const,
  HISTORY: ['done', 'no_show', 'cancelled'] as const,
} as const;

/**
 * Preços base por categoria de carro
 */
export const CAR_CATEGORY_BASE_PRICE: Record<CarCategory, number> = {
  Hatch: 80,
  Sedan: 85,
  SUV: 90,
  'Picape cabine dupla': 110,
};

/**
 * Preço base para moto
 */
export const MOTO_BASE_PRICE = 70;

// Manter exports individuais para compatibilidade com código existente
export const NO_SHOW_GRACE_MS = APPOINTMENT.NO_SHOW_GRACE_MS;
export const NO_SHOW_GRACE_MIN = APPOINTMENT.NO_SHOW_GRACE_MIN;
export const CAR_CATEGORIES = APPOINTMENT.CAR_CATEGORIES;
export const VEHICLE_TYPES = APPOINTMENT.VEHICLE_TYPES;

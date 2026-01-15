import type { VehicleType, CarCategory } from './appointment.types';

export const CAR_BASE_PRICE_BY_CATEGORY: Record<CarCategory, number> = {
  Hatch: 80,
  Sedan: 85,
  SUV: 90,
  'Picape cabine dupla': 110,
};

// Como você não definiu preço de Moto, deixei um padrão seguro.
// Se quiser outro valor depois, é só mudar aqui.
export const MOTO_BASE_PRICE = 70;

export function getBasePriceForAppointment(
  vehicleType: VehicleType | null,
  carCategory: CarCategory | null,
): number | null {
  if (!vehicleType) return null;

  if (vehicleType === 'Moto') return MOTO_BASE_PRICE;

  if (!carCategory) return null;
  return CAR_BASE_PRICE_BY_CATEGORY[carCategory] ?? null;
}

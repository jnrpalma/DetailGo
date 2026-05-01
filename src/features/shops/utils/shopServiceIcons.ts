import { Droplets, Shield, Sparkles, Wrench, Zap, type LucideIcon } from 'lucide-react-native';

import type { ShopService, ShopServiceIconKey } from '../domain/shopService.types';

const ICONS: Record<ShopServiceIconKey, LucideIcon> = {
  wash: Droplets,
  polish: Sparkles,
  wax: Shield,
  express: Zap,
  engine: Wrench,
  default: Sparkles,
};

export function getShopServiceIcon(service: Pick<ShopService, 'name' | 'iconKey'>): LucideIcon {
  if (service.iconKey && service.iconKey !== 'default') return ICONS[service.iconKey];

  const name = service.name.toLowerCase();
  if (name.includes('lavagem') || name.includes('wash')) return ICONS.wash;
  if (name.includes('polimento') || name.includes('polish')) return ICONS.polish;
  if (name.includes('cera') || name.includes('wax')) return ICONS.wax;
  if (name.includes('express')) return ICONS.express;
  if (name.includes('motor')) return ICONS.engine;

  return ICONS.default;
}

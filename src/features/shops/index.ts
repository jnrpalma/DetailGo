export { ShopProvider, useShop } from './context/ShopContext';
export type { ShopDoc, UserRole, SubscriptionStatus } from './context/ShopContext';
export { useShopServices } from './hooks/useShopServices';
export { joinShop } from './services/joinShop.service';
export { updateShopName } from './services/shop.service';
export {
  DEFAULT_SHOP_SERVICES,
  deleteShopService,
  ensureShopServices,
  updateShopService,
} from './services/shopServices.service';
export type { ShopService, ShopServiceIconKey } from './domain/shopService.types';

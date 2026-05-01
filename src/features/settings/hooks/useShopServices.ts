import { useEffect, useState } from 'react';
import { doc, getFirestore, onSnapshot } from '@react-native-firebase/firestore';
import { type ShopService, DEFAULT_SHOP_SERVICES } from '../domain/shopService.types';

type UseShopServicesResult = {
  services: ShopService[];
  enabledServices: ShopService[];
  loading: boolean;
};

/**
 * Carrega os serviços de uma loja em tempo real.
 * - services: todos os serviços (ativos e inativos) — para o dono gerenciar
 * - enabledServices: só os ativos — para o cliente ver/agendar
 */
export function useShopServices(shopId: string | null): UseShopServicesResult {
  const [services, setServices] = useState<ShopService[]>(DEFAULT_SHOP_SERVICES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) {
      setServices(DEFAULT_SHOP_SERVICES);
      setLoading(false);
      return;
    }

    setLoading(true);

    const ref = doc(getFirestore(), 'shops', shopId, 'settings', 'config');

    const unsub = onSnapshot(
      ref,
      snap => {
        const data = snap.data() as { services?: ShopService[] } | undefined;
        if (data?.services && Array.isArray(data.services) && data.services.length > 0) {
          setServices(data.services);
        } else {
          setServices(DEFAULT_SHOP_SERVICES);
        }
        setLoading(false);
      },
      () => {
        setServices(DEFAULT_SHOP_SERVICES);
        setLoading(false);
      },
    );

    return unsub;
  }, [shopId]);

  const enabledServices = services.filter(s => s.enabled);

  return { services, enabledServices, loading };
}

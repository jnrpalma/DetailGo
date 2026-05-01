import { useEffect, useMemo, useState } from 'react';
import { onSnapshot } from '@react-native-firebase/firestore';

import type { ShopService } from '../domain/shopService.types';
import {
  ensureShopServices,
  normalizeShopService,
  shopServicesQuery,
} from '../services/shopServices.service';

type Params = {
  shopId: string | null;
  activeOnly?: boolean;
  ensureDefaults?: boolean;
};

export function useShopServices({ shopId, activeOnly = false, ensureDefaults = false }: Params) {
  const [items, setItems] = useState<ShopService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    if (ensureDefaults) {
      ensureShopServices(shopId).catch(() => {
        if (mounted) setLoading(false);
      });
    }

    const unsub = onSnapshot(
      shopServicesQuery(shopId),
      snap => {
        const services = snap.docs.map(normalizeShopService).filter(Boolean) as ShopService[];
        setItems(services);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => {
      mounted = false;
      unsub();
    };
  }, [ensureDefaults, shopId]);

  const visibleItems = useMemo(
    () => (activeOnly ? items.filter(item => item.active) : items),
    [activeOnly, items],
  );

  return { items: visibleItems, loading };
}

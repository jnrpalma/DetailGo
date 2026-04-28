import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  doc,
  getFirestore,
  onSnapshot,
} from '@react-native-firebase/firestore';
import { useAuth } from '@features/auth';

export type UserRole = 'owner' | 'customer';

export type ShopDoc = {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  createdAt?: any;
};

type UserDoc = {
  shopId?: string;
  role?: UserRole;
};

type ShopContextValue = {
  shopId: string | null;
  shop: ShopDoc | null;
  userRole: UserRole | null;
  loading: boolean;
};

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const db = getFirestore();

  const [shopId, setShopId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [shop, setShop] = useState<ShopDoc | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingShop, setLoadingShop] = useState(false);

  // Subscribe to users/{uid} for shopId + role
  useEffect(() => {
    if (!user?.uid) {
      setShopId(null);
      setUserRole(null);
      setShop(null);
      setLoadingUser(false);
      return;
    }

    setLoadingUser(true);

    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      snap => {
        const data = (snap.data() ?? {}) as UserDoc;
        setShopId(data.shopId ?? null);
        setUserRole(data.role ?? null);
        setLoadingUser(false);
      },
      () => setLoadingUser(false),
    );

    return unsub;
  }, [user?.uid]);

  // Subscribe to shops/{shopId} when shopId is known
  useEffect(() => {
    if (!shopId) {
      setShop(null);
      setLoadingShop(false);
      return;
    }

    setLoadingShop(true);

    const unsub = onSnapshot(
      doc(db, 'shops', shopId),
      snap => {
        if (snap.exists) {
          setShop({ id: snap.id, ...(snap.data() as Omit<ShopDoc, 'id'>) });
        } else {
          setShop(null);
        }
        setLoadingShop(false);
      },
      () => setLoadingShop(false),
    );

    return unsub;
  }, [shopId]);

  const loading = loadingUser || loadingShop;

  const value = useMemo<ShopContextValue>(
    () => ({ shopId, shop, userRole, loading }),
    [shopId, shop, userRole, loading],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop deve ser usado dentro de <ShopProvider>');
  return ctx;
}

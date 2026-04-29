import { useRef, useCallback } from 'react';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';

interface CacheItem<T> {
  value: T;
  timestamp: number;
}

export function useFirestoreCache<T>(cacheTimeMs: number = 5 * 60 * 1000) {
  const cache = useRef<Map<string, CacheItem<T>>>(new Map());

  const get = useCallback(
    async (path: string, fetcher: () => Promise<T>): Promise<T> => {
      const cached = cache.current.get(path);
      const now = Date.now();

      if (cached && now - cached.timestamp < cacheTimeMs) {
        return cached.value;
      }

      const value = await fetcher();
      cache.current.set(path, { value, timestamp: now });
      return value;
    },
    [cacheTimeMs],
  );

  const invalidate = useCallback((path: string) => {
    cache.current.delete(path);
  }, []);

  const clear = useCallback(() => {
    cache.current.clear();
  }, []);

  return { get, invalidate, clear };
}
export function useCustomerName() {
  const db = getFirestore();
  const { get } = useFirestoreCache<string>();

  const fetchCustomerName = useCallback(
    async (customerUid: string): Promise<string> => {
      return get(`user_${customerUid}`, async () => {
        try {
          const snap = await getDoc(doc(db, 'users', customerUid));
          const data = (snap.data() ?? {}) as {
            firstName?: string;
            lastName?: string;
          };
          return `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || 'Cliente';
        } catch {
          return 'Cliente';
        }
      });
    },
    [db, get],
  );

  return { fetchCustomerName };
}

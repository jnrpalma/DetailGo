import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import type {
  ShopService,
  ShopServiceIconKey,
  ShopServiceInput,
} from '../domain/shopService.types';

type QDoc = FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

export const DEFAULT_SHOP_SERVICES: ShopServiceInput[] = [
  {
    name: 'Lavagem',
    title: 'Lavagem',
    description: 'Limpeza externa essencial',
    includes: ['Lavagem externa', 'Limpeza de vidros', 'Aspiração rápida', 'Acabamento nos pneus'],
    note: 'Ideal para manutenção semanal.',
    recommendedFor: ['Uso diário', 'Manutenção'],
    durationMin: 30,
    price: 80,
    iconKey: 'wash',
    active: true,
    sortOrder: 0,
  },
  {
    name: 'Polimento',
    title: 'Polimento técnico',
    description: 'Recuperação de brilho da pintura',
    includes: ['Correção de swirls', 'Remoção de riscos leves', 'Proteção da pintura'],
    note: 'Recomendado a cada 6 meses.',
    recommendedFor: ['Carros +1 ano', 'Pré-venda'],
    durationMin: 120,
    price: 220,
    iconKey: 'polish',
    active: true,
    sortOrder: 1,
  },
  {
    name: 'Cera',
    title: 'Cera',
    description: 'Proteção e acabamento da pintura',
    includes: ['Aplicação de cera', 'Brilho da pintura', 'Proteção leve'],
    note: 'Ajuda a proteger a pintura no uso diário.',
    recommendedFor: ['Proteção', 'Brilho'],
    durationMin: 60,
    price: 120,
    iconKey: 'wax',
    active: true,
    sortOrder: 2,
  },
  {
    name: 'Express',
    title: 'Express',
    description: 'Serviço rápido para o dia a dia',
    includes: ['Limpeza rápida', 'Acabamento visual', 'Entrega ágil'],
    note: 'Pensado para quem precisa resolver rápido.',
    recommendedFor: ['Rotina', 'Pouco tempo'],
    durationMin: 30,
    price: 50,
    iconKey: 'express',
    active: true,
    sortOrder: 3,
  },
];

function normalizeIconKey(value: unknown): ShopServiceIconKey {
  const validKeys: ShopServiceIconKey[] = ['wash', 'polish', 'wax', 'express', 'engine', 'default'];
  return validKeys.includes(value as ShopServiceIconKey)
    ? (value as ShopServiceIconKey)
    : 'default';
}

export function normalizeShopService(d: QDoc): ShopService | null {
  const v = d.data() as Partial<ShopService>;
  const name = typeof v.name === 'string' ? v.name.trim() : '';
  if (!name) return null;

  return {
    id: d.id,
    name,
    title: typeof v.title === 'string' ? v.title : name,
    description: typeof v.description === 'string' ? v.description : null,
    includes: Array.isArray(v.includes) ? v.includes.filter(item => typeof item === 'string') : [],
    note: typeof v.note === 'string' ? v.note : null,
    recommendedFor: Array.isArray(v.recommendedFor)
      ? v.recommendedFor.filter(item => typeof item === 'string')
      : [],
    durationMin: typeof v.durationMin === 'number' && v.durationMin > 0 ? v.durationMin : 30,
    price: typeof v.price === 'number' && v.price >= 0 ? v.price : 0,
    iconKey: normalizeIconKey(v.iconKey),
    active: typeof v.active === 'boolean' ? v.active : true,
    sortOrder: typeof v.sortOrder === 'number' ? v.sortOrder : 999,
  };
}

export function shopServicesRef(shopId: string) {
  return collection(getFirestore(), 'shops', shopId, 'services');
}

export function shopServicesQuery(shopId: string) {
  return query(shopServicesRef(shopId), orderBy('sortOrder', 'asc'));
}

export async function ensureShopServices(shopId: string): Promise<ShopService[]> {
  const snap = await getDocs(shopServicesQuery(shopId));
  const current = snap.docs.map(normalizeShopService).filter(Boolean) as ShopService[];

  if (current.length > 0) return current;

  const db = getFirestore();
  const batch = writeBatch(db);

  DEFAULT_SHOP_SERVICES.forEach(service => {
    const id = service.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const ref = doc(db, 'shops', shopId, 'services', id);
    batch.set(ref, {
      ...service,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();

  return DEFAULT_SHOP_SERVICES.map((service, index) => ({
    id: service.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
    ...service,
    sortOrder: service.sortOrder ?? index,
  }));
}

export async function updateShopService(
  shopId: string,
  serviceId: string,
  updates: Partial<
    Pick<
      ShopService,
      | 'active'
      | 'description'
      | 'durationMin'
      | 'includes'
      | 'name'
      | 'note'
      | 'price'
      | 'recommendedFor'
      | 'title'
    >
  >,
): Promise<void> {
  await updateDoc(doc(getFirestore(), 'shops', shopId, 'services', serviceId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteShopService(shopId: string, serviceId: string): Promise<void> {
  await deleteDoc(doc(getFirestore(), 'shops', shopId, 'services', serviceId));
}

export async function createOrUpdateShopService(
  shopId: string,
  serviceId: string,
  service: ShopServiceInput,
): Promise<void> {
  await setDoc(
    doc(getFirestore(), 'shops', shopId, 'services', serviceId),
    { ...service, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

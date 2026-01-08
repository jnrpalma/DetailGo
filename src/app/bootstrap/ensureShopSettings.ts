import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';

export type ShopSettings = {
  openHour: number;
  closeHour: number;
  slotStepMin: number;
  parallelCapacity: number;
};

const DEFAULT_SETTINGS: ShopSettings = {
  openHour: 8,
  closeHour: 18,
  slotStepMin: 30,
  parallelCapacity: 2,
};

export async function ensureShopSettings() {
  const db = getFirestore();
  const ref = doc(db, 'settings', 'shop');

  const snap = await getDoc(ref);

  // Se não existe, cria com defaults
  if (!snap.exists) {
    await setDoc(ref, {
      ...DEFAULT_SETTINGS,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { created: true, settings: DEFAULT_SETTINGS };
  }

  const data = snap.data() as Partial<ShopSettings> | undefined;

  const merged: ShopSettings = {
    openHour: data?.openHour ?? DEFAULT_SETTINGS.openHour,
    closeHour: data?.closeHour ?? DEFAULT_SETTINGS.closeHour,
    slotStepMin: data?.slotStepMin ?? DEFAULT_SETTINGS.slotStepMin,
    parallelCapacity: data?.parallelCapacity ?? DEFAULT_SETTINGS.parallelCapacity,
  };

  await setDoc(ref, { ...merged, updatedAt: serverTimestamp() }, { merge: true });

  return { created: false, settings: merged };
}

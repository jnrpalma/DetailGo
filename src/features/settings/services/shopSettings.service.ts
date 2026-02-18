import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';

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

const SETTINGS_PATH = 'settings/shop';

export class ShopSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShopSettingsError';
  }
}

function validateHour(hour?: number): number | null {
  return hour && hour >= 0 && hour <= 23 ? hour : null;
}

function validateSlotStep(step?: number): number | null {
  return step && step >= 15 && step <= 60 ? step : null;
}

function validateCapacity(capacity?: number): number | null {
  return capacity && capacity >= 1 && capacity <= 10 ? capacity : null;
}

function validateAndMergeSettings(data: Partial<ShopSettings>): ShopSettings {
  return {
    openHour: validateHour(data?.openHour) ?? DEFAULT_SETTINGS.openHour,
    closeHour: validateHour(data?.closeHour) ?? DEFAULT_SETTINGS.closeHour,
    slotStepMin:
      validateSlotStep(data?.slotStepMin) ?? DEFAULT_SETTINGS.slotStepMin,
    parallelCapacity:
      validateCapacity(data?.parallelCapacity) ??
      DEFAULT_SETTINGS.parallelCapacity,
  };
}

function hasSettingsChanged(
  old: Partial<ShopSettings>,
  newSettings: ShopSettings,
): boolean {
  return (Object.keys(newSettings) as Array<keyof ShopSettings>).some(
    key => old[key] !== newSettings[key],
  );
}

export async function ensureShopSettings(): Promise<{
  created: boolean;
  settings: ShopSettings;
}> {
  const db = getFirestore();
  const ref = doc(db, SETTINGS_PATH);

  try {
    const snap = await getDoc(ref);

    if (!snap.exists) {
      await setDoc(ref, {
        ...DEFAULT_SETTINGS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { created: true, settings: DEFAULT_SETTINGS };
    }

    const data = snap.data() as Partial<ShopSettings>;
    const merged = validateAndMergeSettings(data);

    if (hasSettingsChanged(data, merged)) {
      await setDoc(
        ref,
        { ...merged, updatedAt: serverTimestamp() },
        { merge: true },
      );
    }

    return { created: false, settings: merged };
  } catch (error) {
    console.error('❌ Erro ao garantir configurações:', error);
    throw new ShopSettingsError('Falha ao carregar configurações da loja');
  }
}

export async function getShopSettings(): Promise<ShopSettings> {
  const { settings } = await ensureShopSettings();
  return settings;
}

export async function updateShopSettings(
  updates: Partial<ShopSettings>,
): Promise<ShopSettings> {
  const db = getFirestore();
  const ref = doc(db, SETTINGS_PATH);

  const current = await getShopSettings();
  const merged = validateAndMergeSettings({ ...current, ...updates });

  await setDoc(
    ref,
    { ...merged, updatedAt: serverTimestamp() },
    { merge: true },
  );

  return merged;
}

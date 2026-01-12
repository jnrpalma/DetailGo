import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  where,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type ShopSettings = {
  openHour: number;
  closeHour: number;
  slotStepMin: number;
  parallelCapacity: number;
};

export type Slot = {
  startAtMs: number;
  endAtMs: number;
};

export type AppointmentCreateInput = {
  customerUid: string;
  vehicleType: 'Carro' | 'Moto';
  carCategory: 'Hatch' | 'Sedan' | 'Caminhonete' | null;
  serviceLabel: string;
  durationMin: number;
  price: number | null;
  startAtMs: number;
  endAtMs: number;
};

export type AppointmentStatus =
  | 'scheduled'
  | 'in_progress'
  | 'done'
  | 'no_show';

type AppointmentDoc = {
  dayKey?: string;
  startAtMs: number;
  endAtMs: number;
  status: AppointmentStatus;
};

function toDayKey(dateOrMs: Date | number) {
  const d =
    typeof dateOrMs === 'number' ? new Date(dateOrMs) : new Date(dateOrMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDayMs(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function endOfDayMs(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export async function getShopSettings(): Promise<ShopSettings> {
  const db = getFirestore();
  const snap = await getDoc(doc(db, 'settings', 'shop'));
  const data = snap.data() as Partial<ShopSettings> | undefined;

  return {
    openHour: data?.openHour ?? 8,
    closeHour: data?.closeHour ?? 18,
    slotStepMin: data?.slotStepMin ?? 30,
    parallelCapacity: data?.parallelCapacity ?? 1,
  };
}

export async function getAvailableSlotsForDay(
  day: Date,
  durationMin: number,
): Promise<Slot[]> {
  const db = getFirestore();
  const cfg = await getShopSettings();

  const dayKey = toDayKey(day);

  const qByDayKey = query(
    collection(db, 'appointments'),
    where('status', '==', 'scheduled'),
    where('dayKey', '==', dayKey),
  );

  const snapByDayKey = await getDocs(qByDayKey);

  let appointments: AppointmentDoc[] = snapByDayKey.docs.map(
    (d: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
      d.data() as AppointmentDoc,
  );

  if (appointments.length === 0) {
    const dayStart = startOfDayMs(day);
    const dayEnd = endOfDayMs(day);

    const qRange = query(
      collection(db, 'appointments'),
      where('status', '==', 'scheduled'),
      where('startAtMs', '>=', dayStart),
      where('startAtMs', '<=', dayEnd),
    );

    const snapRange = await getDocs(qRange);
    appointments = snapRange.docs.map(
      (d: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
        d.data() as AppointmentDoc,
    );
  }

  const open = new Date(day);
  open.setHours(cfg.openHour, 0, 0, 0);

  const close = new Date(day);
  close.setHours(cfg.closeHour, 0, 0, 0);

  const stepMs = cfg.slotStepMin * 60 * 1000;
  const durationMs = durationMin * 60 * 1000;

  const slots: Slot[] = [];
  for (let t = open.getTime(); t + durationMs <= close.getTime(); t += stepMs) {
    slots.push({ startAtMs: t, endAtMs: t + durationMs });
  }

  const now = Date.now();
  const slotsFuture = slots.filter(s => s.startAtMs > now);

  return slotsFuture.filter(slot => {
    let concurrent = 0;
    for (const appt of appointments) {
      if (
        overlaps(appt.startAtMs, appt.endAtMs, slot.startAtMs, slot.endAtMs)
      ) {
        concurrent += 1;
        if (concurrent >= cfg.parallelCapacity) return false;
      }
    }
    return true;
  });
}

export async function createAppointmentWithCapacityCheck(
  input: AppointmentCreateInput,
) {
  const db = getFirestore();
  const cfg = await getShopSettings();
  const dayKey = toDayKey(input.startAtMs);

  const userSnap = await getDoc(doc(db, 'users', input.customerUid));
  const userData = (userSnap.data() ?? {}) as {
    firstName?: string;
    lastName?: string;
  };
  const customerName =
    `${userData.firstName ?? ''} ${userData.lastName ?? ''}`.trim() ||
    'Cliente';

  return runTransaction(db, async tx => {
    const qy = query(
      collection(db, 'appointments'),
      where('status', '==', 'scheduled'),
      where('dayKey', '==', dayKey),
    );

    const snap = await getDocs(qy);

    let concurrent = 0;
    snap.docs.forEach((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const appt = d.data() as AppointmentDoc;
      if (
        overlaps(appt.startAtMs, appt.endAtMs, input.startAtMs, input.endAtMs)
      ) {
        concurrent += 1;
      }
    });

    if (concurrent >= cfg.parallelCapacity) {
      const err: any = new Error('Horário ocupado');
      err.code = 'SLOT_FULL';
      throw err;
    }

    const apptRef = doc(collection(db, 'appointments'));
    tx.set(apptRef, {
      dayKey,
      customerUid: input.customerUid,
      customerName,
      vehicleType: input.vehicleType,
      carCategory: input.carCategory,
      serviceLabel: input.serviceLabel,
      durationMin: input.durationMin,
      price: input.price,
      startAtMs: input.startAtMs,
      endAtMs: input.endAtMs,
      status: 'scheduled' as AppointmentStatus,
      createdAt: serverTimestamp(),
    });
    const userRef = doc(
      db,
      'users',
      input.customerUid,
      'appointments',
      apptRef.id,
    );
    tx.set(userRef, {
      dayKey,
      appointmentId: apptRef.id,
      customerName,
      vehicleType: input.vehicleType,
      carCategory: input.carCategory,
      serviceLabel: input.serviceLabel,
      price: input.price,
      whenMs: input.startAtMs,
      status: 'scheduled' as AppointmentStatus,
      createdAt: serverTimestamp(),
    });

    return { id: apptRef.id };
  });
}

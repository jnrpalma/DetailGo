import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
  runTransaction,
  doc,
  serverTimestamp,
  type FirebaseFirestoreTypes,
  getDoc,
} from '@react-native-firebase/firestore';

import {
  getShopSettings,
  type ShopSettings,
} from '@features/settings/services/shopSettings.service';
import type {
  VehicleType,
  CarCategory,
  AppointmentStatus,
} from '@features/appointments/domain/appointment.types';

type QDoc =
  FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

export type Slot = {
  startAtMs: number;
  endAtMs: number;
};

export type AppointmentCreateInput = {
  customerUid: string;
  vehicleType: VehicleType;
  carCategory: CarCategory | null;
  serviceLabel: string;
  durationMin: number;
  price: number | null;
  startAtMs: number;
  endAtMs: number;
};

type AppointmentDoc = {
  dayKey?: string;
  startAtMs: number;
  endAtMs: number;
  status: AppointmentStatus;
};

export class AvailabilityError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AvailabilityError';
    this.code = code;
  }
}

function toDayKey(dateOrMs: Date | number): string {
  const d = typeof dateOrMs === 'number' ? new Date(dateOrMs) : dateOrMs;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

async function getScheduledAppointmentsForDay(
  dayKey: string,
  dayStart: number,
  dayEnd: number,
): Promise<AppointmentDoc[]> {
  const db = getFirestore();

  const qByDayKey = query(
    collection(db, 'appointments'),
    where('status', '==', 'scheduled'),
    where('dayKey', '==', dayKey),
  );

  const snapByDayKey = await getDocs(qByDayKey);

  if (!snapByDayKey.empty) {
    return snapByDayKey.docs.map((d: QDoc) => d.data() as AppointmentDoc);
  }

  const qRange = query(
    collection(db, 'appointments'),
    where('status', '==', 'scheduled'),
    where('startAtMs', '>=', dayStart),
    where('startAtMs', '<=', dayEnd),
  );

  const snapRange = await getDocs(qRange);

  return snapRange.docs.map((d: QDoc) => d.data() as AppointmentDoc);
}

function generateSlots(
  day: Date,
  settings: ShopSettings,
  durationMin: number,
): Slot[] {
  const open = new Date(day);
  open.setHours(settings.openHour, 0, 0, 0);

  const close = new Date(day);
  close.setHours(settings.closeHour, 0, 0, 0);

  const stepMs = settings.slotStepMin * 60 * 1000;
  const durationMs = durationMin * 60 * 1000;

  const slots: Slot[] = [];
  for (let t = open.getTime(); t + durationMs <= close.getTime(); t += stepMs) {
    slots.push({ startAtMs: t, endAtMs: t + durationMs });
  }

  const now = Date.now();
  return slots.filter(s => s.startAtMs > now);
}

function filterAvailableSlots(
  slots: Slot[],
  appointments: AppointmentDoc[],
  capacity: number,
): Slot[] {
  return slots.filter(slot => {
    let concurrent = 0;
    for (const appt of appointments) {
      if (
        overlaps(appt.startAtMs, appt.endAtMs, slot.startAtMs, slot.endAtMs)
      ) {
        concurrent += 1;
        if (concurrent >= capacity) return false;
      }
    }
    return true;
  });
}

export async function getAvailableSlotsForDay(
  day: Date,
  durationMin: number,
): Promise<Slot[]> {
  const settings = await getShopSettings();
  const dayKey = toDayKey(day);
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  const appointments = await getScheduledAppointmentsForDay(
    dayKey,
    dayStart,
    dayEnd,
  );
  const allSlots = generateSlots(day, settings, durationMin);

  return filterAvailableSlots(
    allSlots,
    appointments,
    settings.parallelCapacity,
  );
}

async function getCustomerName(customerUid: string): Promise<string> {
  const db = getFirestore();
  const userSnap = await getDoc(doc(db, 'users', customerUid));
  const userData = (userSnap.data() ?? {}) as {
    firstName?: string;
    lastName?: string;
  };
  return (
    `${userData.firstName ?? ''} ${userData.lastName ?? ''}`.trim() || 'Cliente'
  );
}

export async function createAppointmentWithCapacityCheck(
  input: AppointmentCreateInput,
) {
  const db = getFirestore();
  const settings = await getShopSettings();
  const customerName = await getCustomerName(input.customerUid);
  const dayKey = toDayKey(input.startAtMs);

  return runTransaction(db, async tx => {
    const qy = query(
      collection(db, 'appointments'),
      where('status', '==', 'scheduled'),
      where('dayKey', '==', dayKey),
    );

    const snap = await getDocs(qy);

    let concurrent = 0;

    snap.docs.forEach((d: QDoc) => {
      const appt = d.data() as AppointmentDoc;
      if (
        overlaps(appt.startAtMs, appt.endAtMs, input.startAtMs, input.endAtMs)
      ) {
        concurrent += 1;
      }
    });

    if (concurrent >= settings.parallelCapacity) {
      throw new AvailabilityError('Horário ocupado', 'SLOT_FULL');
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
      status: 'scheduled',
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
      status: 'scheduled',
      createdAt: serverTimestamp(),
    });

    return { id: apptRef.id };
  });
}

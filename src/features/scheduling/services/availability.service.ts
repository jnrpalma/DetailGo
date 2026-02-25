// src/features/scheduling/services/availability.service.ts
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
import { APPOINTMENT } from '@features/appointments/domain/appointment.constants';

type QDoc =
  FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>;

export type Slot = {
  startAtMs: number;
  endAtMs: number;
  durationMin: number; 
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

/**
 * 👇 NOVA FUNÇÃO: Valida se o horário está dentro do horário comercial
 */
function isWithinBusinessHours(slot: Slot, settings: ShopSettings): boolean {
  const slotStartHour = new Date(slot.startAtMs).getHours();
  const slotEndHour = new Date(slot.endAtMs).getHours();
  const slotEndMinutes = new Date(slot.endAtMs).getMinutes();
  
  // Converte para minutos desde meia-noite para comparação mais precisa
  const slotStartMinutes = slotStartHour * 60 + new Date(slot.startAtMs).getMinutes();
  const slotEndMinutesTotal = slotEndHour * 60 + slotEndMinutes;
  
  const openMinutes = settings.openHour * 60;
  const closeMinutes = settings.closeHour * 60;

  return slotStartMinutes >= openMinutes && slotEndMinutesTotal <= closeMinutes;
}

/**
 * 👇 NOVA FUNÇÃO: Valida se o slot não está no passado
 */
function isNotInPast(slot: Slot): boolean {
  return slot.startAtMs > Date.now();
}

/**
 * 👇 NOVA FUNÇÃO: Valida duração mínima do serviço
 */
function hasValidDuration(slot: Slot, requiredDuration: number): boolean {
  const actualDuration = (slot.endAtMs - slot.startAtMs) / (60 * 1000);
  return Math.abs(actualDuration - requiredDuration) < 1; // tolerância de 1 minuto
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

  // Fallback para consulta por range (dados antigos sem dayKey)
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
    slots.push({ 
      startAtMs: t, 
      endAtMs: t + durationMs,
      durationMin, // 👈 Adiciona duração
    });
  }

  return slots;
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
  
  // Gera todos os slots possíveis
  const allSlots = generateSlots(day, settings, durationMin);

  // 👇 APLICA TODAS AS VALIDAÇÕES
  const validSlots = allSlots.filter(slot => {
    // 1. Não pode estar no passado
    if (!isNotInPast(slot)) return false;
    
    // 2. Deve estar dentro do horário comercial
    if (!isWithinBusinessHours(slot, settings)) return false;
    
    // 3. Deve ter a duração correta
    if (!hasValidDuration(slot, durationMin)) return false;
    
    return true;
  });

  // Filtra por disponibilidade (capacidade)
  return filterAvailableSlots(
    validSlots,
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
  
  const firstName = userData.firstName || '';
  const lastName = userData.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  return fullName || 'Cliente';
}

export async function createAppointmentWithCapacityCheck(
  input: AppointmentCreateInput,
) {
  const db = getFirestore();
  const settings = await getShopSettings();
  const customerName = await getCustomerName(input.customerUid);
  const dayKey = toDayKey(input.startAtMs);

  // 👇 VALIDAÇÕES ADICIONAIS ANTES DA TRANSAÇÃO
  const slot: Slot = {
    startAtMs: input.startAtMs,
    endAtMs: input.endAtMs,
    durationMin: input.durationMin,
  };

  // Verifica se não está no passado
  if (!isNotInPast(slot)) {
    throw new AvailabilityError(
      'Não é possível agendar para horários passados',
      'PAST_DATE'
    );
  }

  // Verifica horário comercial
  if (!isWithinBusinessHours(slot, settings)) {
    throw new AvailabilityError(
      'Horário fora do expediente',
      'OUTSIDE_BUSINESS_HOURS'
    );
  }

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

/**
 * 👇 NOVA FUNÇÃO: Verifica disponibilidade de um horário específico
 * Útil para validação em tempo real
 */
export async function checkSlotAvailability(
  startAtMs: number,
  durationMin: number,
): Promise<{
  available: boolean;
  reason?: string;
}> {
  const settings = await getShopSettings();
  const dayKey = toDayKey(startAtMs);
  const endAtMs = startAtMs + durationMin * 60 * 1000;
  
  const slot: Slot = { startAtMs, endAtMs, durationMin };

  // Validações básicas
  if (!isNotInPast(slot)) {
    return { available: false, reason: 'Horário no passado' };
  }

  if (!isWithinBusinessHours(slot, settings)) {
    return { available: false, reason: 'Fora do horário comercial' };
  }

  // Verifica capacidade
  const db = getFirestore();
  const qy = query(
    collection(db, 'appointments'),
    where('status', '==', 'scheduled'),
    where('dayKey', '==', dayKey),
  );

  const snap = await getDocs(qy);
  let concurrent = 0;

  snap.docs.forEach((d: QDoc) => {
    const appt = d.data() as AppointmentDoc;
    if (overlaps(appt.startAtMs, appt.endAtMs, startAtMs, endAtMs)) {
      concurrent += 1;
    }
  });

  if (concurrent >= settings.parallelCapacity) {
    return { available: false, reason: 'Capacidade esgotada' };
  }

  return { available: true };
}
import {
  getFirestore,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import type { AppointmentStatus } from '../domain/appointment.types';
import { NO_SHOW_GRACE_MS } from '../domain/appointment.constants';
import { mapFirestoreError } from '@shared/utils/firebase.utils';

export type CancelAppointmentResult =
  | { ok: true; message: string; data?: any }
  | { ok: false; message: string; code?: string };

export function getAppointmentRules(appointment: {
  status: AppointmentStatus;
  startAtMs: number;
}): {
  canCancel: boolean;
  canReschedule: boolean;
  message?: string;
  isExpired: boolean;
} {
  const now = Date.now();
  const isExpired = now >= appointment.startAtMs;

  if (appointment.status === 'cancelled') {
    return {
      canCancel: false,
      canReschedule: false,
      isExpired: true,
      message: 'Este agendamento foi cancelado por você.',
    };
  }

  if (appointment.status === 'no_show') {
    return {
      canCancel: false,
      canReschedule: true,
      isExpired: true,
      message: 'Você não compareceu a este agendamento. Pode reagendar.',
    };
  }

  if (appointment.status === 'done') {
    return {
      canCancel: false,
      canReschedule: false,
      isExpired: true,
      message: 'Este serviço já foi realizado.',
    };
  }

  if (appointment.status === 'in_progress') {
    return {
      canCancel: false,
      canReschedule: false,
      isExpired: true,
      message: 'Serviço em andamento não pode ser alterado.',
    };
  }

  if (appointment.status === 'scheduled') {
    const passedTime = now >= appointment.startAtMs;
    return {
      canCancel: !passedTime,
      canReschedule: true,
      isExpired: passedTime,
      message: passedTime
        ? 'Horário já passou. Você pode reagendar, mas não cancelar.'
        : undefined,
    };
  }

  return { canCancel: false, canReschedule: false, isExpired };
}

export async function cancelAppointment(
  appointmentId: string,
  customerUid: string,
  shopId: string,
): Promise<CancelAppointmentResult> {
  try {
    const db = getFirestore();
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return { ok: false, message: 'Você precisa estar logado.' };
    }

    if (currentUser.uid !== customerUid) {
      return { ok: false, message: 'Permissão negada.' };
    }

    const appointmentRef = doc(db, 'shops', shopId, 'appointments', appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);

    if (!appointmentSnap.exists) {
      return { ok: false, message: 'Agendamento não encontrado.' };
    }

    const appointmentData = appointmentSnap.data() as {
      status: AppointmentStatus;
      startAtMs: number;
    };

    const rules = getAppointmentRules(appointmentData);
    if (!rules.canCancel) {
      return {
        ok: false,
        message: rules.message || 'Não é possível cancelar este agendamento.',
      };
    }

    const userAppointmentRef = doc(
      db,
      'users',
      customerUid,
      'appointments',
      appointmentId,
    );
    const batch = writeBatch(db);

    batch.update(appointmentRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: currentUser.uid,
      updatedAt: serverTimestamp(),
    });

    batch.update(userAppointmentRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: currentUser.uid,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    return { ok: true, message: 'Agendamento cancelado com sucesso!' };
  } catch (error: any) {
    console.error('Erro ao cancelar agendamento:', error);
    return { ok: false, message: mapFirestoreError(error) };
  }
}

// src/features/appointments/services/appointment.service.ts
import { 
  getFirestore, 
  doc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  writeBatch,
  serverTimestamp,
  addDoc,
  runTransaction,
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import type { AppointmentStatus, UserAppointment } from '../domain/appointment.types';
import { NO_SHOW_GRACE_MS } from '../domain/appointment.constants';

export type CancelAppointmentResult = 
  | { ok: true; message: string; data?: any }
  | { ok: false; message: string; code?: string };

function mapFirebaseError(error: any): string {
  const code = error?.code || '';
  
  switch (code) {
    case 'permission-denied':
      return 'Você não tem permissão para isso.';
    case 'not-found':
      return 'Agendamento não encontrado.';
    case 'deadline-exceeded':
      return 'Tempo limite excedido. Tente novamente.';
    default:
      return error?.message || 'Erro ao processar agendamento. Tente novamente.';
  }
}

/**
 * Verifica as regras de negócio para um agendamento
 */
export function getAppointmentRules(appointment: { 
  status: AppointmentStatus; 
  startAtMs: number 
}): { 
  canCancel: boolean; 
  canReschedule: boolean; 
  message?: string;
  isExpired: boolean;
} {
  const now = Date.now();
  const isExpired = now >= appointment.startAtMs;
  const isNoShow = now >= appointment.startAtMs + NO_SHOW_GRACE_MS;
  
  // Já cancelado pelo app
  if (appointment.status === 'cancelled') {
    return { 
      canCancel: false, 
      canReschedule: false,
      isExpired: true,
      message: 'Este agendamento foi cancelado por você.' 
    };
  }
  
  // Não compareceu (no_show)
  if (appointment.status === 'no_show') {
    return { 
      canCancel: false, 
      canReschedule: true, // Pode reagendar mesmo depois de não comparecer
      isExpired: true,
      message: 'Você não compareceu a este agendamento. Pode reagendar.' 
    };
  }
  
  // Já realizado
  if (appointment.status === 'done') {
    return { 
      canCancel: false, 
      canReschedule: false,
      isExpired: true,
      message: 'Este serviço já foi realizado.' 
    };
  }
  
  // Em andamento
  if (appointment.status === 'in_progress') {
    return { 
      canCancel: false, 
      canReschedule: false,
      isExpired: true,
      message: 'Serviço em andamento não pode ser alterado.' 
    };
  }
  
  // Agendado ativo
  if (appointment.status === 'scheduled') {
    // Verifica se já passou do horário (sem considerar os 15min de tolerância)
    const passedTime = now >= appointment.startAtMs;
    
    return { 
      canCancel: !passedTime, // Só pode cancelar ANTES do horário
      canReschedule: true,    // Pode reagendar SEMPRE (mesmo depois)
      isExpired: passedTime,
      message: passedTime 
        ? 'Horário já passou. Você pode reagendar, mas não cancelar.' 
        : undefined
    };
  }
  
  return { canCancel: false, canReschedule: false, isExpired };
}

/**
 * Cancela um agendamento (apenas se permitido - antes do horário)
 */
export async function cancelAppointment(
  appointmentId: string,
  customerUid: string
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

    // Busca o agendamento para verificar regras
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);
    
    if (!appointmentSnap.exists) {
      return { ok: false, message: 'Agendamento não encontrado.' };
    }

    const appointmentData = appointmentSnap.data() as { status: AppointmentStatus; startAtMs: number };
    
    // Verifica regras
    const rules = getAppointmentRules(appointmentData);
    if (!rules.canCancel) {
      return { 
        ok: false, 
        message: rules.message || 'Não é possível cancelar este agendamento.' 
      };
    }

    const userAppointmentRef = doc(db, 'users', customerUid, 'appointments', appointmentId);
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
    return { ok: false, message: mapFirebaseError(error) };
  }
}
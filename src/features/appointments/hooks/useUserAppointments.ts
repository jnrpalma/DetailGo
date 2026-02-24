// src/features/appointments/hooks/useUserAppointments.ts
import { useEffect, useMemo, useState, useCallback } from 'react';

import {
  AppointmentStatus,
  UserAppointment,
} from '../domain/appointment.types';
import { watchUserAppointmentsWithFallback } from '../data/appointmentsRepo';
import { NO_SHOW_GRACE_MS } from '../domain/appointment.constants';

type Params = {
  uid?: string | null;
  statusIn?: readonly AppointmentStatus[];
  limitN?: number;
};

export function useUserAppointments(params: Params) {
  const { uid, statusIn, limitN = 50 } = params;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UserAppointment[]>([]);
  const [version, setVersion] = useState(0);

  const statusSet = useMemo(
    () => new Set<AppointmentStatus>(statusIn ?? []),
    [statusIn],
  );

  const mutate = useCallback(() => {
    setVersion(v => v + 1);
  }, []);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsub = watchUserAppointmentsWithFallback({
      uid,
      limitN,
      onChange: list => {
        const now = Date.now();

        const updatedList = list.map(item => {
          // Se já foi cancelado pelo app, mantém como cancelled
          if (item.status === 'cancelled') {
            return item;
          }
          
          // Se passou do horário + 15min e ainda está scheduled, vira no_show (não compareceu)
          if (
            item.status === 'scheduled' &&
            now > item.startAtMs + NO_SHOW_GRACE_MS
          ) {
            return {
              ...item,
              status: 'no_show' as const,
            };
          }
          
          return item;
        });

        const filtered =
          statusIn && statusIn.length > 0
            ? updatedList.filter(it => statusSet.has(it.status))
            : updatedList;

        // 👇 ORDENAÇÃO CORRIGIDA: mais recentes primeiro (decrescente)
        const sorted = [...filtered].sort((a, b) => b.startAtMs - a.startAtMs);

        setItems(sorted);
        setLoading(false);
      },
      onError: () => {
        setItems([]);
        setLoading(false);
      },
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, limitN, statusIn?.join('|'), version]);

  return { loading, items, mutate };
}
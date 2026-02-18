
import { useEffect, useMemo, useState } from 'react';

import { resolveDisplayStatus } from '../services/appointmentRules';
import { AppointmentStatus, UserAppointment } from '../domain/appointment.types';
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

  const statusSet = useMemo(
    () => new Set<AppointmentStatus>(statusIn ?? []),
    [statusIn]
  );

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
      onChange: (list) => {
        // 👇 A MAGIA ACONTECE AQUI: atualiza o status em memória
        const now = Date.now();
        const updatedList = list.map(item => {
          // Se o status original é 'scheduled' mas já passou da data + tolerância
          if (item.status === 'scheduled' && 
              now > item.startAtMs + NO_SHOW_GRACE_MS) {
            return {
              ...item,
              status: 'no_show' as const  // Força ser 'no_show' na interface
            };
          }
          return item;
        });

        // Filtra pelo status desejado (usando o status atualizado)
        const filtered = statusIn && statusIn.length > 0
          ? updatedList.filter((it) => statusSet.has(it.status))
          : updatedList;

        setItems(filtered);
        setLoading(false);
      },
      onError: () => {
        setItems([]);
        setLoading(false);
      },
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, limitN, statusIn?.join('|')]);

  return { loading, items };
}
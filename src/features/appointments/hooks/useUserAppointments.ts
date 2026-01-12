import { useEffect, useMemo, useState } from 'react';
import type { Appointment, AppointmentStatus } from '../model/appointment';
import { watchUserAppointmentsWithFallback } from '../data/appointmentsRepo';

type Params = {
  uid?: string | null;
  statusIn?: AppointmentStatus[]; // filtra no client (subcollection) + fallback global já vem filtrado se você quiser no próximo hook
  limitN?: number;
};

export function useUserAppointments(params: Params) {
  const { uid, statusIn, limitN = 50 } = params;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Appointment[]>([]);

  const statusSet = useMemo(() => new Set(statusIn ?? []), [statusIn]);

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
        // se foi passado statusIn, filtra aqui
        const filtered =
          statusIn && statusIn.length > 0
            ? list.filter((it) => statusSet.has(it.status))
            : list;

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
  }, [uid, limitN, statusSet, statusIn?.join('|')]);

  return { loading, items };
}

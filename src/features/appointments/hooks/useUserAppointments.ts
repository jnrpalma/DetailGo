import { useEffect, useMemo, useState } from 'react';
import type { UserAppointment, AppointmentStatus } from '../domain/appointment.types';
import { watchUserAppointmentsWithFallback } from '../data/appointmentsRepo';

type Params = {
  uid?: string | null;
  statusIn?: readonly AppointmentStatus[]; // ✅ aceita readonly (as const)
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
  }, [uid, limitN, statusIn?.join('|')]);

  return { loading, items };
}

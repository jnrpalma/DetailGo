import { useEffect, useMemo, useState } from 'react';

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

  const statusSet = useMemo(
    () => new Set<AppointmentStatus>(statusIn ?? []),
    [statusIn],
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
      onChange: list => {
        const now = Date.now();

        const updatedList = list.map(item => {
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

        const sorted = [...filtered].sort((a, b) => a.startAtMs - b.startAtMs);

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
  }, [uid, limitN, statusIn?.join('|')]);

  return { loading, items };
}

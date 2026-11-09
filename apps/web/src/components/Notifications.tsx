/**
 * Notificações opt-in (GROWTH_PLAN.md 2.9), per device: the new Desafio do Dia (in the morning)
 * and a league's closed week. Nothing is asked until the player ticks a box.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PushKeyResponse } from '@decabeca/contracts';
import { api } from '../lib/api';

type Prefs = { daily: boolean; league: boolean };
const KEY = 'dc_push';
const supported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;
const readPrefs = (): Prefs | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') as Prefs | null;
  } catch {
    return null;
  }
};
const savePrefs = (p: Prefs | null) => {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: the subscription still works */
  }
};
const toBytes = (b64: string) => {
  const s = atob(
    (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'),
  );
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export function Notifications() {
  const key = useQuery({
    queryKey: ['push-key'],
    queryFn: () => api<PushKeyResponse>('/v1/push/key'),
    enabled: supported(),
  });
  const [prefs, setPrefs] = useState<Prefs>({ daily: false, league: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The real state is the browser's subscription; the boxes only remember which kinds.
  useEffect(() => {
    if (!supported()) return;
    void navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setPrefs(
        sub ? (readPrefs() ?? { daily: true, league: true }) : { daily: false, league: false },
      );
    });
  }, []);

  if (!supported() || !key.data?.publicKey) return null;
  const publicKey = key.data.publicKey;

  async function change(next: Prefs) {
    setBusy(true);
    setError('');
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const current = await reg.pushManager.getSubscription();
      if (!next.daily && !next.league) {
        if (current) {
          await api('/v1/push/subscriptions', {
            method: 'DELETE',
            json: { endpoint: current.endpoint },
          });
          await current.unsubscribe();
        }
        savePrefs(null);
      } else {
        if ((await Notification.requestPermission()) !== 'granted') {
          setError('O navegador bloqueou as notificações. Libere nas configurações do site.');
          return;
        }
        const sub =
          current ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: toBytes(publicKey),
          }));
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        await api('/v1/push/subscriptions', {
          method: 'POST',
          json: { endpoint: json.endpoint, keys: json.keys, ...next },
        });
        savePrefs(next);
      }
      setPrefs(next);
    } catch {
      setError('Não deu para mudar as notificações agora. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-condensed text-2xl font-extrabold uppercase">Notificações</h2>
      <p className="text-chalk-soft">
        Só neste aparelho, só o que você marcar. Dá para desligar quando quiser.
      </p>
      {(
        [
          ['daily', 'Desafio do Dia novo (de manhã)'],
          ['league', 'Fechamento da semana nas suas ligas (segunda)'],
        ] as const
      ).map(([k, label]) => (
        <label key={k} className="flex min-h-11 items-center gap-3 font-semibold">
          <input
            type="checkbox"
            className="size-5 accent-cover"
            checked={prefs[k]}
            disabled={busy}
            onChange={(e) => void change({ ...prefs, [k]: e.target.checked })}
          />
          {label}
        </label>
      ))}
      {error && (
        <p role="alert" className="text-sm font-semibold text-cover">
          {error}
        </p>
      )}
    </section>
  );
}

/**
 * /entrar: only the ticket gate (sign in, create account, forgot password). `?criar=1` opens on
 * "Criar conta"; `?voltar=/path` is where a signed-in visitor goes next (else /conta). Google's
 * callback lands here too, so the same rule sends it on.
 */
import { Navigate, useSearchParams } from 'react-router';
import { AuthGate } from '../components/AuthGate';
import { Skeleton } from '../components/ui';
import { useAlbum, useMe } from '../lib/game';

/** A path on this site, never another origin (`//evil.com`). */
export const safeBack = (back: string | null) =>
  back?.startsWith('/') && !back.startsWith('//') ? back : null;

export function EntrarPage() {
  const me = useMe();
  const [params] = useSearchParams();
  const owned = useAlbum().data?.owned;
  if (!me.data) return <Skeleton className="h-[70vh]" />;
  const m = me.data;
  if (m.account) return <Navigate to={safeBack(params.get('voltar')) ?? '/conta'} replace />;
  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col justify-center py-4 sm:py-10">
      <div aria-hidden="true" className="scene-art room-dim" />
      <AuthGate
        initial={params.has('criar') ? 'register' : 'login'}
        nickname={m.nickname}
        stars={m.totalStars}
        stickers={owned}
      />
    </div>
  );
}

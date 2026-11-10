/**
 * What the player wears from the Clube and the Banca: a sticker finish (default and per sticker),
 * the passport theme and the crowd pack. Saved on the account (PATCH /v1/me/cosmetics, only owned
 * items); read with the entitlements while the Clube page is open (`launch.ts`). The passport
 * theme rides on <html data-passport> (index.css), the crowd pack on `sound.ts`.
 */
import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CrowdPack,
  EntitlementsResponse,
  EquipRequest,
  Finish,
  PassportTheme,
} from '@decabeca/contracts';
import { api, type ApiError } from './api';
import { useEntitlements } from './billing';
import { useMe } from './game';
import { isPageLaunched } from './launch';
import { setCrowdPack } from './sound';

export const FINISH_NAME: Record<Finish, string> = {
  acabamento_holografico: 'Holográfico',
  acabamento_cromado: 'Cromado',
  acabamento_clube: 'Clube',
};
export const PASSPORT_NAME: Record<PassportTheme, string> = {
  passaporte_retro: 'Retrô',
  passaporte_selecao: 'Seleção',
  passaporte_clube: 'Clube',
};
export const CROWD_NAME: Record<CrowdPack, string> = {
  torcida_charanga: 'Charanga',
  torcida_geral: 'Geral',
  torcida_clube: 'Clube',
};
/** `data-passport` values (index.css). */
export const PASSPORT_ATTR: Record<PassportTheme, string> = {
  passaporte_retro: 'retro',
  passaporte_selecao: 'selecao',
  passaporte_clube: 'clube',
};

/** The account's entitlements (null for guests and while the Clube is closed). */
export function useOwned(): EntitlementsResponse | null {
  const me = useMe().data;
  return useEntitlements(!!me?.account && isPageLaunched('clube')).data ?? null;
}

/** A sticker's finish: its own choice, else the default; `none` keeps it plain. */
export const finishOf = (e: EntitlementsResponse | null, playerId: string): Finish | null => {
  const own = e?.equipped.stickers[playerId];
  return own === 'none' ? null : (own ?? e?.equipped.finish ?? null);
};
export function useFinish() {
  const e = useOwned();
  return (playerId: string) => finishOf(e, playerId);
}

/** Wears or takes off items; the cache moves first so a choice shows at once. */
export function useEquip() {
  const qc = useQueryClient();
  return useMutation<EntitlementsResponse, ApiError, EquipRequest>({
    mutationFn: (json) => api('/v1/me/cosmetics', { method: 'PATCH', json }),
    onMutate: (patch) => {
      qc.setQueryData<EntitlementsResponse>(['entitlements'], (e) => {
        if (!e) return e;
        const next = { ...e.equipped, stickers: { ...e.equipped.stickers } };
        if (patch.finish !== undefined) next.finish = patch.finish;
        if (patch.passport !== undefined) next.passport = patch.passport;
        if (patch.crowd !== undefined) next.crowd = patch.crowd;
        for (const [id, f] of Object.entries(patch.stickers ?? {}))
          if (f) next.stickers[id] = f;
          else delete next.stickers[id];
        return { ...e, equipped: next };
      });
    },
    onSuccess: (data) => qc.setQueryData(['entitlements'], data),
    onError: () => void qc.invalidateQueries({ queryKey: ['entitlements'] }),
  });
}

/** Mounted once in the shell: the worn passport theme and crowd pack follow the account. */
export function useApplyCosmetics() {
  const e = useOwned();
  const passport = e?.equipped.passport ?? null;
  const crowd = e?.equipped.crowd ?? null;
  useEffect(() => {
    const root = document.documentElement;
    if (passport) root.dataset.passport = PASSPORT_ATTR[passport];
    else delete root.dataset.passport;
  }, [passport]);
  useEffect(() => setCrowdPack(crowd), [crowd]);
}

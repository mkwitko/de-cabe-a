/** Clube, cosmetics and gifts on the web: entitlements and the redirects to Stripe's pages. */
import { useQuery } from '@tanstack/react-query';
import type {
  CheckoutRequest,
  EntitlementsResponse,
  ProductKey,
  RedirectResponse,
} from '@decabeca/contracts';
import { api } from './api';

/** Accounts only (guests have no entitlements); `poll` re-reads while a payment settles. */
export const useEntitlements = (enabled: boolean, poll = false) =>
  useQuery({
    queryKey: ['entitlements'],
    queryFn: () => api<EntitlementsResponse>('/v1/me/entitlements'),
    enabled,
    refetchInterval: poll ? 3000 : false,
  });

/** Sends the browser to Stripe Checkout; it comes back to /clube. */
export async function checkout(product: ProductKey, leagueCode?: string) {
  const body: CheckoutRequest = { product, ...(leagueCode ? { leagueCode } : {}) };
  const { url } = await api<RedirectResponse>('/v1/billing/checkout', {
    method: 'POST',
    json: body,
  });
  location.assign(url);
}

/** Stripe's Customer Portal: card, invoices, cancel at period end. */
export async function openPortal() {
  const { url } = await api<RedirectResponse>('/v1/billing/portal', { method: 'POST' });
  location.assign(url);
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
/** Centavos → "R$ 9,90". */
export const brl = (centavos: number) => BRL.format(centavos / 100);

export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

/** The link a gift buyer shares: /presente/CODE opens the redeem page. */
export const giftLink = (code: string) => `${location.origin}/presente/${code}`;

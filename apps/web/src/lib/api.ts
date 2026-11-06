import type { ErrorBody } from '@decabeca/contracts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** Sign-in errors come from Better Auth in English; these are the ones a player can hit. */
const AUTH_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  USER_ALREADY_EXISTS: 'Esse e-mail já tem conta. Entre com ele.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Esse e-mail já tem conta. Entre com ele.',
  PASSWORD_TOO_SHORT: 'A senha precisa de pelo menos 8 caracteres.',
  INVALID_EMAIL: 'Confira o e-mail.',
  INVALID_TOKEN: 'Esse link expirou ou já foi usado. Peça outro.',
  PROVIDER_NOT_FOUND: 'Entrar com Google ainda não está disponível.',
};

/** JSON fetch against the API (same origin; Vite proxies /v1 in dev). */
export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: 'same-origin',
      ...rest,
      headers: {
        ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor.');
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // Our errors are { error: { code, message } }; sign-in errors (Better Auth) are { code, message }.
    const err =
      (body as ErrorBody | null)?.error ?? (body as { code?: string; message?: string } | null);
    const code = err?.code ?? 'INTERNAL_ERROR';
    throw new ApiError(
      res.status,
      code,
      AUTH_MESSAGES[code] ?? err?.message ?? 'Erro inesperado.',
      (err as { details?: Record<string, unknown> } | null)?.details ?? {},
    );
  }
  return body as T;
}

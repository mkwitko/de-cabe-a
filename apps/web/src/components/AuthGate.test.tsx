import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGate } from './AuthGate';

/** The gate as the server would answer GET /v1/config. */
const render = (google: boolean) => {
  const qc = new QueryClient();
  qc.setQueryData(['config'], { google });
  return renderToString(
    <QueryClientProvider client={qc}>
      <AuthGate initial="login" nickname={null} stars={0} />
    </QueryClientProvider>,
  );
};

describe('AuthGate', () => {
  it('offers Google only when the server has it configured', () => {
    expect(render(true)).toContain('Continuar com Google');
    const off = render(false);
    expect(off).not.toContain('Continuar com Google');
    expect(off).not.toContain('ou com e-mail');
    expect(off).toContain('E-mail');
  });
});

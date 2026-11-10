import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';

const html = renderToString(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  </QueryClientProvider>,
);

describe('Home at launch', () => {
  it('shows the brand as the page heading', () => {
    expect(html).toMatch(/<h1[^>]*>.*De Cabeça F\.C\..*<\/h1>/s);
    expect(html).toContain('Minijogos de futebol');
  });

  it('puts Career Path first and opens its track', () => {
    expect(html).toContain('Career Path');
    expect(html).toContain('href="/career-path"');
  });

  it('lists the closed modes as Em breve, without links to them', () => {
    expect(html).toContain('Em breve');
    expect(html).toContain('Football Grid');
    expect(html).not.toContain('href="/grid');
    expect(html).not.toContain('href="/d/hoje"');
  });
});

import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { Home } from './App';

describe('Home', () => {
  const html = renderToString(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

  it('shows the brand name as the page heading', () => {
    expect(html).toMatch(/<h1[^>]*>.*De Cabeça.*<\/h1>/s);
  });

  it('lists both MVP games with a practice link each', () => {
    expect(html).toContain('Career Path');
    expect(html).toContain('Football Grid');
    expect(html).toContain('href="/career-path/practice"');
    expect(html).toContain('href="/grid/practice"');
  });

  it('shows the no-challenge state when the API has no daily', () => {
    const empty = renderToString(
      <MemoryRouter>
        <Home
          games={{
            today: '2026-11-05',
            games: [
              { mode: 'CAREER_PATH', name: 'Career Path', daily: null },
              { mode: 'FOOTBALL_GRID', name: 'Grid', daily: null },
            ],
          }}
        />
      </MemoryRouter>,
    );
    expect(empty.match(/Sem desafio hoje/g)).toHaveLength(2);
  });
});

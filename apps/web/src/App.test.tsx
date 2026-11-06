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

  it('lists both games with a link to their levels', () => {
    expect(html).toContain('Career Path');
    expect(html).toContain('Football Grid');
    expect(html).toContain('href="/career-path"');
    expect(html).toContain('href="/grid"');
  });

  it('shows track progress and the next level from the API', () => {
    const page = renderToString(
      <MemoryRouter>
        <Home
          games={{
            games: [
              {
                mode: 'CAREER_PATH',
                name: 'Career Path',
                levels: 30,
                completed: 4,
                stars: 9,
                nextLevel: 5,
              },
              {
                mode: 'FOOTBALL_GRID',
                name: 'Grid',
                levels: 0,
                completed: 0,
                stars: 0,
                nextLevel: null,
              },
            ],
          }}
        />
      </MemoryRouter>,
    );
    expect(page).toContain('href="/career-path/5"');
    expect(page).toContain('Jogar fase 5');
    expect(page).toContain('Fases a caminho.');
  });
});

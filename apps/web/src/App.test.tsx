import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Home } from './App';

describe('Home', () => {
  const html = renderToString(<Home />);

  it('shows the brand name as the page heading', () => {
    expect(html).toMatch(/<h1[^>]*>.*De Cabeça.*<\/h1>/s);
  });

  it('lists both MVP games as coming soon', () => {
    expect(html).toContain('Career Path');
    expect(html).toContain('Football Grid');
    expect(html.match(/Em breve/g)).toHaveLength(2);
  });
});

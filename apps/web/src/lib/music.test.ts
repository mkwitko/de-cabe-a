import { describe, expect, it } from 'vitest';
import { readMusic, sceneFor } from './music';
import { readSfx } from './sound';

const store = (o: Record<string, string>) => ({ getItem: (k: string) => o[k] ?? null });

describe('preferences', () => {
  it('migrates the old sound key to Efeitos, new key wins', () => {
    expect(readSfx(store({ dc_sound: 'on' }))).toBe(true);
    expect(readSfx(store({ dc_sound: 'on', dc_sfx: 'off' }))).toBe(false);
    expect(readSfx(store({}))).toBe(false);
  });
  it('music is off unless explicitly on, independent of Efeitos', () => {
    expect(readMusic(store({ dc_sound: 'on' }))).toBe(false);
    expect(readMusic(store({ dc_music: 'on' }))).toBe(true);
  });
});

describe('sceneFor', () => {
  it('level inside a level route, menu elsewhere', () => {
    expect(sceneFor('/career-path/4')).toBe('level');
    expect(sceneFor('/grid/12/')).toBe('level');
    expect(sceneFor('/career-path')).toBe('menu');
    expect(sceneFor('/')).toBe('menu');
    expect(sceneFor('/conta')).toBe('menu');
  });
});

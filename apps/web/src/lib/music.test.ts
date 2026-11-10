import { describe, expect, it } from 'vitest';
import { sceneFor, trackFor } from './music';
import { DEFAULTS, readSettings } from './settings';

const store = (o: Record<string, string>) => ({ getItem: (k: string) => o[k] ?? null });

describe('readSettings', () => {
  it('defaults: sound off, auto track, motion follows the system', () => {
    expect(readSettings(store({}))).toEqual(DEFAULTS);
  });
  it('migrates the old keys: dc_music, dc_sfx, and dc_sound as Efeitos (dc_sfx wins)', () => {
    expect(readSettings(store({ dc_music: 'on' }))).toMatchObject({ music: true, sfx: false });
    expect(readSettings(store({ dc_sound: 'on' }))).toMatchObject({ music: false, sfx: true });
    expect(readSettings(store({ dc_sound: 'on', dc_sfx: 'off' })).sfx).toBe(false);
  });
  it('the saved object wins over the old keys', () => {
    const saved = JSON.stringify({
      ...DEFAULTS,
      music: false,
      musicVolume: 0.3,
      track: 'batucada',
    });
    expect(readSettings(store({ dc_settings: saved, dc_music: 'on' }))).toMatchObject({
      music: false,
      musicVolume: 0.3,
      track: 'batucada',
    });
  });
  it('repairs bad values field by field', () => {
    const saved = JSON.stringify({ music: 'yes', musicVolume: 7, sfxVolume: 'x', track: 'funk' });
    expect(readSettings(store({ dc_settings: saved }))).toEqual({
      ...DEFAULTS,
      musicVolume: 1,
    });
    expect(readSettings(store({ dc_settings: '{oops' }))).toEqual(DEFAULTS);
  });
});

describe('sceneFor / trackFor', () => {
  it('level inside a level route, menu elsewhere', () => {
    expect(sceneFor('/career-path/4')).toBe('level');
    expect(sceneFor('/grid/12/')).toBe('level');
    expect(sceneFor('/career-path')).toBe('menu');
    expect(sceneFor('/')).toBe('menu');
    expect(sceneFor('/conta')).toBe('menu');
  });
  it('auto picks the torcida between levels and batucada inside one; a fixed choice stays', () => {
    expect(trackFor('auto', 'menu')).toBe('torcida-organizada');
    expect(trackFor('auto', 'level')).toBe('batucada');
    expect(trackFor('murga', 'level')).toBe('murga');
  });
});

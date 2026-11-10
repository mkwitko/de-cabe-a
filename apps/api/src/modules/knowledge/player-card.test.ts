import { describe, expect, it, vi } from 'vitest';
import { stickerPhoto } from './player-card';

vi.mock('../album/cutouts.json', () => ({
  default: {
    p1: { file: '/cutouts/{tier}/p1.webp', photoFile: 'A.jpg', face: [0.3, 0.2, 0.4, 0.3] },
  },
}));

describe('stickerPhoto', () => {
  const base = { id: 'p1', photoAuthor: 'Fulano', photoLicense: 'CC BY-SA 4.0' };

  it('serves the cut-out made from the current photo, credited as cropped', () => {
    expect(stickerPhoto({ ...base, photoFile: 'A.jpg' })).toMatchObject({
      cutout: '/cutouts/{tier}/p1.webp',
      cutoutFace: [0.3, 0.2, 0.4, 0.3],
      photoCredit: 'Foto: Fulano · CC BY-SA 4.0 · recortada',
    });
  });

  it('drops a cut-out made from an older photo', () => {
    expect(stickerPhoto({ ...base, photoFile: 'B.jpg' })).toMatchObject({
      cutout: null,
      cutoutFace: null,
      photoCredit: 'Foto: Fulano · CC BY-SA 4.0',
    });
  });

  it('has nothing without a photo', () => {
    expect(stickerPhoto({ ...base, photoFile: null })).toEqual({
      photo: null,
      cutout: null,
      photoCredit: null,
    });
  });
});

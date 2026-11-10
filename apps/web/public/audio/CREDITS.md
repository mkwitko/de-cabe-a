# Music credits

Four football loops, all CC0 1.0 (public domain dedication) on Freesound; the licence was checked on each sound's page on 2026-11-10. No attribution is required; credited anyway. Each file is a cut of the recording (start and length below), loudness-matched to -20 LUFS, with a 3 s crossfade from its end into its start so it loops without a seam (0.25 s for the samba loop), encoded to Ogg Vorbis q3 and AAC 96 kbps (Safari). Source files were the Freesound previews (MP3, 128 kbps).

| File                               | Name in Ajustes | Title                                                                  | Author        | Licence | Source                                                    | Cut           |
| ---------------------------------- | --------------- | ---------------------------------------------------------------------- | ------------- | ------- | --------------------------------------------------------- | ------------- |
| arquibancada.ogg, arquibancada.m4a | Arquibancada    | Soccer fans screaming and playing drums in a small stadium of Chile    | felix.blume   | CC0 1.0 | https://freesound.org/people/felix.blume/sounds/500250/   | 0:15, 90 s    |
| batucada.ogg, batucada.m4a         | Batucada        | Batucada rehearsal in Chile                                            | felix.blume   | CC0 1.0 | https://freesound.org/people/felix.blume/sounds/411465/   | 1:00, 90 s    |
| charanga.ogg, charanga.m4a         | Charanga        | tradicional village carnival brass band - drum, tube, trumpet 2.wav    | speedyrce     | CC0 1.0 | https://freesound.org/people/speedyrce/sounds/460512/     | 0:08, 68 s    |
| samba.ogg, samba.m4a               | Samba-enredo    | SAMBA CARIOCA CARNAVAL RIO BRAZIL (samba-enredo cavaquinho intro loop) | carlosmancuso | CC0 1.0 | https://freesound.org/people/carlosmancuso/sounds/766529/ | whole, 28.6 s |

## Crowd packs (Clube and Banca)

Three 6 s cuts of the loops above play the broadcast roar and the win's roar when a crowd pack is worn (`src/lib/sound.ts`). Each is the loudest 6 s of its loop, with a 0.12 s fade-in and a 1.5 s fade-out, encoded to Ogg Vorbis q3 and AAC 96 kbps. Same CC0 1.0 sources and authors as above.

| File                                       | Pack in Ajustes | Cut from                         | Variation synthesised in sound.ts    |
| ------------------------------------------ | --------------- | -------------------------------- | ------------------------------------ |
| torcida-charanga.ogg, torcida-charanga.m4a | Charanga        | charanga (speedyrce), 0:26       | brass stab after the win fanfare     |
| torcida-geral.ogg, torcida-geral.m4a       | Geral           | arquibancada (felix.blume), 0:18 | none                                 |
| torcida-clube.ogg, torcida-clube.m4a       | Clube           | batucada (felix.blume), 0:29     | two bars of claps (pa, pa, pa-pa-pa) |

Other sound effects are synthesised with Web Audio in `src/lib/sound.ts`; no files.

# Art and animation credits

Everything below is our own; no stock images or third-party animations.

| File                            | What                                 | Origin                                                                                                                                                                 |
| ------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public/img/vestiario-night.webp | Home scene: the locker room by night | Generated for this project on 2026-11-10 with Figma AI image generation (model gpt-image-2.5-flare) from our own prompts; no people, text or logos; re-encoded to WebP |

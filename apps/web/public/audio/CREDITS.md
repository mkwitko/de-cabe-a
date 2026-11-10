# Music credits

Three football loops, all CC0 1.0 (public domain dedication) on Freesound; the licence was checked on each sound's page on 2026-11-10. No attribution is required; credited anyway. Each file is a cut of the recording (start and length below), loudness-matched to about -19 LUFS (peak-limited), with a 3 s crossfade from its end into its start so it loops without a seam, encoded to Ogg Vorbis q3 and AAC 96 kbps (Safari). Source files were the Freesound previews (MP3, 128 kbps). Arquibancada, Charanga, Samba-enredo, Torcida organizada and Maracana were removed from Ajustes (saved choices fall back to Automatica).

| File                       | Name in Ajustes | Title                                                                                      | Author       | Licence | Source                                                   | Cut        |
| -------------------------- | --------------- | ------------------------------------------------------------------------------------------ | ------------ | ------- | -------------------------------------------------------- | ---------- |
| batucada.ogg, batucada.m4a | Batucada        | Batucada rehearsal in Chile                                                                | felix.blume  | CC0 1.0 | https://freesound.org/people/felix.blume/sounds/411465/  | 1:00, 90 s |
| hinchada.ogg, hinchada.m4a | Hinchada        | Explosions, football's chants in street celebration (in the Boca Juniors fan national day) | bienvenido69 | CC0 1.0 | https://freesound.org/people/bienvenido69/sounds/537585/ | 0:00, 72 s |
| murga.ogg, murga.m4a       | Murga           | 080519-003.wav (murga, Buenos Aires)                                                       | cabro        | CC0 1.0 | https://freesound.org/people/cabro/sounds/341318/        | 0:05, 90 s |

## Crowd packs (Clube and Banca)

Three 6 s cuts of the loops above play the broadcast roar and the win's roar when a crowd pack is worn (`src/lib/sound.ts`). Each is the loudest 6 s of its loop, with a 0.12 s fade-in and a 1.5 s fade-out, encoded to Ogg Vorbis q3 and AAC 96 kbps. Cut from loops that have since left the music list (arquibancada and batucada by felix.blume, charanga by speedyrce; all CC0 1.0 on Freesound); the cuts themselves stay for the crowd packs.

| File                                       | Pack in Ajustes | Cut from                         | Variation synthesised in sound.ts    |
| ------------------------------------------ | --------------- | -------------------------------- | ------------------------------------ |
| torcida-charanga.ogg, torcida-charanga.m4a | Charanga        | charanga (speedyrce), 0:26       | brass stab after the win fanfare     |
| torcida-geral.ogg, torcida-geral.m4a       | Geral           | arquibancada (felix.blume), 0:18 | none                                 |
| torcida-clube.ogg, torcida-clube.m4a       | Clube           | batucada (felix.blume), 0:29     | two bars of claps (pa, pa, pa-pa-pa) |

Other sound effects are synthesised with Web Audio in `src/lib/sound.ts`; no files.

# Art and animation credits

Everything below is our own; no stock images or third-party animations.

| File                            | What                                                                                                       | Origin                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public/img/vestiario-night.webp | Home scene: the locker room by night                                                                       | Generated for this project on 2026-11-10 with Figma AI image generation (model gpt-image-2.5-flare) from our own prompts; no people, text or logos; re-encoded to WebP |
| public/lottie/dust.json         | Dust drifting in the floodlight (Lottie)                                                                   | Authored for this project (22 dots, 8 s loop); no LottieFiles asset used                                                                                               |
| src/lib/lottie-art.ts           | Lottie moments: rare-pack tear and burst, title glint, 3-star fireworks and confetti, ball-in-the-net loop | Authored for this project as code (coloured at play time); no LottieFiles asset used                                                                                   |

The Lottie player is `@lottiefiles/dotlottie-react` (MIT); its WebAssembly file is served from our own domain.

"""Bakes the card's look into the cut-outs, once per rarity, so the browser does no grading.

For every master cut-out (cutout.py writes them, levelled and feathered, to
scripts/research/.cache/cutouts/master/<playerId>.webp) and each of the eight rarities:
  - tritone: luminance mapped deep -> mid -> light -> white (the palette of index.css `.rar-*`:
    --deep, --mid, --light; keep the two in sync);
  - rim light: the silhouette minus itself shifted down-right, softened, screened in --light on
    the top-left edge;
  - the card's fades, placed by the face box (cutouts.json `face`): the shoulders fade out where
    the name starts and the sides fade into the night, as the card lays the face out
    (StickerCard: face 25cqw wide, centred), so the card needs no CSS mask;
  - written 480px wide, at most 60 KB, to apps/web/public/cutouts/<tier>/<playerId>.webp.

Run: venv/bin/python -I scripts/research/cutouts/bake.py [--only ID,...]
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
MASTER = ROOT / "scripts/research/.cache/cutouts/master"
OUT = ROOT / "apps/web/public/cutouts"
MANIFEST = ROOT / "apps/api/src/modules/album/cutouts.json"
WIDTH = 480
MAX_BYTES = 60 * 1024
# tier dir -> (deep, mid, light); index.css `.rar-*` holds the same colours
TIERS = {
    "bronze": ("#24130a", "#8a5330", "#f6dcc0"),
    "prata": ("#12161c", "#66717f", "#f2f5f9"),
    "ouro": ("#241800", "#9a7300", "#fff3c2"),
    "ouro-brilhante": ("#2a1600", "#b98400", "#fff7d6"),
    "destaque": ("#06180f", "#1d7347", "#eaffea"),
    "selecao": ("#081032", "#2c4cae", "#e6eeff"),
    "idolo": ("#24090e", "#8a2632", "#f8e8c8"),
    "lenda": ("#0f0820", "#5a2a9e", "#f5ebff"),
}
DEFAULT_FACE = (0.353, 0.188, 0.294, 0.235)  # cutout.py's crop rule, for a cut-out without one


def rgb(h: str) -> np.ndarray:
    return np.array([int(h[i : i + 2], 16) for i in (1, 3, 5)], np.float32) / 255


def fades(w: int, h: int, face) -> np.ndarray:
    """Alpha factor of the card's fades, in image pixels. On the card the face is 25cqw wide
    with its top at 29.3cqw: the shoulders fade from 66.7cqw to 102.7cqw down the card (1.5 to
    2.94 face widths below the face top), the sides from 32cqw to 48cqw off the centre (1.28 to
    1.92 face widths)."""
    fx, fy, fw, _ = face
    fwp = fw * w
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    below = (ys - fy * h) / fwp
    side = np.abs(xs - (fx + fw / 2) * w) / fwp
    v = np.clip((2.94 - below) / (2.94 - 1.5), 0, 1)
    s = np.clip((1.92 - side) / (1.92 - 1.28), 0, 1)
    return v * s


def bake(pid: str, face) -> list[int]:
    src = Image.open(MASTER / f"{pid}.webp").convert("RGBA")
    w = min(WIDTH, src.width)
    src = src.resize((w, w * 5 // 4), Image.LANCZOS)
    arr = np.asarray(src).astype(np.float32) / 255
    h = arr.shape[0]
    a = arr[:, :, 3]
    lum = arr[:, :, :3] @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    # rim: offset 0.048 face widths (1.2cqw on a 25cqw face), softened by a fifth of that
    face = face or DEFAULT_FACE
    d = max(1, round(0.048 * face[2] * w))
    shifted = np.zeros_like(a)
    shifted[d:, d:] = a[:-d, :-d]
    rim = np.clip(a - shifted, 0, 1)
    rim = np.asarray(Image.fromarray((rim * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(d / 5))) / 255.0
    alpha = a * fades(w, h, face)
    sizes = []
    for tier, (deep, mid, light) in TIERS.items():
        stops = np.stack([rgb(deep), rgb(mid), rgb(light), np.ones(3, np.float32)])
        xp = np.linspace(0, 1, 4)
        col = np.stack([np.interp(lum, xp, stops[:, c]) for c in range(3)], -1)
        glow = (rim * 0.75)[:, :, None] * rgb(light)
        col = 1 - (1 - col) * (1 - glow)  # screen
        out = np.dstack([col, alpha])
        img = Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
        dest = OUT / tier / f"{pid}.webp"
        dest.parent.mkdir(parents=True, exist_ok=True)
        for q in (80, 70, 60, 50, 40):
            img.save(dest, "WEBP", quality=q, method=6, alpha_quality=70)
            if dest.stat().st_size <= MAX_BYTES:
                break
        sizes.append(dest.stat().st_size)
    return sizes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    only = set(filter(None, args.only.split(",")))
    manifest = json.loads(MANIFEST.read_text())
    total = []
    for pid, entry in manifest.items():
        if only and pid not in only:
            continue
        if not (MASTER / f"{pid}.webp").exists():
            print(f"no master for {pid}", file=sys.stderr)
            continue
        total += bake(pid, entry.get("face"))
    if total:
        print(f"{len(total)} files, max {max(total) // 1024} KB, mean {sum(total) // len(total) // 1024} KB, total {sum(total) // 1048576} MB")


if __name__ == "__main__":
    sys.exit(main())

"""Sticker cut-outs: each player's Commons portrait without its background, head and shoulders.

Pipeline (offline, re-runnable; downloads are cached in scripts/research/.cache/cutouts/):
  1. list-players.ts prints the players (Career Path answers + stickers in the DB) as JSON lines;
  2. this script downloads each photo (Special:FilePath, one every 5 s), finds the largest face
     (OpenCV Haar), removes the background with rembg (isnet-general-use: close to birefnet-portrait on these
     portraits at a tenth of the CPU time), keeps only the person whose face it is,
     crops head and shoulders (4:5, face-relative), levels its exposure (luminance percentiles and a
     gamma that puts the median at mid-grey, so the card's tritone grade lands the same on every
     photo), feathers every edge where the photo or the crop cuts the person (no hard rectangles),
     and writes a transparent master WebP 384-768px wide (as big as the source allows) to
     scripts/research/.cache/cutouts/master/<playerId>.webp (not served); bake.py then grades it
     once per rarity into apps/web/public/cutouts/<tier>/<playerId>.webp (what the card loads);
  3. quality check: the face must survive the mask, the person must fill a sane share of the
     frame and reach the bottom edge (shoulders), the source must be big enough. Failures are
     skipped and listed in skipped.json with the reason.
  4. apps/api/src/modules/album/cutouts.json maps playerId -> file (`/cutouts/{tier}/<id>.webp`,
     the card fills in its rarity's tier), source photo, author,
     licence, Commons page and `face` (x, y, w, h of the face as fractions of the image), which the
     card uses to place every head at one scale; the API serves `cutout` from it (only while the
     player's photoFile still matches). The cut-out is a derivative ("recortada"): CC BY / BY-SA / CC0 / PD allow it;
     BY-SA derivatives stay BY-SA, so the credit keeps the licence of the source.

Setup: python3 -m venv venv && venv/bin/pip install "rembg[cpu]" pillow "opencv-python-headless<5"
Run:   venv/bin/python -I scripts/research/cutouts/cutout.py players.jsonl [--model NAME] [--only ID,...]
       (`--from-manifest` instead of players.jsonl re-cuts the players already in cutouts.json, no DB)
       (resumable: players already cut or skipped from the same photo are left alone; --force redoes them)
Then:  venv/bin/python -I scripts/research/cutouts/bake.py [--only ID,...]
"""

import argparse
import io
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / "scripts/research/.cache/cutouts"
OUT = CACHE / "master"
SERVED = ROOT / "apps/web/public/cutouts"
MANIFEST = ROOT / "apps/api/src/modules/album/cutouts.json"
SKIPPED = Path(__file__).with_name("skipped.json")
UA = "DeCabeca/0.1 (football quiz; research script)"
GAP = 5.0  # seconds between downloads (Commons answers 429 to faster bursts)
W_MIN, W_MAX = 384, 768  # output width; 4:5
# Rejected by eye on the contact sheet (another person or the background left in the cut-out).
REJECT = {
    "01a1ac22-9321-75e8-bd57-d3230c63dad3": "Diego Maradona: two people",
    "01a1ac27-bd28-7115-91e1-df1ca1737101": "Djalma Santos: people behind",
    "01a1ac2a-5775-741a-9660-a336cf9df12f": "Adílson Batista: background left",
    "01a1ac2b-ab5e-7069-8e75-b2b1125db541": "Gabriel Paulista: two people",
    "01a1ad4f-3b87-73fe-b697-17dec88eafa4": "Andrés Iniesta: trophy and background",
}
_last = 0.0


def download(file: str, dest: Path) -> bytes:
    global _last
    if dest.exists():
        return dest.read_bytes()
    # 1920 is a standard thumbnail step (odd widths are rendered on demand and throttled harder)
    url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{urllib.parse.quote(file)}?width=1920"
    for tries in range(5):
        time.sleep(max(0, _last + GAP - time.time()))
        _last = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            dest.write_bytes(data)
            return data
        except urllib.error.HTTPError as e:  # 429: wait as long as Commons asks, at least a minute
            err = e
            print(f"  {file}: HTTP {e.code} retry-after {e.headers.get('Retry-After')}", file=sys.stderr, flush=True)
            if e.code != 429:
                break
            time.sleep(min(300, max(60 * (tries + 1), int(e.headers.get("Retry-After") or 0))))
        except Exception as e:  # network: retried, then reported
            err = e
            print(f"  {file}: {e!r}", file=sys.stderr, flush=True)
            time.sleep(10 * (tries + 1))
    raise RuntimeError(f"download failed: {err}")


FACES = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def largest_face(rgb: np.ndarray):
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    side = min(gray.shape)
    found = FACES.detectMultiScale(gray, 1.1, 6, minSize=(max(24, side // 14),) * 2)
    return max(found, key=lambda f: f[2] * f[3]) if len(found) else None


def levels(rgba: np.ndarray) -> np.ndarray:
    """Stretches the person's luminance 3rd..97th percentile to 0..1, then a gamma that puts its
    median at mid-grey: dark, flat and blown-out photos all reach the grade alike."""
    rgb = rgba[:, :, :3].astype(np.float32) / 255
    on = rgba[:, :, 3] > 150
    if on.sum() < 100:
        return rgba
    lum = (rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32))[on]
    lo, hi = np.percentile(lum, 3), np.percentile(lum, 97)
    mid = np.clip((np.median(lum) - lo) / max(0.05, hi - lo), 0.05, 0.95)
    gamma = float(np.clip(np.log(0.5) / np.log(mid), 0.6, 1.7))
    out = np.clip((rgb - lo) / max(0.05, hi - lo), 0, 1) ** gamma
    rgba = rgba.copy()
    rgba[:, :, :3] = (out * 255 + 0.5).astype(np.uint8)
    return rgba


def feather(a: np.ndarray, box, ramp: float) -> tuple[np.ndarray, float]:
    """Fades alpha towards each side of `box` (the part of the crop the photo covers: where the
    person is cut by the photo's or the crop's edge). Returns the new alpha and how much of the
    sides and top was solid before (a hard straight edge when high)."""
    h, w = a.shape
    l, t, r, b = box
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.minimum.reduce([xs - l, r - 1 - xs, ys - t, (b - 1 - ys) * 0.6])
    edges = np.concatenate([a[t:b, l], a[t:b, r - 1], a[t, l:r]])  # the bottom is always cut
    hard = float((edges > 0.5).mean())
    return a * np.clip(d / (w * ramp), 0, 1), hard


def cut(rgb: np.ndarray, session):
    """Returns (RGBA crop or None, reason the crop is rejected or None, face box, hard-edge share)."""
    face = largest_face(rgb)
    if face is None:
        return None, "no face found", None, 0
    fx, fy, fw, fh = (int(v) for v in face)
    rgba = np.array(remove(Image.fromarray(rgb), session=session).convert("RGBA"))
    alpha = rgba[:, :, 3]
    # keep only the person whose face it is (team-mates, crowd, other limbs go)
    n, labels = cv2.connectedComponents((alpha > 64).astype(np.uint8), connectivity=8)
    cx, cy = fx + fw // 2, fy + fh // 2
    keep = labels[cy, cx]
    if keep == 0:
        return None, "face lost in the mask", None, 0
    alpha = np.where(labels == keep, alpha, 0).astype(np.uint8)
    rgba[:, :, 3] = alpha
    # head and shoulders, 4:5: 4.25 faces tall, face top 0.8 face below the crop top
    # (tighter when the photo ends higher: the crop never runs past the bottom of the photo)
    y0 = int(fy - fh * 0.8)
    ch = min(fh * 4.25, rgb.shape[0] - y0)
    if ch < fh * 2.6:
        return None, "photo ends at the chin", None, 0
    cw = ch * 4 / 5
    x0 = int(cx - cw / 2)
    x1, y1 = int(x0 + cw), int(y0 + ch)
    if ch < 220:
        return None, f"source too small ({int(ch)}px crop)", None, 0
    W = int(np.clip(round(cw / 16) * 16, W_MIN, W_MAX))
    H = W * 5 // 4
    pad = Image.new("RGBA", (x1 - x0, y1 - y0))
    pad.paste(Image.fromarray(rgba), (-x0, -y0))
    arr = levels(np.array(pad.resize((W, H), Image.LANCZOS)))
    k = W / (x1 - x0)
    ph, pw = rgb.shape[:2]
    box = (
        max(0, round(-x0 * k)),
        max(0, round(-y0 * k)),
        min(W, round((pw - x0) * k)),
        min(H, round((ph - y0) * k)),
    )
    a = arr[:, :, 3] / 255.0  # the checks below read the mask before feathering
    soft, hard = feather(a, box, 0.06)
    arr[:, :, 3] = (soft * 255 + 0.5).astype(np.uint8)
    out = Image.fromarray(arr)
    fbox = [round((fx - x0) / cw, 3), round((fy - y0) / ch, 3), round(fw / cw, 3), round(fh / ch, 3)]
    cover = float((a > 0.5).mean())
    bottom = float((a[-6:] > 0.5).mean())
    face_kept = float(a[int(H * 0.22) : int(H * 0.40), int(W * 0.41) : int(W * 0.59)].mean())
    if face_kept < 0.85:
        return out, f"face not solid in the mask ({face_kept:.2f})", fbox, hard
    if not 0.2 <= cover <= 0.78:
        return out, f"coverage {cover:.2f}", fbox, hard
    if float((a[: int(H * 0.04)] > 0.5).mean()) > 0.2:
        return out, "background left above the head", fbox, hard
    if bottom < 0.2:
        return out, f"shoulders do not reach the bottom ({bottom:.2f})", fbox, hard
    return out, None, fbox, hard


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("players", nargs="?")
    ap.add_argument("--from-manifest", action="store_true", help="re-cut the players in cutouts.json")
    ap.add_argument("--model", default="isnet-general-use")
    ap.add_argument("--only", default="")
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--force", action="store_true", help="redo players already cut or skipped")
    args = ap.parse_args()
    only = set(filter(None, args.only.split(",")))
    out_dir = Path(args.out)
    (CACHE / "src").mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    skipped = json.loads(SKIPPED.read_text()) if SKIPPED.exists() else {}
    session = new_session(args.model)
    if args.from_manifest:
        players = [
            {"id": k, "canonicalName": k, "photoFile": v["photoFile"], "photoAuthor": v["author"], "photoLicense": v["license"]}
            for k, v in manifest.items()
        ]
    else:
        players = [json.loads(l) for l in Path(args.players).read_text().splitlines() if l.strip()]
    for i, p in enumerate(players):
        if only and p["id"] not in only:
            continue
        pid, file = p["id"], p["photoFile"]
        done = manifest.get(pid, {}).get("photoFile") or skipped.get(pid, {}).get("photoFile")
        if done == file and out_dir == OUT and not args.force:
            continue
        try:
            if pid in REJECT:
                raise ValueError(f"rejected by eye ({REJECT[pid]})")
            data = download(file, CACHE / "src" / pid)
            rgb = np.array(Image.open(io.BytesIO(data)).convert("RGB"))
            img, reason, face, hard = cut(rgb, session)
        except Exception as e:
            img, reason, face, hard = None, str(e)[:120], None, 0
        if reason and img is not None and out_dir != OUT:  # trial run: keep the reject to look at
            img.save(out_dir / f"{pid}.fail.webp", "WEBP", quality=80)
        if reason and manifest.get(pid, {}).get("photoFile") == file and out_dir == OUT:
            # a re-cut (--force) that fails keeps the cut-out already served (some are hand-made)
            print(f"[{i + 1}/{len(players)}] keep previous {p['canonicalName']}: {reason}", flush=True)
            continue
        if reason:
            # a failed download is retried on the next run; a rejected cut-out is not
            retry = reason.startswith("download failed")
            skipped[pid] = {"name": p["canonicalName"], "photoFile": None if retry else file, "reason": reason}
            manifest.pop(pid, None)
            (out_dir / f"{pid}.webp").unlink(missing_ok=True)
            for baked in SERVED.glob(f"*/{pid}.webp"):
                baked.unlink()
            print(f"[{i + 1}/{len(players)}] skip {p['canonicalName']}: {reason}", flush=True)
            save(out_dir, manifest, skipped)
            continue
        img.save(out_dir / f"{pid}.webp", "WEBP", quality=90, method=6, alpha_quality=90)
        skipped.pop(pid, None)
        manifest[pid] = {
            "file": f"/cutouts/{{tier}}/{pid}.webp",
            "photoFile": file,
            "author": p["photoAuthor"],
            "license": p["photoLicense"],
            "source": f"https://commons.wikimedia.org/wiki/File:{urllib.parse.quote(file)}",
            "face": face,
        }
        kb = (out_dir / f"{pid}.webp").stat().st_size // 1024
        edge = f" hard-edge {hard:.2f} (feathered)" if hard > 0.15 else ""
        print(f"[{i + 1}/{len(players)}] ok {p['canonicalName']} {img.width}px {kb} KB{edge}", flush=True)
        save(out_dir, manifest, skipped)


def save(out_dir, manifest, skipped):
    """After every player, so a long run can stop and resume."""
    if out_dir == OUT:
        MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), ensure_ascii=False, indent=2) + "\n")
        SKIPPED.write_text(json.dumps(dict(sorted(skipped.items())), ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    sys.exit(main())

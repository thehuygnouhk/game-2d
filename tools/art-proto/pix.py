"""Minimal pixel-art toolkit: masks, auto-shaded parts, sheet and GIF export.

Everything works on numpy arrays:
- a mask is a bool array (H, W)
- a canvas is a uint8 RGBA array (H, W, 4)
Coordinates are pixel units; (x + 0.5, y + 0.5) is a pixel centre.
"""
from __future__ import annotations

import colorsys
import math
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageDraw


# ---------------------------------------------------------------- colours

def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _shift(rgb, dl, dh, ds=0.0):
    r, g, b = (c / 255 for c in rgb)
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    hh = (hh + dh) % 1.0
    ll = min(1.0, max(0.0, ll + dl))
    ss = min(1.0, max(0.0, ss + ds))
    r, g, b = colorsys.hls_to_rgb(hh, ll, ss)
    return (round(r * 255), round(g * 255), round(b * 255))


def _toward(h, target, amount):
    """Rotate hue h toward target hue by amount (shortest way)."""
    d = ((target - h + 0.5) % 1.0) - 0.5
    return d * amount


@dataclass(frozen=True)
class Ramp:
    o: tuple  # outline
    d: tuple  # shadow
    b: tuple  # base
    l: tuple  # light


def ramp(base: str, light: str | None = None, dark: str | None = None,
         outline: str | None = None) -> Ramp:
    """Build a 4-tone ramp with hue shifting (shadows cool, lights warm)."""
    b = hex_rgb(base)
    hh, ll, _ = colorsys.rgb_to_hls(*(c / 255 for c in b))
    d = hex_rgb(dark) if dark else _shift(b, -0.15, _toward(hh, 0.72, 0.08), 0.05)
    lt = hex_rgb(light) if light else _shift(b, +0.12, _toward(hh, 0.14, 0.06), 0.02)
    o = hex_rgb(outline) if outline else _shift(b, -min(ll, 0.62) + 0.13, _toward(hh, 0.75, 0.15), 0.1)
    return Ramp(o, d, b, lt)


# ---------------------------------------------------------------- masks

class Grid:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        ys, xs = np.mgrid[0:h, 0:w]
        self.px = xs + 0.5
        self.py = ys + 0.5

    def empty(self):
        return np.zeros((self.h, self.w), bool)

    def ellipse(self, cx, cy, rx, ry):
        return ((self.px - cx) / rx) ** 2 + ((self.py - cy) / ry) ** 2 <= 1.0

    def disc(self, cx, cy, r):
        return self.ellipse(cx, cy, r, r)

    def capsule(self, x0, y0, x1, y1, r):
        dx, dy = x1 - x0, y1 - y0
        ll = dx * dx + dy * dy
        if ll == 0:
            t = np.zeros_like(self.px)
        else:
            t = np.clip(((self.px - x0) * dx + (self.py - y0) * dy) / ll, 0, 1)
        qx, qy = x0 + t * dx, y0 + t * dy
        return (self.px - qx) ** 2 + (self.py - qy) ** 2 <= r * r

    def polyline(self, pts, r):
        m = self.empty()
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            m |= self.capsule(x0, y0, x1, y1, r)
        return m

    def poly(self, pts):
        img = Image.new("L", (self.w, self.h), 0)
        ImageDraw.Draw(img).polygon([(float(x), float(y)) for x, y in pts], fill=1)
        return np.array(img, bool)

    def rect(self, x0, y0, x1, y1):
        """Inclusive integer rectangle."""
        m = self.empty()
        x0, x1 = sorted((int(round(x0)), int(round(x1))))
        y0, y1 = sorted((int(round(y0)), int(round(y1))))
        m[max(0, y0):max(0, y1 + 1), max(0, x0):max(0, x1 + 1)] = True
        return m

    def ring(self, cx, cy, rx, ry, width=1.0):
        outer = self.ellipse(cx, cy, rx, ry)
        inner = self.ellipse(cx, cy, max(0.1, rx - width), max(0.1, ry - width))
        return outer & ~inner

    def arc(self, cx, cy, r, a0, a1, width):
        """Arc band between angles a0..a1 (degrees, 0 = +x, 90 = +y)."""
        ang = np.degrees(np.arctan2(self.py - cy, self.px - cx)) % 360
        a0 %= 360
        a1 %= 360
        inside = (ang >= a0) & (ang <= a1) if a0 <= a1 else (ang >= a0) | (ang <= a1)
        dist = np.hypot(self.px - cx, self.py - cy)
        return inside & (dist <= r) & (dist >= r - width)


def shift(m, dx, dy):
    """Shift mask by (dx, dy); vacated cells are False."""
    out = np.zeros_like(m)
    h, w = m.shape
    xs0, xs1 = max(0, dx), min(w, w + dx)
    ys0, ys1 = max(0, dy), min(h, h + dy)
    out[ys0:ys1, xs0:xs1] = m[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def dilate4(m):
    return m | shift(m, 1, 0) | shift(m, -1, 0) | shift(m, 0, 1) | shift(m, 0, -1)


def dilate8(m):
    out = dilate4(m)
    for dx, dy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        out |= shift(m, dx, dy)
    return out


def erode4(m):
    return m & shift(m, 1, 0) & shift(m, -1, 0) & shift(m, 0, 1) & shift(m, 0, -1)


# ---------------------------------------------------------------- canvas

def canvas(w, h):
    return np.zeros((h, w, 4), np.uint8)


def fill(cv, m, rgb, alpha=255):
    cv[m, 0:3] = rgb
    cv[m, 3] = alpha


def paint(cv, m, r: Ramp, outline=True, shade=(1, 2, 2), light=True, light_dir=(-1, -1)):
    """Paint a part: outside outline, base fill, shadow band, light rim.

    shade = (dx, dy, width): pixels within `width` steps toward (dx, dy)
    of the mask border become shadow. Light falls from the top-left.
    """
    if not m.any():
        return
    if outline:
        fill(cv, dilate4(m) & ~m, r.o)
    fill(cv, m, r.b)
    if shade:
        sdx, sdy, w = shade
        keep = m.copy()
        for k in range(1, w + 1):
            keep &= shift(m, -sdx * k, -sdy * k)
        shadow = m & ~keep
        fill(cv, shadow, r.d)
    else:
        shadow = np.zeros_like(m)
    if light:
        lx, ly = light_dir
        lit = m & ~shift(m, -lx, -ly) & ~shadow
        fill(cv, lit, r.l)


def flat(cv, m, rgb, outline_rgb=None):
    if outline_rgb is not None:
        fill(cv, dilate4(m) & ~m, outline_rgb)
    fill(cv, m, rgb)


def put(cv, x, y, rgb):
    x, y = int(round(x)), int(round(y))
    if 0 <= y < cv.shape[0] and 0 <= x < cv.shape[1]:
        cv[y, x, 0:3] = rgb
        cv[y, x, 3] = 255


def over(dst, src, ox=0, oy=0):
    """Alpha-composite src (binary alpha) onto dst at offset."""
    sh, sw = src.shape[:2]
    dh, dw = dst.shape[:2]
    x0, y0 = max(0, ox), max(0, oy)
    x1, y1 = min(dw, ox + sw), min(dh, oy + sh)
    if x0 >= x1 or y0 >= y1:
        return dst
    s = src[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    a = s[..., 3:4].astype(np.float32) / 255.0
    d = dst[y0:y1, x0:x1].astype(np.float32)
    d[..., 0:3] = s[..., 0:3] * a + d[..., 0:3] * (1 - a)
    d[..., 3:4] = np.maximum(d[..., 3:4], s[..., 3:4])
    dst[y0:y1, x0:x1] = d.astype(np.uint8)
    return dst


def flip_h(cv):
    return cv[:, ::-1].copy()


def outer_outline(cv, rgb):
    """1px outline around the whole silhouette (used for icons)."""
    m = cv[..., 3] > 0
    fill(cv, dilate4(m) & ~m, rgb)


# ---------------------------------------------------------------- export

def sheet(rows: list[list[np.ndarray]]) -> Image.Image:
    """rows of frames (all frames the same size) -> RGBA sheet."""
    fh, fw = rows[0][0].shape[:2]
    cols = max(len(r) for r in rows)
    out = canvas(fw * cols, fh * len(rows))
    for j, row in enumerate(rows):
        for i, f in enumerate(row):
            out[j * fh:(j + 1) * fh, i * fw:(i + 1) * fw] = f
    return Image.fromarray(out, "RGBA")


def to_image(cv, scale=1, bg=None):
    img = Image.fromarray(cv, "RGBA")
    if bg is not None:
        base = Image.new("RGBA", img.size, bg + (255,))
        base.alpha_composite(img)
        img = base
    if scale != 1:
        img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    return img


def save_gif(frames, path, ms, scale=3, bg=(32, 38, 58)):
    imgs = [to_image(f, scale, bg).convert("RGB") for f in frames]
    # one shared palette avoids colour flicker between frames
    strip = Image.new("RGB", (imgs[0].width, imgs[0].height * len(imgs)))
    for i, im in enumerate(imgs):
        strip.paste(im, (0, i * im.height))
    pal = strip.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q = [im.quantize(palette=pal, dither=Image.Dither.NONE) for im in imgs]
    dur = ms if isinstance(ms, list) else [ms] * len(q)
    q[0].save(path, save_all=True, append_images=q[1:], duration=dur, loop=0, disposal=1)


def rot(x, y, deg):
    a = math.radians(deg)
    return x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)


def dirv(deg):
    """Unit vector for a screen angle (0 = right, 90 = down)."""
    a = math.radians(deg)
    return math.cos(a), math.sin(a)

"""Skill effects drawn per frame onto any canvas (no outlines, banded tones).

Visual language per element: docs/game-design/12-art-audio-direction.md §6.
"""
from __future__ import annotations

import math

import numpy as np

from pix import Grid, dilate4, fill, hex_rgb, put

FIRE = [hex_rgb(h) for h in ("#7a1c12", "#e4572e", "#ffb703", "#fff3b0", "#ffffff")]
SMOKE = [hex_rgb(h) for h in ("#3d3a46", "#5e5a6b", "#8a8698")]


def _g(cv):
    return Grid(cv.shape[1], cv.shape[0])


def flame_blob(g, x, y, r, frame, tongues=5, length=1.6, seed=0):
    """Ball with flame tongues trailing to the left (moving right)."""
    rng = np.random.default_rng(seed * 97 + frame)
    m = g.disc(x, y, r)
    for k in range(tongues):
        a = 180 + (k - (tongues - 1) / 2) * (70 / max(1, tongues - 1)) + rng.uniform(-8, 8)
        ln = r * length * rng.uniform(0.75, 1.25)
        tx, ty = x + ln * math.cos(math.radians(a)) * 1.6, y + ln * math.sin(math.radians(a)) * 0.9
        m |= g.poly([(x, y - r * 0.7), (tx, ty), (x, y + r * 0.7)])
    return m


def fireball(cv, x, y, frame):
    g = _g(cv)
    outer = flame_blob(g, x, y, 6.2, frame, seed=1)
    mid = flame_blob(g, x + 1, y, 4.6, frame, tongues=3, length=1.1, seed=2)
    core = g.disc(x + 1.5, y, 3.0)
    fill(cv, dilate4(outer) & ~outer, FIRE[0])
    fill(cv, outer, FIRE[1])
    fill(cv, mid, FIRE[2])
    fill(cv, core, FIRE[3])
    put(cv, x + 2, y - 1, FIRE[4])
    rng = np.random.default_rng(10 + frame)
    for k in range(5):  # embers in the wake
        ex = x - 10 - k * 4 - rng.uniform(0, 3)
        ey = y + rng.uniform(-4, 4) - k * 0.6
        c = FIRE[2] if k < 2 else FIRE[1]
        put(cv, ex, ey, c)
        if k < 2:
            put(cv, ex + 1, ey, c)


def explosion(cv, x, y, frame):
    """6 frames: flash, burst, bloom, rising flames, smoke, embers."""
    g = _g(cv)
    rng = np.random.default_rng(40)
    if frame == 0:
        fill(cv, g.disc(x, y, 6), FIRE[4])
        fill(cv, g.ring(x, y, 9, 9, 1.2), FIRE[3])
        return
    radius = (0, 10, 13, 14, 13, 10)[frame]
    if frame <= 3:
        spikes = []
        n = 12
        for k in range(n * 2):
            a = math.radians(k * 180 / n + frame * 9)
            rr = radius * (1.0 if k % 2 == 0 else 0.62) * rng.uniform(0.85, 1.1)
            spikes.append((x + rr * math.cos(a), y + rr * math.sin(a) * 0.85))
        burst = g.poly(spikes)
        fill(cv, dilate4(burst) & ~burst, FIRE[0])
        fill(cv, burst, FIRE[1])
        fill(cv, g.disc(x, y, radius * 0.58), FIRE[2])
        fill(cv, g.disc(x, y - 1, radius * 0.32), FIRE[3] if frame < 3 else FIRE[2])
    if frame >= 2:  # rising flame licks
        for k in range(4):
            fx = x - 9 + k * 6 + rng.uniform(-1, 1)
            top = y - 8 - (frame - 1) * 4 - rng.uniform(0, 4)
            lick = g.poly([(fx - 2.5, y - 2), (fx + 0.5, top), (fx + 2.5, y - 2)])
            fill(cv, lick, FIRE[1] if frame < 5 else FIRE[0])
            if frame < 4:
                fill(cv, g.poly([(fx - 1, y - 2), (fx + 0.5, top + 4), (fx + 1.5, y - 2)]), FIRE[2])
    if frame >= 3:  # smoke puffs drifting up
        for k in range(3):
            sx = x - 7 + k * 7
            sy = y - 6 - (frame - 3) * 5 - k * 2
            rr = 3.0 + (frame - 3) * 0.9
            puff = g.disc(sx, sy, rr)
            fill(cv, puff, SMOKE[1] if frame < 5 else SMOKE[0])
            fill(cv, g.disc(sx - 0.8, sy - 0.8, rr * 0.5), SMOKE[2] if frame < 5 else SMOKE[1])
    for k in range(6):  # embers flying outward
        a = math.radians(k * 60 + 15)
        d = 6 + frame * 3.2
        put(cv, x + d * math.cos(a), y + d * math.sin(a) * 0.7 - frame, FIRE[2] if frame < 4 else FIRE[1])


def dummy(cv, x, y, hit=0):
    """Straw training dummy standing on (x, y) = ground centre. hit > 0 flashes."""
    from pix import paint, ramp
    g = _g(cv)
    wood = ramp("#8a5a35", light="#b07a4c", outline="#3a2414")
    straw = ramp("#d9b45a", light="#f3dc8f", dark="#a8843a", outline="#5a4318")
    if hit:
        straw = ramp("#ffffff", light="#ffffff", dark="#ffd0c0", outline="#7a1c12")
    lean = 2 if hit else 0
    paint(cv, g.capsule(x, y, x + lean * 0.5, y - 30, 1.3), wood, shade=None)
    paint(cv, g.capsule(x - 10 + lean, y - 24, x + 10 + lean, y - 24, 1.2), wood, shade=None)
    body = g.ellipse(x + lean, y - 20, 6.5, 9)
    paint(cv, body, straw, shade=(1, 1, 2))
    head = g.disc(x + lean, y - 34, 5)
    paint(cv, head, straw, shade=(1, 1, 1))
    for k in range(3):
        put(cv, x + lean - 3 + k * 3, y - 14, straw.d)
    fill(cv, g.ring(x + lean, y - 20, 3.4, 3.4, 1.0), hex_rgb("#c1121f"))
    put(cv, x + lean, y - 20, hex_rgb("#c1121f"))
    put(cv, x + lean + 2, y - 35, straw.o)


# ---------------------------------------------------------------- palettes

def _pal(*hexes):
    return [hex_rgb(h) for h in hexes]


WATER = _pal("#14306b", "#3a86ff", "#8ecae6", "#e0f4ff", "#ffffff")
WIND = _pal("#0f5e57", "#2ec4b6", "#97e6dc", "#e6fffb", "#ffffff")
BOLT = _pal("#8a5a00", "#ffd23f", "#fff3b0", "#ffffff", "#ffffff")
EARTH = _pal("#3e2723", "#8d6e63", "#b08968", "#d7b98e", "#efe0c4")
PLANT = _pal("#1e5b2a", "#5cb85c", "#a7e08a", "#c7f9cc", "#ffffff")
DARK = _pal("#0d0817", "#1b1233", "#5b3e96", "#9d7fd6", "#e3d6ff")
SEAL = _pal("#3a0509", "#c1121f", "#ff4d5a", "#ffc2c7", "#ffffff")
PETAL = hex_rgb("#f7a8c8")
POISON = hex_rgb("#a259d9")


def _layered(cv, masks, pal, outline=True):
    """masks from outer to inner, painted with pal[1], pal[2], ...; pal[0] outlines the outer."""
    if outline:
        fill(cv, dilate4(masks[0]) & ~masks[0], pal[0])
    for k, m in enumerate(masks):
        fill(cv, m, pal[min(k + 1, len(pal) - 1)])


# ---------------------------------------------------------------- water

def proj_water(cv, x, y, frame):
    g = _g(cv)
    wob = (0, 0.5, 0, -0.5)[frame % 4]
    outer = g.ellipse(x, y, 6.5, 5.5 + wob) | g.poly([(x - 2, y - 4), (x - 12, y), (x - 2, y + 4)])
    _layered(cv, [outer, g.ellipse(x + 0.5, y, 4.5, 3.8), g.ellipse(x + 1.5, y - 1, 2, 1.5)], WATER)
    put(cv, x + 2, y - 2, WATER[4])
    for k in range(3):
        dx = x - 15 - k * 5
        dy = y + ((frame + k) % 3 - 1) * 2
        fill(cv, g.disc(dx, dy, 1.6 - k * 0.3), WATER[2 if k == 0 else 1])


def hit_water(cv, x, y, frame):
    g = _g(cv)
    if frame == 0:
        _layered(cv, [g.disc(x, y, 8), g.disc(x, y, 5.5), g.disc(x, y, 3)], WATER)
        return
    ring = g.ring(x, y + 14, 6 + frame * 4, 1.5 + frame * 0.6, 1.2)
    fill(cv, ring, WATER[2] if frame < 4 else WATER[1])
    rng = np.random.default_rng(7)
    for k in range(9):
        a = math.radians(-160 + k * 17 + rng.uniform(-5, 5))
        sp = rng.uniform(2.5, 4.2)
        t = frame
        dx = x + math.cos(a) * sp * t * 1.6
        dy = y + math.sin(a) * sp * t * 1.6 + 0.9 * t * t
        r = max(0.8, 2.4 - frame * 0.3)
        _layered(cv, [g.disc(dx, dy, r)], [WATER[0], WATER[1] if k % 2 else WATER[2]])
    if frame <= 2:
        crown = g.poly([(x - 9, y + 2), (x - 6, y - 8 - frame * 3), (x - 3, y - 2), (x, y - 11 - frame * 3),
                        (x + 3, y - 2), (x + 6, y - 8 - frame * 3), (x + 9, y + 2)])
        _layered(cv, [crown, crown & shift_down(crown, 2)], WATER)


def shift_down(m, k):
    from pix import shift
    return shift(m, 0, k)


# ---------------------------------------------------------------- wind

def proj_wind(cv, x, y, frame):
    g = _g(cv)
    outer = g.ellipse(x, y, 5.5, 10) & ~g.ellipse(x - 3.5, y, 5.5, 10.5)
    inner = g.ellipse(x, y, 4.0, 8.4) & ~g.ellipse(x - 2.4, y, 4.5, 9.2)
    _layered(cv, [outer, inner], WIND)
    fill(cv, g.ellipse(x + 0.5, y, 2.6, 6.6) & ~g.ellipse(x - 1.2, y, 3.4, 7.4), WIND[4])
    for k in range(4):  # speed lines
        ly = y - 7 + k * 4.5 + (frame % 2)
        ln = 8 + ((k + frame) % 3) * 3
        fill(cv, g.capsule(x - 6 - ln, ly, x - 6, ly, 0.45), WIND[2] if k % 2 else WIND[1])


def hit_wind(cv, x, y, frame):
    g = _g(cv)
    if frame > 4:
        for k in range(4):
            a = math.radians(k * 90 + 45 + frame * 20)
            put(cv, x + 11 * math.cos(a), y + 11 * math.sin(a), WIND[2])
        return
    ext = (6, 12, 14, 14, 10)[frame]
    w = (1.4, 1.6, 1.2, 0.8, 0.5)[frame]
    for sx, sy in ((1, 1), (1, -1)):
        line = g.capsule(x - ext, y - ext * sx * sy, x + ext, y + ext * sx * sy, w)
        fill(cv, dilate4(line) & ~line, WIND[1])
        fill(cv, line, WIND[3] if frame < 3 else WIND[2])
    if frame >= 1:
        fill(cv, g.arc(x, y, 9 + frame * 2, 200 + frame * 30, 320 + frame * 30, 1.2), WIND[2])
        fill(cv, g.arc(x, y, 7 + frame * 2, 20 + frame * 30, 140 + frame * 30, 1.0), WIND[1])


# ---------------------------------------------------------------- lightning

def _bolt_path(x0, y0, x1, y1, seed, segs=7, jitter=5):
    rng = np.random.default_rng(seed)
    pts = [(x0, y0)]
    for k in range(1, segs):
        t = k / segs
        pts.append((x0 + (x1 - x0) * t + rng.uniform(-jitter, jitter), y0 + (y1 - y0) * t))
    pts.append((x1, y1))
    return pts


def strike_bolt(cv, x, y_ground, frame):
    """Lightning from the top of the canvas down to (x, y_ground)."""
    g = _g(cv)
    if frame == 0:
        fill(cv, g.disc(x, 6, 2.5), BOLT[2])
        put(cv, x, 6, BOLT[3])
        return
    if frame <= 3:
        main = _bolt_path(x - 4, 0, x, y_ground - 6, seed=frame % 2 + 3)
        width = (0, 2.0, 1.6, 0.9)[frame]
        core = g.polyline(main, width)
        glow = g.polyline(main, width + 1.4)
        fill(cv, dilate4(glow) & ~glow, BOLT[0])
        fill(cv, glow, BOLT[1])
        fill(cv, core, BOLT[3])
        b0 = main[3]
        branch = _bolt_path(b0[0], b0[1], b0[0] + 10, b0[1] + 14, seed=9 + frame, segs=3, jitter=3)
        fill(cv, g.polyline(branch, 0.6), BOLT[2])
    if 1 <= frame <= 3:
        _layered(cv, [g.ellipse(x, y_ground - 4, 9 + frame * 2, 4 + frame), g.ellipse(x, y_ground - 4, 6, 3)],
                 BOLT)
    rng = np.random.default_rng(21)
    if frame >= 2:
        for k in range(8):
            a = math.radians(-170 + k * 22)
            d = 5 + (frame - 1) * 4
            sx, sy = x + d * math.cos(a), y_ground - 5 + d * math.sin(a) * 0.8
            fill(cv, g.capsule(sx, sy, sx + 2 * math.cos(a), sy + 2 * math.sin(a), 0.5),
                 BOLT[2] if frame < 5 else BOLT[1])


# ---------------------------------------------------------------- earth

def spike(cv, x, y_ground, h, wdt=4.0):
    g = _g(cv)
    m = g.poly([(x - wdt, y_ground), (x - 0.6, y_ground - h), (x + 0.6, y_ground - h), (x + wdt, y_ground)])
    lit = g.poly([(x - wdt + 1, y_ground - 1), (x - 0.4, y_ground - h + 2), (x, y_ground - h + 2),
                  (x - 1, y_ground - 1)])
    fill(cv, dilate4(m) & ~m, EARTH[0])
    fill(cv, m, EARTH[1])
    fill(cv, lit & m, EARTH[3])
    fill(cv, g.poly([(x + 1, y_ground - 1), (x + 0.5, y_ground - h * 0.6), (x + wdt - 1, y_ground - 1)]) & m,
         EARTH[0])


def earth_line(cv, x0, x1, y_ground, frame, n=5):
    """Spikes erupting one after another from x0 to x1; the last one is big."""
    g = _g(cv)
    for k in range(n):
        born = k
        age = frame - born
        if age < 0:
            continue
        sx = x0 + (x1 - x0) * k / (n - 1)
        big = k == n - 1
        full = 22 if big else 10 + k * 2
        h = full * min(1.0, (age + 1) / 2) * (1 if age < 4 else max(0, 1 - (age - 3) * 0.35))
        if h > 1:
            spike(cv, sx, y_ground, h, 6 if big else 4)
        if age <= 2:  # dust
            for d in (-1, 1):
                fill(cv, g.disc(sx + d * (5 + age * 2), y_ground - 1 - age, 2.2 - age * 0.5), EARTH[4])
        if big and 1 <= age <= 4:  # debris
            for j in range(5):
                a = math.radians(-150 + j * 30)
                dd = 6 + age * 4
                fill(cv, g.rect(sx + dd * math.cos(a), y_ground - 18 + dd * math.sin(a),
                                sx + dd * math.cos(a) + 1, y_ground - 17 + dd * math.sin(a)), EARTH[2])


# ---------------------------------------------------------------- plant

def proj_plant(cv, x, y, frame):
    g = _g(cv)
    thorn = g.poly([(x - 8, y - 2.5), (x + 7, y), (x - 8, y + 2.5)])
    _layered(cv, [thorn, g.poly([(x - 6, y - 1), (x + 4, y), (x - 6, y + 1)])], PLANT)
    for k in range(3):  # leaves trailing, fluttering
        lx = x - 12 - k * 6
        ly = y + (-3, 3, -2)[k] + ((frame + k) % 2)
        leaf = g.ellipse(lx, ly, 2.6, 1.3)
        _layered(cv, [leaf], [PLANT[0], PLANT[2] if k % 2 else PLANT[1]])


def hit_plant(cv, x, y_ground, frame):
    g = _g(cv)
    grow = min(1.0, (frame + 1) / 4)
    vines = [[(x - 10, y_ground), (x - 12, y_ground - 10), (x - 6, y_ground - 20), (x - 9, y_ground - 30)],
             [(x + 9, y_ground), (x + 12, y_ground - 12), (x + 6, y_ground - 22), (x + 10, y_ground - 32)],
             [(x - 2, y_ground), (x + 2, y_ground - 9), (x - 3, y_ground - 16)]]
    for v in vines:
        n = max(2, int(round(len(v) * grow)))
        part = v[:n]
        m = g.polyline(part, 1.5)
        fill(cv, dilate4(m) & ~m, PLANT[0])
        fill(cv, m, PLANT[1])
        fill(cv, g.polyline(part, 0.5), PLANT[2])
        for (px, py) in part[1:]:  # thorns
            fill(cv, g.poly([(px, py - 1), (px + 3, py - 2), (px, py + 1)]), PLANT[0])
    if frame >= 3:  # blossoms and poison bubbles
        for k, (bx, by) in enumerate(((x - 9, y_ground - 30), (x + 10, y_ground - 32))):
            for a in range(0, 360, 72):
                fill(cv, g.disc(bx + 2 * math.cos(math.radians(a)), by + 2 * math.sin(math.radians(a)), 1.4), PETAL)
            put(cv, bx, by, hex_rgb("#ffe08a"))
        for k in range(4):
            bx = x - 6 + k * 4
            by = y_ground - 12 - (frame - 3) * 4 - k * 3
            fill(cv, g.ring(bx, by, 1.8, 1.8, 0.8), POISON)
    if frame >= 4:
        for k in range(4):  # petals drifting
            put(cv, x - 14 + k * 9, y_ground - 36 + frame * 3 + k, PETAL)


# ---------------------------------------------------------------- dark

def proj_dark(cv, x, y, frame):
    g = _g(cv)
    for k in range(4):  # smoke trail
        sx = x - 8 - k * 5
        sy = y + ((frame + k) % 3 - 1) * 1.5
        fill(cv, g.disc(sx, sy, 3.2 - k * 0.6), DARK[2] if k < 2 else DARK[1])
    _layered(cv, [g.disc(x, y, 6.5), g.disc(x, y, 4.6), g.disc(x + 0.5, y, 2.6)],
             [DARK[0], DARK[2], DARK[1], DARK[0]])
    for k in range(3):
        a = math.radians(frame * 50 + k * 120)
        put(cv, x + 5.5 * math.cos(a), y + 5.5 * math.sin(a), DARK[4])


def hit_dark(cv, x, y, frame):
    g = _g(cv)
    if frame == 0:
        fill(cv, g.ring(x, y, 12, 12, 1.4), DARK[3])
        fill(cv, g.disc(x, y, 3), DARK[0])
        return
    r = (0, 7, 11, 13, 12, 9)[frame]
    rng = np.random.default_rng(31)
    pts = []
    for k in range(16):
        a = math.radians(k * 22.5 + frame * 7)
        rr = r * (1.0 if k % 2 == 0 else 0.7) * rng.uniform(0.85, 1.1)
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    blob = g.poly(pts)
    _layered(cv, [blob, g.disc(x, y, r * 0.6), g.disc(x, y, r * 0.3)],
             [DARK[0], DARK[2] if frame < 4 else DARK[1], DARK[1], DARK[0]])
    for k in range(5):  # wisps spiralling out
        a = math.radians(k * 72 + frame * 25)
        d = r + 2 + frame
        wx, wy = x + d * math.cos(a), y + d * math.sin(a) - frame
        fill(cv, g.capsule(wx, wy, wx + 3 * math.cos(a + 1.2), wy + 3 * math.sin(a + 1.2), 0.6),
             DARK[3] if frame < 5 else DARK[2])


# ---------------------------------------------------------------- seal arrow

def proj_seal(cv, x, y, frame):
    g = _g(cv)
    for k, c in enumerate((SEAL[1], SEAL[2])):  # red streak
        ly = y - 1 + k * 2
        fill(cv, g.capsule(x - 26 + (frame % 2) * 2, ly, x - 6, ly, 0.5 + k * 0.2), c)
    fill(cv, g.capsule(x - 10, y, x + 4, y, 0.6), hex_rgb("#2a2a2e"))
    head = g.poly([(x + 3, y - 2.5), (x + 8, y), (x + 3, y + 2.5)])
    _layered(cv, [head], [SEAL[0], SEAL[1]])
    fill(cv, g.poly([(x - 10, y), (x - 13, y - 3), (x - 11, y)]) | g.poly([(x - 10, y), (x - 13, y + 3), (x - 11, y)]),
         SEAL[3])
    for k in range(2):  # glyph sparks
        gx = x - 16 - k * 7
        fill(cv, g.rect(gx, y - 4 + k * 6, gx + 1, y - 3 + k * 6), SEAL[2])


def hit_seal(cv, x, y, frame):
    g = _g(cv)
    size = (5, 9, 11, 12, 12, 12)[frame]
    if frame >= 1:
        outer = g.rect(x - size, y - size, x + size, y + size) & ~g.rect(x - size + 2, y - size + 2,
                                                                        x + size - 2, y + size - 2)
        fill(cv, outer, SEAL[1] if frame < 5 else SEAL[0])
    if 2 <= frame <= 4:  # glyph strokes inside the stamp
        s = size - 4
        for k in range(3):
            yy = y - s + 2 + k * 4
            fill(cv, g.rect(x - s + 1, yy, x + s - 1, yy), SEAL[2])
        fill(cv, g.rect(x - 1, y - s + 1, x, y + s - 1), SEAL[2])
    if frame == 3:
        fill(cv, g.rect(x - size - 2, y - size - 2, x + size + 2, y + size + 2) &
             ~g.rect(x - size - 1, y - size - 1, x + size + 1, y + size + 1), SEAL[3])
    if frame <= 1:
        fill(cv, g.disc(x, y, 4 - frame * 2 + 1), SEAL[4])
    if frame >= 3:
        for k in range(6):
            a = math.radians(k * 60 + 30)
            d = size + 3 + (frame - 3) * 3
            put(cv, x + d * math.cos(a), y + d * math.sin(a), SEAL[2])


EFFECTS = {
    # class: (projectile fn or None, impact fn, impact anchor "air"|"ground", label)
    "fire": (fireball, explosion, "air", "Hoa Cau"),
    "water": (proj_water, hit_water, "air", "Thuy Dan"),
    "wind": (proj_wind, hit_wind, "air", "Phong Nhan"),
    "bolt": (None, strike_bolt, "ground", "Tia Chop"),
    "earth": (None, None, "ground", "Dia Chan"),
    "plant": (proj_plant, hit_plant, "ground", "Gai Xanh"),
    "dark": (proj_dark, hit_dark, "air", "Man Dem"),
    "seal": (proj_seal, hit_seal, "air", "An Tien"),
}

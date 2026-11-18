"""Rich tileset: Ninja-School-like terrain (rounded cliffs, draping grass,
6-tone shading with dithering) and European fantasy architecture
(stone ground floors, jettied half-timber, fish-scale slate, turrets).

32 px tiles at 1x, same pixel density as the characters.
"""
from __future__ import annotations

import math

import numpy as np

from pix import Grid, canvas, dilate4, fill, hex_rgb, put, shift

T = 32
COLS = 16


def pal(*h):
    return [hex_rgb(x) for x in h]


# outline, deep, shadow, base, light, highlight
EARTH = pal("#4a2a14", "#7a4a24", "#a8693a", "#c98e55", "#e3b679", "#f4d9a6")
EARTH_DEEP = pal("#4a2a14", "#6e4220", "#94582e", "#b47a46", "#c98e55", "#e3b679")
GRASS = pal("#1e4a14", "#2f7a1e", "#4a9e2a", "#6cc23a", "#9ade52", "#c8f078")
LEAF = pal("#123414", "#1f5a1c", "#2e7a26", "#43a032", "#66c046", "#9ee070")
STONE = pal("#2e2620", "#5a4e42", "#7a6c5c", "#9a8a76", "#b8a892", "#d8ccb6")
CAVE = pal("#141018", "#2a2434", "#3c344a", "#4e4560", "#665c7c", "#8a80a0")
MOSS = pal("#0c1812", "#16301f", "#1f4229", "#2a5634", "#3a6e42", "#548a54")
SLATE = pal("#141826", "#232c46", "#303d62", "#415282", "#5a6ea4", "#8496c4")
PLASTER = pal("#4a3a2a", "#b09872", "#ccb68c", "#e2cea4", "#f2e2be", "#fff6e0")
TIMBER = pal("#160c06", "#2e1c0e", "#432a16", "#5a3a1e", "#764e28", "#966636")
WOOD = pal("#2a1608", "#5a3418", "#7a4822", "#9a5e2c", "#bb7a3c", "#d89a56")
GLASS = pal("#2a1a0a", "#b8701c", "#e09a2c", "#f6c452", "#ffe08a", "#fff6d0")
BANNER = pal("#2a0a0e", "#6a1420", "#962230", "#b8303c", "#d8545a", "#f08a88")
IRON = pal("#0a0a10", "#1e1e28", "#2c2c3a", "#3c3c4e", "#565670", "#8080a0")
GOLD = pal("#4a2a0e", "#9a6420", "#c48a2e", "#e0aa44", "#f4cc70", "#fff0b0")
WATER = pal("#0e3a6a", "#1c6aa8", "#2a8ad0", "#46aee8", "#86d6f6", "#e6faff")


# ---------------------------------------------------------------- shading

def _band(m, dx, dy, k):
    """Pixels of m within k steps of the border in direction (dx, dy)."""
    keep = m.copy()
    for i in range(1, k + 1):
        keep &= shift(m, -dx * i, -dy * i)
    return m & ~keep


def vol(cv, m, p, outline=True, shadow=3, light=2, dither=True, dirs=((1, 1), (-1, -1))):
    """6-tone volume shading: outline, deep, shadow (with dither), base, light, highlight."""
    if not m.any():
        return
    if outline:
        fill(cv, dilate4(m) & ~m, p[0])
    fill(cv, m, p[3])
    (sx, sy), (lx, ly) = dirs
    sh = _band(m, sx, sy, shadow)
    deep = _band(m, sx, sy, 1)
    lt = _band(m, lx, ly, light) & ~sh
    hi = _band(m, lx, ly, 1) & ~sh
    if dither:
        g = (np.indices(m.shape).sum(0) % 2) == 0
        sh_edge = _band(m, sx, sy, shadow + 1) & ~sh
        fill(cv, sh_edge & g, p[2])
        lt_edge = _band(m, lx, ly, light + 1) & ~lt & ~sh_edge
        fill(cv, lt_edge & g, p[4])
    fill(cv, sh, p[2])
    fill(cv, deep, p[1])
    fill(cv, lt, p[4])
    fill(cv, hi, p[5])


def vgrad(cv, m, p, y0, y1, steps=(3, 2, 1), dither=True):
    """Vertical gradient inside m from p[steps[0]] (top) down to p[steps[-1]] (bottom)."""
    ys = np.indices(m.shape)[0]
    n = len(steps)
    chk = (np.indices(m.shape).sum(0) % 2) == 0
    for k, s in enumerate(steps):
        a = y0 + (y1 - y0) * k / n
        b = y0 + (y1 - y0) * (k + 1) / n
        band = m & (ys >= a) & (ys < b)
        fill(cv, band, p[s])
        if dither and k > 0:
            edge = m & (ys >= a) & (ys < a + 2) & chk
            fill(cv, edge, p[steps[k - 1]])


# ---------------------------------------------------------------- sheet

class Sheet:
    def __init__(self, rows=40):
        self.cv = canvas(COLS * T, rows * T)
        self.g = Grid(COLS * T, rows * T)
        self.index, self.objects, self.used = {}, {}, set()
        self.cursor = 0
        self._snap, self._blk = None, None

    def _close(self):
        if self._snap is None:
            return
        x0, y0, x1, y1 = self._blk
        inside = np.zeros(self.cv.shape[:2], bool)
        inside[y0:y1 + 1, x0:x1 + 1] = True
        self.cv[~inside] = self._snap[~inside]
        self._snap = None

    def alloc(self, name, w=1, h=1):
        self._close()
        c, r = self.cursor % COLS, self.cursor // COLS
        while True:
            if c + w > COLS:
                c, r = 0, r + 1
                continue
            if any((c + i, r + j) in self.used for i in range(w) for j in range(h)):
                c += 1
                continue
            break
        for i in range(w):
            for j in range(h):
                self.used.add((c + i, r + j))
        self.objects[name] = (c, r, w, h)
        self.index[name] = r * COLS + c
        self.cursor = r * COLS + c + w
        self._snap = self.cv.copy()
        self._blk = (c * T, r * T, (c + w) * T - 1, (r + h) * T - 1)
        return c * T, r * T

    def finish(self):
        self._close()
        rows = max(r + h for (c, r, w, h) in self.objects.values())
        self.cv = self.cv[:rows * T].copy()
        self.rows = rows
        return self


# ---------------------------------------------------------------- terrain

def _strata(cv, g, x0, y0, p, seed, top_gap=0):
    """Cliff texture: short vertical erosion streaks, cracks, pebbles, light grain."""
    rng = np.random.default_rng(seed)
    y_min = y0 + top_gap + 2
    for _ in range(5):  # vertical streaks
        sx = x0 + int(rng.integers(2, T - 2))
        sy = int(rng.integers(y_min, y0 + T - 4))
        ln = int(rng.integers(3, 8))
        fill(cv, g.rect(sx, sy, sx, min(sy + ln, y0 + T - 1)), p[2])
        put(cv, sx - 1, sy, p[4])
    for _ in range(2):  # small cracks
        cx = x0 + int(rng.integers(4, T - 6))
        cy = int(rng.integers(y_min, y0 + T - 6))
        fill(cv, g.polyline([(cx, cy), (cx + 2, cy + 2), (cx + 1, cy + 4)], 0.4), p[1])
        put(cv, cx + 1, cy, p[4])
    for _ in range(2):  # pebbles
        px = x0 + int(rng.integers(3, T - 5))
        py = int(rng.integers(y_min + 2, y0 + T - 3))
        m = g.ellipse(px + 1.5, py + 1, 2.0, 1.4)
        fill(cv, m, p[4])
        fill(cv, m & (g.py > py + 1), p[2])
        put(cv, px + 1, py + 2, p[1])
    grain = (rng.random((T, T)) < 0.035)
    ys, xs = np.nonzero(grain)
    for yy, xx in zip(ys, xs):
        if y0 + yy >= y_min:
            put(cv, x0 + xx, y0 + yy, p[2] if (xx + yy) % 3 else p[4])


def _grass_lip(cv, g, x0, y0, gp, seed, left=False, right=False):
    """Grass cap with draping, irregular tufts hanging over the edge."""
    rng = np.random.default_rng(seed)
    depth = np.array([7 + 3 * math.sin((i + seed * 3) * 0.55) + rng.integers(0, 3) for i in range(T)])
    for i in range(0, T, 5):  # hanging tufts
        w = int(rng.integers(2, 4))
        depth[i:i + w] += int(rng.integers(2, 5))
    if left:
        depth[:4] = np.minimum(depth[:4], [4, 6, 8, 9])
    if right:
        depth[-4:] = np.minimum(depth[-4:], [9, 8, 6, 4])
    m = np.zeros(cv.shape[:2], bool)
    for i in range(T):
        top = 1 if not ((left and i < 2) or (right and i > T - 3)) else 3
        m[y0 + top:y0 + int(depth[i]) + 1, x0 + i] = True
    vol(cv, m, gp, shadow=2, light=1, dirs=((0, 1), (0, -1)))
    for i in range(1, T - 1, 3):  # blade tips poking up
        if not ((left and i < 3) or (right and i > T - 4)):
            put(cv, x0 + i, y0, gp[0])
            put(cv, x0 + i, y0 + 1, gp[4])


def cliff_tile(S, name, base, gp, top=False, left=False, right=False, bottom=False, seed=0, fill_pal=None):
    sx0, sy0 = S.alloc(name)
    # draw on a padded local canvas so neighbour logic never hits the sheet border
    cv, g = canvas(T + 2, T + 2), Grid(T + 2, T + 2)
    x0, y0 = 1, 1
    _cliff_body(cv, g, x0, y0, base, gp, top, left, right, bottom, seed, fill_pal)
    S.cv[sy0:sy0 + T, sx0:sx0 + T] = cv[1:T + 1, 1:T + 1]


def _cliff_body(cv, g, x0, y0, base, gp, top, left, right, bottom, seed, fill_pal):
    p = fill_pal or base
    r_ = 10
    body = g.rect(x0, y0, x0 + T - 1, y0 + T - 1)
    # rounded corners
    if top and left:
        body &= ~((g.px < x0 + r_) & (g.py < y0 + r_) & ~g.disc(x0 + r_, y0 + r_, r_))
    if top and right:
        body &= ~((g.px > x0 + T - r_) & (g.py < y0 + r_) & ~g.disc(x0 + T - r_, y0 + r_, r_))
    if bottom and left:
        body &= ~((g.px < x0 + r_) & (g.py > y0 + T - r_) & ~g.disc(x0 + r_, y0 + T - r_, r_))
    if bottom and right:
        body &= ~((g.px > x0 + T - r_) & (g.py > y0 + T - r_) & ~g.disc(x0 + T - r_, y0 + T - r_, r_))
    fill(cv, body, p[3])
    _strata(cv, g, x0, y0, p, seed, top_gap=10 if top else 0)
    # edges: left lit, right in shadow, bottom dark
    if left:
        e = _band(body, -1, 0, 4)
        fill(cv, e, p[4])
        fill(cv, _band(body, -1, 0, 1), p[5])
    if right:
        e = _band(body, 1, 0, 6)
        chk = (np.indices(body.shape).sum(0) % 2) == 0
        fill(cv, e & chk, p[2])
        fill(cv, _band(body, 1, 0, 4), p[2])
        fill(cv, _band(body, 1, 0, 1), p[1])
    if bottom:
        fill(cv, _band(body, 0, 1, 4), p[2])
        fill(cv, _band(body, 0, 1, 2), p[1])
    # outline only on open sides: treat the closed neighbours as solid
    ext = body.copy()
    if not left:
        ext |= g.rect(x0 - 1, y0 - 1, x0 - 1, y0 + T)
    if not right:
        ext |= g.rect(x0 + T, y0 - 1, x0 + T, y0 + T)
    if not top:
        ext |= g.rect(x0 - 1, y0 - 1, x0 + T, y0 - 1)
    if not bottom:
        ext |= g.rect(x0 - 1, y0 + T, x0 + T, y0 + T)
    inner = ext & shift(ext, 1, 0) & shift(ext, -1, 0) & shift(ext, 0, 1) & shift(ext, 0, -1)
    fill(cv, body & ~inner, p[0])
    if top and gp is not None:
        _grass_lip(cv, g, x0, y0, gp, seed, left, right)
    elif top:
        fill(cv, _band(body, 0, -1, 2), p[4])
        fill(cv, _band(body, 0, -1, 1), p[0])


def cliff_set(S, prefix, base, deep, gp, seed):
    combos = [("tl", 1, 1, 0, 0), ("t", 1, 0, 0, 0), ("tr", 1, 0, 1, 0), ("l", 0, 1, 0, 0), ("m", 0, 0, 0, 0),
              ("r", 0, 0, 1, 0), ("bl", 0, 1, 0, 1), ("b", 0, 0, 0, 1), ("br", 0, 0, 1, 1),
              ("tlr", 1, 1, 1, 0), ("tb", 1, 0, 0, 1), ("tlb", 1, 1, 0, 1), ("trb", 1, 0, 1, 1)]
    for k, (n, t, lft, rgt, btm) in enumerate(combos):
        cliff_tile(S, f"{prefix}_{n}", base, gp, t, lft, rgt, btm, seed=seed + k * 5)
    cliff_tile(S, f"{prefix}_deep", base, None, seed=seed + 99, fill_pal=deep)



# ---------------------------------------------------------------- foliage

def bush(S, name, w=2, h=1, seed=0):
    x0, y0 = S.alloc(name, w, h)
    cv, g = S.cv, S.g
    W, H = w * T, h * T
    rng = np.random.default_rng(seed)
    blobs = []
    for k in range(5 + w * 2):
        bx = x0 + 6 + rng.uniform(0, W - 12)
        by = y0 + H - 6 - rng.uniform(0, H * 0.45)
        blobs.append((bx, by, rng.uniform(5, 9)))
    m = np.zeros(cv.shape[:2], bool)
    for bx, by, rr in blobs:
        m |= g.disc(bx, by, rr)
    m &= g.rect(x0, y0, x0 + W - 1, y0 + H - 1)
    fill(cv, dilate4(m) & ~m & g.rect(x0, y0, x0 + W - 1, y0 + H - 1), LEAF[0])
    fill(cv, m, LEAF[2])
    for bx, by, rr in sorted(blobs, key=lambda b: b[1]):  # clumps: light top-left
        c = g.disc(bx, by, rr) & m
        fill(cv, c, LEAF[3])
        fill(cv, c & ~g.disc(bx - 1.5, by - 1.5, rr - 1), LEAF[1])
        fill(cv, g.disc(bx - rr * 0.35, by - rr * 0.4, rr * 0.45) & m, LEAF[4])
        fill(cv, g.disc(bx - rr * 0.5, by - rr * 0.55, rr * 0.18) & m, LEAF[5])
    if rng.random() < 0.7:
        for k in range(3):
            fx, fy = x0 + rng.uniform(6, W - 6), y0 + H - rng.uniform(6, 14)
            if m[int(fy), int(fx)]:
                fill(cv, g.disc(fx, fy, 1.3), hex_rgb("#ff8fb0" if k % 2 else "#ffffff"))


def fern(S, name, seed=0):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    rng = np.random.default_rng(seed)
    m = np.zeros(cv.shape[:2], bool)
    for k in range(7):
        a = math.radians(-160 + k * 23 + rng.uniform(-5, 5))
        ln = rng.uniform(10, 15)
        tip = (x0 + 16 + math.cos(a) * ln, y0 + 31 + math.sin(a) * ln)
        mid = (x0 + 16 + math.cos(a) * ln * 0.5, y0 + 31 + math.sin(a) * ln * 0.6 - 2)
        m |= g.polyline([(x0 + 16, y0 + 31), mid, tip], 1.6)
    vol(cv, m, GRASS, shadow=1, light=1)


def flowers(S, name, colors, seed=0):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    rng = np.random.default_rng(seed)
    stems = np.zeros(cv.shape[:2], bool)
    heads = []
    for k in range(5):
        fx = x0 + 3 + k * 6 + rng.integers(-1, 2)
        fy = y0 + 31 - rng.integers(8, 15)
        stems |= g.rect(fx, fy, fx, y0 + 31)
        heads.append((fx, fy, colors[k % len(colors)]))
    leaves = g.ellipse(x0 + 8, y0 + 28, 4, 1.5) | g.ellipse(x0 + 22, y0 + 27, 4, 1.5)
    fill(cv, stems | leaves, GRASS[2])
    for fx, fy, c in heads:
        c = hex_rgb(c)
        for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
            put(cv, fx + dx, fy + dy, c)
        put(cv, fx, fy, hex_rgb("#ffe066"))


def grass_tall(S, name, seed=0):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    rng = np.random.default_rng(seed)
    m = np.zeros(cv.shape[:2], bool)
    for k in range(10):
        bx = x0 + 2 + k * 3 + rng.integers(0, 2)
        h = rng.integers(9, 18)
        lean = rng.integers(-3, 4)
        m |= g.poly([(bx - 1.2, y0 + 32), (bx + lean, y0 + 31 - h), (bx + 1.2, y0 + 32)])
    vol(cv, m, GRASS, shadow=1, light=1, dirs=((1, 0), (-1, 0)))


def vine(S, name, seed=0):
    """Vines hanging down a cliff face (decor over ground tiles)."""
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    rng = np.random.default_rng(seed)
    for k in range(2):
        vx = x0 + 8 + k * 14 + rng.integers(-2, 3)
        ln = rng.integers(16, 30)
        line = g.polyline([(vx, y0), (vx + 2, y0 + ln * 0.5), (vx, y0 + ln)], 0.7)
        fill(cv, line, LEAF[1])
        for j in range(4, ln, 5):
            lx = vx + (2 if j % 10 < 5 else -2)
            leaf = g.ellipse(lx, y0 + j, 2.2, 1.4)
            fill(cv, leaf, LEAF[3])
            put(cv, lx - 1, y0 + j - 1, LEAF[4])


def rock(S, name, seed=0):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    m = (g.ellipse(x0 + 15, y0 + 25, 11, 7) | g.ellipse(x0 + 11, y0 + 21, 7, 6)) & (g.py < y0 + 32)
    vol(cv, m, STONE, shadow=3, light=2)
    fill(cv, g.polyline([(x0 + 16, y0 + 20), (x0 + 18, y0 + 25)], 0.4) & m, STONE[1])


def tree(S, name, w=4, h=6, seed=0, fruit=True):
    x0, y0 = S.alloc(name, w, h)
    cv, g = S.cv, S.g
    W, H = w * T, h * T
    cx = x0 + W / 2
    trunk = g.poly([(cx - 8, y0 + H), (cx - 5, y0 + H * 0.5), (cx + 5, y0 + H * 0.5), (cx + 9, y0 + H)])
    trunk |= g.poly([(cx - 13, y0 + H), (cx - 6, y0 + H - 10), (cx - 3, y0 + H)])
    trunk |= g.poly([(cx + 13, y0 + H), (cx + 6, y0 + H - 9), (cx + 3, y0 + H)])
    trunk |= g.polyline([(cx, y0 + H * 0.55), (cx - 14, y0 + H * 0.38)], 2.2)
    bark = pal("#1e120a", "#3a2414", "#523420", "#6b4428", "#865834", "#a47044")
    vol(cv, trunk, bark, shadow=4, light=2, dirs=((1, 0), (-1, 0)))
    for k in range(6):
        by = y0 + H * 0.58 + k * 10
        fill(cv, g.polyline([(cx - 2 + (k % 2) * 3, by), (cx - 1 + (k % 2) * 3, by + 6)], 0.5) & trunk, bark[1])
    rng = np.random.default_rng(seed)
    # three tiers of leaf clusters; each cluster = a big disc with a bumpy rim
    clusters = []
    for tier, (ty, spread, n, rr) in enumerate(((0.17, 0.16, 2, 0.19), (0.3, 0.24, 3, 0.19), (0.43, 0.27, 3, 0.17))):
        for k in range(n):
            bx = cx + (k - (n - 1) / 2) * W * spread * 1.1 + rng.uniform(-3, 3)
            by = y0 + H * ty + rng.uniform(-3, 3)
            clusters.append((bx, by, W * rr * rng.uniform(0.9, 1.1)))
    canopy = np.zeros(cv.shape[:2], bool)
    for bx, by, rr in clusters:
        canopy |= g.disc(bx, by, rr)
        for a in range(0, 360, 40):  # bumpy rim = leafy edge
            canopy |= g.disc(bx + rr * 0.92 * math.cos(math.radians(a)), by + rr * 0.92 * math.sin(math.radians(a)),
                             rr * 0.28)
    canopy &= g.rect(x0, y0, x0 + W - 1, y0 + H - 1)
    fill(cv, dilate4(canopy) & ~canopy & g.rect(x0, y0, x0 + W - 1, y0 + H - 1), LEAF[0])
    fill(cv, canopy, LEAF[2])
    chk = (np.indices(canopy.shape).sum(0) % 2) == 0
    for bx, by, rr in sorted(clusters, key=lambda b: b[1]):
        lit = g.disc(bx - rr * 0.25, by - rr * 0.3, rr * 0.7) & canopy
        fill(cv, lit & chk, LEAF[3])
        fill(cv, g.disc(bx - rr * 0.3, by - rr * 0.35, rr * 0.55) & canopy, LEAF[3])
        fill(cv, g.disc(bx - rr * 0.4, by - rr * 0.45, rr * 0.3) & canopy, LEAF[4])
        fill(cv, g.disc(bx - rr * 0.5, by - rr * 0.55, rr * 0.1) & canopy, LEAF[5])
        under = g.disc(bx, by + rr * 0.55, rr * 0.6) & canopy & ~g.disc(bx - rr * 0.2, by, rr * 0.8)
        fill(cv, under, LEAF[1])
    fill(cv, canopy & (g.py > y0 + H * 0.56), LEAF[1])
    if fruit:
        for k in range(9):
            fx, fy = cx + rng.uniform(-W * 0.35, W * 0.35), y0 + H * 0.12 + rng.uniform(0, H * 0.36)
            if canopy[int(fy), int(fx)]:
                fill(cv, g.disc(fx, fy, 1.8), hex_rgb("#f2a03a"))
                put(cv, fx - 0.6, fy - 0.6, hex_rgb("#ffe0a0"))


# ---------------------------------------------------------------- architecture parts

def ashlar(cv, g, m, p, x0, y0, x1, y1, block_w=14, block_h=8, seed=0):
    """Stone blocks with per-block shading and mortar lines."""
    rng = np.random.default_rng(seed)
    fill(cv, m, p[1])
    row = 0
    for by in range(int(y0), int(y1) + 1, block_h):
        off = (block_w // 2) * (row % 2)
        for bx in range(int(x0) - off, int(x1) + 1, block_w):
            blk = g.rect(bx + 1, by + 1, bx + block_w - 1, by + block_h - 1) & m
            if not blk.any():
                continue
            tone = 3 if rng.random() > 0.25 else 2
            fill(cv, blk, p[tone])
            fill(cv, blk & (g.py < by + 2), p[4])
            fill(cv, blk & (g.px < bx + 2), p[4])
            fill(cv, blk & (g.py > by + block_h - 2), p[2])
            if block_w > 7 and rng.random() < 0.2:
                put(cv, bx + rng.integers(3, block_w - 3), by + 4, p[1])
        row += 1


def arch_window(cv, g, x, y, w, h, frame=STONE, lit=True):
    """Arched window with a stone surround and a keystone."""
    outer = g.rect(x - 2, y, x + w + 1, y + h + 1) | (g.disc(x + w / 2 - 0.5, y, w / 2 + 2) & (g.py <= y))
    vol(cv, outer, frame, shadow=1, light=1)
    inner = g.rect(x, y, x + w - 1, y + h - 1) | (g.disc(x + w / 2 - 0.5, y, w / 2) & (g.py <= y))
    if lit:
        vgrad(cv, inner, GLASS, y - w / 2, y + h, steps=(5, 4, 3, 2))
    else:
        fill(cv, inner, hex_rgb("#1c2236"))
    fill(cv, g.rect(x + w / 2 - 0.5, y - w / 2, x + w / 2, y + h - 1) & inner, TIMBER[2])
    fill(cv, g.rect(x, y + h * 0.45, x + w - 1, y + h * 0.45) & inner, TIMBER[2])
    ks = g.rect(x + w / 2 - 2, y - w / 2 - 3, x + w / 2 + 1, y - w / 2 + 1)
    vol(cv, ks, frame, shadow=1, light=1)


def timber_window(cv, g, x, y, w, h, shutter=None, box=True):
    frame = g.rect(x - 1, y - 1, x + w, y + h)
    vol(cv, frame, TIMBER, shadow=1, light=1)
    inner = g.rect(x, y, x + w - 1, y + h - 1)
    vgrad(cv, inner, GLASS, y, y + h, steps=(5, 4, 3))
    fill(cv, g.rect(x + w / 2 - 0.5, y, x + w / 2, y + h - 1) | g.rect(x, y + h / 2, x + w - 1, y + h / 2), TIMBER[2])
    if shutter:
        for sx in (x - 5, x + w + 1):
            sm = g.rect(sx, y - 1, sx + 3, y + h)
            vol(cv, sm, shutter, shadow=1, light=1)
            fill(cv, g.rect(sx + 1, y + 2, sx + 2, y + 2) | g.rect(sx + 1, y + h - 3, sx + 2, y + h - 3), shutter[1])
    if box:
        bm = g.rect(x - 3, y + h + 1, x + w + 2, y + h + 4)
        vol(cv, bm, WOOD, shadow=1, light=1)
        rng = np.random.default_rng(int(x * 7 + y))
        for k in range(w + 4):
            if rng.random() < 0.55:
                c = ("#ff5a7a", "#ffffff", "#ffd23f", "#ff8fb0")[rng.integers(4)]
                put(cv, x - 2 + k, y + h - rng.integers(0, 2), hex_rgb(c))
            put(cv, x - 2 + k, y + h + 1, LEAF[3] if k % 2 else LEAF[2])


def door_arch(cv, g, cx, bottom, w=14, h=22, double=False):
    surround = g.rect(cx - w / 2 - 3, bottom - h, cx + w / 2 + 2, bottom) | \
        (g.disc(cx - 0.5, bottom - h, w / 2 + 3) & (g.py <= bottom - h))
    vol(cv, surround, STONE, shadow=1, light=1)
    d = g.rect(cx - w / 2, bottom - h, cx + w / 2 - 1, bottom) | (g.disc(cx - 0.5, bottom - h, w / 2) & (g.py <= bottom - h))
    vol(cv, d, WOOD, outline=False, shadow=2, light=1, dirs=((1, 0), (-1, 0)))
    for k in range(1, 4):  # planks
        px = cx - w / 2 + k * w / 4
        fill(cv, g.rect(px, bottom - h - w / 2 + 2, px, bottom) & d, WOOD[1])
    for yy in (bottom - h + 3, bottom - 5):  # iron straps
        fill(cv, g.rect(cx - w / 2, yy, cx + w / 2 - 1, yy + 1) & d, IRON[3])
    if double:
        fill(cv, g.rect(cx - 0.5, bottom - h - w / 2, cx, bottom) & d, WOOD[0])
    fill(cv, g.disc(cx + w / 2 - 4, bottom - h * 0.45, 1.3), GOLD[4])
    ks = g.rect(cx - 2, bottom - h - w / 2 - 4, cx + 1, bottom - h - w / 2)
    vol(cv, ks, STONE, shadow=1, light=1)
    steps = g.rect(cx - w / 2 - 5, bottom - 1, cx + w / 2 + 4, bottom)
    vol(cv, steps, STONE, shadow=1, light=1)


def fish_scale_roof(cv, g, m, p, x0, y0, x1, y1, scale_w=6, scale_h=4):
    """Slate roof with rows of rounded (fish-scale) tiles."""
    fill(cv, m, p[2])
    row = 0
    for yy in range(int(y0), int(y1) + 1, scale_h):
        off = (scale_w // 2) * (row % 2)
        for xx in range(int(x0) - off, int(x1) + scale_w, scale_w):
            sc = g.ellipse(xx + scale_w / 2, yy + scale_h * 0.4, scale_w / 2, scale_h * 0.85) & (g.py >= yy) & m
            fill(cv, sc, p[3])
            fill(cv, sc & (g.py < yy + 1.5), p[4])
            fill(cv, sc & (g.py >= yy + scale_h - 1), p[1])
        row += 1
    # darken towards the bottom edge, light along the top edge
    fill(cv, _band(m, 0, 1, 2), p[1])
    fill(cv, dilate4(m) & ~m, p[0])


def half_timber(cv, g, x0, y0, x1, y1, pattern="cross"):
    wall = g.rect(x0, y0, x1, y1)
    vgrad(cv, wall, PLASTER, y0, y1, steps=(4, 3, 3))
    fill(cv, _band(wall, 0, -1, 3), PLASTER[2])  # shadow under the eaves
    beams = g.rect(x0, y0, x0 + 2, y1) | g.rect(x1 - 2, y0, x1, y1) | g.rect(x0, y1 - 2, x1, y1) | g.rect(x0, y0, x1, y0 + 1)
    n = max(2, int((x1 - x0) / 22))
    posts = [x0 + (x1 - x0) * k / n for k in range(1, n)]
    for px in posts:
        beams |= g.rect(px - 1, y0, px + 1, y1)
    xs = [x0] + posts + [x1]
    for a, b in zip(xs, xs[1:]):
        if pattern == "cross":
            beams |= g.polyline([(a + 2, y0 + 2), (b - 2, y1 - 2)], 0.9) | g.polyline([(a + 2, y1 - 2), (b - 2, y0 + 2)], 0.9)
        else:
            beams |= g.polyline([(a + 2, y1 - 2), (b - 2, y0 + 3)], 0.9)
    fill(cv, beams, TIMBER[3])
    fill(cv, beams & shift(~beams, 1, 0), TIMBER[4])
    fill(cv, beams & shift(~beams, -1, 0), TIMBER[2])


def corbels(cv, g, x0, x1, y):
    for bx in range(int(x0) + 2, int(x1) - 2, 12):
        c = g.poly([(bx, y), (bx + 5, y), (bx + 5, y + 6), (bx + 2, y + 3)])
        vol(cv, c, TIMBER, shadow=1, light=1)


def chimney(cv, g, x, top, bottom, smoke=True):
    c = g.rect(x, top, x + 7, bottom)
    ashlar(cv, g, c, STONE, x, top, x + 7, bottom, block_w=4, block_h=3, seed=3)
    fill(cv, dilate4(c) & ~c, STONE[0])
    cap = g.rect(x - 1, top - 2, x + 8, top)
    vol(cv, cap, STONE, shadow=1, light=1)
    if smoke:
        for k, (dx, dy, r) in enumerate(((3, -5, 2.2), (6, -10, 3), (4, -16, 3.6))):
            if top + dy - r < 0:
                continue
            puff = g.disc(x + dx, top + dy, r)
            fill(cv, puff, hex_rgb("#eef2f6"))
            fill(cv, puff & (g.py > top + dy), hex_rgb("#cfd6e0"))


def hanging_sign(cv, g, x, y, emblem_rgb):
    """Wrought-iron bracket with a hanging board."""
    fill(cv, g.rect(x, y, x + 14, y + 1), IRON[3])
    fill(cv, g.polyline([(x, y + 6), (x + 8, y + 1)], 0.6), IRON[3])
    fill(cv, g.ring(x + 13, y + 3, 2, 2, 0.8), IRON[3])
    fill(cv, g.rect(x + 5, y + 2, x + 5, y + 4) | g.rect(x + 12, y + 2, x + 12, y + 4), IRON[2])
    board = g.rect(x + 3, y + 5, x + 14, y + 14)
    vol(cv, board, WOOD, shadow=1, light=1)
    fill(cv, g.disc(x + 8.5, y + 9.5, 2.6), emblem_rgb)


def ivy(cv, g, x, y, h, seed=0):
    rng = np.random.default_rng(seed)
    for k in range(int(h / 3)):
        lx = x + rng.integers(-3, 4) + k % 3
        ly = y + k * 3
        leaf = g.ellipse(lx, ly, 2.2, 1.6)
        fill(cv, leaf, LEAF[2] if k % 2 else LEAF[3])
        put(cv, lx - 1, ly - 1, LEAF[4])


def banner(cv, g, x, y, h, emblem=True):
    pole = g.rect(x, y - 2, x + 15, y - 1)
    fill(cv, pole, IRON[3])
    cloth = g.poly([(x + 1, y), (x + 14, y), (x + 14, y + h), (x + 7.5, y + h - 5), (x + 1, y + h)])
    vol(cv, cloth, BANNER, shadow=2, light=1, dirs=((1, 0), (-1, 0)))
    fill(cv, g.rect(x + 1, y, x + 14, y + 1), GOLD[3])
    if emblem:  # kingdom crest: an open book under a six-pointed star (project's own design)
        bx, by = x + 7.5, y + h * 0.45
        book = g.poly([(bx - 5, by), (bx, by + 2), (bx + 5, by), (bx + 5, by + 4), (bx, by + 6), (bx - 5, by + 4)])
        fill(cv, book, GOLD[4])
        fill(cv, g.rect(bx - 0.5, by + 2, bx, by + 6), GOLD[2])
        for a in range(0, 360, 60):
            put(cv, bx + 3 * math.cos(math.radians(a - 90)), by - 5 + 3 * math.sin(math.radians(a - 90)), GOLD[5])
        put(cv, bx, by - 5, GOLD[5])


# ---------------------------------------------------------------- buildings

def town_house(S, name, w=6, h=8, roof=SLATE, shutter=None, sign_rgb=None, seed=0):
    """Stone ground floor, jettied half-timber upper floor, steep fish-scale gable."""
    x0, y0 = S.alloc(name, w, h)
    cv, g = S.cv, S.g
    W, H = w * T, h * T
    shutter = shutter or pal("#0e2a1a", "#1a4a30", "#256640", "#2f8050", "#48a068", "#7ac896")
    ground_top = y0 + H - 64
    upper_top = y0 + H - 124
    eave = upper_top + 2
    sx0, sx1 = x0 + 14, x0 + W - 15      # stone floor
    ux0, ux1 = x0 + 8, x0 + W - 9        # jettied upper floor is wider
    chimney(cv, g, x0 + W - 46, y0 + 22, eave)
    stone = g.rect(sx0, ground_top, sx1, y0 + H - 1)
    ashlar(cv, g, stone, STONE, sx0, ground_top, sx1, y0 + H - 1, seed=seed)
    fill(cv, dilate4(stone) & ~stone, STONE[0])
    door_arch(cv, g, x0 + W // 2 - 14, y0 + H - 1, w=14, h=26)
    arch_window(cv, g, x0 + W // 2 + 10, ground_top + 18, 12, 16)
    ivy(cv, g, sx0 + 3, ground_top + 4, 50, seed=seed)
    half_timber(cv, g, ux0, upper_top, ux1, ground_top - 6)
    fill(cv, g.rect(ux0 - 2, ground_top - 6, ux1 + 2, ground_top - 3), TIMBER[3])
    corbels(cv, g, ux0, ux1, ground_top - 3)
    for wx in (ux0 + 16, ux1 - 30):
        timber_window(cv, g, wx, upper_top + 16, 14, 18, shutter=shutter)
    # steep gable roof with fish-scale slate and carved bargeboards
    roof_m = g.poly([(x0, eave + 4), (x0 + W / 2, y0 + 6), (x0 + W - 1, eave + 4)])
    gable = g.poly([(x0 + 18, eave), (x0 + W / 2, y0 + 30), (x0 + W - 19, eave)])
    fish_scale_roof(cv, g, roof_m & ~gable, roof, x0, y0 + 6, x0 + W, eave + 4)
    gm = gable & (g.py < eave + 1)
    vgrad(cv, gm, PLASTER, y0 + 30, eave, steps=(3, 3, 2))
    fill(cv, g.rect(x0 + W / 2 - 1, y0 + 34, x0 + W / 2 + 1, eave) & gm, TIMBER[3])
    fill(cv, (g.polyline([(x0 + 26, eave), (x0 + W / 2, y0 + 44)], 1.0) |
              g.polyline([(x0 + W - 27, eave), (x0 + W / 2, y0 + 44)], 1.0)) & gm, TIMBER[3])
    ow = g.disc(x0 + W / 2, eave - 16, 5.5)
    vol(cv, ow, TIMBER, shadow=1, light=1)
    vgrad(cv, g.disc(x0 + W / 2, eave - 16, 3.8), GLASS, eave - 20, eave - 12, steps=(5, 4, 3))
    for side in (-1, 1):  # bargeboards
        bb = g.polyline([(x0 + W / 2, y0 + 6), (x0 + W / 2 + side * (W / 2 - 1), eave + 4)], 1.8)
        vol(cv, bb, WOOD, shadow=1, light=1)
    finial = g.rect(x0 + W / 2 - 1, y0, x0 + W / 2, y0 + 7) | g.disc(x0 + W / 2 - 0.5, y0 + 2, 1.6)
    fill(cv, finial, IRON[3])
    if sign_rgb:
        hanging_sign(cv, g, sx1 - 2, ground_top + 4, sign_rgb)


def school(S, name, w=10, h=9, seed=5):
    """Village school: stone hall with a round corner turret (conical roof),
    clock gable, arched windows, banners with the kingdom crest."""
    x0, y0 = S.alloc(name, w, h)
    cv, g = S.cv, S.g
    W, H = w * T, h * T
    base = y0 + H - 1
    hall_top = y0 + H - 150
    eave = hall_top + 2
    hx0, hx1 = x0 + 56, x0 + W - 14
    hall = g.rect(hx0, hall_top, hx1, base)
    ashlar(cv, g, hall, STONE, hx0, hall_top, hx1, base, seed=seed)
    fill(cv, dilate4(hall) & ~hall, STONE[0])
    fill(cv, g.rect(hx0 - 2, base - 76, hx1 + 2, base - 73), STONE[4])  # string course
    fill(cv, g.rect(hx0 - 2, base - 72, hx1 + 2, base - 72), STONE[1])
    cx = (hx0 + hx1) / 2
    door_arch(cv, g, cx, base, w=22, h=34, double=True)
    for wx in (hx0 + 14, hx1 - 30):
        arch_window(cv, g, wx, base - 52, 14, 24)
    for wx in (hx0 + 12, cx - 9, hx1 - 30):
        arch_window(cv, g, wx, hall_top + 26, 16, 26)
    for bx in (cx - 44, cx + 28):
        banner(cv, g, bx, base - 70, 34)
    # main roof: long fish-scale slate with a central clock gable
    roof_m = g.poly([(hx0 - 8, eave + 4), (hx0 + 14, y0 + 40), (hx1 - 14, y0 + 40), (hx1 + 8, eave + 4)])
    fish_scale_roof(cv, g, roof_m, SLATE, hx0 - 8, y0 + 40, hx1 + 8, eave + 4)
    gab = g.poly([(cx - 34, eave + 2), (cx, y0 + 16), (cx + 34, eave + 2)])
    gin = g.poly([(cx - 26, eave), (cx, y0 + 28), (cx + 26, eave)])
    fish_scale_roof(cv, g, gab & ~gin, SLATE, cx - 34, y0 + 16, cx + 34, eave + 2)
    gm = gin & (g.py < eave + 1)
    ashlar(cv, g, gm, STONE, cx - 26, y0 + 28, cx + 26, eave, block_w=10, block_h=6, seed=seed + 1)
    clock = g.disc(cx, eave - 22, 10)
    vol(cv, clock, GOLD, shadow=1, light=1)
    fill(cv, g.disc(cx, eave - 22, 8), hex_rgb("#f6efdc"))
    for a in range(0, 360, 30):
        put(cv, cx + 6.5 * math.cos(math.radians(a)), eave - 22 + 6.5 * math.sin(math.radians(a)), TIMBER[2])
    fill(cv, g.polyline([(cx, eave - 22), (cx, eave - 28)], 0.5) | g.polyline([(cx, eave - 22), (cx + 4, eave - 20)], 0.5),
         TIMBER[1])
    for side in (-1, 1):
        bb = g.polyline([(cx, y0 + 16), (cx + side * 34, eave + 2)], 1.6)
        vol(cv, bb, WOOD, shadow=1, light=1)
    # dormers
    for dx in (hx0 + 30, hx1 - 40):
        dm = g.rect(dx, eave - 30, dx + 16, eave - 6)
        ashlar(cv, g, dm, STONE, dx, eave - 30, dx + 16, eave - 6, block_w=6, block_h=4, seed=dx)
        droof = g.poly([(dx - 4, eave - 28), (dx + 8, eave - 42), (dx + 20, eave - 28)])
        fish_scale_roof(cv, g, droof, SLATE, dx - 4, eave - 42, dx + 20, eave - 28, scale_w=4, scale_h=3)
        timber_window(cv, g, dx + 4, eave - 24, 8, 12, box=False)
    chimney(cv, g, hx1 - 22, y0 + 46, eave - 30)
    # round turret on the left with a conical roof and a pennant
    tx0, tx1 = x0 + 10, x0 + 60
    tower = g.rect(tx0, y0 + 92, tx1, base)
    ashlar(cv, g, tower, STONE, tx0, y0 + 92, tx1, base, block_w=10, block_h=7, seed=seed + 2)
    # cylinder shading: light left, dark right
    chk = (np.indices(tower.shape).sum(0) % 2) == 0
    fill(cv, tower & (g.px > tx1 - 10) & chk, STONE[1])
    fill(cv, tower & (g.px > tx1 - 5), STONE[1])
    fill(cv, tower & (g.px < tx0 + 5) & chk, STONE[5])
    fill(cv, dilate4(tower) & ~tower, STONE[0])
    for wy in (y0 + 120, y0 + 180):
        arch_window(cv, g, (tx0 + tx1) / 2 - 5, wy, 10, 18)
    cone = g.poly([(tx0 - 8, y0 + 96), ((tx0 + tx1) / 2, y0 + 8), (tx1 + 8, y0 + 96)])
    fish_scale_roof(cv, g, cone, SLATE, tx0 - 8, y0 + 8, tx1 + 8, y0 + 96, scale_w=6, scale_h=4)
    fill(cv, cone & (g.px > (tx0 + tx1) / 2 + 10) & chk, SLATE[1])
    rim = g.ellipse((tx0 + tx1) / 2, y0 + 96, (tx1 - tx0) / 2 + 9, 3)
    vol(cv, rim, STONE, shadow=1, light=1)
    mast = g.rect((tx0 + tx1) / 2 - 0.5, y0, (tx0 + tx1) / 2, y0 + 10)
    fill(cv, mast, IRON[3])
    pennant = g.poly([((tx0 + tx1) / 2 + 1, y0 + 1), ((tx0 + tx1) / 2 + 14, y0 + 4), ((tx0 + tx1) / 2 + 1, y0 + 7)])
    vol(cv, pennant, BANNER, shadow=1, light=1)


def street_lamp(S, name):
    x0, y0 = S.alloc(name, 1, 3)
    cv, g = S.cv, S.g
    post = g.rect(x0 + 14, y0 + 22, x0 + 17, y0 + 92) | g.rect(x0 + 10, y0 + 88, x0 + 21, y0 + 95)
    vol(cv, post, IRON, shadow=1, light=1)
    fill(cv, g.polyline([(x0 + 17, y0 + 30), (x0 + 22, y0 + 22)], 0.6), IRON[3])
    cage = g.poly([(x0 + 8, y0 + 8), (x0 + 23, y0 + 8), (x0 + 21, y0 + 22), (x0 + 10, y0 + 22)])
    vol(cv, cage, IRON, shadow=1, light=1)
    vgrad(cv, g.rect(x0 + 11, y0 + 10, x0 + 20, y0 + 20), GLASS, y0 + 10, y0 + 20, steps=(5, 4, 3))
    fill(cv, g.rect(x0 + 15, y0 + 10, x0 + 16, y0 + 20), IRON[3])
    top = g.poly([(x0 + 6, y0 + 9), (x0 + 15.5, y0 + 1), (x0 + 25, y0 + 9)])
    vol(cv, top, IRON, shadow=1, light=1)


def well(S, name):
    x0, y0 = S.alloc(name, 3, 3)
    cv, g = S.cv, S.g
    W, H = 96, 96
    base = g.rect(x0 + 16, y0 + H - 34, x0 + W - 17, y0 + H - 1)
    ashlar(cv, g, base, STONE, x0 + 16, y0 + H - 34, x0 + W - 17, y0 + H - 1, block_w=12, block_h=7)
    fill(cv, dilate4(base) & ~base, STONE[0])
    rim = g.ellipse(x0 + W / 2, y0 + H - 34, W / 2 - 14, 5)
    vol(cv, rim, STONE, shadow=1, light=1)
    fill(cv, g.ellipse(x0 + W / 2, y0 + H - 34, W / 2 - 20, 2.6), hex_rgb("#0c0b12"))
    fill(cv, g.rect(x0 + W / 2 - 2, y0 + H - 35, x0 + W / 2 + 2, y0 + H - 34), hex_rgb("#f3ead2"))
    for px in (x0 + 20, x0 + W - 24):
        vol(cv, g.rect(px, y0 + 22, px + 3, y0 + H - 36), WOOD, shadow=1, light=1)
    roof = g.poly([(x0 + 8, y0 + 28), (x0 + W / 2, y0 + 6), (x0 + W - 9, y0 + 28)])
    fish_scale_roof(cv, g, roof, pal("#2a140a", "#5a2e14", "#7a4020", "#9a5628", "#bb7036", "#d89050"),
                    x0 + 8, y0 + 6, x0 + W - 9, y0 + 28, scale_w=5, scale_h=3)
    fill(cv, g.rect(x0 + 22, y0 + 36, x0 + W - 23, y0 + 37), WOOD[2])
    fill(cv, g.rect(x0 + W / 2, y0 + 37, x0 + W / 2, y0 + 52), hex_rgb("#c9b48a"))
    vol(cv, g.rect(x0 + W / 2 - 4, y0 + 52, x0 + W / 2 + 4, y0 + 59), WOOD, shadow=1, light=1)


def fence(S, name):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    posts = g.rect(x0 + 3, y0 + 12, x0 + 7, y0 + 31) | g.rect(x0 + 19, y0 + 12, x0 + 23, y0 + 31)
    posts |= g.poly([(x0 + 3, y0 + 12), (x0 + 5, y0 + 8), (x0 + 7, y0 + 12)]) | \
        g.poly([(x0 + 19, y0 + 12), (x0 + 21, y0 + 8), (x0 + 23, y0 + 12)])
    rails = g.rect(x0, y0 + 16, x0 + 31, y0 + 18) | g.rect(x0, y0 + 24, x0 + 31, y0 + 26)
    vol(cv, posts | rails, WOOD, shadow=1, light=1)


def crate_barrel(S, name):
    x0, y0 = S.alloc(name, 2, 1)
    cv, g = S.cv, S.g
    crate = g.rect(x0 + 2, y0 + 10, x0 + 23, y0 + 31)
    vol(cv, crate, WOOD, shadow=2, light=1)
    fill(cv, g.polyline([(x0 + 3, y0 + 11), (x0 + 22, y0 + 30)], 0.6) & crate, WOOD[1])
    barrel = g.ellipse(x0 + 42, y0 + 21, 10, 11) & g.rect(x0 + 32, y0 + 12, x0 + 52, y0 + 31)
    vol(cv, barrel, WOOD, shadow=3, light=2, dirs=((1, 0), (-1, 0)))
    for yy in (y0 + 15, y0 + 27):
        fill(cv, g.rect(x0 + 32, yy, x0 + 52, yy + 1) & barrel, IRON[3])


def plank(S, name, end=None):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    m = g.rect(x0, y0 + 2, x0 + T - 1, y0 + 11)
    if end == "l":
        m &= ~((g.px < x0 + 3) & ((g.py < y0 + 4) | (g.py > y0 + 9)))
    if end == "r":
        m &= ~((g.px > x0 + T - 4) & ((g.py < y0 + 4) | (g.py > y0 + 9)))
    vol(cv, m, WOOD, shadow=2, light=1, dirs=((0, 1), (0, -1)))
    for k in (10, 21):
        fill(cv, g.rect(x0 + k, y0 + 3, x0 + k, y0 + 10), WOOD[1])
        put(cv, x0 + k - 3, y0 + 6, IRON[3])
    if end in ("l", "r"):
        bx = x0 + 6 if end == "l" else x0 + T - 9
        br = g.poly([(bx, y0 + 12), (bx + 3, y0 + 12), (bx + 3, y0 + 26), (bx, y0 + 20)])
        vol(cv, br, WOOD, shadow=1, light=1)


def rope_ladder(S, name):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    rope = pal("#3a2a14", "#7a6038", "#9a7c4c", "#b89a64", "#d4b880", "#ecd6a2")
    for sx in (x0 + 7, x0 + 24):
        fill(cv, g.rect(sx, y0, sx + 1, y0 + T - 1), rope[2])
        for yy in range(y0, y0 + T, 3):
            put(cv, sx + (yy // 3) % 2, yy, rope[4])
    for ry in (y0 + 6, y0 + 22):
        rung = g.rect(x0 + 5, ry, x0 + 26, ry + 3)
        vol(cv, rung, WOOD, shadow=1, light=1)


def waterfall(S, name, seed=0):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    m = g.rect(x0, y0, x0 + T - 1, y0 + T - 1)
    fill(cv, m, WATER[3])
    rng = np.random.default_rng(seed)
    for k in range(9):  # vertical streaks of foam and depth
        sx = x0 + int(rng.integers(0, T))
        sy = y0 + int(rng.integers(-8, T))
        ln = int(rng.integers(8, 20))
        c = (WATER[5], WATER[4], WATER[2])[k % 3]
        fill(cv, g.rect(sx, max(y0, sy), sx + (1 if k % 3 == 0 else 0), min(y0 + T - 1, sy + ln)), c)
    fill(cv, g.rect(x0, y0, x0, y0 + T - 1) | g.rect(x0 + T - 1, y0, x0 + T - 1, y0 + T - 1), WATER[1])


def pool(S, name, top=False, seed=0):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    m = g.rect(x0, y0 + (6 if top else 0), x0 + T - 1, y0 + T - 1)
    vgrad(cv, m, WATER, y0, y0 + T, steps=(3, 3, 2))
    rng = np.random.default_rng(seed)
    if top:
        for x in range(T):  # wave crest line
            yy = y0 + 6 + int(round(math.sin((x + seed) * 0.5) * 1.2))
            put(cv, x0 + x, yy, WATER[5])
            put(cv, x0 + x, yy + 1, WATER[4])
        for k in range(3):  # foam blobs where the fall hits
            fx = x0 + int(rng.integers(3, T - 3))
            fill(cv, g.ellipse(fx, y0 + 5, 3, 1.6), WATER[5])
    for k in range(4):
        wx = x0 + int(rng.integers(2, T - 8))
        wy = y0 + int(rng.integers(12, T - 3))
        fill(cv, g.rect(wx, wy, wx + 5, wy), WATER[4])
    cv[y0:y0 + T, x0:x0 + T, 3] = np.where(cv[y0:y0 + T, x0:x0 + T, 3] > 0, 230, 0)


def stone_spikes(S, name):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    for k in range(4):
        sx = x0 + 4 + k * 8
        m = g.poly([(sx - 4, y0 + 31), (sx - 0.5, y0 + 13 + (k % 2) * 4), (sx + 0.5, y0 + 13 + (k % 2) * 4),
                    (sx + 4, y0 + 31)])
        vol(cv, m, CAVE, shadow=2, light=1, dirs=((1, 0), (-1, 0)))


def crystals(S, name, base_hex="#7fd1ff"):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    c = pal("#0f2a4a", "#2a5a9a", "#3a86d0", base_hex, "#c8f0ff", "#ffffff")
    for (cx, h, w) in ((x0 + 13, 22, 4.5), (x0 + 21, 15, 3.5), (x0 + 7, 11, 3)):
        m = g.poly([(cx - w, y0 + 31), (cx - w, y0 + 31 - h * 0.7), (cx, y0 + 31 - h), (cx + w, y0 + 31 - h * 0.7),
                    (cx + w, y0 + 31)])
        vol(cv, m, c, shadow=2, light=1, dirs=((1, 0), (-1, 0)))
    put(cv, x0 + 11, y0 + 14, c[5])


def stalactites(S, name):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    for (cx, h, w) in ((x0 + 9, 26, 5), (x0 + 22, 16, 4), (x0 + 28, 9, 2.5)):
        m = g.poly([(cx - w, y0), (cx + w, y0), (cx + 0.5, y0 + h), (cx - 0.5, y0 + h)])
        vol(cv, m, CAVE, shadow=2, light=1, dirs=((1, 0), (-1, 0)))
        put(cv, cx, y0 + h + 2, WATER[4])


def mushrooms(S, name):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    for (mx, sz, col) in ((x0 + 11, 6.5, ("#5a1414", "#9a2424", "#c83a3a", "#e05d5d", "#f08a8a", "#ffc0c0")),
                          (x0 + 22, 4.5, ("#5a3a0a", "#9a6a1a", "#c8902a", "#e8b04a", "#f6cc70", "#fff0b0"))):
        stem = g.rect(mx - 1.5, y0 + 31 - sz * 1.6, mx + 1.5, y0 + 31)
        vol(cv, stem, PLASTER, shadow=1, light=1)
        cap = g.ellipse(mx, y0 + 31 - sz * 1.6, sz, sz * 0.75) & (g.py < y0 + 31 - sz * 1.4)
        vol(cv, cap, pal(*col), shadow=1, light=1)
        for dx in (-sz * 0.4, sz * 0.3):
            put(cv, mx + dx, y0 + 31 - sz * 2.0, hex_rgb("#ffffff"))


def signpost(S, name):
    x0, y0 = S.alloc(name)
    cv, g = S.cv, S.g
    post = g.rect(x0 + 14, y0 + 12, x0 + 17, y0 + 31)
    vol(cv, post, WOOD, shadow=1, light=1)
    board = g.poly([(x0 + 3, y0 + 4), (x0 + 24, y0 + 4), (x0 + 30, y0 + 9.5), (x0 + 24, y0 + 15), (x0 + 3, y0 + 15)])
    vol(cv, board, WOOD, shadow=2, light=1)
    fill(cv, g.rect(x0 + 6, y0 + 8, x0 + 22, y0 + 8) | g.rect(x0 + 6, y0 + 11, x0 + 18, y0 + 11), WOOD[1])


def windmill(S, name, w=5, h=8):
    x0, y0 = S.alloc(name, w, h)
    cv, g = S.cv, S.g
    W, H = w * T, h * T
    cx = x0 + W / 2
    tower = g.poly([(cx - 26, y0 + H - 1), (cx - 18, y0 + 90), (cx + 18, y0 + 90), (cx + 26, y0 + H - 1)])
    ashlar(cv, g, tower, STONE, cx - 26, y0 + 90, cx + 26, y0 + H - 1, block_w=10, block_h=7, seed=9)
    chk = (np.indices(tower.shape).sum(0) % 2) == 0
    fill(cv, tower & (g.px > cx + 12) & chk, STONE[1])
    fill(cv, dilate4(tower) & ~tower, STONE[0])
    door_arch(cv, g, cx, y0 + H - 1, w=12, h=20)
    arch_window(cv, g, cx - 5, y0 + 130, 10, 14)
    cap = g.poly([(cx - 24, y0 + 92), (cx, y0 + 58), (cx + 24, y0 + 92)])
    fish_scale_roof(cv, g, cap, pal("#2a140a", "#5a2e14", "#7a4020", "#9a5628", "#bb7036", "#d89050"),
                    cx - 24, y0 + 58, cx + 24, y0 + 92, scale_w=5, scale_h=3)
    hub = (cx, y0 + 76)
    sail_p = pal("#4a3a2a", "#b8a888", "#d4c6a6", "#ece0c4", "#f8f0dc", "#ffffff")
    for a in (35, 125, 215, 305):
        dx, dy = math.cos(math.radians(a)), math.sin(math.radians(a))
        px, py = -dy, dx
        lattice = g.poly([(hub[0] + dx * 14, hub[1] + dy * 14), (hub[0] + dx * 70, hub[1] + dy * 70),
                          (hub[0] + dx * 70 + px * 14, hub[1] + dy * 70 + py * 14),
                          (hub[0] + dx * 14 + px * 14, hub[1] + dy * 14 + py * 14)])
        lattice &= g.rect(x0, y0, x0 + W - 1, y0 + H - 1)
        vol(cv, lattice, sail_p, shadow=1, light=1)
        for k in range(20, 70, 9):
            fill(cv, g.capsule(hub[0] + dx * k, hub[1] + dy * k, hub[0] + dx * k + px * 14, hub[1] + dy * k + py * 14, 0.4)
                 & lattice, sail_p[1])
        arm = g.capsule(hub[0], hub[1], hub[0] + dx * 72, hub[1] + dy * 72, 1.3) & g.rect(x0, y0, x0 + W - 1, y0 + H - 1)
        fill(cv, arm, TIMBER[3])
    vol(cv, g.disc(*hub, 4), IRON, shadow=1, light=1)


def haystack(S, name):
    x0, y0 = S.alloc(name, 2, 2)
    cv, g = S.cv, S.g
    m = g.ellipse(x0 + 32, y0 + 44, 27, 21) & (g.py < y0 + 63)
    hay = pal("#5a3f10", "#a8782a", "#c8962e", "#e2b84a", "#f4d478", "#fff0b0")
    vol(cv, m, hay, shadow=4, light=2)
    rng = np.random.default_rng(4)
    for _ in range(50):
        hx, hy = x0 + rng.integers(8, 56), y0 + rng.integers(26, 60)
        if m[hy, hx]:
            fill(cv, g.rect(hx, hy, hx + 2, hy), hay[2] if rng.random() < 0.6 else hay[4])


def boss_altar(S, name):
    x0, y0 = S.alloc(name, 4, 3)
    cv, g = S.cv, S.g
    base = g.rect(x0 + 12, y0 + 58, x0 + 115, y0 + 95)
    ashlar(cv, g, base, CAVE, x0 + 12, y0 + 58, x0 + 115, y0 + 95, block_w=16, block_h=9, seed=3)
    fill(cv, dilate4(base) & ~base, CAVE[0])
    top = g.rect(x0 + 6, y0 + 50, x0 + 121, y0 + 58)
    vol(cv, top, CAVE, shadow=2, light=1)
    fill(cv, g.polyline([(x0 + 40, y0 + 60), (x0 + 46, y0 + 72), (x0 + 42, y0 + 88)], 0.6), CAVE[0])
    paper = pal("#6b5a3a", "#b8a878", "#d2c29a", "#f3ead2", "#fffaf0", "#ffffff")
    for (px, py) in ((x0 + 50, y0 + 30), (x0 + 70, y0 + 18), (x0 + 36, y0 + 14), (x0 + 84, y0 + 36)):
        vol(cv, g.rect(px, py, px + 9, py + 12), paper, shadow=1, light=1)
        for k in range(3):
            fill(cv, g.rect(px + 2, py + 3 + k * 3, px + 7, py + 3 + k * 3), paper[2])
    for k in range(8):
        put(cv, x0 + 20 + k * 12, y0 + 40 - (k % 3) * 9, hex_rgb("#ffffff"))


def build_r01():
    S = Sheet(rows=48)
    cliff_set(S, "grass", EARTH, EARTH_DEEP, GRASS, seed=1)
    cliff_set(S, "cave", CAVE, pal("#0e0a12", "#1e1828", "#2a2434", "#3a3248", "#4e4560", "#665c7c"), MOSS, seed=40)
    for k, n in enumerate(("bush", "bush_b")):
        bush(S, n, 2, 1, seed=k + 3)
    fern(S, "fern", 2)
    flowers(S, "flowers_a", ["#ff7aa8", "#ffffff", "#ffb03a"], 1)
    flowers(S, "flowers_b", ["#b48cff", "#ff7aa8", "#ffffff"], 2)
    grass_tall(S, "grass_tall_a", 4)
    vine(S, "vine", 5)
    rock(S, "rock", 6)
    fence(S, "fence_m")
    crate_barrel(S, "crates")
    street_lamp(S, "lamp")
    tree(S, "tree_big", 4, 6, seed=3)
    tree(S, "tree_small", 3, 4, seed=8)
    well(S, "well")
    town_house(S, "house_a", 6, 8, seed=1, sign_rgb=hex_rgb("#c8402e"))
    town_house(S, "house_b", 5, 7, roof=pal("#2a0e0a", "#5a1a12", "#7a2a1c", "#9a3a26", "#bb5236", "#d8764e"),
               shutter=pal("#0e1a3a", "#1a2c5a", "#24407a", "#2f5aa0", "#4a7ac8", "#7aa2e0"), seed=2)
    school(S, "school", 10, 9)
    plank(S, "plank_l", "l")
    plank(S, "plank_m")
    plank(S, "plank_r", "r")
    rope_ladder(S, "ladder")
    for k in range(2):
        waterfall(S, f"waterfall_{k}", seed=k)
    pool(S, "water_top", top=True, seed=1)
    pool(S, "water", seed=2)
    stone_spikes(S, "spikes")
    crystals(S, "crystal_blue")
    crystals(S, "crystal_violet", "#b9a3ff")
    stalactites(S, "stalactite")
    mushrooms(S, "mushrooms")
    signpost(S, "sign")
    windmill(S, "windmill", 5, 8)
    haystack(S, "haystack")
    boss_altar(S, "boss_altar")
    return S.finish()

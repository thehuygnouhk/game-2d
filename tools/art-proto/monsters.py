"""Chapter 1 monsters and bosses (docs/game-design/05-world-maps-monsters.md).

Each monster: 4 animations x 4 frames (idle, move, attack, die), facing right
(flip for left). Small monsters 64x64, bosses 128x128, Trang Lac 160x160
(art-audio-direction section 4).
"""
from __future__ import annotations

import math

import numpy as np

from pix import Grid, canvas, dilate4, fill, hex_rgb, put
from tiles_rich import pal, vol

ANIMS = ("idle", "move", "attack", "die")
INK = hex_rgb("#160f1c")
WHITE = (255, 255, 255)


def darker(p):
    """Shift a 6-tone palette one step darker (far limbs, far wings)."""
    return [p[0]] + [p[max(0, j - 1)] for j in range(1, 6)]


def eye(cv, g, x, y, r=2.2, angry=False, glow=None):
    fill(cv, g.ellipse(x, y, r * 0.8, r), INK if not glow else hex_rgb(glow))
    put(cv, x - r * 0.3, y - r * 0.4, WHITE)
    if angry:
        fill(cv, g.polyline([(x - r * 1.4, y - r * 1.6), (x + r * 1.2, y - r * 0.9)], 0.6), INK)


def glow_eye(cv, g, x, y, r, color, slant=1):
    """Slanted glowing slit eye of a mana-touched beast."""
    c = hex_rgb(color)
    almond = g.poly([(x - r * 1.3, y + r * 0.35 * slant), (x, y - r * 0.55), (x + r * 1.3, y - r * 0.35 * slant),
                     (x, y + r * 0.55)])
    fill(cv, dilate4(almond) & ~almond, INK)
    fill(cv, almond, c)
    fill(cv, g.rect(x - 0.5, y - r * 0.5, x + 0.5, y + r * 0.5) & almond, INK)
    put(cv, x - r * 0.6, y - r * 0.1, WHITE)


def runes(cv, g, mask, color, seed=0, n=4, size=3.0):
    """Glowing mana runes (short strokes, chevrons, rings) inside a body mask."""
    rng = np.random.default_rng(seed)
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return
    c = hex_rgb(color)
    core = tuple(min(255, v + 90) for v in c)
    for k in range(n):
        j = rng.integers(len(xs))
        x, y = xs[j], ys[j]
        kind = k % 3
        if kind == 0:
            m = g.polyline([(x - size, y + size * 0.6), (x, y - size * 0.6), (x + size, y + size * 0.6)], 0.5)
        elif kind == 1:
            m = g.ring(x, y, size * 0.8, size * 0.8, 0.8)
        else:
            m = g.polyline([(x - size, y), (x + size, y)], 0.5) | g.polyline([(x, y - size), (x, y + size)], 0.5)
        fill(cv, m & mask, c)
        put(cv, x, y, core)


def aura(cv, g, cx, cy, r, color, i, n=6):
    """Mana motes drifting around a beast."""
    c = hex_rgb(color)
    core = tuple(min(255, v + 90) for v in c)
    for k in range(n):
        ang = math.radians(k * 360 / n + i * 25)
        rr = r * (0.85 + 0.15 * ((k + i) % 2))
        x, y = cx + math.cos(ang) * rr, cy + math.sin(ang) * rr * 0.6 - ((i + k) % 4)
        fill(cv, g.poly([(x, y - 2), (x + 1.2, y), (x, y + 2), (x - 1.2, y)]), c)
        put(cv, x, y, core)


def fangs(cv, g, x, y, n=2, h=3, gap=3):
    for k in range(n):
        fx = x + k * gap
        fill(cv, g.poly([(fx - 1, y), (fx + 1, y), (fx, y + h)]), WHITE)


def dissolve(cv, k, n=4):
    """Death fade without partial alpha: drop an ordered-dither share of pixels."""
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])
    h, w = cv.shape[:2]
    thr = np.tile(bayer, (h // 4 + 1, w // 4 + 1))[:h, :w]
    cv[thr < (16 * k // n), 3] = 0
    return cv


def flash(cv):
    m = cv[..., 3] > 0
    cv[m, :3] = (cv[m, :3].astype(int) + 255) // 2
    return cv


def _frames(draw, size):
    out = {}
    for a in ANIMS:
        out[a] = []
        for i in range(4):
            cv = canvas(size, size)
            g = Grid(size, size)
            if a == "die":
                draw(cv, g, "die", i)
                if i == 0:
                    flash(cv)
                else:
                    dissolve(cv, i)
            else:
                draw(cv, g, a, i)
            out[a].append(cv)
    return out


# ---------------------------------------------------------------- palettes

CAP_RED = pal("#100a1e", "#24183e", "#352458", "#463274", "#5e4694", "#7e64b8")   # dusk-violet cap
STEM = pal("#2e2a2a", "#7e7466", "#9a8e7c", "#b4a892", "#cabea8", "#e0d6c2")
SPORE = "#3ff0d2"
FUR_CREAM = pal("#2a2830", "#7a7682", "#9690a0", "#b2acbc", "#cac6d2", "#e4e0ea")
FUR_BROWN = pal("#2e1c10", "#5a3a20", "#7a5030", "#9a6a40", "#b88a58", "#d4aa78")
FUR_GREY = pal("#1e1a1e", "#3e3840", "#5a5258", "#766c70", "#948a8c", "#b4aaac")
FUR_DARK = pal("#120e12", "#2a2228", "#3e3238", "#54444a", "#6e5a60", "#8e787c")
GNOME_SKIN = pal("#16200e", "#3e5228", "#526a34", "#688442", "#82a056", "#a2bc72")    # grey-green imp
TUNIC = pal("#140e0a", "#33241a", "#463224", "#5a4230", "#72563e", "#8e6e50")         # ragged hide
ROCK = pal("#1e1a22", "#4a4450", "#666070", "#847e8e", "#a49eae", "#c8c2d0")
INKBODY = pal("#08060e", "#16122a", "#241c40", "#33295a", "#4a3c7c", "#6e5aa8")
BAT = pal("#120c18", "#2a2036", "#3c2e4c", "#504064", "#6a5682", "#8c78a8")
WING = pal("#1a1022", "#3a2a48", "#4e3a5e", "#644c76", "#7e6292", "#a086b4")
SHELL = pal("#1a1820", "#3e3a46", "#56505e", "#6e6878", "#8a8494", "#aaa4b4")
MOSSP = pal("#0c1812", "#1f4229", "#2a5634", "#3a6e42", "#548a54", "#78a870")
TURTLE_SKIN = pal("#141a16", "#34402e", "#46543c", "#5a6a4c", "#72845e", "#90a278")
PAPER = pal("#4a3e2e", "#b8aa88", "#d2c6a6", "#ece2c8", "#f8f2e2", "#ffffff")
GOLD = pal("#4a2a0e", "#9a6420", "#c48a2e", "#e0aa44", "#f4cc70", "#fff0b0")
ROYAL = pal("#1a0a2a", "#3a1a5a", "#4e2a7a", "#64389a", "#8250b8", "#a678d8")
CRYSTAL = pal("#0f2a4a", "#2a5a9a", "#3a86d0", "#7fd1ff", "#c8f0ff", "#ffffff")


# ---------------------------------------------------------------- MOB001 Nam Lun

def nam_lun(cv, g, a, i, scale=1.0, king=False):
    s = scale
    W = cv.shape[1]
    cx = W / 2
    base = cv.shape[0] - 3 * s
    dy = dx = 0
    sq = 0
    if a == "idle":
        sq = (0, 1, 2, 1)[i]
    if a == "move":
        dy = (0, -5, -7, -2)[i] * s
        sq = (2, -2, -1, 1)[i]
    if a == "attack":
        dx = (-2, -4, 7, 3)[i] * s
        sq = (2, 3, -2, 0)[i]
        if king:
            dy = (0, -10, -14, 0)[i] * s
            dx = 0
    if a == "die":
        sq = (3, 5, 7, 8)[i]
    cx += dx
    bh = 12 * s - sq * s * 0.6
    bw = 10 * s + sq * s * 0.5
    stem = g.ellipse(cx, base - bh + dy, bw, bh)
    vol(cv, stem, STEM, shadow=int(3 * s), light=1)
    capw, caph = 19 * s + sq * s * 0.6, 11 * s - sq * s * 0.3
    capy = base - bh * 1.55 + dy
    cap = g.ellipse(cx, capy, capw, caph) & (g.py < capy + caph * 0.55)
    vol(cv, cap, CAP_RED if not king else pal("#14060e", "#320c22", "#4e1434", "#6a1e48", "#8a3060", "#b04e80"),
        shadow=int(3 * s), light=int(2 * s))
    for k, (ox, oy, r) in enumerate(((-0.45, -0.2, 3.0), (0.2, -0.45, 2.4), (0.55, -0.05, 2.0), (-0.05, 0.1, 1.6))):
        spot = g.ellipse(cx + ox * capw, capy + oy * caph * 1.3, r * s, r * s * 0.8) & cap
        fill(cv, spot, hex_rgb(SPORE))
        put(cv, cx + ox * capw - 0.5, capy + oy * caph * 1.3 - 0.5, hex_rgb("#c8fff4"))
    runes(cv, g, stem, SPORE, seed=int(s * 10), n=2, size=1.8 * s)
    fill(cv, g.ellipse(cx, capy + caph * 0.5, capw * 0.85, 1.6 * s) & ~cap, CAP_RED[1] if not king else ROYAL[1])
    ey = base - bh * 0.88 + dy
    angry = a == "attack" or king
    if a == "die":
        for ex in (cx + 1 * s, cx + 7 * s):
            fill(cv, g.polyline([(ex - 1.5 * s, ey - 1.5 * s), (ex + 1.5 * s, ey + 1.5 * s)], 0.6 * s) |
                 g.polyline([(ex - 1.5 * s, ey + 1.5 * s), (ex + 1.5 * s, ey - 1.5 * s)], 0.6 * s), INK)
    else:
        glow_eye(cv, g, cx + 1 * s, ey, 2.2 * s, SPORE)
        glow_eye(cv, g, cx + 7 * s, ey, 2.0 * s, SPORE)
    fill(cv, g.ellipse(cx + 4 * s, ey + 3.6 * s, 2.8 * s, 1.0 * s if a != "attack" else 1.8 * s), INK)
    fangs(cv, g, cx + 2.5 * s, ey + 3.2 * s, n=2, h=1.6 * s, gap=3 * s)
    if a != "die":
        aura(cv, g, cx, capy, capw * 1.15, SPORE, i, n=5)
    for fx in (cx - 5 * s, cx + 5 * s):  # feet
        foot = g.ellipse(fx + (2 * s if fx > cx else 0), base + dy - 1 * s, 3.4 * s, 2 * s)
        vol(cv, foot, STEM, shadow=1, light=1)
    if king:
        crown_y = capy - caph * 0.95
        crown = g.poly([(cx - 9 * s, crown_y + 4 * s), (cx - 9 * s, crown_y - 3 * s), (cx - 4.5 * s, crown_y + 1 * s),
                        (cx, crown_y - 6 * s), (cx + 4.5 * s, crown_y + 1 * s), (cx + 9 * s, crown_y - 3 * s),
                        (cx + 9 * s, crown_y + 4 * s)])
        vol(cv, crown, FUR_BROWN, shadow=2, light=1)
        for k in (-1, 1):  # antler tines
            tine = g.polyline([(cx + k * 6 * s, crown_y), (cx + k * 12 * s, crown_y - 8 * s), (cx + k * 16 * s, crown_y - 7 * s)], 1.2 * s)
            vol(cv, tine, FUR_BROWN, shadow=1, light=1)
        for gx in (cx - 9 * s, cx, cx + 9 * s):
            fill(cv, g.disc(gx, crown_y - (6 if gx == cx else 3) * s, 1.5 * s), hex_rgb(SPORE))
        beard = g.poly([(cx - 2 * s, ey + 6 * s), (cx + 10 * s, ey + 5 * s), (cx + 5 * s, ey + 14 * s)])
        vol(cv, beard, MOSSP, shadow=1, light=1)
        staff = g.capsule(cx + 14 * s, base + dy, cx + 18 * s, base - 30 * s + dy, 1.6 * s)
        vol(cv, staff, FUR_BROWN, shadow=1, light=1)
        fill(cv, g.disc(cx + 18 * s, base - 31 * s + dy, 4.2 * s), hex_rgb("#1a5a52"))
        fill(cv, g.disc(cx + 18 * s, base - 31 * s + dy, 3 * s), hex_rgb(SPORE))
        put(cv, cx + 17 * s, base - 32 * s + dy, WHITE)
        if a == "attack" and i == 3:  # shock rings on landing
            for r in (18 * s, 26 * s):
                fill(cv, g.ring(cx, base - 2 * s, r, r * 0.25, 1.6 * s), hex_rgb(SPORE))
    if a == "die" and i >= 1:
        for k in range(6):
            ang = math.radians(k * 60 + i * 15)
            put(cv, cx + math.cos(ang) * (8 + i * 4) * s, base - 14 * s + math.sin(ang) * (6 + i * 3) * s,
                hex_rgb("#f6e6c0"))


# ---------------------------------------------------------------- MOB002 Tho Dom

def tho_dom(cv, g, a, i):
    cx, base = 30, 61
    dy = dx = 0
    ear = 0
    stretch = 0
    if a == "idle":
        ear = (0, 1, 0, -1)[i]
        dy = (0, 0, 1, 0)[i]
    if a == "move":
        dy = (0, -6, -8, -3)[i]
        stretch = (0, 3, 2, -1)[i]
    if a == "attack":
        dx = (-2, -3, 6, 2)[i]
    if a == "die":
        dy = 2
    cx += dx
    body = g.ellipse(cx - 2, base - 11 + dy, 13 + stretch, 9 - stretch * 0.4)
    vol(cv, body, FUR_CREAM, shadow=3, light=1)
    for (sx, sy, r) in ((-7, -14, 3.0), (1, -8, 2.6), (-4, -6, 2.0)):
        fill(cv, g.ellipse(cx + sx, base + sy + dy, r, r * 0.8) & body, hex_rgb("#ffb347"))
        put(cv, cx + sx, base + sy + dy, hex_rgb("#fff0c0"))
    tail = g.disc(cx - 15 - stretch, base - 13 + dy, 3.4)
    vol(cv, tail, FUR_CREAM, shadow=1, light=1)
    hx, hy = cx + 10 + stretch, base - 18 + dy
    for k, (ex, lean) in enumerate(((-3, -14), (1, -10))):  # ears behind the head
        e = g.ellipse(hx + ex + (lean + ear * 3) * 0.25, hy - 11, 2.6, 8.5)
        vol(cv, e, FUR_CREAM, shadow=1, light=1)
        fill(cv, g.ellipse(hx + ex + (lean + ear * 3) * 0.25, hy - 10, 1.1, 6) & e, hex_rgb("#f2a3a3"))
    head = g.ellipse(hx, hy, 8, 7)
    vol(cv, head, FUR_CREAM, shadow=2, light=1)
    horn = g.poly([(hx + 1, hy - 5), (hx + 6, hy - 15), (hx + 4, hy - 4)])
    vol(cv, horn, pal("#3a1a0a", "#a8601a", "#d88a2a", "#ffb347", "#ffd890", "#fff4d0"), shadow=1, light=1)
    if a == "die":
        fill(cv, g.polyline([(hx + 1, hy - 2), (hx + 4, hy + 1)], 0.6) | g.polyline([(hx + 1, hy + 1), (hx + 4, hy - 2)], 0.6), INK)
    else:
        glow_eye(cv, g, hx + 3, hy - 1, 2.0, "#ff4d5a")
    fill(cv, g.disc(hx + 7.5, hy + 1, 1.2), INK)
    fangs(cv, g, hx + 5, hy + 3, n=1, h=2.2)
    legs = [((cx - 9, base - 4 + dy), (cx - 11 - (6 if a == "attack" and i == 2 else 0), base + dy - 0.5)),
            ((cx + 5, base - 4 + dy), (cx + 7 + stretch, base + dy - 0.5))]
    for (x0, y0), (x1, y1) in legs:
        leg = g.capsule(x0, y0, x1, y1, 2.6)
        vol(cv, leg, FUR_CREAM, shadow=1, light=1)


# ---------------------------------------------------------------- quadruped (dog / wolf)

def wolf(cv, g, a, i, s=1.0, alpha=False):
    W, H = cv.shape[1], cv.shape[0]
    cx, base = W * 0.45, H - 3 * s
    fur = FUR_GREY if not alpha else FUR_DARK
    belly = FUR_CREAM if not alpha else FUR_GREY
    dx = dy = 0
    phase = i * math.pi / 2
    swing = 0
    open_mouth = False
    if a == "idle":
        dy = (0, 0, 1, 1)[i] * s
    if a == "move":
        swing = math.sin(phase)
        dy = -abs(math.sin(phase)) * 2 * s
    if a == "attack":
        dx = (-3, -5, 9, 4)[i] * s
        dy = (0, 1, -3, 0)[i] * s
        open_mouth = i in (1, 2)
    if a == "die":
        dy = 2 * s
    cx += dx
    by = base - 15 * s + dy
    # legs: back pair darker, front pair normal
    for k, (lx, ph) in enumerate(((-10, 0), (8, math.pi), (-7, math.pi), (11, 0))):
        far = k >= 2
        off = math.sin(phase + ph) * 5 * s if a == "move" else 0
        top = (cx + lx * s, by + 4 * s)
        foot = (cx + lx * s + off, base - (abs(math.cos(phase + ph)) * 2 * s if a == "move" else 0))
        leg = g.capsule(*top, *foot, 2.4 * s)
        p = fur if not far else darker(fur)
        vol(cv, leg, p, shadow=1, light=1)
    tail_a = -150 + (math.sin(phase * 2) * 15 if a != "die" else 30)
    tx, ty = cx - 16 * s, by - 2 * s
    tail = g.polyline([(tx, ty), (tx + math.cos(math.radians(tail_a)) * 9 * s, ty + math.sin(math.radians(tail_a)) * 9 * s),
                       (tx + math.cos(math.radians(tail_a - 25)) * 15 * s, ty + math.sin(math.radians(tail_a - 25)) * 13 * s)],
                      2.6 * s)
    vol(cv, tail, fur, shadow=1, light=1)
    body = g.ellipse(cx, by, 18 * s, 9 * s)
    vol(cv, body, fur, shadow=int(3 * s), light=int(1 * s))
    fill(cv, g.ellipse(cx + 2 * s, by + 5 * s, 12 * s, 3.5 * s) & body, belly[3])
    glow = "#5af0ff" if not alpha else "#7cf0ff"
    for k in range(3):  # mana stripes
        sx = cx - 10 * s + k * 7 * s
        fill(cv, g.polyline([(sx, by - 7 * s), (sx + 2 * s, by - 2 * s), (sx, by + 2 * s)], 0.6 * s) & body, hex_rgb(glow))
    if alpha:  # mane
        mane = g.ellipse(cx + 12 * s, by - 3 * s, 10 * s, 11 * s)
        for k in range(7):
            ang = math.radians(150 + k * 25)
            mane |= g.poly([(cx + 12 * s, by - 3 * s), (cx + 12 * s + math.cos(ang) * 15 * s, by - 3 * s + math.sin(ang) * 14 * s),
                            (cx + 12 * s + math.cos(ang + 0.3) * 9 * s, by - 3 * s + math.sin(ang + 0.3) * 9 * s)])
        vol(cv, mane, FUR_GREY, shadow=2, light=1)
        for k in range(7):
            ang = math.radians(150 + k * 25)
            put(cv, cx + 12 * s + math.cos(ang) * 14 * s, by - 3 * s + math.sin(ang) * 13 * s, hex_rgb("#7cf0ff"))
        aura(cv, g, cx + 4 * s, by - 4 * s, 30 * s, "#7cf0ff", i, n=7)
    hx, hy = cx + 19 * s, by - 7 * s + (2 * s if a == "die" else 0)
    for ex in (-3, 2):  # ears
        e = g.poly([(hx + ex * s - 2.5 * s, hy - 4 * s), (hx + ex * s - 1 * s, hy - 12 * s), (hx + ex * s + 2.5 * s, hy - 4 * s)])
        vol(cv, e, fur, shadow=1, light=1)
    head = g.ellipse(hx, hy, 8 * s, 6.5 * s)
    snout = g.ellipse(hx + 8 * s, hy + 2 * s, 5.5 * s, 3.4 * s)
    jaw = g.ellipse(hx + 7 * s, hy + (6 if open_mouth else 4) * s, 5 * s, 2.2 * s)
    vol(cv, head | snout, fur, shadow=2, light=1)
    vol(cv, jaw, belly, shadow=1, light=1)
    if open_mouth:
        fill(cv, g.ellipse(hx + 8 * s, hy + 4.5 * s, 4 * s, 1.2 * s), hex_rgb("#5a1a22"))
        for tx_ in (hx + 6 * s, hx + 10 * s):
            put(cv, tx_, hy + 3.6 * s, WHITE)
    fill(cv, g.ellipse(hx + 13 * s, hy + 1 * s, 1.6 * s, 1.3 * s), INK)
    if a == "die":
        fill(cv, g.polyline([(hx + 1 * s, hy - 2 * s), (hx + 4 * s, hy + 1 * s)], 0.6 * s), INK)
    else:
        glow_eye(cv, g, hx + 3 * s, hy - 1.5 * s, 2.0 * s, "#ffd23f" if alpha else "#5af0ff")
    fangs(cv, g, hx + 9 * s, hy + 4.2 * s, n=2, h=2 * s, gap=3 * s)
    if alpha:
        fill(cv, g.polyline([(hx + 1 * s, hy - 6 * s), (hx + 5 * s, hy + 1 * s)], 0.5 * s), hex_rgb("#d8a0a0"))


# ---------------------------------------------------------------- MOB004 Lun Nem Da

def lun_nem_da(cv, g, a, i):
    cx, base = 30, 61
    dy = 0
    arm = 20
    rock_pos = None
    if a == "idle":
        dy = (0, 0, 1, 1)[i]
    if a == "move":
        dy = (0, -2, 0, -2)[i]
    step = (0, 3, 0, -3)[i] if a == "move" else 0
    if a == "attack":
        arm = (150, 175, 70, 30)[i]
    for k, (lx, st) in enumerate(((-4, -step), (4, step))):
        leg = g.capsule(cx + lx, base - 9 + dy, cx + lx + st, base - 1, 2.6)
        vol(cv, leg, FUR_BROWN, shadow=1, light=1)
        vol(cv, g.ellipse(cx + lx + st + 1.5, base - 1, 3.6, 2), ROCK, shadow=1, light=1)
    body = g.ellipse(cx, base - 16 + dy, 10, 10)
    vol(cv, body, TUNIC, shadow=3, light=1)
    fill(cv, g.rect(cx - 9, base - 13 + dy, cx + 9, base - 12 + dy) & body, FUR_BROWN[2])
    hx, hy = cx + 2, base - 32 + dy
    head = g.ellipse(hx, hy, 9, 8.5)
    vol(cv, head, GNOME_SKIN, shadow=2, light=1)
    nose = g.ellipse(hx + 8, hy + 2, 4.5, 3.2)
    vol(cv, nose, GNOME_SKIN, shadow=1, light=1)
    ear = g.poly([(hx - 6, hy - 1), (hx - 16, hy - 6), (hx - 6, hy + 3)])
    vol(cv, ear, GNOME_SKIN, shadow=1, light=1)
    glow_eye(cv, g, hx + 3, hy - 1, 2.0, "#ff8a2a")
    fill(cv, g.polyline([(hx + 1, hy + 5), (hx + 7, hy + 6)], 0.6), INK)
    fangs(cv, g, hx + 3, hy + 5.5, n=2, h=1.8, gap=3)
    hat = g.poly([(hx - 11, hy - 3), (hx - 3, hy - 17), (hx + 9, hy - 5)])
    vol(cv, hat, TUNIC, shadow=1, light=1)
    fill(cv, g.ellipse(hx - 1, hy - 4, 10.5, 2), TUNIC[2])
    sx, sy = cx + 5, base - 22 + dy
    ex = sx + math.sin(math.radians(arm)) * 9
    ey = sy + math.cos(math.radians(arm)) * 9
    vol(cv, g.capsule(sx, sy, ex, ey, 2.4), GNOME_SKIN, shadow=1, light=1)
    if a != "attack" or i < 2:
        rock_pos = (ex + (2 if a != "attack" else 0), ey - (3 if a == "attack" else -1))
    elif i == 2:
        rock_pos = (ex + 12, ey - 3)
    if rock_pos and a != "die":
        r = g.ellipse(*rock_pos, 5, 4.2)
        vol(cv, r, ROCK, shadow=2, light=1)
        fill(cv, g.polyline([(rock_pos[0] - 2, rock_pos[1] + 1), (rock_pos[0], rock_pos[1] - 2), (rock_pos[0] + 2, rock_pos[1] + 1)], 0.5),
             hex_rgb("#ff8a2a"))
        aura(cv, g, rock_pos[0], rock_pos[1], 8, "#ff8a2a", i, n=3)


# ---------------------------------------------------------------- MOB005 Nhen Muc

def nhen_muc(cv, g, a, i):
    cx, base = 32, 60
    dy = 0
    rear = 0
    if a == "idle":
        dy = (0, 0, 1, 1)[i]
    if a == "attack":
        rear = (0, 4, 8, 2)[i]
    if a == "die":
        dy = 3
    phase = i * math.pi / 2
    by = base - 12 + dy - rear * 0.3
    for k in range(4):  # 4 visible legs per side; far side darker
        for far in (True, False):
            ox = (-11 + k * 7) + (1 if far else 0)
            lift = math.sin(phase + k * 1.3 + (math.pi if far else 0)) * 3 if a == "move" else 0
            knee = (cx + ox + (k - 1.5) * 4, by - 9 - lift)
            foot = (cx + ox + (k - 1.5) * 7, base - (0 if a != "die" else -1) - max(0, lift))
            leg = g.polyline([(cx + ox * 0.3, by), knee, foot], 1.2)
            p = INKBODY if not far else darker(INKBODY)
            vol(cv, leg, p, shadow=1, light=1)
    abdomen = g.ellipse(cx - 7, by - 2 - rear * 0.5, 12, 9)
    vol(cv, abdomen, INKBODY, shadow=3, light=1)
    for k in range(3):  # ink drips
        dx_ = cx - 13 + k * 6
        fill(cv, g.capsule(dx_, by + 4, dx_, by + 8 + (k + i) % 3, 1.0), INKBODY[1])
    fill(cv, g.ellipse(cx - 9, by - 5 - rear * 0.5, 4, 2.4), INKBODY[5])
    sig = g.ring(cx - 7, by - 1 - rear * 0.5, 4.2, 3.4, 0.8) | g.polyline([(cx - 11, by - 1 - rear * 0.5), (cx - 3, by - 1 - rear * 0.5)], 0.5)
    fill(cv, sig & abdomen, hex_rgb("#b06aff"))
    if a != "die":
        aura(cv, g, cx, by - 4, 22, "#b06aff", i, n=4)
    head = g.ellipse(cx + 8, by - rear, 7, 6)
    vol(cv, head, INKBODY, shadow=2, light=1)
    for (ex, ey_) in ((cx + 10, by - 2 - rear), (cx + 13, by - 1 - rear), (cx + 11, by + 1 - rear)):
        fill(cv, g.disc(ex, ey_, 1.2), hex_rgb("#ff4d6a"))
        put(cv, ex - 0.4, ey_ - 0.4, hex_rgb("#ffd0d8"))
    if a == "attack" and i == 2:
        blob = g.disc(cx + 24, by - rear - 2, 3.4) | g.ellipse(cx + 18, by - rear - 1, 4, 1.4)
        fill(cv, blob, INKBODY[2])
        put(cv, cx + 23, by - rear - 3, INKBODY[5])


# ---------------------------------------------------------------- bat (MOB006 / BOSS036)

def bat(cv, g, a, i, s=1.0, queen=False):
    W, H = cv.shape[1], cv.shape[0]
    cx, cy = W / 2, H * 0.42
    flap = (-1.0, -0.2, 0.8, -0.2)[i]
    dx = dy = 0
    tilt = 0
    if a == "idle":
        dy = (0, -1, 0, 1)[i] * s
    if a == "move":
        dy = (0, -2, 0, 2)[i] * s
        dx = (0, 1, 2, 1)[i] * s
    if a == "attack":
        flap = (-1.0, -1.0, 0.9, 0.3)[i]
        dy = (-4, -6, 10, 6)[i] * s
        dx = (-2, -3, 8, 4)[i] * s
        tilt = (0, 0, 1, 0)[i]
    if a == "die":
        flap = 0.6
        dy = (2, 6, 10, 14)[i] * s
    cx += dx
    cy += dy
    wp = WING if not queen else pal("#0c1a2a", "#1e3450", "#2a4a6e", "#3a6290", "#5a86b8", "#86b0e0")
    for side, far in ((1, True), (-1, False)):  # far wing first
        span = 26 * s if not far else 21 * s
        tip_y = cy - flap * 16 * s
        root = (cx + (2 if far else -2) * s, cy)
        pts = [root, (cx - side * span * 0.45, tip_y - 6 * s), (cx - side * span, tip_y + 2 * s),
               (cx - side * span * 0.8, cy + 6 * s + flap * 2 * s), (cx - side * span * 0.55, cy + 2 * s),
               (cx - side * span * 0.35, cy + 8 * s), (cx - side * span * 0.15, cy + 4 * s)]
        wing = g.poly(pts)
        p = wp if not far else darker(wp)
        vol(cv, wing, p, shadow=2, light=1)
        vein = hex_rgb("#c08aff" if not queen else "#7fe0ff")
        fill(cv, g.polyline([root, pts[2]], 0.6 * s) & wing, vein if not far else p[1])
        fill(cv, g.polyline([root, pts[3]], 0.5 * s) & wing, vein if not far else p[1])
        if queen:
            for k in (2, 3):
                cxs, cys = pts[k]
                cr = g.poly([(cxs - 3 * s, cys), (cxs, cys - 8 * s), (cxs + 3 * s, cys)])
                vol(cv, cr, CRYSTAL, shadow=1, light=1)
    body = g.ellipse(cx, cy + 3 * s, 7 * s, 9 * s)
    vol(cv, body, BAT, shadow=int(2 * s), light=1)
    hy = cy - 6 * s + tilt * 2 * s
    for ex in (-3.5, 3.5):
        e = g.poly([(cx + ex * s - 2.5 * s, hy - 2 * s), (cx + ex * s * 1.2, hy - 10 * s), (cx + ex * s + 2.5 * s, hy - 2 * s)])
        vol(cv, e, BAT, shadow=1, light=1)
    head = g.ellipse(cx + 1 * s, hy, 6 * s, 5.5 * s)
    vol(cv, head, BAT, shadow=1, light=1)
    if a == "die":
        for ex in (cx - 1 * s, cx + 4 * s):
            fill(cv, g.polyline([(ex - 1.2 * s, hy - 1.2 * s), (ex + 1.2 * s, hy + 1.2 * s)], 0.5 * s), INK)
    else:
        for ex in (cx - 1 * s, cx + 4 * s):
            glow_eye(cv, g, ex, hy, 1.6 * s, "#ffd23f" if queen else "#ff4d6a")
        if queen and a != "die":
            aura(cv, g, cx, cy, 34 * s, "#7fe0ff", i, n=8)
    for fx in (cx, cx + 3 * s):  # fangs
        fill(cv, g.rect(fx, hy + 3 * s, fx, hy + 4.5 * s), WHITE)
    if queen:
        crest = g.poly([(cx - 3 * s, hy - 4 * s), (cx + 1 * s, hy - 12 * s), (cx + 4 * s, hy - 4 * s)])
        vol(cv, crest, CRYSTAL, shadow=1, light=1)


# ---------------------------------------------------------------- MOB007 Rua Da Gieng

def rua_da(cv, g, a, i):
    cx, base = 31, 60
    dy = 0
    head_out = 1.0
    dx = 0
    if a == "idle":
        head_out = (1.0, 1.0, 0.9, 0.9)[i]
    if a == "move":
        dx = (0, 1, 2, 1)[i]
    if a == "attack":
        head_out = (0.6, 0.4, 1.5, 1.2)[i]
        dx = (0, -1, 3, 1)[i]
    if a == "die":
        head_out = 0.0
    cx += dx
    step = (0, 2, 0, -2)[i] if a == "move" else 0
    for (lx, st) in ((-11, -step), (-3, step), (5, -step), (12, step)):
        leg = g.ellipse(cx + lx + st * 0.5, base - 3, 3.6, 4)
        vol(cv, leg, TURTLE_SKIN, shadow=1, light=1)
    hx = cx + 15 + 6 * head_out
    if head_out > 0:
        neck = g.capsule(cx + 12, base - 9, hx, base - 11, 3.4)
        head = g.ellipse(hx + 2, base - 12, 6, 4.8)
        vol(cv, neck | head, TURTLE_SKIN, shadow=1, light=1)
        glow_eye(cv, g, hx + 3, base - 13.5, 1.8, "#ffb347")
        fill(cv, g.polyline([(hx + 4, base - 10), (hx + 7, base - 10.5)], 0.4), INK)
    shell = g.ellipse(cx, base - 10 + dy, 17, 13) & (g.py < base - 4)
    vol(cv, shell, SHELL, shadow=3, light=2)
    for (px, py_, r) in ((-6, -15, 4.2), (4, -16, 4.6), (12, -10, 3.2), (-12, -9, 3.2), (0, -9, 3.6)):  # stone plates
        plate = g.disc(cx + px, base + py_, r) & shell
        fill(cv, dilate4(plate) & ~plate & shell, hex_rgb("#ffb347"))
        fill(cv, g.disc(cx + px - r * 0.3, base + py_ - r * 0.3, r * 0.4) & plate, SHELL[4])
    moss = g.ellipse(cx - 4, base - 21, 8, 3) & shell
    vol(cv, moss, MOSSP, shadow=1, light=1)
    fill(cv, g.rect(cx - 17, base - 5, cx + 17, base - 4) & g.ellipse(cx, base - 4, 18, 3), SHELL[1])
    if a == "die" and i >= 1:
        fill(cv, g.polyline([(cx - 2, base - 22), (cx + 1, base - 15), (cx - 1, base - 8)], 0.6), SHELL[0])


# ---------------------------------------------------------------- Trang Lac (BOSS001) and Manh Trang

def _page(cv, g, x, y, w, h, ang, p=PAPER, ink=True):
    c, s_ = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    pts = [(x + dx * c - dy * s_, y + dx * s_ + dy * c) for dx, dy in ((-w, -h), (w, -h), (w, h), (-w, h))]
    m = g.poly(pts)
    vol(cv, m, p, shadow=1, light=1)
    if ink:
        fill(cv, g.polyline([pts[0], ((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2 + 1)], 0.5) & m, INKBODY[2])


def trang_lac(cv, g, a, i):
    """Tall cloak of crumpled erased pages, single dripping ink eye, page claws."""
    W, H = cv.shape[1], cv.shape[0]
    cx, cy = W * 0.46, H * 0.46
    bob = (0, -2, -3, -1)[i]
    dx = 0
    swipe = 0
    if a == "move":
        dx = (0, 2, 4, 2)[i]
    if a == "attack":
        swipe = (-1, -2, 2, 1)[i]
        dx = (-2, -4, 6, 2)[i]
    if a == "die":
        bob = 4 + i * 4
    cx += dx
    cy += bob
    # pages orbiting behind the body (upper half of the orbit)
    def orbit(front):
        for k in range(5):
            ang = k * 72 + i * 18 + (30 if a == "attack" else 0)
            sy = math.sin(math.radians(ang))
            if (sy > 0) != front:
                continue
            px_ = cx + math.cos(math.radians(ang)) * 62
            py_ = cy + 4 + sy * 20
            _page(cv, g, px_, py_, 5, 7, ang * 0.6)
    orbit(False)
    # shredded skirt
    for k in range(10):
        sx = cx - 24 + k * 5.3
        ln = 22 + (k * 7 % 11) + (3 if (k + i) % 2 else 0)
        strip = g.poly([(sx - 3.2, cy + 26), (sx + 3.2, cy + 26), (sx + 1.5 + (i % 2), cy + 26 + ln), (sx - 1.5, cy + 26 + ln - 4)])
        vol(cv, strip, PAPER, shadow=1, light=1)
        if k % 3 == 0:
            fill(cv, g.rect(sx - 1, cy + 22 + ln, sx + 1, cy + 24 + ln) & strip, INKBODY[2])
    # body: tall crumpled cloak with a pointed hood
    body = g.ellipse(cx, cy + 6, 27, 26) | g.poly([(cx - 22, cy - 6), (cx - 4, cy - 46), (cx + 6, cy - 40), (cx + 22, cy - 6)])
    vol(cv, body, PAPER, shadow=4, light=2)
    for k in range(8):
        fy = cy - 26 + k * 7
        fill(cv, g.polyline([(cx - 24 + (k % 2) * 5, fy + 4), (cx - 2, fy), (cx + 22 - (k % 3) * 4, fy + 5)], 0.5) & body,
             PAPER[2])
    for k in range(6):  # ink stains at the edges
        ang = math.radians(160 + k * 40)
        sx, sy = cx + math.cos(ang) * 24, cy + 6 + math.sin(ang) * 24
        fill(cv, g.disc(sx, sy, 2.5 + k % 2) & body, INKBODY[2])
    # arms with page claws
    for side in (-1, 1):
        sh = (cx + side * 19, cy - 6)
        reach = 34 + (12 * swipe if side == 1 else 0)
        hand = (sh[0] + side * reach * 0.7, sh[1] + 20 - (18 if side == 1 and swipe < 0 else 0))
        arm = g.polyline([sh, ((sh[0] + hand[0]) / 2 + side * 3, (sh[1] + hand[1]) / 2 - 6), hand], 4.5)
        vol(cv, arm, PAPER, shadow=2, light=1)
        for k in range(3):
            ang = math.radians(60 + k * 30) if side == 1 else math.radians(90 + k * 30)
            tip = (hand[0] + math.cos(ang) * 11 * side, hand[1] + math.sin(ang) * 11)
            claw = g.poly([(hand[0] - 2, hand[1]), tip, (hand[0] + 2, hand[1] + 1)])
            vol(cv, claw, PAPER, shadow=1, light=1)
            fill(cv, g.disc(*tip, 1.2), INKBODY[2])
    # face: one swirling ink eye that drips, torn mouth
    fx, fy = cx + 5, cy - 18
    fill(cv, g.ellipse(fx, fy, 9, 7.5), INKBODY[1])
    fill(cv, g.ring(fx, fy, 6.5, 5.5, 1.3), INKBODY[3])
    fill(cv, g.disc(fx + 1, fy, 2.8), hex_rgb("#ff4d6a") if a == "attack" else INKBODY[5])
    put(cv, fx - 1, fy - 2, WHITE)
    for k, dl in enumerate((7, 11, 5)):
        fill(cv, g.capsule(fx - 4 + k * 4, fy + 6, fx - 4 + k * 4, fy + 6 + dl, 1.0), INKBODY[1])
    mouth = g.poly([(fx - 11, fy + 14), (fx - 6, fy + 11), (fx - 2, fy + 15), (fx + 2, fy + 11), (fx + 6, fy + 15),
                    (fx + 10, fy + 12), (fx + 7, fy + 19), (fx - 6, fy + 19)])
    fill(cv, mouth, INK)
    for k in range(4):
        put(cv, fx - 7 + k * 4, fy + 13, PAPER[4])
    orbit(True)
    if a == "die" and i >= 1:  # tears into four pieces
        tear = np.zeros(cv.shape[:2], bool)
        for k in range(1, 4):
            tear |= g.polyline([(cx - 30 + k * 15, cy - 48), (cx - 26 + k * 15, cy), (cx - 31 + k * 15, cy + 50)], 1.0 + i * 0.7)
        cv[tear, 3] = 0


def manh_trang(cv, g, a, i):
    cx, cy = 32, 30 + (0, -2, -3, -1)[i]
    flutter = (0, 6, 0, -6)[i]
    if a == "attack":
        cx += (-2, -3, 8, 3)[i]
    if a == "die":
        cy += i * 4
    _page(cv, g, cx, cy, 11, 13, flutter)
    fill(cv, g.ellipse(cx + 2, cy - 2, 4, 3.4), INKBODY[1])
    fill(cv, g.disc(cx + 2.5, cy - 2, 1.6), hex_rgb("#ff4d6a") if a == "attack" else INKBODY[5])
    fill(cv, g.polyline([(cx - 4, cy + 6), (cx, cy + 4), (cx + 4, cy + 6)], 0.5), INK)


# ---------------------------------------------------------------- registry

MONSTERS = {
    # id: (draw fn, frame size, display name, level)
    "MOB001": (lambda cv, g, a, i: nam_lun(cv, g, a, i), 64, "Nam Lun", "1-2"),
    "MOB002": (tho_dom, 64, "Tho Dom", "2-4"),
    "MOB003": (lambda cv, g, a, i: wolf(cv, g, a, i, 0.85), 64, "Cho Rung Non", "4-5"),
    "MOB004": (lun_nem_da, 64, "Lun Nem Da", "5-7"),
    "MOB005": (nhen_muc, 64, "Nhen Muc", "6-7"),
    "MOB006": (lambda cv, g, a, i: bat(cv, g, a, i, 0.85), 64, "Doi Gieng", "7-8"),
    "MOB007": (rua_da, 64, "Rua Da Gieng", "8-9"),
    "BOSS001": (trang_lac, 160, "Trang Lac", "9"),
    "BOSS001_SHARD": (manh_trang, 64, "Manh Trang", "9"),
    "BOSS034": (lambda cv, g, a, i: nam_lun(cv, g, a, i, 2.4, king=True), 128, "Vua Nam Lun", "5"),
    "BOSS035": (lambda cv, g, a, i: wolf(cv, g, a, i, 1.75, alpha=True), 128, "Cho Rung Dau Dan", "8"),
    "BOSS036": (lambda cv, g, a, i: bat(cv, g, a, i, 1.9, queen=True), 128, "Doi Chua Gieng", "10"),
}


def monster_frames(mid):
    draw, size, _, _ = MONSTERS[mid]
    return _frames(draw, size)

"""Chibi characters on a 96x96 frame (facing right), built from a simple rig.

Spec: docs/game-design/12-art-audio-direction.md section 3 (96x96 frame,
body about 56 px, one facing direction, paper-doll layer order).
"""
from __future__ import annotations

import math

import numpy as np

from pix import (Grid, Ramp, canvas, dilate4, dirv, fill, flat, hex_rgb, paint,
                 put, ramp, shift)

W = H = 96
G = Grid(W, H)
GROUND = 88          # last row of the boots
OUT = hex_rgb("#24182c")

SKIN = ramp("#f4c7a1", light="#ffe2c6", dark="#dc9f7d", outline="#7a4236")
EYE = hex_rgb("#2a1b33")
WHITE = (255, 255, 255)
BLUSH = hex_rgb("#f29b97")

# class palettes: art-direction section 2 (main, secondary)
CLASSES = {
    "fire":  dict(main="#e4572e", sub="#ffb703", weapon="sword",   trigram="ly"),
    "water": dict(main="#3a86ff", sub="#8ecae6", weapon="staff",   trigram="kham"),
    "wind":  dict(main="#2ec4b6", sub="#cbf3f0", weapon="dagger",  trigram="ton"),
    "bolt":  dict(main="#ffd23f", sub="#fff3b0", weapon="gauntlet", trigram="chan"),
    "earth": dict(main="#8d6e63", sub="#d7b98e", weapon="hammer",  trigram="can"),
    "plant": dict(main="#5cb85c", sub="#c7f9cc", weapon="flower",  trigram="khon"),
    "dark":  dict(main="#5b3e96", sub="#b9a3e3", weapon="saber",   trigram="doai"),
    "seal":  dict(main="#2a2a2e", sub="#c1121f", weapon="bow",     trigram=None),
}

# trigram lines from top to bottom: True = solid, False = broken
TRIGRAMS = {
    "can_": (True, True, True),   # Càn (not used by a class)
    "khon": (False, False, False),
    "chan": (False, False, True),
    "ton": (True, True, False),
    "kham": (False, True, False),
    "ly": (True, False, True),
    "can": (True, False, False),  # Cấn
    "doai": (False, True, True),
}

STEEL = ramp("#cfd8e3", light="#ffffff", dark="#8d9bb0", outline="#3b3f58")
WOOD = ramp("#9c6b43", light="#c48d5c", dark="#6e4527", outline="#3e2417")
GOLD = ramp("#e0a83a", light="#ffe08a", dark="#a8681f", outline="#5a3412")
LEATHER = ramp("#7a4a2c", light="#a2683f", dark="#552f1a", outline="#2e170c")
PAPER = ramp("#f3ead2", light="#ffffff", dark="#d2c29a", outline="#6b5a3a")


# ---------------------------------------------------------------- rig

def P(**kw):
    """Pose with defaults (see module docstring for meaning)."""
    base = dict(bob=0, lean=0, head=0, fa=(12, 20), ba=(-8, 12), ff=(3, 0), bf=(-3, 0),
                wang=None, cloak=0, tome=("back", 0), fx=None)
    base.update(kw)
    return base


def arm_points(sx, sy, a, bend, up=6.0, fo=5.5):
    ex = sx + up * math.sin(math.radians(a))
    ey = sy + up * math.cos(math.radians(a))
    a2 = a + bend
    wx = ex + fo * math.sin(math.radians(a2))
    wy = ey + fo * math.cos(math.radians(a2))
    return (ex, ey), (wx, wy), a2


def leg_points(hx, hy, fdx, lift, length):
    ax, ay = hx + fdx, GROUND - 2.5 - lift
    d = math.hypot(ax - hx, ay - hy)
    mx, my = (hx + ax) / 2, (hy + ay) / 2
    k = math.sqrt(max(0.0, (length / 2) ** 2 - (d / 2) ** 2))
    # knees bend forward (+x); perpendicular to the hip-ankle line
    px, py = (ay - hy) / (d or 1), -(ax - hx) / (d or 1)
    if px < 0:
        px, py = -px, -py
    return (mx + px * k, my + py * k), (ax, ay)


class Rig:
    def __init__(self, pose, tall=0):
        self.p = pose
        self.root = (48.0, 71.0 - tall + pose["bob"])
        rx, ry = self.root
        self.leg_len = 16.0 + tall
        self.neck = (rx + pose["lean"], ry - 15)
        nx, ny = self.neck
        self.head = (nx + 1, ny - 10 + pose["head"])
        self.sh_f = (nx + 1, ny + 3)
        self.sh_b = (nx - 2, ny + 3)
        self.hip_f = (rx + 2, ry)
        self.hip_b = (rx - 2, ry)
        self.arm_f = arm_points(*self.sh_f, *pose["fa"])
        self.arm_b = arm_points(*self.sh_b, *pose["ba"])
        self.leg_f = leg_points(*self.hip_f, *pose["ff"], self.leg_len)
        self.leg_b = leg_points(*self.hip_b, *pose["bf"], self.leg_len)


# ---------------------------------------------------------------- parts

def hair_masks(style, hc):
    """Return (back_mask, front_mask) for a hair style around head centre hc."""
    x, y = hc
    cap = G.ellipse(x - 1, y - 2.5, 11.6, 9.6)
    face = (G.px > x - 3.5) & (G.py > y - 2.5)
    back = G.empty()
    if style in ("short", "ponytail", "braids", "long", "topknot", "spiky"):
        front = cap & ~face
        # fringe over the forehead
        front |= G.poly([(x - 3, y - 8), (x + 9, y - 8), (x + 11, y - 3), (x + 7, y - 5),
                         (x + 5, y - 1.5), (x + 3, y - 5), (x + 0.5, y - 1), (x - 3, y - 4)])
        # sideburn in front of the ear
        front |= G.poly([(x - 4, y - 3), (x - 1, y - 3), (x - 2, y + 4), (x - 4, y + 3)])
        if style in ("short", "spiky"):
            spikes = [(x - 9, y - 9), (x - 16, y - 7), (x - 11, y - 4), (x - 15, y),
                      (x - 10, y + 1), (x - 12, y + 5), (x - 7, y + 4)]
            front |= G.poly(spikes)
            if style == "spiky":
                front |= G.poly([(x - 2, y - 11), (x + 1, y - 16), (x + 4, y - 11)])
                front |= G.poly([(x - 8, y - 9), (x - 9, y - 15), (x - 3, y - 11)])
        if style == "ponytail":
            back |= G.polyline([(x - 8, y - 7), (x - 14, y - 4), (x - 17, y + 3), (x - 16, y + 10)], 2.8)
            back |= G.disc(x - 9, y - 7, 3.2)
        if style == "braids":
            back |= G.polyline([(x - 7, y + 1), (x - 8, y + 6), (x - 7, y + 11)], 2.0)
            front |= G.polyline([(x - 3, y + 3), (x - 3, y + 8), (x - 2, y + 12)], 1.7)
        if style == "long":
            back |= G.poly([(x - 11, y - 4), (x - 2, y - 4), (x - 1, y + 15), (x - 14, y + 16)])
        if style == "topknot":
            front = (cap & ~face) | G.poly([(x - 3, y - 8), (x + 8, y - 8), (x + 10, y - 4),
                                             (x + 3, y - 6), (x - 3, y - 4)])
            front |= G.poly([(x - 4, y - 3), (x - 1, y - 3), (x - 2, y + 3), (x - 4, y + 3)])
            front |= G.disc(x - 4, y - 11.5, 3.6)
    elif style == "bald":
        front = G.ellipse(x - 5, y + 1, 5, 5) & ~face & ~G.ellipse(x - 1, y - 5, 10, 6)
    else:
        front = G.empty()
    return back, front


def draw_face(cv, hc, eye=EYE, old=False):
    x, y = int(round(hc[0])), int(round(hc[1]))
    for ex in (x + 1, x + 6):
        if old:
            fill(cv, G.rect(ex, y + 2, ex + 1, y + 2), eye)
            continue
        fill(cv, G.rect(ex, y, ex + 1, y + 3), eye)
        put(cv, ex + 1, y, WHITE)
    put(cv, x + 4, y + 6, SKIN.o)
    put(cv, x + 5, y + 6, SKIN.o)
    put(cv, x + 8, y + 4, BLUSH)
    put(cv, x + 9, y + 4, BLUSH)
    put(cv, x - 1, y + 3, SKIN.d)  # ear shadow


def draw_tome(cv, x, y, state="closed", edition="draft", glow=None):
    cover = {"draft": ramp("#8a3b2e", light="#b85a3f", outline="#3a140f"),
             "revised": ramp("#2f5aa8", light="#5b86d6", outline="#121f45"),
             "final": ramp("#2a2236", light="#4a3d63", outline="#0c0912")}[edition]
    if state == "closed":
        m = G.rect(x - 4, y - 3, x + 4, y + 3)
        paint(cv, m, cover, shade=(1, 1, 1))
        fill(cv, G.rect(x + 4, y - 2, x + 4, y + 2), PAPER.b)
        for cx, cy in ((x - 4, y - 3), (x - 4, y + 3)):
            put(cv, cx, cy, GOLD.l)
        put(cv, x, y, GOLD.l)
        if edition == "final":
            fill(cv, G.rect(x - 1, y - 1, x + 1, y + 1), hex_rgb("#c1121f"))
    else:
        cover_m = G.poly([(x - 8, y), (x, y + 3), (x + 8, y), (x + 8, y + 1.6), (x, y + 4.6), (x - 8, y + 1.6)])
        paint(cv, cover_m, cover, shade=None)
        left = G.poly([(x - 7, y - 5), (x, y - 2), (x, y + 2.6), (x - 7, y - 0.4)])
        right = G.poly([(x, y - 2), (x + 7, y - 5), (x + 7, y - 0.4), (x, y + 2.6)])
        paint(cv, left | right, PAPER, shade=(0, 1, 1), outline=False)
        fill(cv, G.capsule(x, y - 2, x, y + 2.5, 0.45), PAPER.o)
        for i in range(2):
            fill(cv, G.capsule(x - 6, y - 3.2 + i * 2, x - 2, y - 1.6 + i * 2, 0.3), PAPER.d)
            fill(cv, G.capsule(x + 2, y - 1.6 + i * 2, x + 6, y - 3.2 + i * 2, 0.3), PAPER.d)
        if glow:
            fill(cv, G.ellipse(x, y - 6, 4, 1.4) & ~G.ellipse(x, y - 6, 2.5, 0.8), glow)
            for gx, gy in ((x - 4, y - 9), (x + 1, y - 11), (x + 5, y - 8)):
                put(cv, gx, gy, glow)
                put(cv, gx, gy - 1, WHITE)


def trigram(cv, x, y, name, rgb):
    lines = TRIGRAMS[name]
    for i, solid in enumerate(lines):
        yy = y + i * 2
        if solid:
            fill(cv, G.rect(x, yy, x + 4, yy), rgb)
        else:
            fill(cv, G.rect(x, yy, x + 1, yy), rgb)
            fill(cv, G.rect(x + 3, yy, x + 4, yy), rgb)


# ---------------------------------------------------------------- weapons

def _frame(hx, hy, ang):
    dx, dy = dirv(ang)
    return lambda u, v: (hx + u * dx - v * dy, hy + u * dy + v * dx)


def weapon_mask_draw(cv, kind, hand, ang, cls, pose_tag="idle", back_hand=None):
    hx, hy = hand
    f = _frame(hx, hy, ang)
    main = ramp(cls["main"])
    sub = ramp(cls["sub"])
    if kind == "sword":
        paint(cv, G.capsule(*f(-4, 0), *f(-1, 0), 1.1), LEATHER, shade=None)
        paint(cv, G.capsule(*f(2, 0), *f(14, 0), 1.5) | G.capsule(*f(14, 0), *f(18, 0), 0.8), STEEL,
              shade=(0, 1, 1))
        fill(cv, G.capsule(*f(3, 0.3), *f(15, 0.3), 0.3), STEEL.l)
        paint(cv, G.capsule(*f(1, -3.5), *f(1, 3.5), 1.0), GOLD, shade=None)
        put(cv, *f(1, 0), main.l)
    elif kind == "dagger":
        paint(cv, G.capsule(*f(-3, 0), *f(-1, 0), 1.0), LEATHER, shade=None)
        paint(cv, G.capsule(*f(2, 0), *f(8, 0), 1.3) | G.capsule(*f(8, 0), *f(11, 0), 0.7), STEEL,
              shade=(0, 1, 1))
        paint(cv, G.capsule(*f(1, -2.5), *f(1, 2.5), 0.9), sub, shade=None)
    elif kind == "saber":
        pts = [f(2, 0), f(7, -0.6), f(12, -1.8), f(16, -3.6), f(19, -6)]
        blade = G.polyline(pts, 1.6)
        dark_steel = ramp("#7b6f9c", light="#c9bdf0", dark="#4b4070", outline="#1b1233")
        paint(cv, G.capsule(*f(-4, 0), *f(-1, 0), 1.1), ramp("#3b2a4d"), shade=None)
        paint(cv, blade, dark_steel, shade=(0, 1, 1))
        paint(cv, G.disc(*f(1, 0), 1.9), sub, shade=None)
    elif kind in ("staff", "flower"):
        paint(cv, G.capsule(*f(-10, 0), *f(14, 0), 1.2), WOOD, shade=None)
        if kind == "staff":
            paint(cv, G.ring(*f(16.5, 0), 3.6, 3.6, 1.3), GOLD, shade=None)
            paint(cv, G.disc(*f(16.5, 0), 2.4), main, shade=(1, 1, 1))
            put(cv, *f(17.3, -0.8), WHITE)
        else:
            cx, cy = f(16, 0)
            petals = G.empty()
            for k in range(5):
                a = k * 72 + 20
                petals |= G.disc(cx + 2.8 * math.cos(math.radians(a)),
                                 cy + 2.8 * math.sin(math.radians(a)), 1.9)
            paint(cv, petals, ramp("#f7a8c8", light="#ffe0ee", outline="#7a2e52"), shade=None)
            paint(cv, G.disc(cx, cy, 1.4), GOLD, shade=None, outline=False)
            leaf = G.ellipse(*f(10, 2.5), 2.6, 1.3)
            paint(cv, leaf, main, shade=None)
    elif kind == "hammer":
        paint(cv, G.capsule(*f(-3, 0), *f(13, 0), 1.2), WOOD, shade=None)
        head = G.poly([f(11, -5), f(16, -5), f(16, 5), f(11, 5)])
        paint(cv, head, ramp("#8c8f99", light="#c3c7d1", outline="#2c2e36"), shade=(1, 1, 1))
        fill(cv, G.capsule(*f(13.5, -4), *f(13.5, 4), 0.5), ramp(cls["main"]).b)
    elif kind == "bow":
        top, bot = f(-13, 0), f(13, 0)
        mid = f(0, -4.5)  # bow belly bulges forward (local -v is forward for an upright bow)
        limb = G.polyline([top, f(-8, -3.5), mid, f(8, -3.5), bot], 1.3)
        paint(cv, limb, ramp("#2a2a2e", light="#55555f", outline="#0b0b0d"), shade=None)
        fill(cv, G.capsule(*f(-6, -4), *f(-4, -4.4), 0.8) | G.capsule(*f(4, -4.4), *f(6, -4), 0.8),
             hex_rgb(cls["sub"]))
        nock = back_hand if back_hand is not None else f(0, 0.5)
        fill(cv, G.polyline([top, nock, bot], 0.45), hex_rgb("#e8e2d0"))
        return nock
    return None


def draw_fist(cv, x, y, cls):
    g = ramp("#d9b23a", light="#fff3b0", dark="#9a7419", outline="#4b3608")
    paint(cv, G.disc(x, y, 3.4), g, shade=(1, 1, 1))
    for k in (-1.5, 0, 1.5):
        put(cv, x + 2.5, y + k, hex_rgb(cls["sub"]))


def draw_shield(cv, x, y, cls):
    m = G.poly([(x - 4, y - 7), (x + 4, y - 7), (x + 5, y + 3), (x, y + 8), (x - 5, y + 3)])
    paint(cv, m, ramp("#a07856", light="#c9a27b", outline="#3e2716"), shade=(1, 1, 1))
    inner = G.poly([(x - 2, y - 4), (x + 2, y - 4), (x + 2.5, y + 2), (x, y + 4.5), (x - 2.5, y + 2)])
    fill(cv, inner, hex_rgb(cls["sub"]))
    fill(cv, G.rect(x - 1, y - 2, x + 1, y + 2), hex_rgb(cls["main"]))


# ---------------------------------------------------------------- whole body

DEFAULT_WANG = {"sword": 62, "dagger": 70, "saber": 64, "staff": -62, "flower": -62,
                "hammer": 58, "bow": -90, "gauntlet": None, None: None}


def draw_actor(spec, pose):
    cv = canvas(W, H)
    r = Rig(pose, spec.get("tall", 0))
    cls = spec.get("cls")
    kind = spec.get("weapon")
    shirt, pants, boots = spec["shirt"], spec["pants"], spec["boots"]
    sleeve = spec.get("sleeve", shirt)
    hair = spec.get("hair")
    nx, ny = r.neck
    rx, ry = r.root

    tome_where, tome_dy = pose["tome"][0], pose["tome"][1]
    if spec.get("tome") and tome_where == "back":
        draw_tome(cv, int(nx - 19), int(ny - 4 + tome_dy), "closed", spec["tome"])

    # 1. cloak back
    if spec.get("cloak"):
        sw = pose["cloak"]
        cm = G.poly([(nx - 4, ny), (nx + 1, ny + 1), (rx - 1, ry + 6), (rx - 4, ry + 11),
                     (rx - 12 - sw, ry + 12), (rx - 13 - sw, ry + 7), (nx - 10 - sw * 0.5, ny + 6)])
        paint(cv, cm, spec["cloak"], shade=(1, 1, 2))
        if spec.get("trigram"):
            trigram(cv, int(rx - 10 - sw * 0.6), int(ry - 1), spec["trigram"],
                    spec.get("trigram_rgb", GOLD.l))
    if spec.get("quiver"):
        q = G.capsule(nx - 7, ny - 2, nx - 3, ny + 13, 2.4)
        paint(cv, q, LEATHER, shade=(1, 0, 1))
        for k in range(3):
            fill(cv, G.capsule(nx - 8 + k * 1.5, ny - 6, nx - 7 + k * 1.5, ny - 2, 0.6),
                 hex_rgb("#c1121f") if k == 1 else PAPER.b)

    # hair behind the head
    hb, hf = hair_masks(spec.get("hair_style", "short"), r.head) if hair else (None, None)
    if hair is not None and hb.any():
        paint(cv, hb, hair, shade=(1, 1, 2))

    # 2. back arm (darker) and back leg
    (eb, wb, ab) = r.arm_b
    back_sleeve = Ramp(sleeve.o, sleeve.d, sleeve.d, sleeve.b)
    back_pants = Ramp(pants.o, pants.d, pants.d, pants.b)
    back_skin = Ramp(SKIN.o, SKIN.d, SKIN.d, SKIN.b)
    kb, ab_ank = r.leg_b
    paint(cv, G.capsule(*r.hip_b, *kb, 2.7) | G.capsule(*kb, *ab_ank, 2.4), back_pants, shade=None)
    paint(cv, G.ellipse(ab_ank[0] + 1.2, ab_ank[1] + 1, 3.4, 2.3), boots, shade=(0, 1, 1))
    paint(cv, G.capsule(*r.sh_b, *eb, 2.3) | G.capsule(*eb, *wb, 2.0), back_sleeve, shade=None)
    if kind == "hammer":
        weapon_mask_draw(cv, "hammer", wb, pose["wang"] if pose["wang"] is not None else 58, cls)
    if kind == "gauntlet":
        draw_fist(cv, *wb, cls)
    else:
        paint(cv, G.disc(*wb, 2.3), back_skin, shade=None)

    # 3. torso, robe, belt
    torso = G.ellipse(rx + pose["lean"] * 0.5, ry - 7, 7.2, 9.0)
    if spec.get("robe"):
        robe = G.poly([(nx - 6, ny + 2), (nx + 6, ny + 2), (rx + 9, GROUND - 2),
                       (rx - 10, GROUND - 2)]) | torso
        # 4. front leg (only boots show under a robe)
        kf, af = r.leg_f
        paint(cv, G.ellipse(af[0] + 1.2, af[1] + 1, 3.4, 2.3), boots, shade=(0, 1, 1))
        paint(cv, robe, spec["robe"], shade=(1, 1, 2))
        fill(cv, G.capsule(rx - 2, ry - 4, rx - 4, GROUND - 3, 0.5), spec["robe"].d)
    else:
        paint(cv, torso, shirt, shade=(1, 1, 2))
        kf, af = r.leg_f
        paint(cv, G.capsule(*r.hip_f, *kf, 2.8) | G.capsule(*kf, *af, 2.5), pants, shade=(1, 0, 1))
        paint(cv, G.ellipse(af[0] + 1.2, af[1] + 1, 3.4, 2.3), boots, shade=(0, 1, 1))
        # redraw lower torso over the hip joint
        paint(cv, torso & (G.py < ry - 1), shirt, shade=(1, 1, 2), outline=False)
    belt = spec.get("belt")
    if belt:
        bm = torso & (G.py >= ry - 4) & (G.py < ry - 2)
        fill(cv, bm, belt.b)
        put(cv, rx + pose["lean"] * 0.5 + 3, ry - 3.5, GOLD.l)
    if spec.get("apron"):
        am = G.poly([(rx - 2, ny + 4), (rx + 7 + pose["lean"], ny + 4), (rx + 8, ry + 6), (rx - 1, ry + 6)])
        paint(cv, am, spec["apron"], shade=(1, 1, 1))
    if spec.get("bag"):
        fill(cv, G.capsule(nx + 3, ny + 1, rx - 5, ry - 1, 0.6), LEATHER.d)
        bag = G.ellipse(rx - 6, ry, 4.2, 3.6)
        paint(cv, bag, spec["bag"], shade=(1, 1, 1))
        for i, c in enumerate(spec.get("vials", [])):
            fill(cv, G.rect(rx - 8 + i * 2, ry - 5, rx - 8 + i * 2, ry - 4), hex_rgb(c))

    # 5. head, face, hair
    hx, hy = r.head
    head = G.ellipse(hx, hy, 10.6, 9.6)
    paint(cv, head, SKIN, shade=(1, 1, 2))
    draw_face(cv, r.head, old=spec.get("old", False))
    if spec.get("beard"):
        bx, by = hx, hy
        long_ = spec.get("beard_len", 8)
        beard = G.poly([(bx + 1.5, by + 7), (bx + 9.5, by + 5.5), (bx + 8, by + 9 + long_ * 0.4),
                        (bx + 4, by + 8 + long_), (bx + 2, by + 9 + long_ * 0.4)])
        paint(cv, beard, spec["beard"], shade=(1, 1, 1))
        fill(cv, G.rect(bx + 3, by + 5, bx + 8, by + 5), spec["beard"].b)
        put(cv, bx + 5, by + 7, SKIN.o)
    if hair is not None and hf.any():
        paint(cv, hf, hair, shade=(1, 1, 2))
        if spec.get("hair_tie"):
            fill(cv, G.rect(hx - 6, hy - 10, hx - 5, hy - 9), hex_rgb(spec["hair_tie"]))
    if spec.get("hat") == "conical":
        hat = G.poly([(hx - 14, hy - 4), (hx + 1, hy - 17), (hx + 15, hy - 4)])
        paint(cv, hat, ramp("#e2c27d", light="#f6e2a6", outline="#6b4b1c"), shade=(0, 1, 1))
        for k in range(-10, 12, 4):
            put(cv, hx + k * 0.5 + 1, hy - 8 - abs(k) * 0.1, hex_rgb("#b8964f"))
    if spec.get("headband"):
        fill(cv, G.ellipse(hx - 1, hy - 5, 11.2, 1.1) & ~G.ellipse(hx + 6, hy - 5, 3, 3),
             hex_rgb(spec["headband"]))

    # collar / mantle
    if spec.get("cloak"):
        mantle = G.ellipse(nx - 0.5, ny + 1.5, 6.5, 3.0)
        paint(cv, mantle, spec["cloak"], shade=(0, 1, 1))
        if spec.get("pin"):
            put(cv, nx + 4, ny + 2, spec["pin"])

    # 6. front arm, weapon, hand
    (ef, wf, af2) = r.arm_f
    paint(cv, G.capsule(*r.sh_f, *ef, 2.4) | G.capsule(*ef, *wf, 2.1), sleeve, shade=(1, 1, 1))
    wang = pose["wang"] if pose["wang"] is not None else DEFAULT_WANG.get(kind)
    if kind in ("sword", "dagger", "saber", "staff", "flower"):
        weapon_mask_draw(cv, kind, wf, wang, cls)
    if kind == "bow":
        nock = weapon_mask_draw(cv, "bow", wf, wang, cls, back_hand=wb if pose.get("string") else None)
        if pose.get("string"):
            fill(cv, G.capsule(nock[0] - 1, nock[1], wf[0] + 9, wf[1], 0.5), WOOD.b)
            fill(cv, G.poly([(wf[0] + 9, wf[1] - 2), (wf[0] + 12.5, wf[1]), (wf[0] + 9, wf[1] + 2)]),
                 hex_rgb("#c1121f"))
    if kind == "gauntlet":
        draw_fist(cv, *wf, cls)
    else:
        paint(cv, G.disc(*wf, 2.4), SKIN, shade=None)
    if kind == "hammer":
        draw_shield(cv, ef[0] + 2, ef[1] + 2, cls)
    if spec.get("prop"):
        spec["prop"](cv, wf, pose)

    if spec.get("tome") and tome_where == "front":
        state = pose["tome"][2] if len(pose["tome"]) > 2 else "open"
        draw_tome(cv, int(nx + 20), int(ny - 11 + tome_dy), state, spec["tome"],
                  glow=hex_rgb(cls["sub"]) if cls else None)
    if pose.get("fx"):
        pose["fx"](cv, r)
    return cv


# ---------------------------------------------------------------- poses

HOLD = {"staff": 28, "flower": 28, "bow": 10}


def idle(kind=None):
    out = []
    k = HOLD.get(kind, 0)
    for i in range(4):
        b = (0, 0, 1, 1)[i]
        out.append(P(bob=b, fa=(12 + k + b * 2, 20 + k * 0.7), ba=(-8 - b, 12), cloak=(0, 1, 1, 0)[i],
                     tome=("back", (0, -1, -2, -1)[i])))
    return out


WALK_F = [(7, 0), (3, 0), (-1, 0), (-6, 0), (-2, 2), (3, 3)]
WALK_B = [(-6, 0), (-2, 2), (3, 3), (7, 0), (3, 0), (-1, 0)]


def walk(kind=None):
    out = []
    k = HOLD.get(kind, 0)
    for i in range(6):
        ff, bf = WALK_F[i], WALK_B[i]
        swing = -3 * ff[0] if not k else -ff[0]
        out.append(P(bob=(0, 1, 0, 0, 1, 0)[i], ff=ff, bf=bf,
                     fa=(swing + 8 + k, 22 - k), ba=(-3 * bf[0] + 2, 18),
                     cloak=(1, 2, 1, 1, 2, 1)[i], tome=("back", (0, 1, 0, 0, 1, 0)[i])))
    return out


RUN_F = [(9, 0), (4, 0), (-2, 1), (-8, 3), (-4, 6), (4, 7)]
RUN_B = [(-8, 3), (-4, 6), (4, 7), (9, 0), (4, 0), (-2, 1)]


def run(kind=None):
    out = []
    for i in range(6):
        ff, bf = RUN_F[i], RUN_B[i]
        out.append(P(bob=(0, 1, -1, 0, 1, -1)[i], lean=2, ff=ff, bf=bf,
                     fa=(-4 * ff[0] + 15, 75), ba=(-4 * bf[0] + 10, 70),
                     cloak=(3, 4, 3, 3, 4, 3)[i], tome=("back", (1, 2, 0, 1, 2, 0)[i])))
    return out


def swing_fx(radius, a0, a1, rgb, width):
    def fx(cv, r):
        sx, sy = r.sh_f
        fill(cv, G.arc(sx, sy, radius, a0, a1, width), rgb)
        fill(cv, G.arc(sx, sy, radius - width, a0 + 10, a1 - 5, 1.2), WHITE)
    return fx


def attack(kind, cls):
    sub = hex_rgb(cls["sub"])
    if kind in ("sword", "dagger", "saber", "hammer"):
        rad = 20 if kind != "dagger" else 15
        keys = [dict(fa=(150, 30), wang=-125, lean=-1, ff=(4, 0)),
                dict(fa=(178, 8), wang=-95, lean=0, ff=(6, 0)),
                dict(fa=(98, 0), wang=18, lean=2, ff=(8, 0), bf=(-5, 0),
                     fx=swing_fx(rad, 250, 40, sub, 3.2)),
                dict(fa=(58, 0), wang=58, lean=2, ff=(8, 0), bf=(-5, 0),
                     fx=swing_fx(rad, 330, 60, sub, 1.6)),
                dict(fa=(25, 15), wang=66, lean=1, ff=(6, 0), bf=(-4, 0))]
        if kind == "hammer":  # hammer is in the back hand
            for k in keys:
                k["ba"], k["fa"] = k["fa"], (40, 40)
    elif kind in ("staff", "flower"):
        def tip(cv, r):
            x, y = r.arm_f[1]
            for a in range(0, 360, 45):
                dx, dy = dirv(a)
                put(cv, x + 19 + dx * 3, y + dy * 3, sub)
            put(cv, x + 19, y, WHITE)
        keys = [dict(fa=(60, 40), wang=-12, lean=-1),
                dict(fa=(72, 22), wang=-6, lean=0, ff=(5, 0)),
                dict(fa=(96, 0), wang=0, lean=2, ff=(8, 0), bf=(-5, 0), fx=tip),
                dict(fa=(92, 0), wang=0, lean=2, ff=(8, 0), bf=(-5, 0)),
                dict(fa=(35, 30), wang=-60, lean=1, ff=(5, 0))]
    elif kind == "gauntlet":
        def burst(cv, r):
            x, y = r.arm_f[1]
            for a in range(-60, 61, 30):
                dx, dy = dirv(a)
                fill(cv, G.capsule(x + 4 + dx * 2, y + dy * 2, x + 4 + dx * 6, y + dy * 6, 0.6), sub)
        keys = [dict(fa=(35, 110), lean=-1, ba=(40, 60)),
                dict(fa=(62, 60), lean=0, ff=(5, 0), ba=(20, 40)),
                dict(fa=(96, 0), lean=3, ff=(9, 0), bf=(-5, 0), ba=(-20, 30), fx=burst),
                dict(fa=(92, 0), lean=3, ff=(9, 0), bf=(-5, 0), ba=(-20, 30)),
                dict(fa=(30, 60), lean=1, ff=(5, 0))]
    else:  # bow
        keys = [dict(fa=(92, 0), ba=(60, 40), wang=-90),
                dict(fa=(92, 0), ba=(80, 115), wang=-90, string="pull1"),
                dict(fa=(92, 0), ba=(80, 140), wang=-90, string="pull2", lean=-1),
                dict(fa=(94, 0), ba=(-25, 30), wang=-90, lean=1),
                dict(fa=(40, 20), ba=(-10, 15), wang=-80)]
    return [P(**k) for k in keys]


def cast(cls):
    main, sub = hex_rgb(cls["main"]), hex_rgb(cls["sub"])

    def circle(size, flash=False):
        def fx(cv, r):
            x, y = r.arm_f[1]
            cx = x + 9
            rr = G.ring(cx, y, 2.6 * size, 9.0 * size, 1.2)
            fill(cv, rr, WHITE if flash else sub)
            if size >= 0.7:
                fill(cv, G.ring(cx, y, 1.4 * size, 5.2 * size, 1.0), main)
                for k in range(4):
                    a = k * 90 + 45
                    put(cv, cx + 2.6 * size * math.cos(math.radians(a)),
                        y + 8 * size * math.sin(math.radians(a)), WHITE)
            # loose pages orbit the open tome
            if size > 0.4:
                tx, ty = r.neck[0] + 20, r.neck[1] - 13
                for k in range(3):
                    a = math.radians(k * 120 + size * 140)
                    px, py = tx + 10 * math.cos(a), ty - 3 + 4 * math.sin(a)
                    fill(cv, G.rect(px, py, px + 1, py + 2), PAPER.b)
                    put(cv, px, py, PAPER.d)
        return fx
    keys = [dict(fa=(45, 40), tome=("front", 0, "closed"), wang=-20),
            dict(fa=(70, 20), tome=("front", -1, "open"), wang=-8, fx=circle(0.45)),
            dict(fa=(86, 0), tome=("front", -2, "open"), wang=-2, fx=circle(0.75)),
            dict(fa=(92, 0), tome=("front", -2, "open"), wang=0, fx=circle(1.0)),
            dict(fa=(96, 0), tome=("front", -1, "open"), wang=0, lean=2, ff=(6, 0), fx=circle(1.1, True)),
            dict(fa=(50, 20), tome=("front", 0, "closed"), wang=-40)]
    return [P(**k) for k in keys]


# ---------------------------------------------------------------- specs

def class_spec(name, hair_style="short", hair="#3b2a2a", tall=0):
    c = CLASSES[name]
    main = ramp(c["main"])
    if name == "seal":
        shirt = ramp("#3a3a42", light="#5a5a66", outline="#0f0f12")
        cloak = ramp("#c1121f", light="#e5383b", outline="#4a060b")
    else:
        shirt = main
        cloak = ramp("#f1ece0", light="#ffffff", dark="#c9bfa8", outline="#5c5444")
    return dict(cls=c, weapon=c["weapon"], shirt=shirt,
                sleeve=shirt, pants=ramp("#3b3f58", outline="#14162a"),
                boots=ramp("#6b4630", outline="#2a170c"), belt=LEATHER,
                cloak=cloak, trigram=c["trigram"], trigram_rgb=hex_rgb(c["main"]) if name != "seal" else None,
                pin=GOLD.l, hair=ramp(hair), hair_style=hair_style, tall=tall,
                tome="final" if name == "seal" else "draft")


def _cane(cv, hand, pose):
    x, y = hand
    paint(cv, G.capsule(x + 1, y - 2, x + 3, GROUND, 1.0), WOOD, shade=None)


def _brush(cv, hand, pose):
    x, y = hand
    paint(cv, G.capsule(x - 1, y + 6, x + 3, y - 16, 1.1), ramp("#5a3a22"), shade=None)
    paint(cv, G.ellipse(x - 1.6, y + 9, 2.2, 3.6), ramp("#1f1a2e", light="#3a3355"), shade=None)
    fill(cv, G.rect(x - 1, y + 4, x + 1, y + 5), GOLD.b)


def _hammer(cv, hand, pose):
    weapon_mask_draw(cv, "hammer", hand, 60, CLASSES["earth"])


def _fan(cv, hand, pose):
    x, y = hand
    fan = G.arc(x, y + 2, 9, 200, 330, 7)
    paint(cv, fan, ramp("#e63946", light="#ff8fa3", outline="#5c0f17"), shade=None)
    for a in range(205, 330, 25):
        dx, dy = dirv(a)
        fill(cv, G.capsule(x, y + 2, x + dx * 8.5, y + 2 + dy * 8.5, 0.4), GOLD.l)


def _arrow(cv, hand, pose):
    x, y = hand
    fill(cv, G.capsule(x - 2, y - 1, x + 10, y - 4, 0.5), WOOD.b)
    fill(cv, G.poly([(x + 10, y - 6), (x + 13, y - 4.5), (x + 10, y - 2.5)]), hex_rgb("#c1121f"))


NPCS = {
    "NPC001_bach_van": dict(shirt=ramp("#8a8f9c"), robe=ramp("#8a8f9c", light="#b3b8c4"), pants=ramp("#555a66"),
                            boots=ramp("#4a3a2a"), belt=ramp("#4b5568"), hair=ramp("#e9edf2", light="#ffffff", dark="#b9c0cc"),
                            hair_style="topknot", tall=1, bag=ramp("#6d5a3f"), vials=["#7bd389", "#e05d5d"],
                            sleeve=ramp("#8a8f9c")),
    "NPC003_lam_nhi": dict(shirt=ramp("#e07a5f"), pants=ramp("#3d405b"), boots=ramp("#7a4a2c"), belt=LEATHER,
                           hair=ramp("#5a3825"), hair_style="braids", tall=-3, bag=ramp("#c9a227"),
                           vials=["#59c3c3", "#f49ac1", "#9bde7e"], hair_tie="#59c3c3"),
    "NPC004_khoi": dict(shirt=ramp("#a39171"), pants=ramp("#4a3f35"), boots=ramp("#3a2a20"),
                        belt=ramp("#9e2a2b", light="#c94a4b"), hair=ramp("#1e1b24", light="#3a3547"),
                        hair_style="spiky", tall=2, sleeve=ramp("#a39171")),
    "NPC005_hac_minh": dict(shirt=ramp("#f2efe8"), robe=ramp("#f2efe8", light="#ffffff", dark="#c8c2b4"),
                            pants=ramp("#3b3f58"), boots=ramp("#3a2a20"), belt=ramp("#2b2d42"),
                            hair=ramp("#e4e4e4", light="#ffffff"), hair_style="topknot", old=True,
                            beard=ramp("#ececec", light="#ffffff", dark="#bdbdbd"), beard_len=12, tall=1,
                            cloak=ramp("#2b2d42", light="#4a4e72", outline="#0d0e17"), pin=GOLD.l,
                            prop=_brush),
    "NPC040_cu_truong": dict(shirt=ramp("#9c7a54"), robe=ramp("#7d6248", light="#a0805d"), pants=ramp("#4a3f35"),
                             boots=ramp("#3a2a20"), belt=ramp("#5a3a22"), hair=ramp("#cfcfcf"), hair_style="bald",
                             old=True, beard=ramp("#dedede", light="#ffffff"), beard_len=6, hat="conical", prop=_cane),
    "NPC042_tho_ren_tu": dict(shirt=ramp("#b5654a"), pants=ramp("#3b3a40"), boots=ramp("#2f2620"), belt=LEATHER,
                              apron=ramp("#5e4636", light="#7d604c"), hair=ramp("#2a201c"), hair_style="short",
                              headband="#c0392b", tall=1, prop=_hammer),
    "NPC024_kim_thoa": dict(shirt=ramp("#f0b429", light="#ffe08a"), robe=ramp("#d9480f", light="#f76707"),
                            pants=ramp("#5c2d0c"), boots=ramp("#5c2d0c"), belt=GOLD,
                            hair=ramp("#2b1b17", light="#4a3029"), hair_style="long", hair_tie="#e63946",
                            sleeve=ramp("#f0b429", light="#ffe08a"), prop=_fan),
    "NPC053_cu_tien": dict(shirt=ramp("#56524a"), pants=ramp("#3a3631"), boots=ramp("#2a201c"),
                           belt=ramp("#c1121f"), hair=ramp("#bfbfbf"), hair_style="topknot", old=True,
                           beard=ramp("#d6d6d6"), quiver=True, prop=_arrow, sleeve=ramp("#56524a")),
}

"""32x32 item icons (docs/game-design/07-items-and-equipment.md)."""
from __future__ import annotations

import math

import numpy as np

import templates as T
from actors import CLASSES, weapon_mask_draw
from hero import tome_cmap
from pix import Grid, canvas, dilate4, fill, hex_rgb, paint, put, ramp

S = 32
g = Grid(S, S)
WHITE = (255, 255, 255)
OUT = hex_rgb("#1a1222")


def _crop_center(cv96, size=S):
    a = cv96[..., 3] > 0
    ys, xs = np.nonzero(a)
    cy, cx = (ys.min() + ys.max()) // 2, (xs.min() + xs.max()) // 2
    y0, x0 = max(0, cy - size // 2), max(0, cx - size // 2)
    return cv96[y0:y0 + size, x0:x0 + size].copy()


def weapon_icon(cls_name):
    c = CLASSES[cls_name]
    kind = c["weapon"]
    big = canvas(96, 96)
    if kind == "gauntlet":
        cv = canvas(S, S)
        metal = ramp("#d9b23a", light="#fff3b0", dark="#9a7419", outline="#4b3608")
        leather = ramp("#3a2a2a", light="#5a4040", dark="#251a1a", outline="#0e0808")
        paint(cv, g.rect(9, 21, 21, 28), leather, shade=(0, 1, 1))
        fill(cv, g.rect(9, 22, 21, 23), hex_rgb("#e8b04a"))
        fist = g.poly([(7, 12), (10, 7), (22, 7), (25, 11), (25, 19), (22, 22), (9, 22), (7, 18)])
        paint(cv, fist, metal, shade=(1, 1, 2))
        for k in range(3):  # finger plates
            fill(cv, g.capsule(11 + k * 4, 8, 11 + k * 4, 13, 0.4), metal.d)
        fill(cv, g.capsule(8, 14, 24, 14, 0.4), metal.d)
        bolt = g.poly([(17, 15), (13, 19), (16, 19), (14, 22), (19, 17), (16, 17), (18, 15)])
        fill(cv, bolt, hex_rgb(c["sub"]))
        fill(cv, dilate4(bolt) & ~bolt & fist, metal.d)
        put(cv, 11, 9, WHITE)
        return cv
    ang = {"bow": -90, "staff": -45, "flower": -45}.get(kind, -45)
    hand = (44, 54) if kind not in ("bow",) else (48, 48)
    weapon_mask_draw(big, kind, hand, ang, c)
    return _crop_center(big)


def potion(color):
    cv = canvas(S, S)
    glass = ramp("#cfe3ef", light="#ffffff", dark="#93b2c4", outline="#2a3a48")
    body = g.disc(16, 20, 8.5)
    neck = g.rect(13, 6, 18, 12)
    paint(cv, body | neck, glass, shade=(1, 1, 1))
    liquid = ramp(color)
    fill(cv, body & (g.py > 17), liquid.b)
    fill(cv, body & (g.py > 24), liquid.d)
    fill(cv, g.capsule(11, 18, 21, 18, 0.5) & body, liquid.l)
    paint(cv, g.rect(12, 3, 19, 6), ramp("#9c6b43", light="#c48d5c", outline="#3e2417"), shade=None)
    fill(cv, g.capsule(11, 15, 11, 21, 0.6), WHITE)
    return cv


def ore(tier):
    cols = {1: ("#b87333", "#e8a06a"), 2: ("#aeb8c8", "#ffffff"), 3: ("#e8b04a", "#ffe7a3"),
            4: ("#7fd1ff", "#e8fbff")}[tier]
    cv = canvas(S, S)
    r = ramp(cols[0], light=cols[1])
    ingot = g.poly([(6, 22), (10, 12), (24, 12), (27, 22)])
    top = g.poly([(10, 12), (24, 12), (22, 15), (12, 15)])
    paint(cv, ingot, r, shade=(1, 1, 2))
    fill(cv, top, r.l)
    for k in range(tier):  # tier pips
        fill(cv, g.rect(9 + k * 4, 25, 10 + k * 4, 26), r.l)
    put(cv, 13, 13, WHITE)
    if tier == 4:
        for (sx, sy) in ((26, 8), (5, 10)):
            fill(cv, g.capsule(sx - 2, sy, sx + 2, sy, 0.4) | g.capsule(sx, sy - 2, sx, sy + 2, 0.4), WHITE)
    return cv


def gem(color):
    cv = canvas(S, S)
    r = ramp(color)
    outer = g.poly([(16, 4), (26, 12), (16, 28), (6, 12)])
    paint(cv, outer, r, shade=(1, 1, 2))
    fill(cv, g.poly([(16, 4), (21, 12), (11, 12)]), r.l)
    fill(cv, g.poly([(11, 12), (21, 12), (16, 24)]), r.b)
    fill(cv, g.poly([(21, 12), (26, 12), (16, 27)]) & outer, r.d)
    put(cv, 14, 8, WHITE)
    put(cv, 15, 8, WHITE)
    return cv


def page_star():
    cv = canvas(S, S)
    paper = ramp("#f3ead2", light="#ffffff", dark="#d2c29a", outline="#6b5a3a")
    page = g.poly([(7, 5), (22, 4), (25, 26), (9, 28)])
    paint(cv, page, paper, shade=(1, 1, 2))
    fill(cv, g.poly([(19, 4), (22, 4), (23, 8)]), paper.d)  # dog-ear
    pts = []
    for k in range(10):
        a = math.radians(-90 + k * 36)
        rr = 6 if k % 2 == 0 else 2.6
        pts.append((16 + rr * math.cos(a), 16 + rr * math.sin(a)))
    star = g.poly(pts)
    paint(cv, star, ramp("#e8b04a", light="#ffe7a3", outline="#7a4a12"), shade=None)
    for k in range(3):
        fill(cv, g.capsule(10, 23 + k * 0, 20, 23 + k * 0, 0.3), paper.o) if k == 0 else None
    return cv


def coin_quan():
    cv = canvas(S, S)
    copper = ramp("#c47a3a", light="#f0b070", dark="#8a4f22", outline="#3a1e0a")
    for k in range(3):  # coins stacked behind (edges)
        paint(cv, g.ellipse(21 - k, 25 - k * 3, 7, 2.6), copper, shade=(0, 1, 1))
    disc = g.disc(14, 15, 10)
    paint(cv, disc, copper, shade=(1, 1, 2))
    fill(cv, g.ring(14, 15, 8.2, 8.2, 0.9), copper.d)
    hole = g.rect(12, 13, 16, 17)
    fill(cv, dilate4(hole) & ~hole, copper.o)
    cv[hole] = 0
    for (mx, my) in ((14, 9), (14, 21), (8, 15), (20, 15)):  # stamped marks
        fill(cv, g.rect(mx - 1, my, mx + 1, my), copper.d)
    put(cv, 9, 10, copper.l)
    put(cv, 10, 9, copper.l)
    return cv


def ingot_silver():
    cv = canvas(S, S)
    silver = ramp("#c9d1dc", light="#ffffff", dark="#8d99ab", outline="#323a48")
    boat = g.poly([(4, 15), (9, 18), (23, 18), (28, 15), (26, 24), (6, 24)])
    dome = g.ellipse(16, 15, 6, 4.5)
    paint(cv, boat, silver, shade=(1, 1, 2))
    paint(cv, dome, silver, shade=(1, 1, 1))
    put(cv, 14, 12, WHITE)
    fill(cv, g.capsule(7, 19, 25, 19, 0.4) & boat, silver.d)
    return cv


def leaf():
    cv = canvas(S, S)
    r = ramp("#5cb85c", light="#a7e08a", dark="#2f7a3a", outline="#123d1c")
    m = g.poly([(6, 26), (9, 12), (17, 5), (26, 4), (24, 14), (17, 23)])
    paint(cv, m, r, shade=(1, 1, 2))
    fill(cv, g.polyline([(6, 26), (13, 17), (24, 6)], 0.5), r.d)
    for (a, b) in (((11, 19), (11, 14)), ((15, 15), (19, 15)), ((18, 11), (18, 8))):
        fill(cv, g.capsule(*a, *b, 0.35) & m, r.d)
    for (sx, sy) in ((26, 20), (8, 6)):
        put(cv, sx, sy, hex_rgb("#c7f9cc"))
    return cv


def broom():
    cv = canvas(S, S)
    paint(cv, g.capsule(25, 4, 10, 21, 1.4), ramp("#9c6b43", light="#c48d5c", outline="#3e2417"), shade=None)
    bristle = g.poly([(12, 18), (4, 24), (3, 30), (9, 29), (15, 22)])
    paint(cv, bristle, ramp("#e2c27d", light="#f6e2a6", dark="#b8964f", outline="#6b4b1c"), shade=(1, 1, 1))
    fill(cv, g.capsule(11, 18, 15, 22, 1.0), hex_rgb("#c1121f"))
    for k in range(3):
        fill(cv, g.capsule(6 + k * 2, 25, 4 + k * 2, 29, 0.3) & bristle, hex_rgb("#b8964f"))
    return cv


def tome_icon(edition):
    cv = canvas(S, S)
    T.stamp(cv, T.TOME_CLOSED, 9, 8, tome_cmap(edition, "#3a86ff"))
    return cv


def bookmark():
    cv = canvas(S, S)
    r = ramp("#2a9d8f", light="#5fd3c4", outline="#0c3a35")
    m = g.poly([(11, 3), (21, 3), (21, 24), (16, 20), (11, 24)])
    paint(cv, m, r, shade=(1, 1, 1))
    fill(cv, g.rect(13, 6, 19, 6) | g.rect(13, 9, 17, 9), r.l)
    fill(cv, g.polyline([(16, 20), (17, 25), (15, 29)], 0.6), hex_rgb("#e8b04a"))
    fill(cv, g.disc(15, 29, 1.3), hex_rgb("#e8b04a"))
    return cv


# ---- quest items and Chapter 1 quest rewards (docs/game-design/06-quests-and-missions.md §4) ----
def radish():
    cv = canvas(S, S)
    leaf_r = ramp("#4caf50", light="#9be27f", dark="#2b6e33", outline="#123d1c")
    for pts in (((15, 12), (9, 2), (7, 5), (12, 12)), ((16, 12), (17, 1), (20, 3), (18, 12)),
                ((17, 12), (25, 4), (26, 8), (19, 13))):
        paint(cv, g.poly(list(pts)), leaf_r, shade=(0, 1, 1))
    body = g.ellipse(16, 18, 7.5, 6.5) | g.poly([(9, 19), (23, 19), (16, 30)])
    paint(cv, body, ramp("#f08bb0", light="#ffe0ec", dark="#b8507a", outline="#4a1630"), shade=(1, 1, 2))
    fill(cv, g.ellipse(16, 13, 6, 1.6) & body, hex_rgb("#fff3f7"))
    for (a, b) in (((11, 21), (13, 21)), ((19, 23), (21, 23)), ((14, 26), (15, 26))):
        fill(cv, g.capsule(*a, *b, 0.3) & body, hex_rgb("#b8507a"))
    put(cv, 12, 15, WHITE)
    return cv


def herb_sprig():
    cv = canvas(S, S)
    stem = ramp("#3f8f4a", light="#7cc96b", outline="#123d1c")
    fill(cv, dilate4(g.polyline([(16, 30), (15, 22), (16, 14), (15, 7)], 0.6)), stem.o)
    fill(cv, g.polyline([(16, 30), (15, 22), (16, 14), (15, 7)], 0.6), stem.b)
    leaf_r = ramp("#5cb85c", light="#b5ec95", dark="#2f7a3a", outline="#123d1c")
    for (cx, cy, side) in ((15, 24, -1), (16, 20, 1), (15, 15, -1), (16, 11, 1)):
        tip = (cx + side * 9, cy - 4)
        m = g.poly([(cx, cy), (cx + side * 4, cy - 4), tip, (cx + side * 5, cy + 1)])
        paint(cv, m, leaf_r, shade=(0, 1, 1))
        fill(cv, g.capsule(cx, cy, cx + side * 6, cy - 3, 0.3) & m, leaf_r.d)
    glow = ramp("#7fe7ff", light="#e8fbff", dark="#2fa8d0", outline="#0c4a5e")
    for (fx, fy) in ((15, 5), (24, 13), (7, 18)):
        paint(cv, g.disc(fx, fy, 2.4), glow, shade=None)
        put(cv, fx, fy, WHITE)
    for (sx, sy) in ((27, 6), (5, 9)):
        fill(cv, g.capsule(sx - 1.5, sy, sx + 1.5, sy, 0.3) | g.capsule(sx, sy - 1.5, sx, sy + 1.5, 0.3), hex_rgb("#e8fbff"))
    return cv


def sack():
    cv = canvas(S, S)
    burlap = ramp("#c9a26b", light="#ecd3a2", dark="#8f6a3a", outline="#3d2a12")
    body = g.poly([(9, 12), (23, 12), (27, 20), (26, 27), (21, 30), (11, 30), (6, 27), (5, 20)])
    neck = g.poly([(12, 6), (20, 6), (19, 12), (13, 12)])
    paint(cv, body, burlap, shade=(1, 1, 2))
    paint(cv, neck, burlap, shade=(0, 1, 1))
    paint(cv, g.poly([(9, 3), (14, 6), (18, 6), (23, 3), (21, 9), (11, 9)]), burlap, shade=None)
    rope = ramp("#7a4a24", light="#b07a44", outline="#2a1608")
    paint(cv, g.capsule(11, 12, 21, 12, 1.2), rope, shade=None)
    paint(cv, g.capsule(21, 12, 24, 16, 0.8), rope, shade=None)
    patch = g.rect(15, 19, 21, 24)
    paint(cv, patch, ramp("#a07a4a", light="#c9a26b", outline="#3d2a12"), shade=None)
    for k in range(3):
        put(cv, 16 + k * 2, 19, hex_rgb("#f3e2b8"))
        put(cv, 16 + k * 2, 24, hex_rgb("#f3e2b8"))
    for (x, y) in ((8, 22), (10, 26), (24, 22)):
        put(cv, x, y, burlap.d)
    return cv


def torn_page():
    cv = canvas(S, S)
    paper = ramp("#fbf6ea", light="#ffffff", dark="#d8cdb2", outline="#5a4a2e")
    pts = [(7, 4), (24, 3), (26, 12), (23, 15), (26, 19), (22, 23), (25, 28), (9, 29), (6, 21), (8, 16), (5, 11)]
    page = g.poly(pts)
    paint(cv, page, paper, shade=(1, 1, 1))
    for y in (9, 13, 17, 21, 25):
        fill(cv, g.capsule(9, y, 20, y, 0.25) & page, hex_rgb("#ece3cf"))
    glint = hex_rgb("#bfe8ff")
    fill(cv, g.capsule(17, 10, 21, 10, 0.4) | g.capsule(19, 8, 19, 12, 0.4), glint)
    put(cv, 19, 10, WHITE)
    put(cv, 11, 22, glint)
    return cv


def wooden_sword():
    cv = canvas(S, S)
    wood = ramp("#c48d5c", light="#e8bf8a", dark="#8a5a32", outline="#3e2417")
    blade = g.capsule(10, 22, 25, 7, 2.2) | g.poly([(24, 5), (28, 4), (27, 8)])
    paint(cv, blade, wood, shade=(1, 1, 2))
    fill(cv, g.capsule(12, 19, 24, 7, 0.4) & blade, wood.l)
    guard = g.capsule(6, 18, 14, 26, 1.6)
    paint(cv, guard, ramp("#7a4a24", light="#a8703c", outline="#2a1608"), shade=None)
    grip = g.capsule(4, 28, 9, 23, 1.6)
    paint(cv, grip, ramp("#3a5a8a", light="#6a8ac0", outline="#14223a"), shade=None)
    for k in range(2):
        fill(cv, g.capsule(5 + k * 2, 25 + k * 0, 7 + k * 2, 27 - k * 0, 0.3) & grip, hex_rgb("#14223a"))
    paint(cv, g.disc(4, 29, 1.6), ramp("#e8b04a", light="#ffe7a3", outline="#5a3a0a"), shade=None)
    return cv


def tunic():
    cv = canvas(S, S)
    cloth = ramp("#3a8f86", light="#6fc9bd", dark="#22605a", outline="#0c2a26")
    body = g.poly([(11, 5), (21, 5), (28, 10), (25, 16), (22, 14), (22, 28), (10, 28), (10, 14), (7, 16), (4, 10)])
    paint(cv, body, cloth, shade=(1, 1, 2))
    gold = hex_rgb("#e8b04a")
    fill(cv, g.poly([(13, 5), (19, 5), (16, 11)]), hex_rgb("#f3e2b8"))
    fill(cv, g.capsule(16, 11, 16, 27, 0.4), gold)
    fill(cv, g.capsule(10, 26, 22, 26, 0.5) & body, gold)
    fill(cv, g.capsule(10, 20, 22, 20, 0.6) & body, hex_rgb("#7a4a24"))
    put(cv, 16, 20, gold)
    fill(cv, g.capsule(5, 11, 8, 15, 0.4) & body, gold)
    fill(cv, g.capsule(27, 11, 24, 15, 0.4) & body, gold)
    return cv


# ---- set S1 "Dan Lang" (items §5) and medium potions (items §8) ----
def iron_sword():
    cv = canvas(S, S)
    steel = ramp("#c9d1dc", light="#ffffff", dark="#7d8798", outline="#232a36")
    blade = g.capsule(11, 21, 26, 6, 2.0) | g.poly([(25, 4), (29, 3), (28, 7)])
    paint(cv, blade, steel, shade=(1, 1, 2))
    fill(cv, g.capsule(13, 18, 25, 6, 0.35) & blade, steel.l)
    paint(cv, g.capsule(6, 17, 15, 26, 1.7), ramp("#8a5a32", light="#b8844e", outline="#2a1608"), shade=None)
    grip = g.capsule(4, 28, 9, 23, 1.5)
    paint(cv, grip, ramp("#6b3f1d", light="#9a6a3a", outline="#22120a"), shade=None)
    paint(cv, g.disc(4, 29, 1.7), ramp("#c9d1dc", light="#ffffff", outline="#232a36"), shade=None)
    return cv


def cap():
    cv = canvas(S, S)
    felt = ramp("#8a6a3a", light="#c49a5c", dark="#5a4020", outline="#24180a")
    crown = g.ellipse(16, 16, 9, 8) & (g.py < 19)
    brim = g.ellipse(16, 20, 13, 3.2)
    paint(cv, brim, felt, shade=(0, 1, 1))
    paint(cv, crown, felt, shade=(1, 1, 2))
    fill(cv, g.rect(8, 17, 24, 18) & crown, hex_rgb("#3a8f86"))
    paint(cv, g.poly([(21, 12), (28, 5), (29, 7), (23, 14)]), ramp("#e8e0c8", light="#ffffff", outline="#5a4a2e"), shade=None)
    put(cv, 12, 11, felt.l)
    return cv


def villager_tunic():
    cv = canvas(S, S)
    cloth = ramp("#a8784a", light="#d4a676", dark="#6e4a28", outline="#2a1608")
    body = g.poly([(11, 5), (21, 5), (28, 10), (25, 16), (22, 14), (22, 28), (10, 28), (10, 14), (7, 16), (4, 10)])
    paint(cv, body, cloth, shade=(1, 1, 2))
    fill(cv, g.poly([(13, 5), (19, 5), (16, 10)]), hex_rgb("#f3e2b8"))
    fill(cv, g.capsule(10, 20, 22, 20, 0.7) & body, hex_rgb("#3a8f86"))
    for y in (12, 15, 24):
        put(cv, 16, y, hex_rgb("#e8b04a"))
    fill(cv, g.capsule(11, 27, 21, 27, 0.4) & body, cloth.d)
    return cv


def boots():
    cv = canvas(S, S)
    leather = ramp("#7a4a24", light="#b07a44", dark="#4e2c12", outline="#1e0f06")
    for dx in (0, 11):
        shaft = g.rect(6 + dx, 8, 12 + dx, 21)
        foot = g.poly([(6 + dx, 19), (13 + dx, 19), (17 + dx, 23), (17 + dx, 27), (5 + dx, 27)])
        paint(cv, shaft | foot, leather, shade=(1, 1, 2))
        fill(cv, g.rect(6 + dx, 8, 12 + dx, 9) & shaft, hex_rgb("#c49a5c"))
        fill(cv, g.rect(5 + dx, 26, 17 + dx, 27) & foot, hex_rgb("#2a1608"))
        put(cv, 9 + dx, 14, hex_rgb("#e8b04a"))
    return cv


def potion_big(color):
    cv = canvas(S, S)
    glass = ramp("#cfe3ef", light="#ffffff", dark="#93b2c4", outline="#2a3a48")
    body = g.ellipse(16, 20, 10, 9)
    neck = g.rect(13, 5, 18, 12)
    paint(cv, body | neck, glass, shade=(1, 1, 1))
    liquid = ramp(color)
    fill(cv, body & (g.py > 15), liquid.b)
    fill(cv, body & (g.py > 24), liquid.d)
    fill(cv, g.capsule(9, 16, 23, 16, 0.5) & body, liquid.l)
    fill(cv, g.rect(6, 19, 25, 21) & body, hex_rgb("#e8b04a"))
    paint(cv, g.rect(12, 2, 19, 5), ramp("#9c6b43", light="#c48d5c", outline="#3e2417"), shade=None)
    fill(cv, g.capsule(10, 13, 10, 20, 0.6), WHITE)
    return cv


def chest():
    cv = canvas(S, S)
    wood = ramp("#9c6b43", light="#c48d5c", dark="#6e4527", outline="#2a1608")
    gold = ramp("#e0a83a", light="#ffe08a", dark="#a8681f", outline="#4a2a08")
    lid = g.poly([(5, 13), (8, 7), (24, 7), (27, 13)])
    box = g.rect(5, 13, 27, 27)
    paint(cv, box, wood, shade=(1, 1, 2))
    paint(cv, lid, wood, shade=(0, 1, 1))
    for x in (8, 23):
        paint(cv, g.rect(x, 8, x + 1, 27), gold, shade=None)
    paint(cv, g.rect(5, 13, 27, 14), gold, shade=None)
    paint(cv, g.rect(14, 12, 18, 18), gold, shade=None)
    fill(cv, g.rect(15, 15, 17, 16), hex_rgb("#2a1608"))
    for (sx, sy) in ((27, 4), (4, 6)):
        fill(cv, g.capsule(sx - 1.5, sy, sx + 1.5, sy, 0.3) | g.capsule(sx, sy - 1.5, sx, sy + 1.5, 0.3), hex_rgb("#fff3b0"))
    return cv


# ---- set S2 "Thu Lai" (items §5, step B5.1) and the lost book page of Q_MAIN_15 ----
def brush_pen():
    """Weapon of the clerks: a long brush-pen with a brass ferrule, ink still wet on the tip."""
    cv = canvas(S, S)
    shaft = g.capsule(6, 27, 23, 8, 1.8)
    paint(cv, shaft, ramp("#5a2a6a", light="#8a52a0", dark="#3a1a48", outline="#160a1e"), shade=(1, 1, 2))
    paint(cv, g.capsule(20, 11, 23, 8, 2.2), ramp("#c48a2e", light="#f4cc70", outline="#4a2a0e"), shade=None)
    tip = g.poly([(22, 7), (28, 2), (26, 9)])
    paint(cv, tip, ramp("#1f1a2e", light="#3a3355", outline="#08060e"), shade=None)
    put(cv, 27, 3, hex_rgb("#7fd1ff"))
    for k in range(3):
        put(cv, 9 + k * 4, 24 - k * 4, hex_rgb("#c48a2e"))
    return cv


def scholar_cap():
    cv = canvas(S, S)
    felt = ramp("#2a2a34", light="#4a4a5a", dark="#16161e", outline="#08080c")
    crown = g.rect(9, 9, 23, 20) | g.ellipse(16, 9, 7, 3)
    paint(cv, crown, felt, shade=(1, 1, 2))
    for side in (-1, 1):
        paint(cv, g.ellipse(16 + side * 11, 14, 4.5, 1.8), felt, shade=None)
    fill(cv, g.rect(9, 18, 23, 19), hex_rgb("#c48a2e"))
    put(cv, 16, 13, hex_rgb("#c48a2e"))
    return cv


def clerk_robe():
    cv = canvas(S, S)
    cloth = ramp("#5a2a6a", light="#8a52a0", dark="#3a1a48", outline="#160a1e")
    body = g.poly([(11, 5), (21, 5), (28, 10), (25, 16), (22, 14), (24, 28), (8, 28), (10, 14), (7, 16), (4, 10)])
    paint(cv, body, cloth, shade=(1, 1, 2))
    gold = hex_rgb("#c48a2e")
    fill(cv, g.poly([(13, 5), (19, 5), (16, 12)]), hex_rgb("#f3e2b8"))
    fill(cv, g.capsule(16, 12, 16, 27, 0.4), gold)
    fill(cv, g.capsule(9, 19, 23, 19, 0.8) & body, gold)
    return cv


def clerk_boots():
    cv = canvas(S, S)
    leather = ramp("#3a3a4a", light="#5e5e74", dark="#22222e", outline="#0a0a10")
    for dx in (0, 11):
        shaft = g.rect(6 + dx, 8, 12 + dx, 21)
        foot = g.poly([(6 + dx, 19), (13 + dx, 19), (17 + dx, 23), (17 + dx, 27), (5 + dx, 27)])
        paint(cv, shaft | foot, leather, shade=(1, 1, 2))
        fill(cv, g.rect(6 + dx, 8, 12 + dx, 9) & shaft, hex_rgb("#8a52a0"))
        fill(cv, g.rect(5 + dx, 26, 17 + dx, 27) & foot, hex_rgb("#08080c"))
        put(cv, 9 + dx, 14, hex_rgb("#c48a2e"))
    return cv


def book_page():
    """Trang Sach That Lac: a written page of the exam books, corner torn, a seal in red."""
    cv = canvas(S, S)
    paper = ramp("#f3ead2", light="#fffaf0", dark="#d2c29a", outline="#5a4a2e")
    page = g.poly([(6, 4), (25, 4), (26, 27), (12, 28), (6, 22)])
    paint(cv, page, paper, shade=(1, 1, 1))
    for y in (9, 12, 15, 18, 21):
        fill(cv, g.capsule(10, y, 22, y, 0.3) & page, hex_rgb("#5a4a3a"))
    fill(cv, g.disc(21, 24, 2.6), hex_rgb("#c1121f"))
    put(cv, 21, 24, hex_rgb("#ff8a8a"))
    return cv


def all_icons():
    icons = []
    for name in CLASSES:
        icons.append((f"weapon_{name}", weapon_icon(name)))
    icons += [("potion_hp", potion("#e63946")), ("potion_mp", potion("#3a86ff"))]
    for tier in (1, 2, 3, 4):
        icons.append((f"dong_luyen_{tier}", ore(tier)))
    icons += [("hat_nguyen_tim", gem("#9c27b0")), ("hat_nguyen_lam", gem("#2a9d8f")),
              ("trang_roi", page_star()), ("quan", coin_quan()), ("nen_bac", ingot_silver()),
              ("la_thuoc_co", leaf()), ("choi_bay", broom()),
              ("huyen_thu_so_ban", tome_icon("draft")), ("huyen_thu_tu_ban", tome_icon("revised")),
              ("huyen_thu_dinh_ban", tome_icon("final")), ("the_kep_trang", bookmark())]
    icons += [("cu_cai_non", radish()), ("thao_duoc", herb_sprig()), ("bao_tai", sack()),
              ("manh_trang", torn_page()), ("kiem_go_tap", wooden_sword()), ("ao_suoi_mo", tunic())]
    icons += [("kiem_dan_lang", iron_sword()), ("mu_dan_lang", cap()), ("ao_dan_lang", villager_tunic()),
              ("giay_dan_lang", boots()), ("potion_hp_m", potion_big("#e63946")), ("potion_mp_m", potion_big("#3a86ff")),
              ("ruong_tan_thu", chest())]
    icons += [("but_thu_lai", brush_pen()), ("mu_thu_lai", scholar_cap()), ("ao_thu_lai", clerk_robe()),
              ("giay_thu_lai", clerk_boots()), ("trang_sach", book_page())]
    return icons

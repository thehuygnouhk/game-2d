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
    return icons

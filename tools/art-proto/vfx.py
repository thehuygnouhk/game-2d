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

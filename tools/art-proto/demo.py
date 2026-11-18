"""Skill demos: hero casts, projectile flies, impact on a training dummy."""
from __future__ import annotations

import numpy as np

import vfx
from hero import draw_hero, hero_cast, idle
from pix import canvas, over

DW = 240
TARGET_X, GROUND_Y, AIR_Y = 205, 88, 68


def skill_demo(cls_name, spec):
    proj, hit, anchor, _ = vfx.EFFECTS[cls_name]
    poses = hero_cast(spec["cls"])
    idl = idle(spec["weapon"])
    frames = []
    px = None
    impact = None
    release = 4
    total = 24
    for t in range(total):
        cv = canvas(DW, 96)
        hit_now = impact is not None and 0 <= impact <= 2
        vfx.dummy(cv, TARGET_X, GROUND_Y, hit=1 if hit_now else 0)
        pose = poses[t] if t < len(poses) else idl[t % 4]
        over(cv, draw_hero(spec, pose), 0, 0)
        if cls_name == "earth":
            if t >= release:
                vfx.earth_line(cv, 74, TARGET_X, GROUND_Y, t - release)
                if t - release == 4:
                    impact = 0
        elif cls_name == "bolt":
            if t >= release + 1 and (t - release - 1) < 6:
                vfx.strike_bolt(cv, TARGET_X, GROUND_Y, t - release - 1)
                if t - release - 1 == 1:
                    impact = 0
        else:
            if t == release:
                px = 66
            if px is not None:
                proj(cv, px, 69, t)
                px += 17 if cls_name != "dark" else 15
                if cls_name == "seal":
                    px += 9
                if px >= TARGET_X - 6:
                    px = None
                    impact = 0
            elif impact is not None and impact < 6:
                ay = AIR_Y if anchor == "air" else GROUND_Y
                hit(cv, TARGET_X, ay, impact)
        if impact is not None:
            impact += 1
        frames.append(cv)
    return frames

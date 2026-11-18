"""Anime-style chibi heroes: hand-placed head/hair/tome templates on the rig.

Reuses the rig and poses from actors.py; replaces the look (head, hair,
uniform, cape, tome). Faces right; flip horizontally for the left.
"""
from __future__ import annotations

import math

import numpy as np

import templates as T
from actors import (CLASSES, G, GROUND, H, TRIGRAMS, W, Rig, attack, cast, idle, run,
                    walk, weapon_mask_draw)
from pix import (Grid, Ramp, canvas, dilate4, dirv, fill, hex_rgb, paint, put, ramp)

WHITE = (255, 255, 255)
GOLD = ramp("#e8b04a", light="#ffe7a3", dark="#b0702a", outline="#4a2a0e")
INK = hex_rgb("#1a1222")


def head_cmap(skin, hair, iris):
    s = skin
    h = hair
    ih = ramp(iris)
    shine = tuple(min(255, c + 60) for c in h.l)
    return {
        "K": s.o, "s": s.b, "S": s.d, "l": s.l,
        "E": INK, "w": WHITE, "i": ih.b, "e": ih.o, "I": ih.l,
        "k": h.o, "h": h.b, "H": h.d, "j": h.l, "J": shine,
        "m": hex_rgb("#8e3b35"), "p": hex_rgb("#f2a39b"),
        "O": hex_rgb("#4a0c12"), "r": hex_rgb("#d62839"), "R": hex_rgb("#ff7b8a"),
    }


SKIN = ramp("#f6cfae", light="#fff0e0", dark="#e2a989", outline="#6e3a33")

HAIR = {
    "spiky": (T.HAIR_SPIKY_FRONT, None),
    "long": (T.HAIR_LONG_FRONT, T.HAIR_LONG_BACK),
}


def draw_head(cv, cx, cy, spec, eyes="open"):
    """cx, cy: head centre from the rig."""
    x, y = int(round(cx - 9)), int(round(cy - 9))
    cm = head_cmap(spec.get("skin", SKIN), spec["hair"], spec.get("iris", "#c0392b"))
    front, back = HAIR[spec["hair_style"]]
    if back:
        T.stamp(cv, back, x - 4, y - 5, cm)
    T.stamp(cv, T.HEAD, x, y, cm)
    F = T.FACE
    if eyes == "open":
        T.stamp(cv, T.EYE_NEAR, x + F["eye_near"][0], y + F["eye_near"][1], cm)
        T.stamp(cv, T.EYE_FAR, x + F["eye_far"][0], y + F["eye_far"][1], cm)
    else:
        T.stamp(cv, T.EYE_CLOSED, x + F["eye_near"][0], y + F["eye_near"][1], cm)
    for px, py in F["mouth"]:
        put(cv, x + px, y + py, cm["m"])
    for px, py in F["nose"]:
        put(cv, x + px, y + py, cm["S"])
    for px, py in F["blush"]:
        put(cv, x + px, y + py, cm["p"])
    T.stamp(cv, front, x - 4, y - 5, cm)
    for px, py in F["brow_near"] + F["brow_far"]:
        put(cv, x + px, y + py, cm["k"])
    if spec.get("ribbon"):
        T.stamp(cv, T.RIBBON, x - 5, y - 1, cm)


# ---------------------------------------------------------------- tome

EDITIONS = {
    # Sơ Bản: worn leather, brass seal
    "draft": dict(c="#7b3f2a", C="#5a2a1c", L="#a65c3d", O="#2a120b", G="#c08a3e", g="#f0c875",
                  r="#c08a3e", x="#5a2a1c"),
    # Tu Bản: blue cloth, silver fittings, class-colour seal
    "revised": dict(c="#2d4f9e", C="#1d3570", L="#5079c9", O="#0c1533", G="#aeb8c8", g="#ffffff",
                    r=None, x="#0c1533"),
    # Định Bản: black, gold filigree, red seal
    "final": dict(c="#26202e", C="#16121c", L="#433a52", O="#08060b", G="#e8b04a", g="#ffe7a3",
                  r="#c1121f", x="#4a060b"),
}


def tome_cmap(edition, cls_main):
    e = EDITIONS[edition]
    cm = {k: hex_rgb(v) for k, v in e.items() if v}
    if e["r"] is None:
        cm["r"] = hex_rgb(cls_main)
    cm["p"] = hex_rgb("#f3ead2")
    cm["P"] = hex_rgb("#d2c29a")
    cm["q"] = hex_rgb("#9c8a66")
    return cm


def draw_tome_closed(cv, x, y, edition, cls_main, glow=None):
    cm = tome_cmap(edition, cls_main)
    T.stamp(cv, T.TOME_CLOSED, x - 7, y - 7, cm)
    if glow:
        for gx, gy in ((x - 9, y - 6), (x + 9, y - 3), (x - 8, y + 6)):
            put(cv, gx, gy, glow)


def draw_tome_open(cv, x, y, edition, cls_main, flip=None, glow=None):
    cm = tome_cmap(edition, cls_main)
    if glow:
        g = Grid(cv.shape[1], cv.shape[0])
        halo = g.ellipse(x, y - 1, 13, 8) & ~g.ellipse(x, y - 1, 11.5, 6.6)
        fill(cv, halo, glow)
    T.stamp(cv, T.TOME_OPEN, x - 10, y - 7, cm)
    if flip is not None:
        T.stamp(cv, T.PAGE_FLIP[flip], x - 3, y - 12, cm)
    if glow:
        for k, (gx, gy) in enumerate(((x - 6, y - 11), (x + 2, y - 14), (x + 7, y - 10), (x - 1, y - 17))):
            put(cv, gx, gy, glow)
            put(cv, gx, gy - 1, WHITE)


# ---------------------------------------------------------------- body

def uniform(cls_name):
    c = CLASSES[cls_name]
    return dict(
        coat=ramp("#2b2f4a", light="#454b70", dark="#1c1f33", outline="#0b0c16"),
        trim=GOLD,
        sash=ramp(c["main"]),
        cape=ramp(c["main"]) if cls_name != "seal" else ramp("#c1121f", light="#e5383b", outline="#3a0509"),
        lining=ramp(c["sub"]) if cls_name != "seal" else ramp("#2a2a2e"),
        pants=ramp("#5b6178", light="#7c839c", outline="#1d2030"),
        boots=ramp("#3a2a2a", light="#5a4040", dark="#251a1a", outline="#0e0808"),
        glove=ramp("#2a2230", outline="#0b0810"),
    )


def draw_trigram_badge(cv, x, y, name, ring_r, fg):
    disc = G.disc(x + 0.5, y + 0.5, 4.6)
    paint(cv, disc, GOLD, shade=None)
    fill(cv, G.disc(x + 0.5, y + 0.5, 3.4), ring_r)
    if name:
        for i, solid in enumerate(TRIGRAMS[name]):
            yy = y - 2 + i * 2
            if solid:
                fill(cv, G.rect(x - 1, yy, x + 2, yy), fg)
            else:
                put(cv, x - 1, yy, fg)
                put(cv, x + 2, yy, fg)
    else:  # seal archer: a small square seal
        fill(cv, G.rect(x - 1, y - 1, x + 2, y + 2), fg)


def draw_hero(spec, pose):
    cv = canvas(W, H)
    r = Rig(pose, spec.get("tall", 0))
    u = spec["uniform"]
    cls = spec["cls"]
    kind = spec["weapon"]
    nx, ny = r.neck
    rx, ry = r.root
    sway = pose["cloak"]
    glow = hex_rgb(cls["sub"])

    where, dy = pose["tome"][0], pose["tome"][1]
    if where == "back":
        draw_tome_closed(cv, int(rx - 21), int(ry - 13 + dy), spec["tome"], cls["main"],
                         glow=glow if dy < -1 else None)

    # cape: back flare (with lining showing at the edge)
    cape = G.poly([(nx - 2, ny - 1), (nx + 2, ny + 1), (rx - 2, ry - 5), (rx - 8 - sway, ry + 1),
                   (rx - 14 - sway, ry - 1), (nx - 9 - sway * 0.5, ny + 4), (nx - 6, ny)])
    lining = G.poly([(rx - 4, ry - 4), (rx - 8 - sway, ry + 1), (rx - 14 - sway, ry - 1),
                     (rx - 11 - sway, ry - 2)])
    paint(cv, cape, u["cape"], shade=(1, 1, 2))
    fill(cv, lining & cape, u["lining"].b)
    hem = G.polyline([(rx - 3, ry - 4), (rx - 8 - sway, ry + 1), (rx - 14 - sway, ry - 1)], 0.6)
    fill(cv, hem & cape, GOLD.b)
    draw_trigram_badge(cv, int(rx - 10 - sway * 0.6), int(ry - 9), cls["trigram"],
                       u["cape"].d, GOLD.l)

    # long hair behind the body
    if spec["hair_style"] == "long":
        x0, y0 = int(round(r.head[0] - 9)), int(round(r.head[1] - 9))
        T.stamp(cv, T.HAIR_LONG_BACK, x0 - 4, y0 - 5,
                head_cmap(SKIN, spec["hair"], spec.get("iris", "#c0392b")))

    # back arm
    eb, wb, _ = r.arm_b
    dark_coat = Ramp(u["coat"].o, u["coat"].d, u["coat"].d, u["coat"].b)
    paint(cv, G.capsule(*r.sh_b, *eb, 2.3) | G.capsule(*eb, *wb, 2.0), dark_coat, shade=None)
    if kind == "hammer":
        weapon_mask_draw(cv, "hammer", wb, pose["wang"] if pose["wang"] is not None else 58, cls)
    paint(cv, G.disc(*wb, 2.2), u["glove"], shade=None)

    # legs (behind the coat skirt), back leg darker
    for (knee, ank), hip, dark in ((r.leg_b, r.hip_b, True), (r.leg_f, r.hip_f, False)):
        pr = u["pants"]
        pr = Ramp(pr.o, pr.d, pr.d, pr.b) if dark else pr
        paint(cv, G.capsule(*hip, *knee, 2.6) | G.capsule(*knee, *ank, 2.3), pr, shade=(1, 0, 1))
        boot = G.capsule(knee[0] * 0.35 + ank[0] * 0.65, knee[1] * 0.35 + ank[1] * 0.65, *ank, 2.6) | \
            G.ellipse(ank[0] + 1.5, ank[1] + 1, 3.6, 2.3)
        br = u["boots"]
        paint(cv, boot, Ramp(br.o, br.d, br.d, br.b) if dark else br, shade=(0, 1, 1))
        cuff_y = knee[1] * 0.35 + ank[1] * 0.65
        fill(cv, G.capsule(knee[0] * 0.35 + ank[0] * 0.65 - 2.4, cuff_y, knee[0] * 0.35 + ank[0] * 0.65 + 2.4,
                           cuff_y, 0.6) & boot, GOLD.d if dark else GOLD.b)

    # coat with skirt tails
    lx = pose["lean"]
    coat = G.poly([(nx - 5, ny + 1), (nx + 5, ny + 1), (rx + 5 + lx * 0.3, ry - 4), (rx + 7, ry + 4),
                   (rx + 2, ry + 3), (rx - 2, ry + 4), (rx - 9 - sway * 0.5, ry + 7), (rx - 6, ry - 4)])
    paint(cv, coat, u["coat"], shade=(1, 1, 2))
    # front edge trim and buttons
    fill(cv, G.polyline([(nx + 4, ny + 2), (rx + 4 + lx * 0.3, ry - 4), (rx + 6, ry + 3)], 0.5) & coat,
         GOLD.b)
    for k in range(3):
        put(cv, nx + 2 + (rx - nx) * (0.2 + 0.25 * k), ny + 4 + k * 3, GOLD.l)
    # hem trim
    fill(cv, G.polyline([(rx + 7, ry + 4), (rx + 2, ry + 3), (rx - 2, ry + 4), (rx - 9 - sway * 0.5, ry + 7)],
                        0.5) & coat, GOLD.b)
    # sash belt with a hanging knot in the class colour
    belt = coat & (G.py >= ry - 5) & (G.py <= ry - 3)
    fill(cv, belt, u["sash"].b)
    fill(cv, belt & (G.py == ry - 5 + 0.5), u["sash"].l)
    knot = G.polyline([(rx - 4, ry - 4), (rx - 6 - sway * 0.4, ry + 2)], 1.0)
    paint(cv, knot, u["sash"], shade=None)

    # head
    draw_head(cv, *r.head, spec)

    # high collar + mantle over the shoulders + brooch
    collar = G.rect(nx - 3, ny - 1, nx + 3, ny + 1)
    paint(cv, collar, ramp("#f1ece0", light="#ffffff", outline="#3a3428"), shade=None)
    mantle = G.ellipse(nx - 1, ny + 2.5, 6.5, 3.2)
    paint(cv, mantle, u["cape"], shade=(0, 1, 1))
    fill(cv, mantle & (G.py >= ny + 4.5) & ~(G.py >= ny + 5.5), GOLD.b)
    paint(cv, G.disc(nx + 4, ny + 2, 1.4), ramp(cls["sub"]), shade=None)

    # front arm, weapon, glove
    ef, wf, _ = r.arm_f
    paint(cv, G.capsule(*r.sh_f, *ef, 2.4) | G.capsule(*ef, *wf, 2.1), u["coat"], shade=(1, 1, 1))
    cdx, cdy = wf[0] - ef[0], wf[1] - ef[1]
    ln = math.hypot(cdx, cdy) or 1
    cx_, cy_ = wf[0] - cdx / ln * 1.8, wf[1] - cdy / ln * 1.8
    fill(cv, G.capsule(cx_ - cdy / ln * 2.3, cy_ + cdx / ln * 2.3, cx_ + cdy / ln * 2.3,
                       cy_ - cdx / ln * 2.3, 0.7), GOLD.b)
    from actors import DEFAULT_WANG, draw_fist, draw_shield
    wang = pose["wang"] if pose["wang"] is not None else DEFAULT_WANG.get(kind)
    if kind in ("sword", "dagger", "saber", "staff", "flower"):
        weapon_mask_draw(cv, kind, wf, wang, cls)
    if kind == "bow":
        weapon_mask_draw(cv, "bow", wf, wang, cls, back_hand=wb if pose.get("string") else None)
    if kind == "gauntlet":
        draw_fist(cv, *wf, cls)
    else:
        paint(cv, G.disc(*wf, 2.3), u["glove"], shade=None)
    if kind == "hammer":
        draw_shield(cv, ef[0] + 2, ef[1] + 2, cls)

    if where == "front":
        state = pose["tome"][2] if len(pose["tome"]) > 2 else "open"
        tx, ty = int(nx + 19), int(ny - 12 + dy)
        if state == "open":
            draw_tome_open(cv, tx, ty, spec["tome"], cls["main"], flip=pose.get("flip"), glow=glow)
        else:
            draw_tome_closed(cv, tx, ty + 2, spec["tome"], cls["main"], glow=glow)
    if pose.get("fx"):
        pose["fx"](cv, r)
    return cv


def hero_spec(cls_name, hair_style, hair_hex, iris, tome="draft", ribbon=False, tall=0):
    c = CLASSES[cls_name]
    return dict(cls=c, weapon=c["weapon"], uniform=uniform(cls_name), hair=ramp(hair_hex),
                hair_style=hair_style, iris=iris, tome=tome, ribbon=ribbon, tall=tall)


def hero_cast(cls):
    """Cast with page flips while the tome is open."""
    poses = cast(cls)
    for i, p in enumerate(poses):
        if p["tome"][0] == "front" and len(p["tome"]) > 2 and p["tome"][2] == "open":
            p["flip"] = (None, 0, 1, None, 0, None)[i]
    return poses

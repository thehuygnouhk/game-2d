"""Anime-style chibi characters (players and NPCs) drawn as paper-doll layers.

Reuses the rig and poses from actors.py. Every part is painted into its own
layer so the result can be edited per layer in a pixel editor (Piskel).
Faces right; flip horizontally for the left.
"""
from __future__ import annotations

import math

import templates as T
from actors import (CLASSES, DEFAULT_WANG, G, GROUND, H, TRIGRAMS, W, Rig, attack, cast,
                    draw_fist, draw_shield, idle, run, walk, weapon_mask_draw)
from pix import Grid, Layers, Ramp, fill, hex_rgb, paint, put, ramp, taper

WHITE = (255, 255, 255)
GOLD = ramp("#e8b04a", light="#ffe7a3", dark="#b0702a", outline="#4a2a0e")
INK = hex_rgb("#1a1222")
SKIN = ramp("#f6cfae", light="#fff0e0", dark="#e2a989", outline="#6e3a33")
LEATHER = ramp("#7a4a2c", light="#a2683f", dark="#552f1a", outline="#2e170c")
WOOD = ramp("#9c6b43", light="#c48d5c", dark="#6e4527", outline="#3e2417")

ORDER = ["tome_back", "cape", "hair_back", "arm_back", "legs", "coat", "head", "hair",
         "mantle", "arm_front", "weapon", "hand", "tome_front", "fx"]
# layer names shown in the pixel editor
LAYER_TITLES = {
    "tome_back": "Huyen Thu (sau)", "cape": "Ao choang", "hair_back": "Toc sau",
    "arm_back": "Tay sau", "legs": "Chan + ung", "coat": "Ao", "head": "Dau + mat",
    "hair": "Toc truoc", "mantle": "Vai ao choang", "arm_front": "Tay truoc",
    "weapon": "Vu khi / dao cu", "hand": "Ban tay", "tome_front": "Huyen Thu (truoc)",
    "fx": "Hieu ung",
}

HAIR = {
    "spiky": (T.HAIR_SPIKY_FRONT, None),
    "long": (T.HAIR_LONG_FRONT, T.HAIR_LONG_BACK),
    "short": (T.HAIR_SHORT_FRONT, None),
    "braid": (T.HAIR_SHORT_FRONT, T.HAIR_BRAID_BACK),
    "topknot": (T.HAIR_TOPKNOT_FRONT, None),
}


def head_cmap(skin, hair, iris):
    ih = ramp(iris)
    shine = tuple(min(255, c + 60) for c in hair.l)
    return {
        "K": skin.o, "s": skin.b, "S": skin.d, "l": skin.l,
        "E": INK, "w": WHITE, "i": ih.b, "e": ih.o, "I": ih.l,
        "k": hair.o, "h": hair.b, "H": hair.d, "j": hair.l, "J": shine,
        "m": hex_rgb("#8e3b35"), "p": hex_rgb("#f2a39b"),
        "O": hex_rgb("#4a0c12"), "r": hex_rgb("#d62839"), "R": hex_rgb("#ff7b8a"),
    }


def draw_head(L, cx, cy, spec):
    x, y = int(round(cx - 9)), int(round(cy - 9))
    cm = head_cmap(spec.get("skin", SKIN), spec["hair"], spec.get("iris", "#c0392b"))
    front, back = HAIR[spec["hair_style"]]
    if back:
        T.stamp(L["hair_back"], back, x - 4, y - 5, cm)
    hc = L["head"]
    T.stamp(hc, T.HEAD, x, y, cm)
    F = T.FACE
    if spec.get("eyes", "open") == "open":
        T.stamp(hc, T.EYE_NEAR, x + F["eye_near"][0], y + F["eye_near"][1], cm)
        T.stamp(hc, T.EYE_FAR, x + F["eye_far"][0], y + F["eye_far"][1], cm)
    else:
        T.stamp(hc, T.EYE_CLOSED, x + F["eye_near"][0], y + F["eye_near"][1], cm)
        T.stamp(hc, ["EE.", "..E"], x + F["eye_far"][0], y + F["eye_far"][1] + 1, cm)
    for px, py in F["mouth"]:
        put(hc, x + px, y + py, cm["m"])
    for px, py in F["nose"]:
        put(hc, x + px, y + py, cm["S"])
    if spec.get("eyes", "open") == "open":
        for px, py in F["blush"]:
            put(hc, x + px, y + py, cm["p"])
    if spec.get("beard"):
        draw_beard(hc, x, y, spec["beard"], spec.get("beard_len", 8))
    T.stamp(L["hair"], front, x - 4, y - 5, cm)
    for px, py in F["brow_near"] + F["brow_far"]:
        put(L["hair"], x + px, y + py, cm["k"] if spec.get("eyes", "open") == "open" else spec["hair"].b)
    if spec.get("ribbon"):
        T.stamp(L["hair"], T.RIBBON, x - 5, y - 1, cm)
    if spec.get("headband"):
        band = G.ellipse(x + 8, y + 3, 11.5, 1.0) & ~G.ellipse(x + 15, y + 3, 5, 5)
        fill(L["hair"], band, hex_rgb(spec["headband"]))
    if spec.get("hat") == "conical":
        hat = G.poly([(x - 6, y + 4), (x + 10, y - 10), (x + 26, y + 4)])
        hr = ramp("#e2c27d", light="#f6e2a6", dark="#b8964f", outline="#6b4b1c")
        paint(L["hair"], hat, hr, shade=(0, 1, 1))
        for k in range(4):
            fill(L["hair"], G.capsule(x + 10, y - 9, x - 3 + k * 9, y + 3, 0.35) & hat, hr.d)


def draw_beard(cv, x, y, r, length):
    """x, y: head template origin."""
    m = G.poly([(x + 9, y + 15), (x + 17, y + 14), (x + 16, y + 17 + length * 0.4),
                (x + 13, y + 16 + length), (x + 10, y + 17 + length * 0.4)])
    paint(cv, m, r, shade=(1, 1, 1))
    fill(cv, G.rect(x + 11, y + 14, x + 16, y + 14), r.b)  # moustache
    put(cv, x + 13, y + 15, r.o)
    put(cv, x + 14, y + 15, r.o)


# ---------------------------------------------------------------- tome

EDITIONS = {
    "draft": dict(c="#7b3f2a", C="#5a2a1c", L="#a65c3d", O="#2a120b", G="#c08a3e", g="#f0c875",
                  r="#c08a3e", x="#5a2a1c"),
    "revised": dict(c="#2d4f9e", C="#1d3570", L="#5079c9", O="#0c1533", G="#aeb8c8", g="#ffffff",
                    r=None, x="#0c1533"),
    "final": dict(c="#26202e", C="#16121c", L="#433a52", O="#08060b", G="#e8b04a", g="#ffe7a3",
                  r="#c1121f", x="#4a060b"),
}


def tome_cmap(edition, cls_main):
    e = EDITIONS[edition]
    cm = {k: hex_rgb(v) for k, v in e.items() if v}
    if e["r"] is None:
        cm["r"] = hex_rgb(cls_main)
    cm.update(p=hex_rgb("#f3ead2"), P=hex_rgb("#d2c29a"), q=hex_rgb("#9c8a66"))
    return cm


def draw_tome_closed(cv, x, y, edition, cls_main, glow=None):
    T.stamp(cv, T.TOME_CLOSED, x - 7, y - 7, tome_cmap(edition, cls_main))
    if glow:
        for gx, gy in ((x - 9, y - 6), (x + 9, y - 3), (x - 8, y + 6)):
            put(cv, gx, gy, glow)


def draw_tome_open(cv, x, y, edition, cls_main, flip=None, glow=None):
    cm = tome_cmap(edition, cls_main)
    if glow:
        g = Grid(cv.shape[1], cv.shape[0])
        fill(cv, g.ellipse(x, y - 1, 13, 8) & ~g.ellipse(x, y - 1, 11.5, 6.6), glow)
    T.stamp(cv, T.TOME_OPEN, x - 10, y - 7, cm)
    if flip is not None:
        T.stamp(cv, T.PAGE_FLIP[flip], x - 3, y - 12, cm)
    if glow:
        for gx, gy in ((x - 6, y - 11), (x + 2, y - 14), (x + 7, y - 10), (x - 1, y - 17)):
            put(cv, gx, gy, glow)
            put(cv, gx, gy - 1, WHITE)


# ---------------------------------------------------------------- outfits

def uniform(cls_name):
    c = CLASSES[cls_name]
    seal = cls_name == "seal"
    return dict(
        outfit="uniform",
        coat=ramp("#2b2f4a", light="#454b70", dark="#1c1f33", outline="#0b0c16"),
        sash=ramp(c["main"]) if not seal else ramp("#c1121f"),
        cape=ramp(c["main"]) if not seal else ramp("#c1121f", light="#e5383b", outline="#3a0509"),
        lining=ramp(c["sub"]) if not seal else ramp("#2a2a2e"),
        pants=ramp("#5b6178", light="#7c839c", outline="#1d2030"),
        boots=ramp("#3a2a2a", light="#5a4040", dark="#251a1a", outline="#0e0808"),
        glove=ramp("#2a2230", outline="#0b0810"),
        trigram=c["trigram"],
    )


def draw_trigram_badge(cv, x, y, name, inner, fg):
    paint(cv, G.disc(x + 0.5, y + 0.5, 4.6), GOLD, shade=None)
    fill(cv, G.disc(x + 0.5, y + 0.5, 3.4), inner)
    if name:
        for i, solid in enumerate(TRIGRAMS[name]):
            yy = y - 2 + i * 2
            if solid:
                fill(cv, G.rect(x - 1, yy, x + 2, yy), fg)
            else:
                put(cv, x - 1, yy, fg)
                put(cv, x + 2, yy, fg)
    else:
        fill(cv, G.rect(x - 1, y - 1, x + 2, y + 2), fg)


def boot_cmap(br, dark):
    if dark:
        return {"O": br.o, "b": br.d, "d": br.o, "l": br.b, "g": GOLD.d}
    return {"O": br.o, "b": br.b, "d": br.d, "l": br.l, "g": GOLD.b}


def draw_legs(L, r, u, pose):
    for (knee, ank), hip, dark, foot in ((r.leg_b, r.hip_b, True, pose["bf"]),
                                        (r.leg_f, r.hip_f, False, pose["ff"])):
        pr = u["pants"]
        pr = Ramp(pr.o, pr.d, pr.d, pr.b) if dark else pr
        leg = taper(G, *hip, *knee, 3.0, 2.5) | taper(G, *knee, *ank, 2.5, 2.1)
        paint(L["legs"], leg, pr, shade=(1, 0, 1))
        tmpl = T.BOOT_LIFT if foot[1] >= 3 else T.BOOT
        T.stamp(L["legs"], tmpl, ank[0] - 3, ank[1] - 3, boot_cmap(u["boots"], dark))


def draw_cape(L, r, u, cls, sway):
    nx, ny = r.neck
    rx, ry = r.root
    cape = G.poly([(nx - 2, ny - 1), (nx + 2, ny + 1), (rx - 2, ry - 5), (rx - 8 - sway, ry + 1),
                   (rx - 14 - sway, ry - 1), (nx - 9 - sway * 0.5, ny + 4), (nx - 6, ny)])
    lining = G.poly([(rx - 4, ry - 4), (rx - 8 - sway, ry + 1), (rx - 14 - sway, ry - 1),
                     (rx - 11 - sway, ry - 2)])
    cv = L["cape"]
    paint(cv, cape, u["cape"], shade=(1, 1, 2))
    fill(cv, lining & cape, u["lining"].b)
    hem = G.polyline([(rx - 3, ry - 4), (rx - 8 - sway, ry + 1), (rx - 14 - sway, ry - 1)], 0.6)
    fill(cv, hem & cape, GOLD.b)
    if "trigram" in u:
        draw_trigram_badge(cv, int(rx - 10 - sway * 0.6), int(ry - 9), u["trigram"], u["cape"].d, GOLD.l)


def draw_body(L, r, u, pose, spec):
    nx, ny = r.neck
    rx, ry = r.root
    lx = pose["lean"]
    sway = pose["cloak"]
    cv = L["coat"]
    outfit = u.get("outfit", "uniform")
    if outfit == "robe":
        body = G.poly([(nx - 5, ny + 1), (nx + 5, ny + 1), (rx + 5 + lx * 0.3, ry - 4),
                       (rx + 8, GROUND - 2), (rx - 9 - sway * 0.3, GROUND - 2), (rx - 6, ry - 4)])
        paint(cv, body, u["coat"], shade=(1, 1, 2))
        fill(cv, G.polyline([(rx + 1, ry - 2), (rx - 1, GROUND - 3)], 0.5) & body, u["coat"].d)
        fill(cv, G.polyline([(nx + 4, ny + 2), (rx + 4 + lx * 0.3, ry - 4)], 0.5) & body, u["coat"].l)
    elif outfit == "tunic":
        body = G.poly([(nx - 5, ny + 1), (nx + 5, ny + 1), (rx + 5 + lx * 0.3, ry - 4), (rx + 6, ry + 2),
                       (rx - 7 - sway * 0.3, ry + 2), (rx - 6, ry - 4)])
        paint(cv, body, u["coat"], shade=(1, 1, 2))
    else:  # uniform coat with tails
        body = G.poly([(nx - 5, ny + 1), (nx + 5, ny + 1), (rx + 5 + lx * 0.3, ry - 4), (rx + 6, ry + 3),
                       (rx + 1, ry + 2), (rx - 3, ry + 3), (rx - 8 - sway * 0.5, ry + 5), (rx - 6, ry - 4)])
        paint(cv, body, u["coat"], shade=(1, 1, 2))
        fill(cv, G.polyline([(nx + 4, ny + 2), (rx + 4 + lx * 0.3, ry - 4), (rx + 5.5, ry + 2.5)], 0.5)
             & body, GOLD.b)
        fill(cv, G.polyline([(rx + 6, ry + 3), (rx + 1, ry + 2), (rx - 3, ry + 3),
                             (rx - 8 - sway * 0.5, ry + 5)], 0.5) & body, GOLD.d)
    if u.get("sash"):
        belt = body & (G.py >= ry - 5) & (G.py <= ry - 3)
        fill(cv, belt, u["sash"].b)
        fill(cv, belt & (G.py < ry - 4), u["sash"].l)
        if outfit == "uniform":
            paint(cv, G.polyline([(rx - 4, ry - 4), (rx - 6 - sway * 0.4, ry + 2)], 1.0), u["sash"], shade=None)
    if spec.get("apron"):
        am = G.poly([(rx - 1, ny + 4), (rx + 6 + lx, ny + 4), (rx + 7, ry + 7), (rx - 1, ry + 7)])
        paint(cv, am, spec["apron"], shade=(1, 1, 1))
    if spec.get("bag"):
        fill(cv, G.capsule(nx + 4, ny + 1, rx - 5, ry - 2, 0.6), LEATHER.d)
        bag = G.ellipse(rx - 6, ry, 4.2, 3.6)
        paint(cv, bag, spec["bag"], shade=(1, 1, 1))
        for i, c in enumerate(spec.get("vials", [])):
            fill(cv, G.rect(rx - 8 + i * 2, ry - 5, rx - 8 + i * 2, ry - 4), hex_rgb(c))
    # collar
    paint(L["mantle"], G.rect(nx - 3, ny - 1, nx + 3, ny + 1),
          u.get("collar", ramp("#f1ece0", light="#ffffff", outline="#3a3428")), shade=None)


def draw_arms(L, r, u, pose, spec):
    cls = spec.get("cls")
    kind = spec.get("weapon")
    sleeve = u.get("sleeve", u["coat"])
    glove = u.get("glove") or SKIN
    eb, wb, _ = r.arm_b
    back = Ramp(sleeve.o, sleeve.d, sleeve.d, sleeve.b)
    paint(L["arm_back"], taper(G, *r.sh_b, *eb, 2.4, 2.1) | taper(G, *eb, *wb, 2.1, 1.8), back, shade=None)
    if kind == "hammer":
        weapon_mask_draw(L["arm_back"], "hammer", wb, pose["wang"] if pose["wang"] is not None else 58, cls)
    if kind == "gauntlet":
        draw_fist(L["arm_back"], *wb, cls)
    else:
        paint(L["arm_back"], G.disc(*wb, 2.2), Ramp(glove.o, glove.d, glove.d, glove.b), shade=None)

    ef, wf, _ = r.arm_f
    paint(L["arm_front"], taper(G, *r.sh_f, *ef, 2.5, 2.2) | taper(G, *ef, *wf, 2.2, 1.9), sleeve,
          shade=(1, 1, 1))
    if u.get("outfit", "uniform") == "uniform":  # gold cuff
        dx, dy = wf[0] - ef[0], wf[1] - ef[1]
        ln = math.hypot(dx, dy) or 1
        cx, cy = wf[0] - dx / ln * 1.8, wf[1] - dy / ln * 1.8
        fill(L["arm_front"], G.capsule(cx - dy / ln * 2.2, cy + dx / ln * 2.2, cx + dy / ln * 2.2,
                                       cy - dx / ln * 2.2, 0.7), GOLD.b)
    wang = pose["wang"] if pose["wang"] is not None else DEFAULT_WANG.get(kind)
    if kind in ("sword", "dagger", "saber", "staff", "flower"):
        weapon_mask_draw(L["weapon"], kind, wf, wang, cls)
    if kind == "bow":
        nock = weapon_mask_draw(L["weapon"], "bow", wf, wang, cls,
                                back_hand=wb if pose.get("string") else None)
        if pose.get("string"):
            fill(L["weapon"], G.capsule(nock[0] - 1, nock[1], wf[0] + 9, wf[1], 0.5), WOOD.b)
            fill(L["weapon"], G.poly([(wf[0] + 9, wf[1] - 2), (wf[0] + 12.5, wf[1]), (wf[0] + 9, wf[1] + 2)]),
                 hex_rgb("#c1121f"))
    if spec.get("prop"):
        spec["prop"](L["weapon"], wf, pose)
    if kind == "gauntlet":
        draw_fist(L["hand"], *wf, cls)
    else:
        paint(L["hand"], G.disc(*wf, 2.3), glove, shade=None)
    if kind == "hammer":
        draw_shield(L["hand"], ef[0] + 2, ef[1] + 2, cls)


def draw_character(spec, pose):
    """Returns a Layers stack (use .flat() for a single image)."""
    L = Layers(W, H, ORDER)
    r = Rig(pose, spec.get("tall", 0))
    u = spec["uniform"]
    cls = spec.get("cls")
    nx, ny = r.neck
    rx, ry = r.root
    sway = pose["cloak"]
    glow = hex_rgb(cls["sub"]) if cls else None

    where, dy = pose["tome"][0], pose["tome"][1]
    if spec.get("tome") and where == "back":
        draw_tome_closed(L["tome_back"], int(nx - 21), int(ny - 2 + dy), spec["tome"], cls["main"],
                         glow=glow if dy < -1 else None)
    if u.get("outfit", "uniform") == "uniform" or spec.get("cape"):
        draw_cape(L, r, u if "cape" in u else dict(u, cape=spec["cape"], lining=spec["cape"]), cls, sway)
    if spec.get("quiver"):
        q = G.capsule(nx - 7, ny - 2, nx - 3, ny + 13, 2.4)
        paint(L["cape"], q, LEATHER, shade=(1, 0, 1))
        for k in range(3):
            fill(L["cape"], G.capsule(nx - 8 + k * 1.5, ny - 6, nx - 7 + k * 1.5, ny - 2, 0.6),
                 hex_rgb("#c1121f") if k == 1 else hex_rgb("#f3ead2"))
    draw_legs(L, r, u, pose)
    draw_body(L, r, u, pose, spec)
    draw_head(L, *r.head, spec)
    if u.get("outfit", "uniform") == "uniform" or spec.get("cape"):
        mantle_r = u.get("cape", spec.get("cape"))
        mantle = G.ellipse(nx - 1, ny + 2.5, 6.5, 3.2)
        paint(L["mantle"], mantle, mantle_r, shade=(0, 1, 1))
        fill(L["mantle"], mantle & (G.py >= ny + 4.5) & ~(G.py >= ny + 5.5), GOLD.b)
        paint(L["mantle"], G.disc(nx + 4, ny + 2, 1.4), ramp(cls["sub"]) if cls else GOLD, shade=None)
    draw_arms(L, r, u, pose, spec)

    if spec.get("tome") and where == "front":
        state = pose["tome"][2] if len(pose["tome"]) > 2 else "open"
        tx, ty = int(nx + 19), int(ny - 12 + dy)
        if state == "open":
            draw_tome_open(L["tome_front"], tx, ty, spec["tome"], cls["main"], flip=pose.get("flip"), glow=glow)
        else:
            draw_tome_closed(L["tome_front"], tx, ty + 2, spec["tome"], cls["main"], glow=glow)
    if pose.get("fx"):
        pose["fx"](L["fx"], r)
    return L


def draw_hero(spec, pose):
    return draw_character(spec, pose).flat()


def hero_spec(cls_name, hair_style, hair_hex, iris, tome="draft", ribbon=False, tall=0, hair_ramp=None):
    c = CLASSES[cls_name]
    return dict(cls=c, weapon=c["weapon"], uniform=uniform(cls_name),
                hair=hair_ramp or ramp(hair_hex), hair_style=hair_style, iris=iris, tome=tome,
                ribbon=ribbon, tall=tall)


def hero_cast(cls):
    poses = cast(cls)
    for i, p in enumerate(poses):
        if p["tome"][0] == "front" and len(p["tome"]) > 2 and p["tome"][2] == "open":
            p["flip"] = (None, 0, 1, None, 0, None)[i]
    return poses

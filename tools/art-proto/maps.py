"""Region R01 maps (M001-M004) as Tiled .tmj + parallax backgrounds + previews.

Specs: docs/game-design/05-world-maps-monsters.md (map list, size rules),
docs/workflows/content-pipeline.md section 5 (required layers, collision
tile convention 1 solid / 2 one-way / 3 ladder / 4 hazard, object types),
docs/game-design/12-art-audio-direction.md section 5 (32x32, parallax x3).
"""
from __future__ import annotations

import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw

from pix import Grid, canvas, dilate4, fill, hex_rgb, over, put
from tiles_rich import COLS, T as TS

COLL_FIRSTGID = 1
REGION_FIRSTGID = 5
PARALLAX = {"bg_far": 0.1, "bg_mid": 0.35, "bg_near": 0.6}


# ---------------------------------------------------------------- collision tileset

def collision_tileset():
    cols = [("#e63946", "solid"), ("#3a86ff", "oneway"), ("#ffd23f", "ladder"), ("#9d4edd", "hazard")]
    cv = canvas(TS * 4, TS)
    g = Grid(TS * 4, TS)
    for k, (c, kind) in enumerate(cols):
        x0 = k * TS
        fill(cv, g.rect(x0, 0, x0 + TS - 1, TS - 1), hex_rgb(c), alpha=110)
        fill(cv, g.rect(x0, 0, x0 + TS - 1, 0) | g.rect(x0, 0, x0, TS - 1), hex_rgb(c))
        if kind == "oneway":
            fill(cv, g.rect(x0, 0, x0 + TS - 1, 3), hex_rgb(c))
        if kind == "ladder":
            for y in (8, 20):
                fill(cv, g.rect(x0 + 6, y, x0 + 25, y + 1), hex_rgb(c))
        if kind == "hazard":
            for k2 in range(4):
                fill(cv, g.poly([(x0 + k2 * 8, 31), (x0 + k2 * 8 + 4, 20), (x0 + k2 * 8 + 8, 31)]), hex_rgb(c))
    return cv


def shift_up(m, k):
    from pix import shift
    return shift(m, 0, k)


def shift_x(m, k):
    from pix import shift
    return shift(m, k, 0)


# ---------------------------------------------------------------- builder

VARIANTS = {
    (1, 1, 1, 1): "tlr", (1, 1, 1, 0): "tlr", (1, 1, 0, 1): "tlb", (1, 0, 1, 1): "trb", (1, 0, 0, 1): "tb",
    (1, 1, 0, 0): "tl", (1, 0, 1, 0): "tr", (1, 0, 0, 0): "t", (0, 1, 0, 1): "bl", (0, 0, 1, 1): "br",
    (0, 0, 0, 1): "b", (0, 1, 1, 1): "b", (0, 1, 0, 0): "l", (0, 0, 1, 0): "r", (0, 1, 1, 0): "m",
}


class MapBuilder:
    def __init__(self, mid, name, w, h, S, kind, level, region, theme, bgm, pk="PEACE", zone_cap=30):
        self.id, self.name, self.w, self.h, self.S = mid, name, w, h, S
        self.type, self.level, self.region, self.theme, self.bgm, self.pk = kind, level, region, theme, bgm, pk
        self.zone_cap = zone_cap
        self.solid = np.zeros((h, w), bool)
        self.oneway = np.zeros((h, w), bool)   # floating ledges you can jump through from below
        self.prefix = np.full((h, w), "grass", object)
        self.tiles = {n: np.zeros((h, w), int) for n in ("ground", "decor", "fg")}
        self.coll = np.zeros((h, w), int)
        self.reserved = np.zeros((h, w), bool)  # cells used by big decor
        self.objects = []
        self.portals, self.npcs, self.spawns, self.safe, self.triggers = [], [], [], [], []
        self.boss_spawns = []
        self.player_spawn = None

    # terrain ------------------------------------------------------
    def ground_profile(self, heights, prefix="grass"):
        for x, top in enumerate(heights):
            self.solid[top:, x] = True
            self.prefix[top:, x] = prefix

    def block(self, x0, y0, x1, y1, prefix="grass", oneway=False):
        self.solid[y0:y1 + 1, x0:x1 + 1] = True
        self.prefix[y0:y1 + 1, x0:x1 + 1] = prefix
        self.oneway[y0:y1 + 1, x0:x1 + 1] = oneway

    def carve(self, x0, y0, x1, y1):
        self.solid[y0:y1 + 1, x0:x1 + 1] = False

    def surface(self, x):
        for y in range(1, self.h):
            if self.solid[y, x] and not self.solid[y - 1, x]:
                return y
        return self.h

    def surfaces(self, x):
        return [y for y in range(1, self.h) if self.solid[y, x] and not self.solid[y - 1, x]]

    def _t(self, name):
        return self.S.index[name] + REGION_FIRSTGID

    def platform(self, x0, x1, y):
        for x in range(x0, x1 + 1):
            n = "plank_l" if x == x0 else "plank_r" if x == x1 else "plank_m"
            self.tiles["ground"][y, x] = self._t(n)
            self.coll[y, x] = 2

    def ladder(self, x, y0, y1):
        for y in range(y0, y1 + 1):
            self.tiles["ground"][y, x] = self._t("ladder")
            self.coll[y, x] = 3

    def spikes(self, x0, x1, y):
        for x in range(x0, x1 + 1):
            self.tiles["ground"][y, x] = self._t("spikes")
            self.coll[y, x] = 4

    def water(self, x0, x1, y0, y1):
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                self.tiles["decor"][y, x] = self._t("water_top" if y == y0 else "water")

    def stamp(self, name, tx, bottom, layer="decor"):
        c, r, w, h = self.S.objects[name]
        top = bottom - h + 1
        for j in range(h):
            for i in range(w):
                yy, xx = top + j, tx + i
                if 0 <= yy < self.h and 0 <= xx < self.w:
                    self.tiles[layer][yy, xx] = (r + j) * COLS + (c + i) + REGION_FIRSTGID
                    self.reserved[yy, xx] = True

    def on_ground(self, name, tx, layer="decor"):
        """Stamp a big object standing on the surface under its centre column."""
        c, r, w, h = self.S.objects[name]
        y = self.surface(tx + w // 2)
        self.stamp(name, tx, y - 1, layer)

    def scatter(self, names, density, seed, x_range=None, layer="decor", avoid=()):
        rng = np.random.default_rng(seed)
        x0, x1 = x_range or (1, self.w - 2)
        for x in range(x0, x1 + 1):
            if any(a0 <= x <= a1 for a0, a1 in avoid):
                continue
            for y in self.surfaces(x):
                if y - 1 < 0 or self.reserved[y - 1, x] or self.tiles["ground"][y - 1, x]:
                    continue
                if rng.random() < density:
                    self.tiles[layer][y - 1, x] = self._t(names[rng.integers(len(names))])
                    self.reserved[y - 1, x] = True

    # objects ------------------------------------------------------
    def px(self, tx):
        return int(tx * TS + TS // 2)

    def feet(self, tx):
        return int(self.surface(tx) * TS)

    def portal(self, pid, tx, to, to_x, to_y):
        x, y = self.px(tx), self.feet(tx)
        self.portals.append(dict(id=pid, x=x, y=y, to=to, toX=to_x, toY=to_y))

    def npc(self, nid, tx, y_tile=None):
        y = self.feet(tx) if y_tile is None else y_tile * TS
        self.npcs.append(dict(id=nid, x=self.px(tx), y=y))

    def spawn(self, mob, tx, count, radius_tiles, respawn, y_tile=None, note="", level=None):
        """level: (min, max) override, e.g. dungeon monsters stronger than the field ones."""
        y = self.feet(tx) if y_tile is None else y_tile * TS
        self.spawns.append(dict(mob=mob, x=self.px(tx), y=y, radius=radius_tiles * TS, count=count,
                                respawnSec=respawn, note=note, level=level))

    def boss_spawn(self, boss, tx, event, y_tile=None):
        y = self.feet(tx) if y_tile is None else y_tile * TS
        self.boss_spawns.append(dict(boss=boss, x=self.px(tx), y=y, event=event))

    # finalize -----------------------------------------------------
    def finalize(self):
        s = self.solid
        H, W = s.shape
        for y in range(H):
            for x in range(W):
                if not s[y, x]:
                    continue
                n = s[y - 1, x] if y > 0 else True
                wl = s[y, x - 1] if x > 0 else True
                e = s[y, x + 1] if x < W - 1 else True
                so = s[y + 1, x] if y < H - 1 else True
                key = (int(not n), int(not wl), int(not e), int(not so))
                var = VARIANTS.get(key)
                if var is None:
                    depth = 0
                    while y - depth - 1 >= 0 and s[y - depth - 1, x]:
                        depth += 1
                    var = "m"
                self.tiles["ground"][y, x] = self._t(f"{self.prefix[y, x]}_{var}")
                if self.oneway[y, x]:
                    self.coll[y, x] = 2 if (y == 0 or not self.oneway[y - 1, x]) else 0
                else:
                    self.coll[y, x] = 1


# ---------------------------------------------------------------- reachability

JUMP_UP = 3      # tiles: jump height is 3 tiles (combat section 4.5)
JUMP_SIDE = 3    # tiles of horizontal reach while climbing a step
FALL_SIDE = 5    # tiles of horizontal drift while falling


def reach_report(B):
    """Walk/jump/fall/climb graph over standable tiles, BFS from the player spawn.

    A node (x, y) is a tile whose top a 2-tile-tall body can stand on. Returns
    the objects (portals, NPCs, spawns, boss spawns) that cannot be reached.
    """
    c = B.coll
    H, W = c.shape
    free = (c == 0) | (c == 3) | (c == 4)

    def standable(x, y):
        if not (0 <= x < W and 1 <= y < H):
            return False
        if c[y, x] not in (1, 2):
            return False
        return free[y - 1, x] and (y < 2 or free[y - 2, x])

    nodes = {(x, y) for x in range(W) for y in range(1, H) if standable(x, y)}
    ladders = {(x, y) for x in range(W) for y in range(H) if c[y, x] == 3}
    by_col = {}
    for (x, y) in nodes:
        by_col.setdefault(x, []).append(y)

    def neighbours(n):
        x, y = n
        for dx in range(-FALL_SIDE, FALL_SIDE + 1):
            for yy in by_col.get(x + dx, []):
                up = y - yy
                if up > 0 and (up > JUMP_UP or abs(dx) > JUMP_SIDE):
                    continue
                if up <= 0 and abs(dx) > (1 if up == 0 else FALL_SIDE):
                    continue
                if up <= 0 and up < 0 and not _clear_fall(free, x, y, x + dx, yy):
                    continue
                yield (x + dx, yy)
        # ladders: any ladder column next to this node connects its whole span
        for lx in (x - 1, x, x + 1):
            span = [ly for (cx, ly) in ladders if cx == lx]
            if span and min(span) - 2 <= y <= max(span) + 2:
                for yy in range(min(span) - 1, max(span) + 3):
                    for nx in (lx - 1, lx, lx + 1):
                        if (nx, yy) in nodes:
                            yield (nx, yy)

    start = (B.player_spawn[0] // TS, B.player_spawn[1] // TS)
    start = min(nodes, key=lambda n: abs(n[0] - start[0]) + abs(n[1] - start[1]))
    seen, todo = {start}, [start]
    while todo:
        n = todo.pop()
        for m in neighbours(n):
            if m not in seen:
                seen.add(m)
                todo.append(m)

    def ok(px, py):
        tx, ty = int(px // TS), int(round(py / TS))
        return any((tx + dx, ty + dy) in seen for dx in (-1, 0, 1) for dy in (-1, 0, 1))

    bad = []
    for p in B.portals:
        if not ok(p["x"], p["y"]):
            bad.append(f"portal {p['id']} -> {p['to']}")
    for n in B.npcs:
        if not ok(n["x"], n["y"]):
            bad.append(f"npc {n['id']}")
    for s in B.spawns:
        if not ok(s["x"], s["y"]) and s["mob"] not in ("MOB006",):  # flying spawns sit in the air
            bad.append(f"spawn {s['mob']} at x={s['x']}")
    for b in B.boss_spawns:
        if not ok(b["x"], b["y"]):
            bad.append(f"boss_spawn {b['boss']}")
    unreached = len(nodes) - len(seen)
    return bad, unreached, len(nodes)


def _clear_fall(free, x0, y0, x1, y1):
    """Rough check that a body can drift from (x0, y0) down to (x1, y1)."""
    steps = max(abs(x1 - x0), 1)
    for k in range(1, steps + 1):
        x = x0 + (x1 - x0) * k // steps
        if not free[y0 - 1, x]:
            return False
    return True


# ---------------------------------------------------------------- export

def tileset_json(name, image, w_px, h_px, firstgid):
    cols = w_px // TS
    return {"firstgid": firstgid, "name": name, "image": image, "imagewidth": w_px, "imageheight": h_px,
            "tilewidth": TS, "tileheight": TS, "columns": cols, "tilecount": cols * (h_px // TS),
            "margin": 0, "spacing": 0}


def _props(d):
    out = []
    for k, v in d.items():
        t = "int" if isinstance(v, int) and not isinstance(v, bool) else "bool" if isinstance(v, bool) else "string"
        out.append({"name": k, "type": t, "value": v})
    return out


def write_tmj(B, path, region_png, region_size, bg_names, bg_h):
    layers, lid, oid = [], 1, 1
    for name in ("bg_far", "bg_mid", "bg_near"):
        layers.append({"id": lid, "name": name, "type": "imagelayer", "image": bg_names[name],
                       "imagewidth": 960, "imageheight": bg_h, "repeatx": True, "repeaty": False,
                       "parallaxx": PARALLAX[name], "parallaxy": 1, "offsetx": 0, "offsety": 0,
                       "opacity": 1, "visible": True, "x": 0, "y": 0})
        lid += 1
    for name in ("ground", "decor"):
        layers.append({"id": lid, "name": name, "type": "tilelayer", "width": B.w, "height": B.h,
                       "data": [int(v) for v in B.tiles[name].flatten()], "opacity": 1, "visible": True,
                       "x": 0, "y": 0})
        lid += 1
    layers.append({"id": lid, "name": "collision", "type": "tilelayer", "width": B.w, "height": B.h,
                   "data": [int(v) for v in B.coll.flatten()], "opacity": 0.6, "visible": False, "x": 0, "y": 0})
    lid += 1
    objs = []

    def add(otype, name, x, y, w=0, h=0, props=None, point=False):
        nonlocal oid
        o = {"id": oid, "name": name, "type": otype, "x": x, "y": y, "width": w, "height": h, "rotation": 0,
             "visible": True}
        if point:
            o["point"] = True
        if props:
            o["properties"] = _props(props)
        objs.append(o)
        oid += 1

    if B.player_spawn:
        add("spawn_player", "spawn", B.player_spawn[0], B.player_spawn[1], props={"default": True}, point=True)
    for p in B.portals:
        add("portal", p["id"], p["x"] - 32, p["y"] - 96, 64, 96,
            props={"id": p["id"], "to": p["to"], "toX": p["toX"], "toY": p["toY"]})
    for n in B.npcs:
        add("npc", n["id"], n["x"], n["y"], props={"id": n["id"]}, point=True)
    for s in B.spawns:
        props = {"mob": s["mob"], "count": s["count"], "radius": s["radius"], "respawnSec": s["respawnSec"]}
        if s.get("level"):
            props.update(levelMin=s["level"][0], levelMax=s["level"][1])
        add("mob_spawn", s["mob"], s["x"], s["y"], props=props, point=True)
    for b in B.boss_spawns:
        add("boss_spawn", b["boss"], b["x"], b["y"], props={"boss": b["boss"], "event": b["event"]}, point=True)
    for z in B.safe:
        add("zone_safe", "safe", *z)
    for (x, y, w, h, ev) in B.triggers:
        add("zone_trigger", ev, x, y, w, h, props={"event": ev})
    layers.append({"id": lid, "name": "objects", "type": "objectgroup", "draworder": "topdown", "objects": objs,
                   "opacity": 1, "visible": True, "x": 0, "y": 0})
    lid += 1
    layers.append({"id": lid, "name": "fg", "type": "tilelayer", "width": B.w, "height": B.h,
                   "data": [int(v) for v in B.tiles["fg"].flatten()], "opacity": 1, "visible": True, "x": 0, "y": 0})
    lid += 1
    doc = {"type": "map", "version": "1.10", "tiledversion": "1.10.2", "orientation": "orthogonal",
           "renderorder": "right-down", "infinite": False, "compressionlevel": -1,
           "width": B.w, "height": B.h, "tilewidth": TS, "tileheight": TS,
           "nextlayerid": lid, "nextobjectid": oid, "layers": layers,
           "properties": _props({"id": B.id, "region": B.region, "type": B.type}),
           "tilesets": [tileset_json("collision", "tilesets/collision.png", TS * 4, TS, COLL_FIRSTGID),
                        tileset_json("r01", region_png, *region_size, REGION_FIRSTGID)]}
    with open(path, "w") as f:
        json.dump(doc, f, indent=1)


def write_yaml(B, path, tmj_name):
    L = [f"# Prototype map ({B.name}). Generated by tools/art-proto/maps.py", f"id: {B.id}",
         f"nameKey: map.{B.id.lower()}.name", f"type: {B.type}", f"region: {B.region}",
         f"levelRange: [{B.level[0]}, {B.level[1]}]", f"tmj: {tmj_name}", f"bgm: {B.bgm}", f"pk: {B.pk}",
         f"zoneCap: {B.zone_cap}", f"size: {{ widthTiles: {B.w}, heightTiles: {B.h} }}", "portals:"]
    for p in B.portals:
        L.append(f"  - {{ id: {p['id']}, x: {p['x']}, y: {p['y']}, to: {p['to']}, toX: {p['toX']}, toY: {p['toY']} }}")
    L.append("npcs:" + ("" if B.npcs else " []"))
    for n in B.npcs:
        L.append(f"  - {{ id: {n['id']}, x: {n['x']}, y: {n['y']} }}")
    L.append("spawns:" + ("" if B.spawns else " []"))
    for s in B.spawns:
        note = f"   # {s['note']}" if s["note"] else ""
        L.append(f"  - {{ mob: {s['mob']}, x: {s['x']}, y: {s['y']}, radius: {s['radius']}, count: {s['count']}, "
                 f"respawnSec: {s['respawnSec']} }}{note}")
    L.append("bossSpawns:" + ("" if B.boss_spawns else " []"))
    for b in B.boss_spawns:
        L.append(f"  - {{ boss: {b['boss']}, x: {b['x']}, y: {b['y']}, event: {b['event']} }}   # theo gio, xem events/")
    L.append("skyZones: []")
    L.append("safeZones:" + ("" if B.safe else " []"))
    for z in B.safe:
        L.append(f"  - {{ x: {z[0]}, y: {z[1]}, w: {z[2]}, h: {z[3]} }}")
    with open(path, "w") as f:
        f.write("\n".join(L) + "\n")


# ---------------------------------------------------------------- preview

def render(B, bgs, show=("ground", "decor", "fg"), actors=None):
    W, H = B.w * TS, B.h * TS
    out = canvas(W, H)
    for name in ("bg_far", "bg_mid", "bg_near"):
        img = bgs[name]
        for x in range(0, W, img.shape[1]):
            over(out, img, x, 0)
    sheet = B.S.cv

    def draw_layer(name):
        t = B.tiles[name]
        for y in range(B.h):
            for x in range(B.w):
                gid = t[y, x]
                if gid >= REGION_FIRSTGID:
                    i = gid - REGION_FIRSTGID
                    c, r = i % COLS, i // COLS
                    over(out, sheet[r * TS:(r + 1) * TS, c * TS:(c + 1) * TS], x * TS, y * TS)
    for name in ("ground", "decor"):
        draw_layer(name)
    if actors:
        for (spr, x, y, *anchor) in actors:
            ay = anchor[0] if anchor else 89
            over(out, spr, int(x - spr.shape[1] // 2), int(y - ay))
    draw_layer("fg")
    return out


def annotate(img_rgba, B):
    im = Image.fromarray(img_rgba, "RGBA")
    d = ImageDraw.Draw(im)
    for p in B.portals:
        d.rectangle([p["x"] - 32, p["y"] - 96, p["x"] + 32, p["y"]], outline=(120, 255, 255), width=2)
        d.text((p["x"] - 28, p["y"] - 110), f"{p['id']} -> {p['to']}", fill=(255, 255, 255))
    for n in B.npcs:
        d.text((n["x"] - 20, n["y"] - 108), n["id"], fill=(255, 255, 120))
    for s in B.spawns:
        d.ellipse([s["x"] - s["radius"], s["y"] - 10, s["x"] + s["radius"], s["y"] + 10], outline=(255, 90, 90), width=2)
        d.text((s["x"] - 30, s["y"] - 26), f"{s['mob']} x{s['count']}", fill=(255, 200, 200))
    if B.player_spawn:
        x, y = B.player_spawn
        d.polygon([(x - 6, y - 14), (x + 6, y - 14), (x, y - 2)], fill=(120, 255, 120))
    for (x, y, w, h, ev) in B.triggers:
        d.rectangle([x, y, x + w, y + h], outline=(255, 160, 60), width=2)
        d.text((x + 4, y + 4), ev, fill=(255, 200, 120))
    for b in B.boss_spawns:
        d.ellipse([b["x"] - 9, b["y"] - 9, b["x"] + 9, b["y"] + 9], outline=(255, 210, 60), width=3)
        d.text((b["x"] - 40, b["y"] - 150), f"{b['boss']} ({b['event']})", fill=(255, 230, 120))
    return im


# ---------------------------------------------------------------- rich backgrounds (Ninja School-like)

def _dgrad(g, stops):
    """Vertical gradient through colour stops [(t, hex)], ordered 2x2 dithering between bands."""
    t = g.py / g.h
    out = np.zeros((g.h, g.w, 4), np.uint8)
    out[..., 3] = 255
    bayer = np.array([[0, 2], [3, 1]]) / 4.0
    by = (np.indices((g.h, g.w))[0] % 2)
    bx = (np.indices((g.h, g.w))[1] % 2)
    thr = bayer[by, bx]
    cols = [np.array(hex_rgb(c), float) for _, c in stops]
    ts = [s for s, _ in stops]
    for i in range(len(stops) - 1):
        a, b = ts[i], ts[i + 1]
        m = (t >= a) & (t < b) if i < len(stops) - 2 else (t >= a)
        f = np.clip((t - a) / (b - a), 0, 1)
        # quantise to 4 sub-bands and dither between them
        q = np.floor(f * 4 + thr) / 4
        rgb = cols[i][None, None, :] * (1 - q[..., None]) + cols[i + 1][None, None, :] * q[..., None]
        out[m, :3] = np.round(rgb[m] / 4) * 4
    return out


def _cloud(cv, g, cx, cy, s, rng):
    m = np.zeros(cv.shape[:2], bool)
    for k in range(7):
        m |= g.disc(cx + (k - 3) * 9 * s + rng.uniform(-3, 3), cy - (3 - abs(k - 3)) * 3.2 * s, (8 + (3 - abs(k - 3)) * 2.4) * s)
    m &= g.py <= cy + 7 * s
    fill(cv, m, hex_rgb("#ffffff"))
    fill(cv, m & (g.py > cy + 1 * s), hex_rgb("#e4eef8"))
    fill(cv, m & (g.py > cy + 4 * s), hex_rgb("#cfdff0"))
    chk = (np.indices(m.shape).sum(0) % 2) == 0
    fill(cv, m & (g.py > cy - 1 * s) & (g.py <= cy + 1 * s) & chk, hex_rgb("#e4eef8"))


def _tree_band(cv, g, base_y, n, rmin, rmax, cols, rng, w, trunks=False):
    """Row of round trees along base_y(x) with light top-left clusters."""
    for k in range(n):
        tx = (k + rng.uniform(0, 1)) * w / n
        ty = base_y(tx)
        r = rng.uniform(rmin, rmax)
        if trunks:
            fill(cv, g.rect(tx - 1.5, ty - r * 0.6, tx + 1.5, ty + 6), hex_rgb(cols[0]))
        m = g.disc(tx, ty - r, r) | g.disc(tx - r * 0.6, ty - r * 0.6, r * 0.7) | g.disc(tx + r * 0.6, ty - r * 0.6, r * 0.7)
        fill(cv, m, hex_rgb(cols[1]))
        fill(cv, g.disc(tx - r * 0.25, ty - r * 1.2, r * 0.6) & m, hex_rgb(cols[2]))
        fill(cv, g.disc(tx - r * 0.4, ty - r * 1.4, r * 0.25) & m, hex_rgb(cols[3]))


def bg_rich(theme, h_px, w=960, seed=0):
    g = Grid(w, h_px)
    H = h_px
    far, mid, near = canvas(w, H), canvas(w, H), canvas(w, H)
    rng = np.random.default_rng(seed)
    xs = np.arange(w)
    if theme == "cave":
        far[:] = _dgrad(g, [(0, "#100c18"), (0.5, "#1c1628"), (1, "#2a2238")])
        for k in range(40):
            x, y = rng.uniform(0, w), rng.uniform(0, H)
            fill(far, g.ellipse(x, y, rng.uniform(8, 24), rng.uniform(3, 9)), hex_rgb("#1e1828"))
        for k in range(9):
            cx, cw = rng.uniform(0, w), rng.uniform(14, 28)
            col = g.poly([(cx - cw, H), (cx - cw * 0.6, H * 0.5), (cx - cw * 0.35, 0), (cx + cw * 0.35, 0),
                          (cx + cw * 0.6, H * 0.5), (cx + cw, H)])
            fill(mid, col, hex_rgb("#2a2438"))
            fill(mid, col & (g.px < cx - cw * 0.2), hex_rgb("#352d48"))
        for k in range(24):
            sx, sl, sw = rng.uniform(0, w), rng.uniform(20, 70), rng.uniform(5, 12)
            m = g.poly([(sx - sw, 0), (sx + sw, 0), (sx, sl)])
            fill(mid, m, hex_rgb("#2a2438"))
            fill(mid, m & (g.px < sx - 1), hex_rgb("#352d48"))
        ry = H * 0.82 + np.sin(xs / w * 2 * math.pi * 4) * H * 0.03 + np.sin(xs / w * 2 * math.pi * 11) * 4
        rocks = g.py >= ry[None, :]
        fill(near, rocks, hex_rgb("#2c2640"))
        fill(near, rocks & ~shift_up(rocks, 3), hex_rgb("#3f365a"))
        for k in range(18):
            x, y = rng.uniform(0, w), H * 0.84 + rng.uniform(2, 26)
            cr = g.poly([(x - 3, y + 7), (x, y - 7), (x + 3, y + 7)])
            fill(near, cr, hex_rgb("#7fd1ff" if k % 3 else "#c9b6ff"))
            fill(near, cr & (g.px < x), hex_rgb("#c8f0ff" if k % 3 else "#e8deff"))
        return far, mid, near

    sky = {"village": [(0, "#4f9fe6"), (0.35, "#7cc0f2"), (0.62, "#bfe4fb"), (1, "#e6f6ff")],
           "meadow": [(0, "#4aa2ec"), (0.35, "#78c4f4"), (0.62, "#bce6fc"), (1, "#e8f8ff")],
           "forest": [(0, "#5bb0d8"), (0.4, "#8fd0e0"), (0.65, "#c4ead8"), (1, "#e8f6e0")]}[theme]
    far[:] = _dgrad(g, sky)
    fill(far, g.disc(w * 0.82, H * 0.16, 20), hex_rgb("#fffbe6"))
    chk = (np.indices((H, w)).sum(0) % 2) == 0
    fill(far, g.ring(w * 0.82, H * 0.16, 28, 28, 6) & chk, hex_rgb("#e6f6ff"))
    for cx, cy, s in ((120, 0.12, 1.1), (420, 0.07, 0.8), (640, 0.22, 1.3), (880, 0.3, 0.7)):
        _cloud(far, g, cx, H * cy, s, rng)
    # distant mountains with lit ridges
    my = H * 0.5 - (np.abs(np.sin(xs / w * math.pi * 3 + 0.6)) * H * 0.14) - np.sin(xs / w * 2 * math.pi * 7) * 5
    mtn = g.py >= my[None, :]
    fill(far, mtn, hex_rgb("#8fb6dc"))
    fill(far, mtn & ~shift_up(mtn, 3), hex_rgb("#b4d2ee"))
    fill(far, mtn & (g.py > my[None, :] + 14) & chk, hex_rgb("#82a8d0"))
    # castle town on the far hill (generic fantasy silhouette)
    cx0 = w * 0.3
    base_y = H * 0.56
    castle = g.rect(cx0 - 40, base_y - 18, cx0 + 40, base_y + 6)
    for tx, th in ((-40, 34), (-20, 46), (0, 60), (20, 44), (40, 32)):
        castle |= g.rect(cx0 + tx - 5, base_y - th, cx0 + tx + 5, base_y)
        castle |= g.poly([(cx0 + tx - 7, base_y - th), (cx0 + tx, base_y - th - 14), (cx0 + tx + 7, base_y - th)])
    for k in range(-38, 39, 6):
        castle |= g.rect(cx0 + k, base_y - 22, cx0 + k + 2, base_y - 18)
    fill(far, castle, hex_rgb("#7c9ec6"))
    fill(far, castle & (g.px < cx0 - 4), hex_rgb("#90b0d6"))
    for tx, th in ((-20, 46), (0, 60), (20, 44)):
        fill(far, g.rect(cx0 + tx, base_y - th - 24, cx0 + tx, base_y - th - 14), hex_rgb("#5a7aa0"))
        fill(far, g.rect(cx0 + tx + 1, base_y - th - 24, cx0 + tx + 7, base_y - th - 20), hex_rgb("#d8504a"))
        fill(far, g.rect(cx0 + tx - 1, base_y - th + 10, cx0 + tx + 1, base_y - th + 15), hex_rgb("#f6d78a"))
    # mid hills with a forest edge and windmills
    hy = H * 0.64 + np.sin(xs / w * 2 * math.pi * 2 + 1) * H * 0.05
    hill = g.py >= hy[None, :]
    green = {"forest": ["#2f6a36", "#3f8044", "#5aa058", "#86c470"]}.get(theme, ["#3f7a34", "#5a9e44", "#78bc56", "#a2d870"])
    fill(mid, hill, hex_rgb(green[1]))
    fill(mid, hill & ~shift_up(hill, 3), hex_rgb(green[2]))
    fill(mid, hill & (g.py > hy[None, :] + 20) & chk, hex_rgb(green[0]))
    hy_f = lambda x: H * 0.64 + math.sin(x / w * 2 * math.pi * 2 + 1) * H * 0.05  # noqa: E731
    _tree_band(mid, g, hy_f, 26 if theme != "forest" else 46, 7, 13 if theme != "forest" else 20, green, rng, w)
    if theme != "forest":
        for wx in (w * 0.62, w * 0.9):
            wy = hy_f(wx)
            tower = g.poly([(wx - 6, wy), (wx - 4, wy - 26), (wx + 4, wy - 26), (wx + 6, wy)])
            fill(mid, tower, hex_rgb("#e8dcc0"))
            fill(mid, tower & (g.px > wx + 1), hex_rgb("#cbbd9c"))
            fill(mid, g.poly([(wx - 6, wy - 26), (wx, wy - 34), (wx + 6, wy - 26)]), hex_rgb("#8a4a2a"))
            for a in (20, 110, 200, 290):
                dx, dy = math.cos(math.radians(a)), math.sin(math.radians(a))
                fill(mid, g.capsule(wx, wy - 28, wx + dx * 18, wy - 28 + dy * 18, 1.6), hex_rgb("#f2ead6"))
    # near: dense tree line
    ny = H * 0.8 + np.sin(xs / w * 2 * math.pi * 3 + 2) * H * 0.02
    nm = g.py >= ny[None, :]
    dark = {"forest": ["#1f4a24", "#2a5f2e", "#3a7a3a", "#5a9a4a"]}.get(theme, ["#2a5a24", "#3a7a30", "#4f9a3c", "#78bc56"])
    fill(near, nm, hex_rgb(dark[1]))
    ny_f = lambda x: H * 0.8 + math.sin(x / w * 2 * math.pi * 3 + 2) * H * 0.02  # noqa: E731
    _tree_band(near, g, ny_f, 18 if theme != "forest" else 26, 14, 24 if theme != "forest" else 34, dark, rng, w,
               trunks=True)
    return far, mid, near

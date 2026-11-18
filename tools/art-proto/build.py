"""Build the art prototype pack into art/prototype/.

Outputs per kind: Piskel files (one layer per paper-doll part), PNG sprite
sheets, and GIF previews. Usage: python3 tools/art-proto/build.py [out_dir]
"""
from __future__ import annotations

import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import vfx  # noqa: E402
from demo import skill_demo  # noqa: E402
from hero import (LAYER_TITLES, ORDER, draw_character, draw_tome_closed, draw_tome_open,  # noqa: E402
                  hero_cast, hero_spec)
from actors import attack, idle, run, walk  # noqa: E402
from items import all_icons  # noqa: E402
from npcs import NPCS  # noqa: E402
from pix import canvas, hex_rgb, over, ramp, save_gif, save_piskel, sheet  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "art", "prototype")

HEROES = {
    "fire": hero_spec("fire", "spiky", "#b8322a", "#e8a33a"),
    "water": hero_spec("water", "long", None, "#2a9d8f", ribbon=True,
                       hair_ramp=ramp("#e9dcc0", dark="#c9a47a", light="#fff6e0", outline="#7a5a3a")),
    "wind": hero_spec("wind", "spiky", "#1f6f68", "#2ec4b6"),
    "bolt": hero_spec("bolt", "spiky", "#e8c547", "#3a86ff"),
    "earth": hero_spec("earth", "short", "#5a3a28", "#7a5a3a"),
    "plant": hero_spec("plant", "long", "#3f7d3a", "#a7e08a", ribbon=True),
    "dark": hero_spec("dark", "short", "#2a1f3d", "#9d7fd6"),
    "seal": hero_spec("seal", "spiky", "#2a2630", "#c1121f", tome="final"),
}
CLASS_VI = {"fire": "hoa", "water": "thuy", "wind": "phong", "bolt": "loi", "earth": "tho",
            "plant": "moc", "dark": "am", "seal": "phong_an"}
ANIMS = [("idle", 4), ("walk", 6), ("run", 6), ("attack", 5), ("cast", 6)]


def poses_for(spec):
    k = spec["weapon"]
    return {"idle": idle(k), "walk": walk(k), "run": run(k), "attack": attack(k, spec["cls"]),
            "cast": hero_cast(spec["cls"])}


def layered_frames(spec, poses):
    """-> list of (title, frames) without empty layers, back to front."""
    stacks = [draw_character(spec, p) for p in poses]
    out = []
    for name in ORDER:
        frames = [s[name] for s in stacks]
        if any(f[..., 3].any() for f in frames):
            out.append((LAYER_TITLES[name], frames))
    return out, [s.flat() for s in stacks]


def mk(*parts):
    d = os.path.join(OUT, *parts)
    os.makedirs(d, exist_ok=True)
    return d


def build_heroes():
    pk, sh, pv = mk("piskel"), mk("sheets"), mk("preview")
    for cls, spec in HEROES.items():
        ps = poses_for(spec)
        seq = [p for name, _ in ANIMS for p in ps[name]]
        layers, flat = layered_frames(spec, seq)
        ranges, i = [], 1
        for name, n in ANIMS:
            ranges.append(f"{name} {i}-{i + n - 1}")
            i += n
        save_piskel(os.path.join(pk, f"nhan_vat_{CLASS_VI[cls]}.piskel"), f"Nhan vat {CLASS_VI[cls]}",
                    layers, fps=10, description="Khung: " + ", ".join(ranges))
        rows, i = [], 0
        for name, n in ANIMS:
            rows.append(flat[i:i + n])
            i += n
        sheet(rows).save(os.path.join(sh, f"nhan_vat_{CLASS_VI[cls]}.png"))
        move = [flat[4 + k % 6] for k in range(12)] + [flat[10 + k % 6] for k in range(12)]
        save_gif(move, os.path.join(pv, f"di_chuyen_{CLASS_VI[cls]}.gif"), [100] * 12 + [80] * 12, scale=3)
        save_gif(skill_demo(cls, spec), os.path.join(pv, f"chieu_{CLASS_VI[cls]}.gif"), 80, scale=3)


def build_npcs():
    pk, sh, pv = mk("piskel"), mk("sheets"), mk("preview")
    rows, lineup = [], []
    for key, spec in NPCS.items():
        layers, flat = layered_frames(spec, idle())
        save_piskel(os.path.join(pk, f"{key.lower()}.piskel"), spec["name"], layers, fps=6,
                    description="idle 1-4")
        rows.append(flat)
    sheet(rows).save(os.path.join(sh, "npc_idle.png"))
    n_rows = (len(rows) + 3) // 4
    for f in range(4):
        cv = canvas(96 * 4, 96 * n_rows)
        for k, row in enumerate(rows):
            over(cv, row[f], (k % 4) * 96, (k // 4) * 96)
        lineup.append(cv)
    save_gif(lineup, os.path.join(pv, "npc.gif"), 166, scale=2)


def build_items():
    pk, sh, pv = mk("piskel"), mk("sheets"), mk("preview")
    icons = all_icons()
    frames = [c for _, c in icons]
    cols = 8
    rows = [frames[i:i + cols] for i in range(0, len(frames), cols)]
    while len(rows[-1]) < cols:
        rows[-1].append(canvas(32, 32))
    sheet(rows).save(os.path.join(sh, "vat_pham.png"))
    save_piskel(os.path.join(pk, "vat_pham.piskel"), "Vat pham", [("Icon", frames)], fps=2,
                description=", ".join(f"{i + 1}:{n}" for i, (n, _) in enumerate(icons)))
    from pix import to_image
    to_image(np.array(sheet(rows)), 4, (40, 44, 64)).save(os.path.join(pv, "vat_pham.png"))
    with open(os.path.join(sh, "vat_pham.txt"), "w") as f:
        for i, (n, _) in enumerate(icons):
            f.write(f"{i}\t{n}\n")


def build_vfx():
    pk, sh = mk("piskel"), mk("sheets")
    for cls, (proj, hit, anchor, label) in vfx.EFFECTS.items():
        frames = []
        if proj:
            for f in range(4):
                cv = canvas(96, 96)
                proj(cv, 56, 48, f)
                frames.append(cv)
        if cls == "earth":
            for f in range(10):
                cv = canvas(96, 96)
                vfx.earth_line(cv, 8, 70, 88, f)
                frames.append(cv)
        elif cls == "bolt":
            for f in range(6):
                cv = canvas(96, 96)
                vfx.strike_bolt(cv, 48, 88, f)
                frames.append(cv)
        else:
            for f in range(6):
                cv = canvas(96, 96)
                hit(cv, 48, 60 if anchor == "air" else 88, f)
                frames.append(cv)
        sheet([frames]).save(os.path.join(sh, f"hieu_ung_{CLASS_VI[cls]}.png"))
        desc = ("dan bay 1-4, trung dich 5-10" if proj else "trung dich 1-%d" % len(frames))
        save_piskel(os.path.join(pk, f"hieu_ung_{CLASS_VI[cls]}.piskel"), label, [("Hieu ung", frames)],
                    fps=12, description=desc)


def build_tomes():
    pv = mk("preview")
    tc = []
    for i in range(4):
        cv = canvas(110, 40)
        for j, ed in enumerate(("draft", "revised", "final")):
            draw_tome_closed(cv, 14 + j * 22, 20 + (0, -1, -2, -1)[(i + j) % 4], ed, "#3a86ff")
        draw_tome_open(cv, 90, 24, "draft", "#e4572e", flip=(None, 0, 1, None)[i], glow=hex_rgb("#ffb703"))
        tc.append(cv)
    save_gif(tc, os.path.join(pv, "huyen_thu.gif"), 140, scale=5)


def build_maps():
    from PIL import Image

    import maps as MP
    from maps_r01 import build_region
    from tiles_rich import build_r01

    root = mk("maps")
    tsd, bgd, pvd = mk("maps", "tilesets"), mk("maps", "backgrounds"), mk("maps", "preview")
    S = build_r01()
    Image.fromarray(S.cv, "RGBA").save(os.path.join(tsd, "r01.png"))
    Image.fromarray(MP.collision_tileset(), "RGBA").save(os.path.join(tsd, "collision.png"))
    save_piskel(os.path.join(mk("piskel"), "tileset_r01.piskel"), "Tileset R01", [("Tileset", [S.cv])], fps=1,
                description="O 32x32, 16 cot; thu tu o xem maps/tilesets/r01_index.txt")
    with open(os.path.join(tsd, "r01_index.txt"), "w") as f:
        for name, (c, r, w, h) in sorted(S.objects.items(), key=lambda kv: kv[1][1] * 16 + kv[1][0]):
            f.write(f"{name}\tcol={c}\trow={r}\tw={w}\th={h}\tgid={r * 16 + c + MP.REGION_FIRSTGID}\n")
    npc_sprites = {key.split("_")[0]: layered_frames(spec, idle()[:1])[1][0] for key, spec in NPCS.items()}
    hero = layered_frames(HEROES["fire"], idle("sword")[:1])[1][0]
    for mid, B in build_region(S).items():
        name = mid.lower()
        bgs = dict(zip(("bg_far", "bg_mid", "bg_near"), MP.bg_rich(B.theme, B.h * 32, seed=int(mid[1:]))))
        bg_names = {}
        for k, img in bgs.items():
            fn = f"{name}_{k[3:]}.png"
            Image.fromarray(img, "RGBA").save(os.path.join(bgd, fn))
            bg_names[k] = f"backgrounds/{fn}"
        MP.write_tmj(B, os.path.join(root, f"{name}.tmj"), "tilesets/r01.png", S.cv.shape[1::-1], bg_names, B.h * 32)
        MP.write_yaml(B, os.path.join(root, f"{name}.yaml"), f"{name}.tmj")
        actors = [(npc_sprites[n["id"]], n["x"], n["y"]) for n in B.npcs if n["id"] in npc_sprites]
        actors.append((hero, *B.player_spawn))
        full = MP.render(B, bgs, actors=actors)
        Image.fromarray(full, "RGBA").save(os.path.join(pvd, f"{name}.png"))
        MP.annotate(MP.render(B, bgs), B).save(os.path.join(pvd, f"{name}_annotated.png"))
        sx = min(max(0, B.player_spawn[0] - 300), full.shape[1] - 960)
        Image.fromarray(full[full.shape[0] - 540:, sx:sx + 960], "RGBA").save(os.path.join(pvd, f"{name}_view.png"))


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[2] == "maps":
        build_maps()
        print("maps built into", OUT)
        sys.exit(0)
    build_maps()
    build_heroes()
    build_npcs()
    build_items()
    build_vfx()
    build_tomes()
    print("built into", OUT)

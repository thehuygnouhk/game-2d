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


MOB_DATA = {
    # id: (level, element, kind, ai, aggro, speed, skills, w, h, note)
    "MOB001": ([1, 2], "PLANT", "NORMAL", "PASSIVE", 0, 40, ["MOBSKL_TACKLE"], 40, 40, "Nam Lun: nhay cham"),
    "MOB002": ([2, 4], "NONE", "NORMAL", "PASSIVE", 0, 70, ["MOBSKL_KICK"], 44, 40, "Tho Dom: chay tron khi HP < 30%"),
    "MOB003": ([4, 5], "NONE", "NORMAL", "AGGRESSIVE", 180, 90, ["MOBSKL_BITE"], 52, 36, "Cho Rung Non"),
    "MOB004": ([5, 7], "EARTH", "NORMAL", "AGGRESSIVE", 240, 50, ["MOBSKL_THROW_ROCK"], 36, 56, "Lun Nem Da: nem da tam ngan"),
    "MOB005": ([6, 7], "DARK", "NORMAL", "AGGRESSIVE", 200, 60, ["MOBSKL_INK_SPIT"], 52, 32, "Nhen Muc: gay Doc nhe"),
    "MOB006": ([7, 8], "DARK", "NORMAL", "AGGRESSIVE", 220, 80, ["MOBSKL_DIVE"], 44, 36, "Doi Gieng: bay, lao xuong"),
    "MOB007": ([8, 9], "EARTH", "NORMAL", "AGGRESSIVE", 140, 30, ["MOBSKL_SHELL_BASH"], 56, 34, "Rua Da Gieng: DEF cao"),
}
BOSS_DATA = {
    # id: (level, element, kind, hp_mult_note, skills, w, h, where, note)
    "BOSS001": (9, "NONE", "MINIBOSS", ["BSKL_PAGE_SWIPE", "BSKL_PAGE_STORM", "BSKL_TEAR_APART"], 110, 140,
                "DG01 (instance)", "Trang Lac: 50% HP rach thanh 4 Manh Trang"),
    "BOSS034": (5, "PLANT", "BOSS", ["BSKL_STOMP_WAVE", "BSKL_SUMMON_MUSHROOMS"], 90, 110, "M002 (theo gio)",
                "Vua Nam Lun: goi 3 Nam Lun o 60% va 30% HP"),
    "BOSS035": (8, "NONE", "BOSS", ["BSKL_HOWL_SUMMON", "BSKL_LUNGE"], 110, 80, "M003 (theo gio)",
                "Cho Rung Dau Dan: hu goi 2 Cho Rung Non; lao can co vung bao hieu"),
    "BOSS036": (10, "DARK", "BOSS", ["BSKL_DIVE_CIRCLE", "BSKL_CRYSTAL_WING"], 120, 90, "M004 (theo gio)",
                "Doi Chua Gieng: bay cao, sa xuong theo vong tron bao hieu"),
}
EVENTS = {
    "EVT_BOSS_034": ("BOSS034", ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"], ["M002"], "RANDOM_ONE"),
    "EVT_BOSS_035": ("BOSS035", ["11:00", "17:00", "21:00"], ["M003"], "RANDOM_ONE"),
    "EVT_BOSS_036": ("BOSS036", ["12:30", "19:30"], ["M004"], "RANDOM_ONE"),
}


def build_content():
    """Prototype content data (to move into packages/content in Phase 0)."""
    d = {k: mk("content", k) for k in ("monsters", "bosses", "events")}
    for mid, (lv, el, kind, ai, aggro, spd, skills, w, h, note) in MOB_DATA.items():
        with open(os.path.join(d["monsters"], f"{mid.lower()}.yaml"), "w") as f:
            f.write(f"""# {note} (prototype)
id: {mid}
nameKey: mob.{mid.lower()}.name
level: [{lv[0]}, {lv[1]}]
element: {el}
kind: {kind}
sprite: monsters/{mid.lower()}
size: {{ w: {w}, h: {h} }}
ai:
  type: {ai}
  aggroRange: {aggro}
  leash: 600
  moveSpeed: {spd}{chr(10) + "  flying: true" if mid == "MOB006" else ""}{chr(10) + "  fleeBelowHp: 0.3" if mid == "MOB002" else ""}
skills: [ {", ".join(skills)} ]
drops: DROP_R01_BASIC
exp: formula                 # 8L + 10 (combat section 2.1)
""")
    for bid, (lv, el, kind, skills, w, h, where, note) in BOSS_DATA.items():
        extra = ""
        if bid == "BOSS001":
            extra = "phases:\n  - { atHp: 0.5, action: SPLIT, into: BOSS001_SHARD, count: 4 }\ninstanceOnly: DG01\n"
        if bid == "BOSS034":
            extra = "phases:\n  - { atHp: 0.6, action: SUMMON, mob: MOB001, count: 3 }\n  - { atHp: 0.3, action: SUMMON, mob: MOB001, count: 3 }\n"
        if bid == "BOSS035":
            extra = "phases:\n  - { atHp: 0.7, action: SUMMON, mob: MOB003, count: 2 }\n  - { atHp: 0.35, action: SUMMON, mob: MOB003, count: 2 }\n"
        with open(os.path.join(d["bosses"], f"{bid.lower()}.yaml"), "w") as f:
            f.write(f"""# {note}; {where} (prototype)
id: {bid}
nameKey: boss.{bid.lower()}.name
level: [{lv}, {lv}]
element: {el}
kind: {kind}                  # HP/EXP multiplier per combat section 2.1 (Boss x40, Mini-boss x10)
sprite: bosses/{bid.lower()}
size: {{ w: {w}, h: {h} }}
skills: [ {", ".join(skills)} ]
{extra}drops: DROP_{bid}
enrageAfterMin: 10
""")
    for eid, (boss, times, maps, zones) in EVENTS.items():
        with open(os.path.join(d["events"], f"{eid.lower()}.yaml"), "w") as f:
            f.write(f"""# Boss theo gio Chuong 1 (maps section 5.1-5.2), prototype
id: {eid}
kind: WORLD_BOSS
boss: {boss}
schedule: {{ times: [{", ".join('"' + x + '"' for x in times)}], tz: "Asia/Ho_Chi_Minh" }}
announceBeforeMin: 5
maps: [ {", ".join(maps)} ]
zones: {zones}
despawnAfterMin: 30
rewardMaxLevelGap: 10
""")
    with open(os.path.join(d["events"], "evt_r01_well_night.yaml"), "w") as f:
        f.write("""# Dem Gieng Sang: moi toi thu Sau, Doi Chua Gieng xuat hien day hon o moi khu M004 (prototype)
id: EVT_R01_WELL_NIGHT
kind: WORLD_BOSS
boss: BOSS036
schedule: { weekly: { day: FRI, from: "20:00", to: "21:00", everyMin: 20 }, tz: "Asia/Ho_Chi_Minh" }
announceBeforeMin: 5
maps: [ M004 ]
zones: ALL
despawnAfterMin: 20
rewardMaxLevelGap: 10
""")


def build_monsters():
    from monsters import ANIMS, MONSTERS, monster_frames
    pk, sh, pv = mk("piskel"), mk("sheets"), mk("preview")
    lineup_small, boss_gifs = [], {}
    for mid, (_, size, name, lv) in MONSTERS.items():
        fr = monster_frames(mid)
        seq = [f for a in ANIMS for f in fr[a]]
        tag = "boss" if mid.startswith("BOSS") else "quai"
        fn = f"{tag}_{mid.lower()}"
        save_piskel(os.path.join(pk, fn + ".piskel"), f"{mid} {name} (Lv{lv})", [("Quai", seq)], fps=8,
                    description="idle 1-4, move 5-8, attack 9-12, die 13-16")
        sheet([fr[a] for a in ANIMS]).save(os.path.join(sh, fn + ".png"))
        if size == 64:
            lineup_small.append(fr)
        else:
            loop = fr["idle"] * 2 + fr["move"] * 2 + fr["attack"] * 2 + fr["die"]
            save_gif(loop, os.path.join(pv, fn + ".gif"), 125, scale=2)
    frames = []
    for k in range(16):
        cv = canvas(64 * 4, 64 * 2)
        for j, fr in enumerate(lineup_small):
            anim = ("idle", "move", "attack", "move")[k // 4]
            over(cv, fr[anim][k % 4], (j % 4) * 64, (j // 4) * 64)
        frames.append(cv)
    save_gif(frames, os.path.join(pv, "quai_chuong1.gif"), 140, scale=3)


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
    from monsters import monster_frames
    mob_spr = {m: monster_frames(m) for m in ("MOB001", "MOB002", "MOB003", "MOB004", "MOB005", "MOB006", "MOB007",
                                              "BOSS034", "BOSS035", "BOSS036")}
    flying = {"MOB006": 27, "BOSS036": 54}
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
        for s in B.spawns:  # up to 3 monsters per spawn, spread over the radius
            fr = mob_spr[s["mob"]]
            for k in range(min(3, s["count"])):
                x = s["x"] + (k - 1) * min(s["radius"], 96) * 0.6
                anim = ("idle", "move")[k % 2]
                spr = fr[anim][k % 4] if k % 2 == 0 else fr[anim][k % 4][:, ::-1].copy()
                actors.append((spr, x, s["y"] - (40 if s["mob"] in flying else 0), flying.get(s["mob"], 61)))
        for b in B.boss_spawns:
            spr = mob_spr[b["boss"]]["idle"][0][:, ::-1].copy()
            actors.append((spr, b["x"], b["y"] - (60 if b["boss"] in flying else 0), flying.get(b["boss"], 125)))
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
    if len(sys.argv) > 2 and sys.argv[2] == "monsters":
        build_monsters()
        build_content()
        build_maps()
        print("monsters, content and maps built into", OUT)
        sys.exit(0)
    build_monsters()
    build_content()
    build_maps()
    build_heroes()
    build_npcs()
    build_items()
    build_vfx()
    build_tomes()
    print("built into", OUT)

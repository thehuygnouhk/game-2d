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
    from monsters import ALL_ANIMS, MONSTERS, monster_frames
    pk, sh, pv = mk("piskel"), mk("sheets"), mk("preview")
    lineup_small, boss_gifs = [], {}
    for mid, (_, size, name, lv) in MONSTERS.items():
        fr = monster_frames(mid)
        rows = [a for a in ALL_ANIMS if a in fr]
        seq = [f for a in rows for f in fr[a]]
        tag = "boss" if mid.startswith("BOSS") else "quai"
        fn = f"{tag}_{mid.lower()}"
        desc = "idle 1-4, move 5-8, attack 9-12, die 13-16, hurt 17-18" + (", skill2 19-22" if "skill2" in fr else "")
        save_piskel(os.path.join(pk, fn + ".piskel"), f"{mid} {name} (Lv{lv})", [("Quai", seq)], fps=8,
                    description=desc)
        sheet([fr[a] for a in rows]).save(os.path.join(sh, fn + ".png"))
        if size == 64:
            lineup_small.append(fr)
        else:
            loop = fr["idle"] * 2 + fr["move"] * 2 + fr["attack"] * 2 + fr["hurt"] * 2 + fr["skill2"] * 2 + fr["die"]
            save_gif(loop, os.path.join(pv, fn + ".gif"), 125, scale=2)
    frames = []
    for k in range(16):
        cv = canvas(64 * 4, 64 * 2)
        for j, fr in enumerate(lineup_small):
            anim = ("idle", "move", "attack", "move")[k // 4]
            over(cv, fr[anim][k % 4], (j % 4) * 64, (j // 4) * 64)
        frames.append(cv)
    save_gif(frames, os.path.join(pv, "quai_chuong1.gif"), 140, scale=3)


VI_NAMES = {
    "MOB001": "Nấm Lùn", "MOB002": "Thỏ Đốm", "MOB003": "Chó Rừng Non", "MOB004": "Lùn Ném Đá",
    "MOB005": "Nhện Mực", "MOB006": "Dơi Giếng", "MOB007": "Rùa Đá Giếng", "BOSS001": "Trang Lạc",
    "BOSS034": "Vua Nấm Lùn", "BOSS035": "Chó Rừng Đầu Đàn", "BOSS036": "Dơi Chúa Giếng",
    "M001": "Nhà Học Suối Mơ", "M002": "Đồng Hoa Suối Mơ", "M003": "Rừng Mơ Non", "M004": "Hang Giếng Cạn",
    "NPC001": "Thầy Bạch Vân", "NPC002": "Bà Mơ", "NPC003": "Lam Nhi", "NPC004": "Khôi", "NPC005": "Chấp Bút Hạc Minh",
    "NPC040": "Cụ Trương", "NPC042": "Thợ Rèn Tư", "NPC024": "Cô Kim Thoa", "NPC053": "Cụ Tiễn",
}


# Chapter 1 main quests (docs/game-design/06-quests-and-missions.md §4, format §11).
# Display text lives in the i18n table below, not in the quest records.
QUEST_ITEMS = {   # quest items: only drop while the quest needs them (quests §4.1)
    "cu_cai_non": ("Củ Cải Non", {"mob": "MOB002", "chance": 0.5}),
    "thao_duoc": ("Thảo Dược Suối Mơ", {"node": "M002", "respawnSec": 20}),
    "bao_tai": ("Bao Tải Bị Lấy", {"mob": "MOB004", "chance": 0.25}),
    "manh_trang": ("Mảnh Trang", {"mob": "MOB007", "chance": 0.3}),
}
REWARD_ITEMS = {"potion_hp": "Bình HP Nhỏ", "kiem_go_tap": "Kiếm Gỗ Tập", "ao_suoi_mo": "Áo Suối Mơ"}
QUEST_DATA = [
    # id, level, giver, turnIn, objectives, rewards, prototype-ready
    ("Q_MAIN_01", 1, "NPC001", "NPC001", [dict(type="TALK", target="NPC002", map="M001")],
     dict(exp=50, soft=100, items=[("potion_hp", 5)]), True),
    ("Q_MAIN_02", 1, "NPC001", "NPC001", [dict(type="KILL", target="MOB001", count=5, map="M002")],
     dict(exp=120, soft=80, items=[("kiem_go_tap", 1)]), True),
    ("Q_MAIN_03", 2, "NPC040", "NPC040", [dict(type="KILL", target="MOB002", count=6, map="M002"),
                                          dict(type="COLLECT", target="cu_cai_non", count=4, map="M002")],
     dict(exp=200, soft=120), True),
    ("Q_MAIN_04", 3, "NPC003", "NPC003", [dict(type="COLLECT", target="thao_duoc", count=5, map="M002")],
     dict(exp=300, soft=150, items=[("potion_hp", 3)]), True),
    ("Q_MAIN_05", 5, "NPC004", "NPC004", [dict(type="TALK", target="NPC004", map="M002"),
                                          dict(type="USE_SKILL", target="SKL_MANA_BURST", count=3, map="M002")],
     dict(exp=400, soft=200, skill="SKL_MANA_BURST"), True),
    ("Q_MAIN_06", 5, "NPC040", "NPC040", [dict(type="KILL", target="MOB003", count=8, map="M003")],
     dict(exp=600, soft=250), True),
    ("Q_MAIN_07", 6, "NPC040", "NPC040", [dict(type="KILL", target="MOB004", count=6, map="M003"),
                                          dict(type="COLLECT", target="bao_tai", count=1, map="M003")],
     dict(exp=800, soft=300), True),
    ("Q_MAIN_08", 7, "NPC002", "NPC002", [dict(type="KILL", target="MOB006", count=8, map="M004")],
     dict(exp=1000, soft=350), True),
    ("Q_MAIN_09", 8, "NPC003", "NPC003", [dict(type="KILL", target="MOB007", count=6, map="M004"),
                                          dict(type="COLLECT", target="manh_trang", count=1, map="M004")],
     dict(exp=1400, soft=400), True),
    ("Q_MAIN_10", 9, "NPC001", "NPC001", [dict(type="BOSS", target="BOSS001", count=1, map="DG01")],
     dict(exp=2000, soft=600, items=[("ao_suoi_mo", 1)]), False),
    ("Q_MAIN_11", 9, "NPC001", "NPC001", [dict(type="TALK", target="NPC001", map="M001")],
     dict(exp=1200), False),
    ("Q_MAIN_12", 10, "NPC001", "NPC001", [dict(type="REACH", target="I001", map="I001")],
     dict(), False),
]
QUEST_TEXT = {   # i18n vi: title, objective labels, dialogue (accept / progress / complete / extra talk)
    "Q_MAIN_01": ("Buổi Sáng Ở Nhà Học", ["Chào Bà Mơ ở bếp nhà học"],
                  "Sáng nay con đến sớm đấy. Ghé chào Bà Mơ ở bếp rồi quay lại đây, ta có việc nhờ.",
                  "Bà Mơ ở ngay cạnh nhà học thôi, con.",
                  "Ăn sáng no rồi mới học được. Cầm mấy bình thuốc này mà dùng.",
                  {"NPC002": "Ôi, đến sớm thế! Cầm cái bánh này rồi về báo thầy nhé."}),
    "Q_MAIN_02": ("Dọn Vườn Thuốc", ["Hạ Nấm Lùn"],
                  "Lũ Nấm Lùn lại mọc tràn ra Đồng Hoa, giẫm nát cả vườn thuốc. Con ra dọn giúp ta năm con.",
                  "Nấm Lùn ở phía trái Đồng Hoa, đi qua cổng cuối làng là thấy.",
                  "Vườn thuốc sạch rồi. Thanh kiếm gỗ này hợp tay con đấy.", {}),
    "Q_MAIN_03": ("Thỏ Phá Ruộng", ["Hạ Thỏ Đốm", "Nhặt Củ Cải Non"],
                  "Thỏ Đốm đào nát ruộng củ cải của làng rồi! Đuổi chúng đi, nhặt lại giúp lão mấy củ còn lành.",
                  "Thỏ ở nửa sau Đồng Hoa, gần cối xay gió. Củ cải rơi ra khi hạ thỏ.",
                  "Củ còn tươi cả. Già này cảm ơn con.", {}),
    "Q_MAIN_04": ("Hái Thảo Dược", ["Hái Thảo Dược Suối Mơ"],
                  "Mình cần năm nhánh Thảo Dược Suối Mơ để chế thuốc. Nó mọc lấp lánh trên Đồng Hoa, cậu hái giúp nhé!",
                  "Thảo dược có đốm sáng xanh. Đứng gần rồi nhấn F (hoặc chạm vào) để hái.",
                  "Đủ rồi! Mình vừa chế xong mấy bình, cậu cầm đi đường.", {}),
    "Q_MAIN_05": ("Bài Học Của Khôi", ["Gặp Khôi ở Đồng Hoa", "Đấu tập: Tụ Mana Chấn trúng quái"],
                  "Muốn mạnh lên thì phải biết dồn mana. Ra Đồng Hoa gặp tớ, tớ chỉ cho.",
                  "Dồn mana vào lòng bàn tay rồi đẩy ra. Nhấn phím 1, trúng ba lần là được.",
                  "Khá đấy! Từ giờ Tụ Mana Chấn là chiêu của cậu.",
                  {"NPC004": "Tới rồi à? Nhìn tớ này: dồn mana, rồi đẩy! Giờ cậu thử với lũ quái quanh đây."}),
    "Q_MAIN_06": ("Chó Rừng Lạc Bầy", ["Hạ Chó Rừng Non"],
                  "Đêm qua chó rừng mò tới tận bờ rào. Vào Rừng Mơ Non đuổi bớt tám con giúp lão.",
                  "Chó Rừng Non ở đầu Rừng Mơ Non, đi hết Đồng Hoa là tới.",
                  "Đêm nay làng ngủ yên rồi.", {}),
    "Q_MAIN_07": ("Bao Tải Bị Lấy", ["Hạ Lùn Ném Đá", "Lấy lại Bao Tải Bị Lấy"],
                  "Bác Tư bên suối bị lũ Lùn Ném Đá cướp mất bao tải hạt giống. Con đòi lại giúp lão.",
                  "Lùn Ném Đá ở giữa Rừng Mơ Non. Cẩn thận đá bay.",
                  "Bao tải đây rồi, hạt giống còn nguyên. Bác Tư sẽ mừng lắm.", {}),
    "Q_MAIN_08": ("Giếng Làng Cạn", ["Hạ Dơi Giếng"],
                  "Giếng làng cạn dần mà dưới hang toàn dơi. Con xuống Hang Giếng Cạn đuổi tám con đi.",
                  "Hang Giếng Cạn ở cuối Rừng Mơ Non. Dơi bay thấp, đứng dưới mà đánh.",
                  "Nước lại róc rách rồi. Tối nay bà nấu canh cho cả làng.", {}),
    "Q_MAIN_09": ("Tờ Giấy Trắng", ["Hạ Rùa Đá Giếng", "Tìm Mảnh Trang"],
                  "Rùa đá trong hang có nuốt một tờ giấy không chữ. Cậu tìm giúp mình được không?",
                  "Rùa Đá Giếng ở sâu trong hang, mai cứng lắm.",
                  "Trắng tinh… nhưng mình có cảm giác nó đang chờ ai đó viết lên.", {}),
    "Q_MAIN_10": ("Trang Lạc", ["Hạ Trang Lạc trong hầm ngục DG01"],
                  "Có thứ gì đó trú trong đáy giếng cạn. Con đủ sức rồi, xuống xem đi.",
                  "Cổng hầm ngục ở cuối Hang Giếng Cạn.", "Con đã lớn thật rồi.", {}),
    "Q_MAIN_11": ("Đêm Trước Ngày Lễ", ["Trò chuyện cùng Thầy, Lam Nhi và Khôi"],
                  "Mai là Lễ Khai Thư. Tối nay ở lại nhà học nhé.", "", "", {}),
    "Q_MAIN_12": ("Lễ Khai Thư", ["Vào lễ đường, chọn hệ phép"],
                  "Huyền Thư đang chờ con.", "", "", {}),
}


# Items for step A1 (docs/game-design/07-items-and-equipment.md §1-5, §8; economy §3).
# Gear entries are templates: level and rarity are rolled when the item drops.
ITEM_DEFS = {
    "potion_hp": dict(type="CONSUMABLE", name="Bình HP Nhỏ", icon="potion_hp", value=20, heal_hp=150, stack=999),
    "potion_hp_m": dict(type="CONSUMABLE", name="Bình HP Vừa", icon="potion_hp_m", value=80, heal_hp=600, stack=999),
    "potion_mp": dict(type="CONSUMABLE", name="Bình MP Nhỏ", icon="potion_mp", value=16, heal_mp=80, stack=999),
    "potion_mp_m": dict(type="CONSUMABLE", name="Bình MP Vừa", icon="potion_mp_m", value=64, heal_mp=300, stack=999),
    "dong_luyen_1": dict(type="MATERIAL", name="Đồng Luyện Sơ", icon="dong_luyen_1", value=40, stack=9999),
    "dong_luyen_2": dict(type="MATERIAL", name="Đồng Luyện Trung", icon="dong_luyen_2", value=160, stack=9999),
    "s1_weapon": dict(type="WEAPON", slot="weapon", set="S1", name="Kiếm Dân Làng", icon="kiem_dan_lang", levelBand=[1, 9]),
    "s1_hat": dict(type="ARMOR", slot="hat", set="S1", name="Mũ Dân Làng", icon="mu_dan_lang", levelBand=[1, 9]),
    "s1_armor": dict(type="ARMOR", slot="armor", set="S1", name="Áo Dân Làng", icon="ao_dan_lang", levelBand=[1, 9]),
    "s1_boots": dict(type="ARMOR", slot="boots", set="S1", name="Giày Dân Làng", icon="giay_dan_lang", levelBand=[1, 9]),
    "kiem_go_tap": dict(type="WEAPON", slot="weapon", name="Kiếm Gỗ Tập", icon="kiem_go_tap", level=1, rarity="common"),
    "ao_suoi_mo": dict(type="ARMOR", slot="armor", name="Áo Suối Mơ", icon="ao_suoi_mo", level=9, rarity="good"),
    # Le Khai Thu (classes §6, quests Q_MAIN_12): bound tome + class weapon
    "huyen_thu_so_ban": dict(type="TOME", slot="tome", name="Huyền Thư Sơ Bản", icon="huyen_thu_so_ban", level=10, rarity="common", bound=True),
    "kiem_lua_tap_su": dict(type="WEAPON", slot="weapon", cls="FIRE", name="Kiếm Lửa Tập Sự", icon="weapon_fire", level=10, rarity="common"),
    "truong_thuy_tap_su": dict(type="WEAPON", slot="weapon", cls="WATER", name="Trượng Thủy Tập Sự", icon="weapon_water", level=10, rarity="common"),
}
# Origins and classes for step A2 (classes §2-4). Display text lives in i18n.
ORIGIN_DATA = {
    "VILLAGER": dict(name="Dân Làng", base=[220, 70, 22, 9], growth=[14, 4, 1.8, 0.9], passive="Không Lùi Bước",
                     passiveText="Khi HP dưới 30%: +15% ATK và DEF trong 8 giây (hồi 60 giây)",
                     blurb="Con nhà nông, thợ, lớn lên ở các làng. Bền, hợp đỡ đòn."),
    "NOBLE": dict(name="Thế Gia", base=[180, 120, 24, 7], growth=[11, 7, 2.0, 0.7], passive="Gia Truyền",
                  passiveText="Hồi MP +25%, sát thương kỹ năng +5%",
                  blurb="Dòng họ lâu đời giữ sách phép qua nhiều đời. Mạnh phép."),
    "ANCIENT": dict(name="Hậu Duệ Tộc Cổ Thư", base=[200, 100, 18, 8], growth=[13, 6, 1.5, 0.8], passive="Ấn Cổ Hộ Thân",
                    passiveText="Ngoài giao tranh hồi 1% HP mỗi 3 giây; bình và hồi máu nhận +15%",
                    blurb="Mang dòng máu tộc đã viết Nguyên Điển. Bền bỉ, tự hồi."),
}
CLASS_DATA = {
    "FIRE": dict(name="Hỏa Kiếm Sĩ", role="Cận chiến bùng nổ", weapon="Kiếm", mods="ATK +15%, DEF −5%", passive="Lửa Bén",
                 passiveText="+8% sát thương lên mục tiêu đang cháy", look="fire",
                 skills=[dict(id="SKL_FIRE_1", name="Hỏa Cầu", lv=10, mp=10, cd=3, mult=1.2, kind="bolt", range="Xa", text="120% ATK, Cháy 3 giây"),
                         dict(id="SKL_FIRE_2", name="Trảm Liệt Diễm", lv=20, mp=18, cd=5, mult=1.6, kind="slash", range="Cận", text="160% ATK, vòng cung"),
                         dict(id="SKL_FIRE_3", name="Hỏa Thương Xuyên Thiên", lv=30, mp=28, cd=8, mult=1.9, kind="lance", range="Ngắn", text="190% ATK, xuyên mọi mục tiêu")]),
    "WATER": dict(name="Thủy Pháp Sư", role="Đánh xa diện rộng", weapon="Trượng", mods="MP +20%", passive="Triều Dâng",
                  passiveText="Mỗi 5 đòn trúng: kỹ năng kế +15% và hồi 3% MP", look="water",
                  skills=[dict(id="SKL_WATER_1", name="Thủy Đạn", lv=10, mp=10, cd=3, mult=1.15, kind="bolt", range="Xa", text="115% ATK"),
                          dict(id="SKL_WATER_2", name="Sóng Triều", lv=20, mp=18, cd=5, mult=1.5, kind="wave", range="Ngắn", text="150% ATK, làm chậm 30% trong 3 giây"),
                          dict(id="SKL_WATER_3", name="Thủy Tiễn Xuyên Sóng", lv=30, mp=28, cd=8, mult=2.3, kind="beam", range="Xa", text="230% ATK, tia nước")]),
}
LOCKED_CLASSES = {"WIND": "Phong Kiếm Khách", "BOLT": "Lôi Chiến Binh", "EARTH": "Thổ Hộ Vệ", "PLANT": "Mộc Thuật Sư", "DARK": "Ám Pháp Sư"}
SETS = {"S1": dict(name="Dân Làng", bonus={"2": "+5% HP", "4": "+8% ATK, +8% DEF"})}
SHOPS = {"NPC003": dict(name="Tiệm thuốc của Lam Nhi", sells=["potion_hp", "potion_hp_m", "potion_mp", "potion_mp_m"])}


def build_item_content():
    """Item records + shop for step A1 (content-pipeline §3, items §12)."""
    d = mk("content", "items")
    for k, v in ITEM_DEFS.items():
        lines = [f"id: {k}", f"type: {v['type']}", f"nameKey: item.{k}.name", f"icon: items/{v['icon']}"]
        for f in ("slot", "set", "level", "rarity", "value", "heal_hp", "heal_mp", "stack"):
            if f in v:
                key = {"heal_hp": "healHp", "heal_mp": "healMp", "level": "levelReq"}.get(f, f)
                lines.append(f"{key}: {v[f]}")
        if "levelBand" in v:
            lines.append(f"levelBand: [{v['levelBand'][0]}, {v['levelBand'][1]}]   # rolled from the monster level")
        with open(os.path.join(d, f"{k}.yaml"), "w", encoding="utf-8") as f:
            f.write("# prototype item (step A1)\n" + "\n".join(lines) + "\n")
    with open(os.path.join(mk("content", "classes"), "origins.yaml"), "w", encoding="utf-8") as f:
        f.write("# Origins (classes section 2), prototype step A2. base/growth: HP, MP, ATK, DEF\n")
        for k, v in ORIGIN_DATA.items():
            f.write(f"{k}:\n  nameKey: origin.{k.lower()}.name\n  base: {v['base']}\n  growth: {v['growth']}\n"
                    f"  passiveKey: origin.{k.lower()}.passive\n")
    for k, v in CLASS_DATA.items():
        with open(os.path.join(mk("content", "classes"), f"{k.lower()}.yaml"), "w", encoding="utf-8") as f:
            f.write(f"# {k} class, skills 1-3 (classes section 3-4), prototype step A2\nid: {k}\nnameKey: class.{k.lower()}.name\nskills:\n")
            for sk in v["skills"]:
                f.write(f"  - {{ id: {sk['id']}, unlockLevel: {sk['lv']}, mp: {sk['mp']}, cooldownSec: {sk['cd']}, "
                        f"atkMult: {sk['mult']}, shape: {sk['kind']} }}\n")
    with open(os.path.join(mk("content", "shops"), "npc003.yaml"), "w", encoding="utf-8") as f:
        f.write("# Lam Nhi sells potions and buys items back at 25% (economy section 3), prototype step A1\n"
                "npc: NPC003\nnameKey: shop.npc003.name\ncurrency: SOFT\n"
                f"sells: [ {', '.join(SHOPS['NPC003']['sells'])} ]\nbuyBack: {{ ratio: 0.25, windowMin: 30 }}\n")


def _yaml_obj(o):
    return "{ " + ", ".join(f"{k}: {v}" for k, v in o.items()) + " }"


def build_quests():
    """Chapter 1 quest records + vi i18n (content-pipeline §3.5, quests §11)."""
    qd, i18n = mk("content", "quests", "main"), mk("content", "i18n")
    prev = None
    lines = ["# i18n vi (prototype): display text for quests and quest items", "quest:"]
    for qid, lv, giver, turn_in, objs, rew, ready in QUEST_DATA:
        n = qid.split("_")[-1]
        items = rew.get("items", [])
        rparts = [f"exp: {rew['exp']}"] if "exp" in rew else []
        if "soft" in rew:
            rparts.append(f"soft: {rew['soft']}")
        if items:
            rparts.append("items: [ " + ", ".join(f"{{ id: {i}, count: {c} }}" for i, c in items) + " ]")
        if "skill" in rew:
            rparts.append(f"skill: {rew['skill']}")
        note = "" if ready else "# not playable in the browser prototype yet\n"
        with open(os.path.join(qd, f"{qid.lower()}.yaml"), "w", encoding="utf-8") as f:
            f.write(f"""{note}id: {qid}
type: MAIN
nameKey: quest.main.{n}.title
descKey: quest.main.{n}.desc
chapter: 1
levelMin: {lv}
prerequisites: [{prev or ""}]
giver: {giver}
turnIn: {turn_in}
objectives:
""" + "".join(f"  - {_yaml_obj(o)}\n" for o in objs) + f"""rewards: {{ {", ".join(rparts)} }}
dialogue:
  accept: dlg.q_main_{n}.accept
  progress: dlg.q_main_{n}.progress
  complete: dlg.q_main_{n}.complete
""")
        prev = qid
        title, olabels, acc, prog, comp, extra = QUEST_TEXT[qid]
        lines += [f"  main.{n}:", f"    title: \"{title}\"", "    objectives:"]
        lines += [f"      - \"{t}\"" for t in olabels]
        lines += [f"    accept: \"{acc}\"", f"    progress: \"{prog}\"", f"    complete: \"{comp}\""]
        for npc, t in extra.items():
            lines.append(f"    talk.{npc.lower()}: \"{t}\"")
    lines.append("item:")
    for k, (name, _) in QUEST_ITEMS.items():
        lines.append(f"  {k}: \"{name}\"")
    for k, v in ITEM_DEFS.items():
        if k not in QUEST_ITEMS:
            lines.append(f"  {k}: \"{v['name']}\"")
    lines.append("origin:")
    for k, v in ORIGIN_DATA.items():
        lines += [f"  {k.lower()}.name: \"{v['name']}\"", f"  {k.lower()}.passive: \"{v['passive']}: {v['passiveText']}\""]
    lines.append("class:")
    for k, v in CLASS_DATA.items():
        lines.append(f"  {k.lower()}.name: \"{v['name']}\"")
        for sk in v["skills"]:
            lines.append(f"  skill.{sk['id'].lower()}: \"{sk['name']}\"")
    lines.append("shop:")
    for k, v in SHOPS.items():
        lines.append(f"  {k.lower()}: \"{v['name']}\"")
    with open(os.path.join(i18n, "vi.yaml"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    with open(os.path.join(mk("content", "quests"), "quest_items.yaml"), "w", encoding="utf-8") as f:
        f.write("# Quest item sources (quests section 4.1). Drops only while the quest still needs the item.\n")
        for k, (_, src) in QUEST_ITEMS.items():
            f.write(f"{k}: {_yaml_obj(src)}\n")


def quest_json():
    out = []
    for qid, lv, giver, turn_in, objs, rew, ready in QUEST_DATA:
        title, olabels, acc, prog, comp, extra = QUEST_TEXT[qid]
        out.append(dict(id=qid, lv=lv, giver=giver, turnIn=turn_in, ready=ready, title=title,
                        objectives=[dict(o, label=olabels[i], count=o.get("count", 1)) for i, o in enumerate(objs)],
                        rewards=dict(rew, items=[[i, c] for i, c in rew.get("items", [])]),
                        accept=acc, progress=prog, complete=comp, talk=extra))
    return out


def build_playable():
    """Assets + data.json for the browser prototype in prototype/playable (single source with content/)."""
    import json
    import shutil

    from PIL import Image

    from monsters import ALL_ANIMS, MONSTERS, monster_frames
    root = os.path.join(ROOT, "prototype", "playable", "assets")
    for sub in ("maps/tilesets", "maps/backgrounds", "sprites"):
        os.makedirs(os.path.join(root, sub), exist_ok=True)
    src_maps = os.path.join(OUT, "maps")
    for n in ("m001", "m002", "m003", "m004"):
        shutil.copy(os.path.join(src_maps, f"{n}.tmj"), os.path.join(root, "maps", f"{n}.tmj"))
        for k in ("far", "mid", "near"):
            shutil.copy(os.path.join(src_maps, "backgrounds", f"{n}_{k}.png"), os.path.join(root, "maps", "backgrounds"))
    for n in ("r01.png", "collision.png"):
        shutil.copy(os.path.join(src_maps, "tilesets", n), os.path.join(root, "maps", "tilesets"))
    sh = os.path.join(OUT, "sheets")
    shutil.copy(os.path.join(sh, "npc_idle.png"), os.path.join(root, "sprites", "npc_idle.png"))
    shutil.copy(os.path.join(sh, "hieu_ung_hoa.png"), os.path.join(root, "sprites", "vfx_hoa.png"))
    shutil.copy(os.path.join(sh, "vat_pham.png"), os.path.join(root, "sprites", "items.png"))
    shutil.copy(os.path.join(sh, "hieu_ung_thuy.png"), os.path.join(root, "sprites", "vfx_thuy.png"))
    build_player_sheets(os.path.join(root, "sprites", "player"))
    mob_rows = {}
    for mid in ("MOB001", "MOB002", "MOB003", "MOB004", "MOB005", "MOB006", "MOB007", "BOSS034", "BOSS035", "BOSS036"):
        fr = monster_frames(mid)
        rows = [a for a in ALL_ANIMS if a in fr]
        sheet([fr[a] for a in rows]).save(os.path.join(root, "sprites", f"{mid.lower()}.png"))
        mob_rows[mid] = {"size": MONSTERS[mid][1], "rows": {a: [i, len(fr[a])] for i, a in enumerate(rows)}}
    where = {}   # NPC and mob spawn positions per map, for quest auto-path (ui-ux §6.4 "Đi tới")
    for n in ("m001", "m002", "m003", "m004"):
        with open(os.path.join(root, "maps", f"{n}.tmj"), encoding="utf-8") as f:
            tm = json.load(f)
        for layer in tm["layers"]:
            for o in layer.get("objects", []):
                pr = {p["name"]: p["value"] for p in o.get("properties", [])}
                key = pr.get("id") if o.get("type") == "npc" else pr.get("mob") if o.get("type") == "mob_spawn" else None
                if key:
                    where.setdefault(key, []).append([n.upper(), round(o["x"])])
    data = {
        "names": VI_NAMES,
        "npcOrder": [k.split("_")[0] for k in NPCS],
        "mobs": {mid: dict(level=v[0], element=v[1], kind=v[2], ai=v[3], aggro=v[4], speed=v[5], skills=v[6],
                           flying=mid == "MOB006", fleeBelowHp=0.3 if mid == "MOB002" else 0,
                           ranged=mid in ("MOB004", "MOB005"), sprite=mob_rows[mid]) for mid, v in MOB_DATA.items()},
        "bosses": {bid: dict(level=v[0], element=v[1], kind=v[2], skills=v[3], sprite=mob_rows.get(bid),
                             flying=bid == "BOSS036") for bid, v in BOSS_DATA.items() if bid in mob_rows},
        "events": {eid: dict(boss=v[0], times=v[1], maps=v[2], zones=v[3]) for eid, v in EVENTS.items()},
        "weeklyEvents": [dict(id="EVT_R01_WELL_NIGHT", name="Đêm Giếng Sáng", boss="BOSS036", map="M004", day=5,
                              start="20:00", end="21:00", everyMin=20)],
        "items": [n for n, _ in all_icons()],
        "quests": quest_json(),
        "questItems": {k: dict(name=v[0], **v[1]) for k, v in QUEST_ITEMS.items()},
        "rewardItems": REWARD_ITEMS,
        "itemDefs": ITEM_DEFS,
        "sets": SETS,
        "shops": SHOPS,
        "origins": ORIGIN_DATA,
        "classes": CLASS_DATA,
        "lockedClasses": LOCKED_CLASSES,
        "where": where,
    }
    with open(os.path.join(root, "data.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


def build_player_sheets(out):
    """18 sheets: origin x gender x (novice, fire, water), same row layout as nhan_vat_*.png."""
    from player_looks import GENDERS, LOOKS, ORIGINS, look_spec, sheet_name
    os.makedirs(out, exist_ok=True)
    lineup = []
    for o in ORIGINS:
        for g in GENDERS:
            for lk in LOOKS:
                spec = look_spec(o, g, lk)
                ps = poses_for(spec)
                _, flat = layered_frames(spec, [p for name, _ in ANIMS for p in ps[name]])
                rows, i = [], 0
                for name, n in ANIMS:
                    rows.append(flat[i:i + n])
                    i += n
                sheet(rows).save(os.path.join(out, f"{sheet_name(o, g, lk)}.png"))
                lineup.append(flat[0][10:90, 14:82])
    from pix import to_image
    to_image(np.concatenate(lineup, axis=1), 2, (200, 220, 240)).save(os.path.join(mk("preview"), "nguoi_choi_ngoai_hinh.png"))


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
    region = build_region(S)
    problems = []
    for mid, B in region.items():   # content-pipeline V016: every portal, NPC and spawn must be reachable
        bad, unreached, total = MP.reach_report(B)
        problems += [f"{mid}: {x}" for x in bad]
        print(f"{mid}: reachable {total - unreached}/{total} standable tiles")
    if problems:
        raise SystemExit("unreachable map content:\n  " + "\n  ".join(problems))
    for mid, B in region.items():
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
    if len(sys.argv) > 2 and sys.argv[2] in ("quests", "content"):
        build_items()
        build_quests()
        build_item_content()
        build_playable()
        print("quests, items, icons and playable data built")
        sys.exit(0)
    if len(sys.argv) > 2 and sys.argv[2] == "playable":
        build_playable()
        print("playable assets built")
        sys.exit(0)
    if len(sys.argv) > 2 and sys.argv[2] == "monsters":
        build_monsters()
        build_content()
        build_maps()
        build_playable()
        print("monsters, content and maps built into", OUT)
        sys.exit(0)
    build_monsters()
    build_content()
    build_quests()
    build_item_content()
    build_maps()
    build_heroes()
    build_npcs()
    build_items()
    build_vfx()
    build_tomes()
    build_playable()   # last: copies the sheets built above
    print("built into", OUT)

"""Chapter 2 pacing simulation, step B5.1 (Q_MAIN_13..16).

Same formulas and player assumptions as tools/sim/chapter1.py, with the Chapter 2 records read from
packages/content (quests, monsters, field boss) and the map files in art/prototype/maps (sizes, NPC and
monster spots). The player starts where Chapter 1 ends: Lv10, Hoa Kiem Si, gear around Lv9-10.

Usage: python3 tools/sim/chapter2.py [--set-exp Q_MAIN_15=6000,Q_MAIN_16=5000] [--set-level Q_MAIN_15=12]
"""
from __future__ import annotations

import argparse
import glob
import json
import math
import os

import yaml

import chapter1 as C1

ROOT = C1.ROOT
CONTENT = os.path.join(ROOT, "packages", "content")
MAPS = os.path.join(ROOT, "art", "prototype", "maps")
SCENE_S = {"Q_MAIN_13": 60}
# the road from the village to the capital and the plains, in portal order
ORDER = ["M001", "M002", "M003", "M004", "M005", "M009"]
SIDE = {"M008": ("M005", 26 * 32 + 16)}   # Tong Duong Phap Ve hangs off the gate in the middle of Thuong Do
HOA_CAU = 1.2 / 3                          # Hoa Cau (120% ATK, 3 s cooldown, burn left out) on top of the basic hits


def load():
    quests = []
    for f in sorted(glob.glob(os.path.join(CONTENT, "quests", "main", "*.yaml"))):
        q = yaml.safe_load(open(f, encoding="utf-8"))
        if q["chapter"] == 2:
            quests.append(q)
    mobs = {}
    for f in glob.glob(os.path.join(CONTENT, "monsters", "*.yaml")):
        m = yaml.safe_load(open(f, encoding="utf-8"))
        mobs[m["id"]] = m
    qitems = yaml.safe_load(open(os.path.join(CONTENT, "quests", "quest_items.yaml"), encoding="utf-8"))
    maps, widths = {}, {}
    for mid in ORDER + ["M008"]:
        maps[mid] = yaml.safe_load(open(os.path.join(MAPS, f"{mid.lower()}.yaml"), encoding="utf-8"))
        with open(os.path.join(MAPS, f"{mid.lower()}.tmj"), encoding="utf-8") as f:
            t = json.load(f)
        widths[mid] = t["width"] * t["tilewidth"]
    return quests, mobs, qitems, maps, widths


class Hero(C1.Player):
    """Chapter 1 player at Lv10 with the class weapon, the tome and the Hoa Kiem Si modifiers (classes §4)."""

    def __init__(self):
        super().__init__({"origins": {"VILLAGER": {"base": [220, 70, 22, 9], "growth": [14, 4, 1.8, 0.9]}}})
        self.lv = 10
        self.gear = {"weapon": 10, "hat": 9, "armor": 9, "boots": 9}
        self.potions, self.potions_m = 5, 3

    def stats(self):
        hp, atk, de = super().stats()
        return hp, (atk + 1.5 * 10 + 5) * 1.15, de * 0.95   # + Huyen Thu So Ban, Fire ATK +15% DEF -5%

    def dps(self, m, Lm):
        _, atk, _ = self.stats()
        return super().dps(m, Lm) + C1.dmg(atk, self.lv, m["def_"], Lm, HOA_CAU * 3) / 3


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set-exp", default="", help="try other quest EXP, e.g. Q_MAIN_15=6000")
    ap.add_argument("--set-level", default="", help="try other level gates, e.g. Q_MAIN_15=12")
    a = ap.parse_args()
    quests, mobs, qitems, maps, widths = load()
    for kv in filter(None, a.set_exp.split(",")):
        k, v = kv.split("=")
        next(q for q in quests if q["id"] == k)["rewards"]["exp"] = int(v)
    for kv in filter(None, a.set_level.split(",")):
        k, v = kv.split("=")
        next(q for q in quests if q["id"] == k)["levelMin"] = int(v)
    p = Hero()
    pos = ["M001", 656]   # by Ba Mo, where Chapter 1 ends
    t = 0.0
    rows = []

    def along(mp):
        return ORDER.index(SIDE.get(mp, (mp,))[0])

    def walk(mp, x):
        nonlocal t
        t0 = t
        cm, cx = pos
        if cm in SIDE:                     # out of the hall first
            t += cx / C1.SPEED + C1.PORTAL_S
            cm, cx = SIDE[cm]
        target, tx = (SIDE[mp] if mp in SIDE else (mp, x))
        i, j = ORDER.index(cm), ORDER.index(target)
        if i == j:
            t += abs(tx - cx) / C1.SPEED
        else:
            step = 1 if j > i else -1
            t += (widths[cm] - cx if step > 0 else cx) / C1.SPEED + C1.PORTAL_S
            for k in range(i + step, j, step):
                t += widths[ORDER[k]] / C1.SPEED + C1.PORTAL_S
            t += (tx if step > 0 else widths[target] - tx) / C1.SPEED
        if mp in SIDE:
            t += C1.PORTAL_S + x / C1.SPEED
        pos[0], pos[1] = mp, x
        p.rest(t - t0)

    def npc_x(npc, mp):
        return next(n["x"] for n in maps[mp]["npcs"] if n["id"] == npc)

    def spot(mob, mp):
        return next(s["x"] for s in maps[mp]["spawns"] if s["mob"] == mob)

    def where_npc(npc):
        for mp in ["M008", "M005", "M001"]:
            if any(n["id"] == npc for n in maps[mp]["npcs"]):
                return mp
        raise KeyError(npc)

    for q in quests:
        t0, k0, lv0 = t, p.kills, p.lv
        grind = 0.0
        if p.lv < q["levelMin"]:           # grind boars on Dong Lua (the lowest zone not below the player)
            walk("M009", spot("MOB008", "M009"))
            g0 = t
            while p.lv < q["levelMin"]:
                t += p.kill(min(12, max(10, p.lv)), 100)
            grind = t - g0
        gm = where_npc(q["giver"])
        walk(gm, npc_x(q["giver"], gm)); t += C1.TALK_S
        for o in q["objectives"]:
            if o["type"] == "KILL":
                lo, hi = mobs[o["target"]]["level"]
                walk(o["map"], spot(o["target"], o["map"]))
                for _ in range(o["count"]):
                    t += p.kill(round((lo + hi) / 2), 100)
            elif o["type"] == "COLLECT":
                src = qitems[o["target"]]
                lo, hi = mobs[src["mob"]]["level"]
                walk(o["map"], spot(src["mob"], o["map"]))
                for _ in range(math.ceil(o["count"] / src["chance"])):
                    t += p.kill(round((lo + hi) / 2), 100)
            elif o["type"] == "TALK":
                walk(o["map"], npc_x(o["target"], o["map"])); t += C1.TALK_S
            elif o["type"] == "BOSS":
                b = next(s for s in maps[o["map"]]["bossSpawns"] if s["boss"] == o["target"])
                walk(o["map"], b["x"])
                bm = C1.mob(12)
                boss_hp = bm["hp"] * 10                    # mini-boss x10 HP (combat §2.1), alone in the field
                t += boss_hp / p.dps(dict(bm, def_=bm["def_"] * 1.2, hp=boss_hp), 12) * 1.4   # dodging telegraphs
                p.gain(bm["exp"] * 10, 100)
            elif o["type"] == "SCENE":
                t += SCENE_S.get(q["id"], 60)
        tm = where_npc(q["turnIn"])
        walk(tm, npc_x(q["turnIn"], tm)); t += C1.TALK_S
        r = q.get("rewards", {})
        p.gain(r.get("exp", 0), 100)
        p.quan += r.get("soft", 0)
        rows.append((q["id"], q["levelMin"], lv0, p.lv, (t - t0) / 60, grind / 60, p.kills - k0, t / 60))

    print("| Nhiệm vụ | Lv yêu cầu | Lv đầu → cuối | Phút | Trong đó cày | Quái | Mốc (phút) |")
    print("|---|---|---|---|---|---|---|")
    for qid, lvq, a0, a1, m, g, k, total in rows:
        print(f"| {qid} | {lvq} | {a0} → {a1} | {m:.1f} | {g:.1f} | {k} | {total:.0f} |")
    pct = p.exp / C1.exp_to_next(p.lv) * 100
    print(f"\n**Tổng:** {t / 60:.0f} phút, {p.kills} quái, Lv {p.lv} ({pct:.0f}%), Quan còn {p.quan:.0f} (đã mua bình {p.spent}).")


if __name__ == "__main__":
    main()

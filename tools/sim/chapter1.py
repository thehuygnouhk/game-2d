"""Chapter 1 pacing simulation (step A3).

Walks the main quest chain Q_MAIN_01..12 with the formulas of
docs/game-design/04-combat-and-progression.md and the prototype data
(prototype/playable/assets/data.json, map sizes from the .tmj files), and
prints a Markdown report: minutes, kills, level and grinding per quest.

Assumptions are deliberately simple and written at the top so they can be argued with.
Usage: python3 tools/sim/chapter1.py [--quest-exp-scale X] [--mob-exp-scale Y]
"""
from __future__ import annotations

import argparse
import json
import math
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSETS = os.path.join(ROOT, "prototype", "playable", "assets")

# ---- assumptions (an average player, not an expert) ----
SPEED = 180              # px/s walking (combat §3.2)
SEARCH_FIELD = 4.0       # s to reach the next monster in a field zone
SEARCH_DUNGEON = 2.0     # s in the dungeon (monsters packed)
PORTAL_S = 3.0           # s per map change (loading, up key)
TALK_S = 12.0            # s per NPC visit (reading, menus)
SCENE_S = {"Q_MAIN_11": 60, "Q_MAIN_12": 90}
ATTACK_RATE = 1.0        # basic hits per second (combat §4.1)
MOB_ATTACK_EVERY = 1.6   # s between monster hits (prototype AI)
POTION = (150, 20)       # Bình HP Nhỏ: heal, price (items §8)
POTION_M = (600, 80)     # Bình HP Vừa
GEAR_RATE = 0.083        # gear drops per normal kill (combat §6: 6% + 2% + 0.3% + 0.03%)


def load():
    with open(os.path.join(ASSETS, "data.json"), encoding="utf-8") as f:
        d = json.load(f)
    widths = {}
    for m in ("m001", "m002", "m003", "m004", "dg01"):
        with open(os.path.join(ASSETS, "maps", f"{m}.tmj"), encoding="utf-8") as f:
            t = json.load(f)
        widths[m.upper()] = t["width"] * t["tilewidth"]
    return d, widths


def exp_to_next(L):
    return 50 * L * L + 100 * L


def mob(L):
    return dict(hp=round(30 + 22 * L ** 1.5), atk=round(8 + 3.2 * L), def_=round(2.5 * L), exp=8 * L + 10, quan=4 * L)


def exp_mod(d):
    if d <= -5:
        return 1.5
    if d < 0:
        return 1 + 0.1 * abs(d)
    if d <= 5:
        return 1
    return max(0.1, 1 - 0.15 * (d - 5))


def hit(lv_a, lv_t):
    return min(1, max(0.3, 0.95 - 0.02 * max(0, lv_t - lv_a)))


def dmg(atk, lv_a, def_t, lv_t, mult=1.0):
    red = def_t / (def_t + 15 * lv_a + 100)
    return atk * mult * (1 - red) * 1.025 * hit(lv_a, lv_t)   # 5% crit x1.5 on average


class Player:
    def __init__(self, d):
        self.d, self.lv, self.exp, self.quan = d, 1, 0, 0
        self.gear = {"weapon": 0, "hat": 0, "armor": 0, "boots": 0}   # item level, 0 = empty
        self.found = 0.0
        self.potions, self.potions_m, self.spent = 3, 0, 0
        self.kills, self.capped = 0, 0
        self.hp = None                               # current HP, None = full

    def stats(self):
        L = self.lv
        pts = 10 + 5 * (L - 1)                      # suggested split 2 HP : 2 ATK : 1 DEF
        o = self.d["origins"]["VILLAGER"]
        hp = o["base"][0] + o["growth"][0] * (L - 1) + pts * 0.4 * 30
        atk = o["base"][2] + o["growth"][2] * (L - 1) + pts * 0.4 * 3
        de = o["base"][3] + o["growth"][3] * (L - 1) + pts * 0.2 * 2
        g = self.gear
        atk += 4 * g["weapon"] + 10 if g["weapon"] else 0
        de += (g["hat"] + 2 if g["hat"] else 0) + (1.6 * g["armor"] + 4 if g["armor"] else 0) + (0.8 * g["boots"] + 2 if g["boots"] else 0)
        hp += 18 * g["armor"] + 40 if g["armor"] else 0
        return hp, atk, de

    def dps(self, m, Lm):
        hp, atk, de = self.stats()
        per = dmg(atk, self.lv, m["def_"], Lm) * ATTACK_RATE
        if self.lv >= 5:                            # Tụ Mana Chấn every 3 s (MP is not the limit at these levels)
            per += dmg(atk, self.lv, m["def_"], Lm, 1.2) / 3
        return per

    def rest(self, seconds):                       # out of combat: 1% HP every 5 s (combat §3.2)
        if self.hp is not None:
            php = self.stats()[0]
            self.hp = min(php, self.hp + php * 0.01 * seconds / 5)

    def gain(self, n, cap):
        self.exp += n
        while self.exp >= exp_to_next(self.lv) and self.lv < cap:
            self.exp -= exp_to_next(self.lv)
            self.lv += 1
        if self.lv >= cap and self.exp >= exp_to_next(self.lv):
            self.capped += self.exp - (exp_to_next(self.lv) - 1)
            self.exp = exp_to_next(self.lv) - 1

    def kill(self, Lm, cap, dungeon=None):
        """Seconds to find and kill one monster, rewards included."""
        m = mob(Lm)
        hp_scale, atk_scale, reward = (dungeon["hp"], dungeon["atk"], dungeon["reward"]) if dungeon else (1, 1, 1)
        m = dict(m, hp=m["hp"] * hp_scale, atk=m["atk"] * atk_scale)
        fight = m["hp"] / self.dps(m, Lm)
        php, _, pde = self.stats()
        if self.hp is None:
            self.hp = php
        self.hp -= fight / MOB_ATTACK_EVERY * dmg(m["atk"], Lm, pde, self.lv)
        heal_s = 0
        while self.hp < 0.4 * php:                  # drink below 40% HP (combat §8), buy from Lam Nhi when out
            use = POTION_M if self.potions_m or self.lv >= 5 else POTION
            if use is POTION_M and not self.potions_m or use is POTION and not self.potions:
                self.quan -= use[1]; self.spent += use[1]
            elif use is POTION_M:
                self.potions_m -= 1
            else:
                self.potions -= 1
            self.hp = min(php, self.hp + use[0])
            heal_s += 0.5
        self.kills += 1
        self.gain(round(m["exp"] * exp_mod(self.lv - Lm) * reward), cap)
        self.quan += 0.9 * m["quan"] * reward
        self.found += GEAR_RATE
        while self.found >= 1:                      # one gear piece: slot by turns, equip if better
            self.found -= 1
            slot = min(self.gear, key=lambda s: self.gear[s])
            if Lm <= self.lv and Lm > self.gear[slot]:
                self.gear[slot] = Lm
            self.quan += (20 * Lm + 30) * 0.25 * 0.5   # half the finds are sold
        return (SEARCH_DUNGEON if dungeon else SEARCH_FIELD) + fight + heal_s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quest-exp-scale", type=float, default=1.0)
    ap.add_argument("--mob-exp-scale", type=float, default=1.0)
    ap.add_argument("--set-exp", default="", help="try other quest EXP, e.g. Q_MAIN_03=350,Q_MAIN_04=600")
    a = ap.parse_args()
    d, widths = load()
    for kv in filter(None, a.set_exp.split(",")):
        k, v = kv.split("=")
        next(q for q in d["quests"] if q["id"] == k)["rewards"]["exp"] = int(v)
    where = d["where"]
    p = Player(d)
    order = ["M001", "M002", "M003", "M004", "DG01"]
    pos = ["M001", 600]
    t = 0.0
    rows = []

    def walk(mp, x):
        nonlocal t
        t_start = t
        cm, cx = pos
        i, j = order.index(cm), order.index(mp)
        if i == j:
            t += abs(x - cx) / SPEED
        else:
            step = 1 if j > i else -1
            t += (widths[cm] - cx if step > 0 else cx) / SPEED + PORTAL_S
            for k in range(i + step, j, step):
                t += widths[order[k]] / SPEED + PORTAL_S
            t += (x if step > 0 else widths[mp] - x) / SPEED
        pos[0], pos[1] = mp, x
        p.rest(t - t_start)

    def zone(mob_id, mp):
        return [e for e in where.get(mob_id, []) if e[0] == mp][0][1]

    def best_zone():   # highest level monsters not above the player, field maps only
        best = None
        for mid, m in d["mobs"].items():
            lo, hi = m["level"]
            if lo <= p.lv + 1 and (best is None or hi > best[1]):
                best = (mid, hi)
        mid = best[0]
        e = where[mid][0]
        return mid, e[0], e[1], max(d["mobs"][mid]["level"][0], min(d["mobs"][mid]["level"][1], p.lv))

    for qi, q in enumerate(d["quests"]):
        t0, k0, lv0 = t, p.kills, p.lv
        cap = 100 if qi > 10 else 9
        grind = 0.0
        if p.lv < q["lv"]:                          # grind to the level gate
            mid, mp, x, Lm = best_zone()
            walk(mp, x)
            g0 = t
            while p.lv < q["lv"]:
                t += p.kill(Lm, cap)
            grind = t - g0
        giver = where[q["giver"]][0]
        walk(giver[0], giver[1]); t += TALK_S
        for o in q["objectives"]:
            if o["type"] in ("KILL",):
                Lm = sum(d["mobs"][o["target"]]["level"]) / 2
                walk(o["map"], zone(o["target"], o["map"]))
                need = o["count"]
                extra = [x for x in q["objectives"] if x["type"] == "COLLECT" and d["questItems"][x["target"]].get("mob") == o["target"]]
                for e in extra:
                    need = max(need, math.ceil(e["count"] / d["questItems"][e["target"]]["chance"]))
                for _ in range(need):
                    t += p.kill(round(Lm), cap)
            elif o["type"] == "COLLECT" and d["questItems"][o["target"]].get("node"):
                walk(o["map"], widths[o["map"]] / 2); t += o["count"] * 14   # herbs spread over the map
            elif o["type"] == "TALK" and o["target"] != q["giver"]:
                tw = [e for e in where[o["target"]] if e[0] == o["map"]][0]
                walk(tw[0], tw[1]); t += TALK_S
            elif o["type"] == "USE_SKILL":
                walk(o["map"], zone("MOB001", o["map"]))
                for _ in range(3):
                    t += p.kill(2, cap)
            elif o["type"] == "BOSS":
                dg = d["dungeons"]["DG01"]
                walk("M004", widths["M004"] - 300)
                walk("DG01", 100)
                for _ in range(11):
                    t += p.kill(10, cap, dg["solo"])
                walk("DG01", zone("BOSS001", "DG01"))
                bm = mob(9)
                boss_hp = bm["hp"] * dg["bossTier"]["hp"] * dg["solo"]["hp"]
                t += boss_hp / p.dps(dict(bm, hp=boss_hp), 9) * 1.4   # dodging the telegraphs
                p.gain(round(bm["exp"] * dg["bossTier"]["exp"] * dg["solo"]["reward"]), cap)
                p.quan += dg["chest"]["soft"] * dg["solo"]["reward"]
                p.gear["armor"] = max(p.gear["armor"], 9)
                walk("DG01", widths["DG01"] - 64); walk("M004", widths["M004"] - 300)
            elif o["type"] in ("SCENE", "REACH"):
                t += SCENE_S.get(q["id"], 60)
        turn = where[q["turnIn"]][0]
        walk(turn[0], turn[1]); t += TALK_S
        r = q["rewards"]
        if r.get("unlockLevel"):
            cap = 100
        p.gain(round(r.get("exp", 0) * a.quest_exp_scale), cap)
        p.quan += r.get("soft", 0)
        rows.append((q["id"], q["title"], q["lv"], lv0, p.lv, (t - t0) / 60, grind / 60, p.kills - k0, t / 60))

    print("| Nhiệm vụ | Tên | Lv yêu cầu | Lv đầu → cuối | Phút | Trong đó cày | Quái | Mốc (phút) |")
    print("|---|---|---|---|---|---|---|---|")
    for qid, title, lvq, a0, a1, m, g, k, total in rows:
        print(f"| {qid} | {title} | {lvq} | {a0} → {a1} | {m:.1f} | {g:.1f} | {k} | {total:.0f} |")
    print(f"\n**Tổng:** {t / 60:.0f} phút, {p.kills} quái, Lv {p.lv}, Quan còn {p.quan:.0f} (đã mua bình {p.spent}), "
          f"EXP bị chặn ở giới hạn Lv9: {p.capped}.")


if __name__ == "__main__":
    main()

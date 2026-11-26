"""Chapter 2 layouts, step B5.1: M005 Thuong Do, M008 Tong Duong Phap Ve (R02), M009 Dong Lua Luc Nguyen (R03).

Map list, levels, monsters and NPC placement follow docs/game-design/05-world-maps-monsters.md §2, §4
and 02-characters-and-npcs.md. Lam Nhi and Khoi leave the village with the player after Q_MAIN_13.
"""
from __future__ import annotations

from maps import MapBuilder, TS


def m005(S):
    """Thuong Do: the capital hub. Gate of the Phap Ve hall in the middle, the road to the plains on the right."""
    B = MapBuilder("M005", "Thuong Do", 80, 18, S, "TOWN", (10, 100), "R02", "capital",
                   "audio/bgm/r02_capital", zone_cap=60)
    h = [15] * 80
    for x in range(32, 50):
        h[x] = 13            # raised plaza with the fountain
    for x in (30, 31, 50, 51):
        h[x] = 14            # steps
    B.ground_profile(h, prefix="pave")
    B.finalize()
    B.on_ground("house_c", 2)
    B.on_ground("house_d", 9)
    B.on_ground("lamp", 15)
    B.on_ground("banner_pole", 23)   # the two poles flank the gate to Tong Duong Phap Ve (portal P02)
    B.on_ground("banner_pole", 29)
    B.on_ground("tree_big", 33)
    B.on_ground("well", 39)
    B.on_ground("lamp", 46)
    B.on_ground("house_c", 53)
    B.on_ground("crates", 60)
    B.on_ground("house_d", 62)
    B.on_ground("banner_pole", 69)
    B.on_ground("tree_small", 72)
    B.on_ground("sign", 77)
    B.scatter(["flowers_a", "flowers_b", "bush"], 0.12, seed=21, avoid=[(0, 8), (22, 30), (36, 44), (74, 79)])
    B.player_spawn = (B.px(4), B.feet(4))
    B.npc("NPC003", 19, show_after="Q_MAIN_13")   # Lam Nhi opens her potion stall in the capital
    B.npc("NPC011", 42)                           # Vien Chu Van Tuoc, on the plaza
    B.portal("P01", 1, "M004", 0, 0)
    B.portal("P02", 26, "M008", 0, 0)             # gate of Tong Duong Phap Ve
    B.portal("P03", 78, "M009", 0, 0)
    B.safe.append((0, 0, B.w * TS, B.h * TS))
    return B


def m008(S):
    """Tong Duong Phap Ve: the courtyard before the hall of the Phap Ve Doan; the season's examiner stands here."""
    B = MapBuilder("M008", "Tong Duong Phap Ve", 44, 16, S, "TOWN", (10, 100), "R02", "capital",
                   "audio/bgm/r02_phap_ve_hall", zone_cap=60)
    B.ground_profile([13] * 44, prefix="pave")
    B.finalize()
    B.on_ground("lamp", 6)
    B.on_ground("banner_pole", 13)
    B.on_ground("hall", 16)
    B.on_ground("banner_pole", 30)
    B.on_ground("lamp", 37)
    B.on_ground("tree_small", 39)
    B.scatter(["flowers_a", "bush_b"], 0.1, seed=22, avoid=[(0, 12), (14, 31)])
    B.player_spawn = (B.px(3), B.feet(3))
    B.npc("NPC046", 10)      # Giam Khao Tuyen Thu: registration and the rounds of the Mua Tuyen Thu
    B.npc("NPC005", 34)      # Chap But Hac Minh, dozing by the hall (talks in Q_MAIN_23, step B5.3)
    B.portal("P01", 1, "M005", 0, 0)
    B.safe.append((0, 0, B.w * TS, B.h * TS))
    return B


def m009(S):
    """Dong Lua Luc Nguyen: rice paddies and dikes. Level zones left -> right (maps §7):
    Lv10-12 Lon Rung Dong, then Lv11-14 Lun Cuop Dong; Lon Rung Chua (field boss) between them."""
    B = MapBuilder("M009", "Dong Lua Luc Nguyen", 110, 20, S, "FIELD", (10, 14), "R03", "paddy",
                   "audio/bgm/r03_rice_plains")
    B.town = "M005"
    h = [16] * 110
    for x in range(40, 52):
        h[x] = 14            # dike where the boar king roams
    for x in (39, 52):
        h[x] = 15
    for x in range(76, 92):
        h[x] = 14            # raised paddy terrace of the bandits
    for x in (75, 92):
        h[x] = 15
    B.ground_profile(h)
    for (a, b) in ((20, 25), (60, 66), (97, 101)):
        B.carve(a, 16, b, 16)   # flooded paddies, one tile deep
    B.block(66, 13, 71, 13, oneway=True)   # grass island over the bandit camp (3 tiles up: one jump)
    B.finalize()
    for (a, b) in ((20, 25), (60, 66), (97, 101)):
        for x in range(a, b + 1):
            B.tiles["fg"][16, x] = B._t("water_top")
    B.on_ground("tree_small", 2)
    B.on_ground("scarecrow", 12)
    B.on_ground("haystack", 30)
    B.on_ground("windmill", 54)
    B.on_ground("scarecrow", 74)
    B.on_ground("haystack", 94)
    B.on_ground("tree_big", 103)
    B.on_ground("sign", 107)
    for x in range(34, 38):
        B.stamp("fence_m", x, B.surface(x) - 1)
    B.scatter(["rice_a", "rice_b", "rice_a", "grass_tall_a"], 0.55, seed=23, avoid=[(0, 6), (52, 58), (104, 109)])
    B.scatter(["rice_a", "grass_tall_a"], 0.08, seed=24, layer="fg")
    B.player_spawn = (B.px(3), B.feet(3))
    B.npc("NPC004", 7, show_after="Q_MAIN_13")   # Khoi hunts here; the quest NPC near the way in (maps §8)
    B.spawn("MOB008", 15, 6, 6, 10, note="khu Lv10-11: Lon Rung Dong", level=(10, 11))
    B.spawn("MOB008", 31, 6, 6, 10, note="khu Lv11-12: Lon Rung Dong", level=(11, 12))
    B.spawn("MOB009", 62, 6, 5, 12, note="khu Lv11-13: Lun Cuop Dong", level=(11, 13))
    B.spawn("MOB009", 68, 3, 2, 12, y_tile=13, note="khu Lv12-13: Lun Cuop Dong tren dao co", level=(12, 13))
    B.spawn("MOB009", 85, 6, 6, 12, note="khu Lv12-14: Lun Cuop Dong tren bo ruong", level=(12, 14))
    B.boss_spawn("BOSS002", 46, "", respawn_min=3)
    B.portal("P01", 1, "M005", 0, 0)
    B.portal("P02", 108, "M010", 0, 0)   # M010 Doi Coi Xay Gio opens in step B5.2
    return B


def build_chapter2(S):
    return [m005(S), m008(S), m009(S)]

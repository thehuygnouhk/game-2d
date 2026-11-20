"""Region R01 (Chapter 1) layouts: M001-M004.

Map list, levels, monsters and NPC placement follow
docs/game-design/05-world-maps-monsters.md and 02-characters-and-npcs.md.
"""
from __future__ import annotations

from maps import MapBuilder, TS


def _vines(B, xs, row):
    for x in xs:
        B.tiles["decor"][row, x] = B._t("vine")


def m001(S):
    B = MapBuilder("M001", "Nha Hoc Suoi Mo", 64, 18, S, "TOWN", (1, 100), "R01", "village",
                   "audio/bgm/r01_village", zone_cap=60)
    h = [15] * 64
    for x in range(33, 44):
        h[x] = 13
    B.ground_profile(h)
    B.block(46, 11, 51, 11, oneway=True)
    B.finalize()
    B.on_ground("tree_big", 0)
    B.on_ground("school", 4)
    B.on_ground("lamp", 15)
    B.on_ground("well", 17)
    B.on_ground("house_a", 22)
    B.on_ground("bush", 28)
    B.on_ground("crates", 30)
    B.on_ground("house_b", 36)
    B.on_ground("bush_b", 47)
    B.on_ground("tree_small", 52)
    B.on_ground("haystack", 56)
    B.on_ground("sign", 61)
    _vines(B, (33, 43), 14)
    B.scatter(["flowers_a", "flowers_b", "grass_tall_a", "fern"], 0.35, seed=1)
    B.scatter(["grass_tall_a", "fern"], 0.08, seed=2, layer="fg", avoid=[(10, 24)])
    B.player_spawn = (B.px(21), B.feet(21))
    B.npc("NPC001", 13)     # Thay Bach Van, by the school
    B.npc("NPC002", 20)     # Ba Mo
    B.npc("NPC040", 27)     # Cu Truong, village board
    B.npc("NPC003", 31)     # Lam Nhi
    B.npc("NPC004", 41)     # Khoi, on the knoll
    B.portal("P01", 62, "M002", 0, 0)
    B.safe.append((0, 0, B.w * TS, B.h * TS))
    return B


def m002(S):
    B = MapBuilder("M002", "Dong Hoa Suoi Mo", 90, 20, S, "FIELD", (1, 4), "R01", "meadow",
                   "audio/bgm/r01_flower_meadow")
    h = [16] * 90
    for x in range(18, 28):
        h[x] = 14
    for x in (28, 29, 46, 47):
        h[x] = 14            # steps up to the cliffs
    for x in list(range(30, 36)) + list(range(40, 46)):
        h[x] = 12
    for x in range(36, 40):
        h[x] = 18            # pool basin under the waterfall
    B.ground_profile(h)
    for (a, b, top) in ((10, 15, 11), (59, 64, 13), (73, 77, 13)):
        B.block(a, top, b, top, oneway=True)
    B.finalize()
    B.platform(36, 39, 12)  # plank bridge over the waterfall
    B.ladder(36, 13, 17)    # rope ladder out of the pool
    for y in range(12, 16):  # waterfall between the two cliffs, pool in front of the legs
        for x in range(36, 40):
            if B.tiles["ground"][y, x] == 0:
                B.tiles["decor"][y, x] = B._t(f"waterfall_{(x + y) % 2}")
    for x in range(36, 40):
        B.tiles["fg"][16, x] = B._t("water_top")
        B.tiles["fg"][17, x] = B._t("water")
    B.on_ground("tree_small", 1)
    B.on_ground("bush", 6)
    B.on_ground("tree_big", 21)
    B.on_ground("haystack", 48)
    B.on_ground("windmill", 66)
    B.on_ground("bush_b", 71)
    for x in range(52, 57):
        B.stamp("fence_m", x, B.surface(x) - 1)
    B.on_ground("tree_big", 80)
    B.on_ground("sign", 87)
    _vines(B, (30, 45), 13)
    B.scatter(["flowers_a", "flowers_b", "flowers_a", "grass_tall_a", "fern"], 0.5, seed=3)
    B.scatter(["grass_tall_a", "fern"], 0.1, seed=4, layer="fg")
    B.player_spawn = (B.px(3), B.feet(3))
    B.npc("NPC003", 25)     # Lam Nhi (quest hub of the meadow)
    B.npc("NPC004", 70)     # Khoi (Q_MAIN_05 sparring)
    # level zones left -> right: Lv1-2 Nam Lun, then Lv2-4 Tho Dom
    B.spawn("MOB001", 10, 6, 5, 8, note="khu Lv1-2: Nam Lun")
    B.spawn("MOB001", 12, 2, 2, 8, y_tile=11, note="khu Lv1-2: Nam Lun tren dao co")
    B.spawn("MOB002", 52, 6, 6, 10, note="khu Lv2-4: Tho Dom")
    B.spawn("MOB002", 61, 2, 2, 10, y_tile=13, note="khu Lv2-4: Tho Dom tren dao co")
    B.spawn("MOB002", 76, 4, 5, 10, note="khu Lv2-4: Tho Dom")
    B.boss_spawn("BOSS034", 50, "EVT_BOSS_034")
    B.portal("P01", 1, "M001", 0, 0)
    B.portal("P02", 88, "M003", 0, 0)
    return B


def m003(S):
    B = MapBuilder("M003", "Rung Mo Non", 96, 24, S, "FIELD", (4, 7), "R01", "forest",
                   "audio/bgm/r01_young_forest")
    h = [20] * 96
    for x in range(28, 45):
        h[x] = 18
    for x in range(62, 77):
        h[x] = 18
    B.ground_profile(h)
    B.finalize()
    for (a, b, row, lad) in ((5, 12, 14, 9), (48, 56, 12, 52), (80, 88, 14, 84)):
        B.platform(a, b, row)
        B.ladder(lad, row + 1, B.surface(lad) - 1)
    for x in (2, 15, 45, 57, 89):
        B.on_ground("tree_big", x)
    B.on_ground("tree_small", 33)
    B.on_ground("tree_small", 68)
    for x in (24, 40, 78):
        B.on_ground("bush", x)
    _vines(B, (28, 44), 19)
    _vines(B, (62, 76), 19)
    B.scatter(["fern", "mushrooms", "grass_tall_a", "rock", "flowers_b"], 0.35, seed=5)
    B.scatter(["fern", "grass_tall_a"], 0.12, seed=6, layer="fg")
    B.player_spawn = (B.px(3), B.feet(3))
    # level zones left -> right: Lv4-5 Cho Rung Non, Lv5-7 Lun Nem Da, Lv6-7 Nhen Muc
    B.spawn("MOB003", 14, 6, 6, 10, note="khu Lv4-5: Cho Rung Non")
    B.spawn("MOB003", 24, 4, 4, 10, note="khu Lv4-5: Cho Rung Non")
    B.spawn("MOB004", 36, 5, 6, 12, note="khu Lv5-7: Lun Nem Da tren go")
    B.spawn("MOB004", 52, 3, 3, 12, y_tile=12, note="khu Lv5-7: Lun Nem Da tren san go")
    B.spawn("MOB005", 69, 5, 5, 12, note="khu Lv6-7: Nhen Muc")
    B.spawn("MOB005", 84, 4, 4, 12, y_tile=14, note="khu Lv6-7: Nhen Muc tren san go")
    B.boss_spawn("BOSS035", 58, "EVT_BOSS_035")
    B.portal("P01", 1, "M002", 0, 0)
    B.portal("P02", 94, "M004", 0, 0)
    return B


def m004(S):
    B = MapBuilder("M004", "Hang Gieng Can", 80, 24, S, "FIELD", (7, 9), "R01", "cave",
                   "audio/bgm/r01_well_cave")
    h = [20] * 80
    B.ground_profile(h, prefix="cave")
    B.block(0, 0, 79, 2, prefix="cave")
    B.block(18, 3, 30, 4, prefix="cave")
    B.block(50, 3, 57, 3, prefix="cave")
    B.carve(27, 20, 36, 21)                 # spike pit
    B.block(8, 15, 16, 16, prefix="cave")    # upper ledge
    B.block(28, 17, 30, 18, prefix="cave")   # stepping stones over the pit
    B.block(33, 17, 35, 18, prefix="cave")
    B.carve(44, 20, 49, 20)                 # shallow pool
    B.finalize()
    B.spikes(27, 36, 21)
    B.ladder(17, 15, 19)
    for x in range(44, 50):
        B.tiles["fg"][20, x] = B._t("water_top")
    for x in list(range(2, 18)) + list(range(31, 50)) + list(range(58, 79)):
        if x % 3 == 0:
            B.tiles["decor"][3, x] = B._t("stalactite")
    for x in (19, 23, 26):
        B.tiles["decor"][5, x] = B._t("stalactite")
    for x, n in ((5, "crystal_blue"), (11, "crystal_violet"), (22, "crystal_blue"), (40, "crystal_violet"),
                 (54, "crystal_blue"), (62, "crystal_violet"), (77, "crystal_blue")):
        y = B.surface(x)
        B.tiles["decor"][y - 1, x] = B._t(n)
    B.on_ground("boss_altar", 69)
    B.scatter(["mushrooms", "rock_cave" if "rock_cave" in S.index else "rock"], 0.2, seed=7,
              avoid=[(66, 75)])
    B.player_spawn = (B.px(3), B.feet(3))
    # level zones left -> right: Lv7-8 Doi Gieng (flying), Lv8-9 Rua Da Gieng
    B.spawn("MOB006", 12, 4, 6, 12, y_tile=11, note="khu Lv7-8: Doi Gieng (bay)")
    B.spawn("MOB006", 24, 4, 7, 12, y_tile=10, note="khu Lv7-8: Doi Gieng (bay)")
    B.spawn("MOB007", 41, 5, 5, 14, note="khu Lv8-9: Rua Da Gieng")
    B.spawn("MOB007", 55, 5, 5, 14, note="khu Lv8-9: Rua Da Gieng")
    B.boss_spawn("BOSS036", 64, "EVT_BOSS_036")
    B.portal("P01", 1, "M003", 0, 0)
    B.portal("P03", 71, "DG01", 0, 0)      # Trang Lac lives only in the DG01 instance
    B.portal("P02", 78, "M005", 96, 480)   # M005 Thuong Do is outside this prototype
    return B


def dg01(S):
    """DG01 Hang Gieng Can dungeon (maps §6): two monster rooms and the Trang Lac arena. Instance, no respawn."""
    B = MapBuilder("DG01", "Ham Nguc Hang Gieng Can", 72, 20, S, "DUNGEON", (9, 12), "R01", "cave",
                   "audio/bgm/r01_dungeon", pk="PEACE", zone_cap=5)
    h = [17] * 72
    for x in range(23, 41):
        h[x] = 15                       # raised rock shelf (room 2)
    B.ground_profile(h, prefix="cave")
    B.block(0, 0, 71, 2, prefix="cave")
    B.block(10, 3, 18, 3, prefix="cave")
    B.block(44, 3, 47, 5, prefix="cave")   # low ceiling before the arena
    B.carve(30, 15, 33, 16)                 # spike pit on the shelf
    B.block(31, 12, 32, 12, prefix="cave", oneway=True)
    B.finalize()
    B.spikes(30, 33, 16)
    for x in list(range(3, 10)) + list(range(19, 44)) + list(range(48, 71)):
        if x % 3 == 1:
            B.tiles["decor"][3, x] = B._t("stalactite")
    for x, n in ((5, "crystal_violet"), (20, "crystal_blue"), (37, "crystal_violet"), (50, "crystal_blue"),
                 (56, "crystal_violet"), (66, "crystal_violet"), (69, "crystal_blue")):
        B.tiles["decor"][B.surface(x) - 1, x] = B._t(n)
    B.scatter(["mushrooms", "rock"], 0.15, seed=11, avoid=[(52, 70)])
    B.player_spawn = (B.px(3), B.feet(3))
    B.spawn("MOB006", 14, 5, 5, 0, y_tile=13, note="phong 1: Doi Gieng (bay), Lv9-10", level=(9, 10))
    B.spawn("MOB007", 36, 4, 4, 0, note="phong 2: Rua Da Gieng tren bac da, Lv10-11", level=(10, 11))
    B.spawn("MOB006", 45, 2, 2, 0, y_tile=14, note="hanh lang: Doi Gieng, Lv10", level=(10, 10))
    B.boss_spawn("BOSS001", 62, "DG01")
    B.portal("P01", 1, "M004", 0, 0)
    B.portal("P02", 70, "M004", 0, 0)
    return B


def i001(S):
    """I001 Le duong Khai Thu: story instance for Q_MAIN_12 (maps §2.1), one screen, night."""
    B = MapBuilder("I001", "Le Duong Khai Thu", 32, 14, S, "INSTANCE", (10, 10), "R01", "village",
                   "audio/bgm/r01_ceremony", zone_cap=1)
    B.ground_profile([11] * 32)
    B.finalize()
    B.on_ground("tree_big", 0)
    B.on_ground("lamp", 8)
    B.on_ground("boss_altar", 14)
    B.on_ground("lamp", 23)
    B.on_ground("tree_small", 27)
    B.scatter(["flowers_a", "flowers_b", "grass_tall_a"], 0.3, seed=12, avoid=[(12, 20)])
    B.player_spawn = (B.px(4), B.feet(4))
    B.npc("NPC001", 19)
    B.portal("P01", 1, "M001", 0, 0)
    B.safe.append((0, 0, B.w * TS, B.h * TS))
    return B


def build_region(S):
    maps = {B.id: B for B in (m001(S), m002(S), m003(S), m004(S), dg01(S), i001(S))}
    # arrival points: two tiles inside the matching portal of the target map
    for B in maps.values():
        for p in B.portals:
            T_ = maps.get(p["to"])
            if not T_:
                continue
            back = [q for q in T_.portals if q["to"] == B.id]
            if not back:
                continue
            q = back[0]
            tx = q["x"] // TS + (2 if q["x"] < T_.w * TS / 2 else -2)
            p["toX"], p["toY"] = T_.px(tx), T_.feet(tx)
    m1 = maps["M001"]   # the ceremony ground is entered by talking to Thay Bach Van: come back next to him
    maps["I001"].portals[0].update(toX=m1.px(11), toY=m1.feet(11))
    return maps

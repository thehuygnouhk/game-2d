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
        h[x] = 11
    B.ground_profile(h)
    B.block(46, 8, 51, 9)
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
    _vines(B, (33, 34, 43), 12)
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
    for x in list(range(30, 36)) + list(range(40, 46)):
        h[x] = 10
    for x in range(36, 40):
        h[x] = 18           # pool basin under the waterfall
    B.ground_profile(h)
    for (a, b, top) in ((11, 16, 10), (59, 64, 10), (73, 77, 12)):
        B.block(a, top, b, top + 1)
    B.finalize()
    for y in range(10, 16):  # waterfall between the two cliffs, pool in front of the legs
        for x in range(36, 40):
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
    _vines(B, (30, 35, 40, 45), 11)
    B.scatter(["flowers_a", "flowers_b", "flowers_a", "grass_tall_a", "fern"], 0.5, seed=3)
    B.scatter(["grass_tall_a", "fern"], 0.1, seed=4, layer="fg")
    B.player_spawn = (B.px(3), B.feet(3))
    B.npc("NPC003", 25)     # Lam Nhi (quest hub of the meadow)
    B.npc("NPC004", 70)     # Khoi (Q_MAIN_05 sparring)
    B.spawn("MOB001", 10, 6, 5, 8, note="Nam Lun")
    B.spawn("MOB001", 13, 2, 2, 8, y_tile=10, note="Nam Lun on the island")
    B.spawn("MOB002", 52, 6, 6, 10, note="Tho Dom")
    B.spawn("MOB002", 61, 2, 2, 10, y_tile=10, note="Tho Dom on the island")
    B.portal("P01", 1, "M001", 0, 0)
    B.portal("P02", 88, "M003", 0, 0)
    return B


def m003(S):
    B = MapBuilder("M003", "Rung Mo Non", 96, 24, S, "FIELD", (4, 7), "R01", "forest",
                   "audio/bgm/r01_young_forest")
    h = [20] * 96
    for x in range(28, 45):
        h[x] = 16
    for x in range(62, 77):
        h[x] = 17
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
    _vines(B, (28, 29, 44), 17)
    _vines(B, (62, 76), 18)
    B.scatter(["fern", "mushrooms", "grass_tall_a", "rock", "flowers_b"], 0.35, seed=5)
    B.scatter(["fern", "grass_tall_a"], 0.12, seed=6, layer="fg")
    B.player_spawn = (B.px(3), B.feet(3))
    B.spawn("MOB003", 20, 6, 6, 10, note="Cho Rung Non")
    B.spawn("MOB004", 36, 5, 6, 12, note="Lun Nem Da, on the knoll")
    B.spawn("MOB005", 52, 4, 3, 12, y_tile=12, note="Nhen Muc, on the planks")
    B.spawn("MOB005", 70, 4, 5, 12, note="Nhen Muc")
    B.spawn("MOB003", 86, 4, 5, 10, note="Cho Rung Non")
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
    B.spawn("MOB006", 22, 5, 8, 12, y_tile=10, note="Doi Gieng, flying")
    B.spawn("MOB007", 41, 5, 5, 14, note="Rua Da Gieng")
    B.spawn("MOB006", 52, 3, 6, 12, y_tile=11, note="Doi Gieng, flying")
    B.spawn("BOSS001", 71, 1, 2, 900, note="Trang Lac (mini boss)")
    B.triggers.append((60 * TS, 6 * TS, 19 * TS, 14 * TS, "boss_BOSS001"))
    B.portal("P01", 1, "M003", 0, 0)
    B.portal("P02", 78, "M005", 96, 480)   # M005 Thuong Do is outside this prototype
    return B


def build_region(S):
    maps = {B.id: B for B in (m001(S), m002(S), m003(S), m004(S))}
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
    return maps

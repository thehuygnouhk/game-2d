"""NPC looks (docs/game-design/02-characters-and-npcs.md), built on hero.py."""
from __future__ import annotations

from actors import G, _arrow, _brush, _cane, _fan, _hammer
from hero import GOLD, LEATHER, SKIN
from pix import fill, hex_rgb, paint, ramp

BOOTS = ramp("#4a3426", light="#6a4c38", outline="#1a110b")


def outfit(kind, coat, sash=None, pants="#4a4a58", sleeve=None, collar=None):
    c = ramp(coat) if isinstance(coat, str) else coat
    return dict(outfit=kind, coat=c, sleeve=ramp(sleeve) if sleeve else c,
                sash=ramp(sash) if sash else None, pants=ramp(pants), boots=BOOTS, glove=None,
                collar=ramp(collar) if collar else ramp("#e9e2d0", light="#ffffff", outline="#3a3428"))


def _notebook(cv, hand, pose):
    x, y = hand
    m = G.rect(x - 2, y - 6, x + 3, y - 1)
    paint(cv, m, ramp("#6b4a2e", light="#8d6a48", outline="#2a1a0e"), shade=None)
    fill(cv, G.rect(x + 3, y - 5, x + 3, y - 2), hex_rgb("#f3ead2"))


NPCS = {
    "NPC001_thay_bach_van": dict(
        name="Thầy Bạch Vân", uniform=outfit("robe", "#8a8f9c", sash="#4b5568"),
        hair=ramp("#e9edf2", light="#ffffff", dark="#b9c0cc", outline="#5d6470"), hair_style="topknot",
        iris="#6b7a8f", tall=1, bag=ramp("#6d5a3f"), vials=["#7bd389", "#e05d5d"], prop=_notebook),
    "NPC002_ba_mo": dict(
        name="Bà Mơ", uniform=outfit("robe", "#6d5a7a", sash="#3d3346"),
        hair=ramp("#d8d8d8", light="#ffffff", outline="#6a6a6a"), hair_style="topknot", eyes="closed",
        tall=-1, prop=_notebook),
    "NPC003_lam_nhi": dict(
        name="Lam Nhi", uniform=outfit("tunic", "#e07a5f", sash="#3d405b", pants="#3d405b"),
        hair=ramp("#6b3f26", light="#94603d", outline="#2e170c"), hair_style="braid", iris="#3fa34d",
        tall=-3, bag=ramp("#c9a227"), vials=["#59c3c3", "#f49ac1", "#9bde7e"], ribbon=True),
    "NPC004_khoi": dict(
        name="Khôi", uniform=outfit("tunic", "#a39171", sash="#9e2a2b", pants="#4a3f35"),
        hair=ramp("#1e1b24", light="#3a3547", outline="#08070b"), hair_style="short", iris="#d4a017",
        tall=2),
    "NPC005_chap_but_hac_minh": dict(
        name="Chấp Bút Hạc Minh", uniform=outfit("robe", ramp("#f2efe8", light="#ffffff", dark="#c8c2b4"),
                                                 sash="#2b2d42"),
        cape=ramp("#2b2d42", light="#4a4e72", outline="#0d0e17"),
        hair=ramp("#e4e4e4", light="#ffffff", outline="#6a6a6a"), hair_style="topknot", eyes="closed",
        beard=ramp("#ececec", light="#ffffff", dark="#bdbdbd", outline="#6a6a6a"), beard_len=12, tall=1,
        prop=_brush),
    "NPC040_cu_truong": dict(
        name="Cụ Trương", uniform=outfit("robe", "#7d6248", sash="#5a3a22"),
        hair=ramp("#cfcfcf", outline="#6a6a6a"), hair_style="topknot", eyes="closed", hat="conical",
        beard=ramp("#dedede", light="#ffffff", outline="#6a6a6a"), beard_len=6, prop=_cane),
    "NPC042_tho_ren_tu": dict(
        name="Thợ Rèn Tư", uniform=outfit("tunic", "#b5654a", sash="#3a2a20", pants="#3b3a40"),
        apron=ramp("#5e4636", light="#7d604c"), hair=ramp("#2a201c", light="#4a3a32"), hair_style="short",
        iris="#8a5a2b", headband="#c0392b", tall=1, prop=_hammer),
    "NPC024_co_kim_thoa": dict(
        name="Cô Kim Thoa", uniform=outfit("robe", ramp("#d9480f", light="#f76707"), sash="#f0b429",
                                           sleeve="#f0b429"),
        hair=ramp("#2b1b17", light="#4a3029", outline="#0e0807"), hair_style="long", iris="#8a4b2b",
        ribbon=True, prop=_fan),
    "NPC053_cu_tien": dict(
        name="Cụ Tiễn", uniform=outfit("tunic", "#56524a", sash="#c1121f", pants="#3a3631"),
        hair=ramp("#bfbfbf", outline="#5a5a5a"), hair_style="topknot", eyes="closed",
        beard=ramp("#d6d6d6", light="#ffffff", outline="#5a5a5a"), beard_len=8, quiver=True, prop=_arrow),
}

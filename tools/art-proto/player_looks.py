"""Player character looks for step A2 (docs/game-design/03-origins-classes-skills.md §2, §6).

Origin x gender sets the hair and the novice clothes. After the Le Khai Thu ceremony
the character keeps the same face and hair and wears the Phap Ve uniform of the class.
"""
from __future__ import annotations

from actors import CLASSES
from hero import hero_spec
from pix import ramp

ORIGINS = ("VILLAGER", "NOBLE", "ANCIENT")
GENDERS = ("MALE", "FEMALE")
LOOKS = ("novice", "fire", "water")

HAIR = {   # (style, colour or ramp, iris, ribbon)
    ("VILLAGER", "MALE"): ("short", "#6b4a2a", "#7a5a3a", False),
    ("VILLAGER", "FEMALE"): ("braid", "#7a4a24", "#5a8f3a", False),
    ("NOBLE", "MALE"): ("topknot", "#22202e", "#3a86ff", False),
    ("NOBLE", "FEMALE"): ("long", "#22202e", "#9d7fd6", True),
    ("ANCIENT", "MALE"): ("spiky", ramp("#d9d4c8", light="#ffffff", dark="#a8a294", outline="#4a463e"), "#2a9d8f", False),
    ("ANCIENT", "FEMALE"): ("long", ramp("#d9d4c8", light="#ffffff", dark="#a8a294", outline="#4a463e"), "#2a9d8f", True),
}
# novice clothes: farm tunic, neat robe with gold collar, grey-teal tunic with glyph sash
NOVICE = {
    "VILLAGER": dict(coat=ramp("#7a8f3a", light="#a8bf5a", dark="#556428", outline="#1f2610"), sash=ramp("#8a5a32")),
    "NOBLE": dict(coat=ramp("#2d4f9e", light="#5079c9", dark="#1d3570", outline="#0c1533"), sash=ramp("#e0a83a"),
                  collar=ramp("#e8b04a", light="#ffe7a3", outline="#5a3412")),
    "ANCIENT": dict(coat=ramp("#5f7f86", light="#8fb0b6", dark="#3f5a60", outline="#16252a"), sash=ramp("#2a9d8f")),
}
NOVICE_CLS = dict(main="#c9a26b", sub="#fff3d0", weapon="sword", trigram=None)


def look_spec(origin, gender, look):
    style, hair, iris, ribbon = HAIR[(origin, gender)]
    hair_hex, hair_ramp = (None, hair) if not isinstance(hair, str) else (hair, None)
    if look == "novice":
        spec = hero_spec("fire", style, hair_hex, iris, ribbon=ribbon, hair_ramp=hair_ramp)
        n = NOVICE[origin]
        spec["uniform"] = dict(outfit="tunic", coat=n["coat"], sash=n["sash"],
                               pants=ramp("#5a4632", light="#7a6248", outline="#1e160e"),
                               boots=ramp("#4e2c12", light="#7a4a24", dark="#2e170c", outline="#140a04"),
                               glove=ramp("#c9a26b", outline="#3d2a12"), **({"collar": n["collar"]} if "collar" in n else {}))
        spec["cls"] = NOVICE_CLS
        spec["weapon"] = "sword"
        spec["tome"] = None
        return spec
    return hero_spec(look, style, hair_hex, iris, ribbon=ribbon, hair_ramp=hair_ramp)


def sheet_name(origin, gender, look):
    return f"{origin.lower()}_{gender.lower()}_{look}"


assert set(CLASSES) >= {"fire", "water"}

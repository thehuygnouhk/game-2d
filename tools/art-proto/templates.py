"""Hand-placed pixel templates (heads, faces, hair, tomes).

Each template is a list of strings; one character per pixel, '.' is empty.
Letters are mapped to colours at stamp time, so one template serves many
palettes (palette swap).
"""
from __future__ import annotations

import numpy as np


def norm(rows):
    w = max(len(r) for r in rows)
    return [r.ljust(w, ".") for r in rows]


def stamp(cv, rows, x, y, cmap, flip=False):
    x, y = int(round(x)), int(round(y))
    rows = norm(rows)
    h, w = cv.shape[:2]
    for j, row in enumerate(rows):
        if flip:
            row = row[::-1]
        for i, ch in enumerate(row):
            if ch == "." or ch not in cmap:
                continue
            xx, yy = x + i, y + j
            if 0 <= xx < w and 0 <= yy < h:
                cv[yy, xx, 0:3] = cmap[ch]
                cv[yy, xx, 3] = 255


def mask_of(rows, x, y, shape):
    m = np.zeros(shape, bool)
    for j, row in enumerate(norm(rows)):
        for i, ch in enumerate(row):
            if ch != ".":
                xx, yy = int(x) + i, int(y) + j
                if 0 <= xx < shape[1] and 0 <= yy < shape[0]:
                    m[yy, xx] = True
    return m


# ---------------------------------------------------------------- head
# 20 x 18, facing right (3/4). K outline, s skin, S shadow, l light.
HEAD = [
    ".....KKKKKKKKK......",
    "...KKsssssssssKK....",
    "..KsssssssssssssK...",
    ".KsssssssssssssssK..",
    ".KssssssssssssssssK.",
    "KsssssssssssssssssK.",
    "KsssssssssssssssssK.",
    "KssssssssssssssssssK",
    "KssssssssssssssssssK",
    "KSssssssssssssssslsK",
    "KSssssssssssssssslsK",
    "KSSssssssssssssssssK",
    ".KSSsssssssssssssssK",
    ".KSSSssssssssssssSK.",
    "..KSSSsssssssssssK..",
    "...KKSSssssssssssK..",
    ".....KKSSsssssssK...",
    ".......KKKSssssK....",
    "..........KKKKK.....",
]

# eyes: E lash, w white highlight, i iris, e iris dark, I iris light
EYE_NEAR = [
    "EEEE",
    "Ewie",
    "Eiie",
    ".II.",
]
EYE_FAR = [
    "EEE",
    "wie",
    "iie",
    "II.",
]
EYE_CLOSED = [  # old / calm characters
    "....",
    "EEE.",
    "...E",
]
FACE = dict(eye_near=(7, 9), eye_far=(14, 9), brow_near=[(7, 7), (8, 7), (9, 7), (10, 8)],
            brow_far=[(14, 7), (15, 7), (16, 8)], mouth=[(13, 15), (14, 15)], nose=[(17, 11)],
            blush=[(6, 13), (7, 13)])

# ---------------------------------------------------------------- hair
# Hair templates are placed so that HEAD's (0, 0) sits at (4, 5) in hair
# space. k outline, h base, H shadow, j light, J shine.
# "back" layers are drawn before the head, "front" layers after it.

HAIR_SPIKY_FRONT = [
    "...............k",
    "........k.....kjk.....k",
    ".......kjk...kjhk....kjk",
    "......kjhk..kjhHk...kjhk",
    "..k..kjhHk.kjhhHk..kjhHk",
    ".kjk.kjhhHkjhhhHkkkjhhHkk",
    ".kjhkjhhhhHhhhhhHjjhhhhhhk",
    "kjhhhhhhJJhhhhhhhJJhhhhhhhk",
    ".khhhhhJJhhhhhhhJJhhhhhhhhhk",
    "..kHhhhhhhhhHhhhhhhhhHhhhhhk",
    ".kHHhhhhhhhHhhhhhhhhHhhhhhhk",
    "kHHhhhhhhhHhhhhhhhhHhhhhhhhk",
    ".kHHhhhhhHhhhhhhhhHhhhhhhhk",
    "..kHhhhhhhhkhhhhhhkhhhhhhk",
    ".kHHhhhhhhk...khhhk..khhk",
    "kHHhhhhhhk.....khk...kk",
    ".kHHhhhhk.......k",
    "..kHHhhk",
    "...kHHhk",
    "....kkk",
]

HAIR_LONG_FRONT = [
    "..........kkkkkk",
    ".......kkkjjjhhhkk",
    ".....kkjjJJjhhhhhhkk",
    "....kjjJJjhhhhhhhhhhk",
    "...kjjjhhhhhhhhhhhhhhk",
    "..khjhhhhhhhhhhhhhhhhhk",
    ".khhhhhhhhhhhhhhhhhhhhhk",
    ".kHhhhhhhhhhhhhhhhhhhhhhk",
    "kHHhhhhhhhhhhhhhhhjjhhhhhk",
    "kHHhhhhhhhhHhhhhhJJhhhhhhk",
    "kHHhhhhhhhHhhhhhhhhhHhhhhhk",
    "kHHhhhhhhHhhhhhhhhhHhhhhhhk",
    "kHHhhhhhHhhhhhhhhhHhhhhhhhk",
    "kHHhhhhhhhhkhhhhhhkhhhhhhk",
    "kHHhhhhhhhk...khhhk..khhhk",
    "kHHhhhhhhk.....khk...khhk",
    "kHHHhhhhk.......k....khk",
    "kHHHhhhhk............khk",
    "kHHHHhhhk............kk",
    ".kHHHhhhk",
    ".kHHHhhk",
    "..kHHhhk",
    "..kHHhk",
    "...kkk",
]
HAIR_LONG_BACK = [
    "", "", "", "", "", "", "", "", "", "", "", "", "",
    ".kk",
    "kHHk",
    "kHHHk",
    "kHHhHk",
    "kHHhhk",
    "kHHhhk",
    "kHHhhhk",
    "kHHhhhk",
    ".kHHhhk",
    ".kHHhhk",
    ".kHHhhhk",
    "..kHHhhk",
    "..kHHhk",
    "...kHhk",
    "...kHk",
    "....k",
]
RIBBON = [
    ".OO.OO.",
    "OrROrRO",
    "OrrrrrO",
    ".OrOrO.",
    "..OrOrO",
    "..O..O.",
]

# ---------------------------------------------------------------- tome
# Closed Huyen Thu seen from the front, slightly turned (spine on the left).
# O outline, c cover, C cover shadow, L cover light, G gold, g gold light,
# p paper edge, r emblem colour, x emblem dark.
TOME_CLOSED = [
    "..OOOOOOOOOOOO.",
    ".OCLLLLLLLLLLgO",
    "OCCcgGcccccGgcO",
    "OCCcGccccccccGO",
    "OCCccccxxxccccO",
    "OCCcccxrrrxcccO",
    "OCCccxrgrgrxccO",
    "OCCccxrrgrrxcpO",
    "OCCccxrgrgrxcpO",
    "OCCcccxrrrxcccO",
    "OCCccccxxxccccO",
    "OCCcGccccccccGO",
    "OCCcgGcccccGgcO",
    ".OCCCCCCCCCCCCO",
    "..OOOOOOOOOOOO.",
]
# Open tome: two pages on a cover, seen from the front.
TOME_OPEN = [
    "..OO.............OO..",
    ".OppOOO.......OOOppO.",
    ".OpppppOOO.OOOpppppO.",
    "OpPpppppppOpppppppPpO",
    "OpPppqqqppOppqqqppPpO",
    "OpPpppppppOpppppppPpO",
    "OpPppqqqqpOpqqqqppPpO",
    "OpPpppppppOpppppppPpO",
    "OpPppqqqppOppqqqppPpO",
    "OPppppppppOpppppppppO",
    "OcOOOOpppOOOpppOOOOcO",
    ".OccccOOOcccOOOccccO.",
    "..OOOOcccOOOcccOOOO..",
    "......OOO...OOO......",
]
# page turning (flip frames), drawn over TOME_OPEN at the spine
PAGE_FLIP = [
    [
        "....OOO..",
        "...OpppO.",
        "..OpppppO",
        "..Oppppp.",
        ".OpppppO.",
        ".OppppO..",
        "OppppO...",
        "OOOOO....",
    ],
    [
        "....O....",
        "...OpO...",
        "...OpO...",
        "..OppO...",
        "..OppO...",
        "..OppO...",
        "..OpO....",
        "..OO.....",
    ],
]

# ---------------------------------------------------------------- more hair

HAIR_SHORT_FRONT = [  # neat short hair with a side part
    "..........kkkkkkk",
    "........kkhhhjjjhkk",
    "......kkhhhhjJJjhhhkk",
    ".....khhhhhhhjjhhhhhhk",
    "....khhhhhhhhhhhhhhhhhk",
    "...kHhhhhhhhhhhhhhhhhhhk",
    "..kHHhhhhhhhhhhhhhhhhhhhk",
    ".kHHhhhhhhhhhhhhhhhhhhhhhk",
    ".kHHhhhhhhhhhhhhhhhhhhhhhk",
    "kHHhhhhhhhhhHhhhhhhhhhhhhk",
    "kHHhhhhhhhhHhhhhhhhhHhhhhhk",
    "kHHhhhhhhhHhhhhhhhhHhhhhhhk",
    ".kHhhhhhhHhhhhhhhhHhhhhhhk",
    ".kHHhhhhhhhhhhhhhhhhhhhhk",
    "..kHhhhhhhk...khhk..khk",
    "..kHHhhhhk.....kk....k",
    "...kHhhhk",
    "...kHHhk",
    "....kkk",
]

HAIR_TOPKNOT_FRONT = [  # hair pulled back into a bun, receding front
    "......kkkk",
    ".....kjJjhk",
    ".....khjhhk",
    "......khhk.kkkkkkk",
    ".......kkkkhhjjjhhkk",
    ".....kkhhhhhjJJjhhhhkk",
    "....khhhhhhhhhhhhhhhhhk",
    "...kHhhhhhhhhhhhhhhhhhhk",
    "..kHHhhhhhhhhhhhhhhhhhhhk",
    "..kHHhhhhhhhhhhhhhhhhhhhk",
    ".kHHhhhhhhhhhhhhhhhhhhkk",
    ".kHHhhhhhhhhhkkkkkkkkk",
    ".kHHhhhhhhhk",
    "..kHHhhhhk",
    "..kHHhhhk",
    "...kHhhk",
    "...kkkk",
]

HAIR_BRAID_BACK = [
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    "..kk",
    ".khHk",
    ".kHhk",
    "..khHk",
    "..kHhk",
    "...khHk",
    "...kHhk",
    "....krk",
    ".....k",
]

# ---------------------------------------------------------------- boots
# anchor = ankle at (3, 4). O outline, b base, d dark, l light, g cuff.
BOOT = [
    ".OOOOO....",
    ".OgggO....",
    ".ObbdO....",
    ".ObbdO....",
    ".ObbbdO...",
    "OlbbbbdOO.",
    "ObbbbbbddO",
    "OddddddddO",
    ".OOOOOOOO.",
]
BOOT_LIFT = [  # toe pointing down when the foot is lifted
    ".OOOOO..",
    ".OgggO..",
    ".ObbdO..",
    ".ObbbdO.",
    "OlbbbbdO",
    "ObbbbbdO",
    ".ObbbddO",
    "..OdddO.",
    "...OOO..",
]

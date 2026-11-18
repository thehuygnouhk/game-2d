"""Style sample: hero idle/walk, tome editions, fire skill demo."""
import sys
import numpy as np
sys.path.insert(0, '.')
from hero import *
from pix import canvas, over, save_gif, sheet, to_image
import vfx

OUT = sys.argv[1]
fire = hero_spec('fire', 'spiky', '#b8322a', '#e8a33a')
water = hero_spec('water', 'long', '#e9dcc0', '#2a9d8f', tome='revised', ribbon=True)
water['hair'] = ramp('#e9dcc0', dark='#c9a47a', light='#fff6e0', outline='#7a5a3a')
seal = hero_spec('seal', 'spiky', '#2a2630', '#c1121f', tome='final')

def demo_fire():
    W2 = 240
    frames, ms = [], []
    poses = hero_cast(fire['cls'])
    idl = idle('sword')
    proj_x, hit_frame, boom = None, None, None
    seq = list(range(6)) + [None] * 14
    for t, ci in enumerate(seq):
        cv = canvas(W2, 96)
        hit = boom is not None and boom < 3
        vfx.dummy(cv, 205, 88, hit=1 if hit else 0)
        pose = poses[ci] if ci is not None else idl[t % 4]
        over(cv, draw_hero(fire, pose), 0, 0)
        if ci == 4:
            proj_x = 66
        if proj_x is not None and boom is None:
            vfx.fireball(cv, proj_x, 69, t)
            proj_x += 17
            if proj_x >= 200:
                boom = 0
                proj_x = None
        elif boom is not None and boom < 6:
            vfx.explosion(cv, 204, 68, boom)
            boom += 1
        frames.append(cv)
        ms.append(80)
    return frames, ms

if __name__ == '__main__':
    fr, ms = demo_fire()
    save_gif(fr, OUT + '/sample_fire_skill.gif', ms, scale=3)
    to_image(np.array(sheet([fr[:10], fr[10:20]])), 2, (32, 38, 58)).save(OUT + '/t_demo_frames.png')
    for name, spec, k in (('fire', fire, 'sword'), ('water', water, 'staff'), ('seal', seal, 'bow')):
        save_gif([draw_hero(spec, p) for p in walk(k)], OUT + f'/sample_{name}_walk.gif', 100, scale=4)
        save_gif([draw_hero(spec, p) for p in idle(k)], OUT + f'/sample_{name}_idle.gif', 166, scale=4)
    # tome closeup: three editions closed + open with flip
    tc = []
    for i in range(4):
        cv = canvas(110, 40)
        for j, ed in enumerate(('draft', 'revised', 'final')):
            draw_tome_closed(cv, 14 + j * 22, 20 + (0, -1, -2, -1)[(i + j) % 4], ed, '#e4572e')
        draw_tome_open(cv, 90, 24, 'draft', '#e4572e', flip=(None, 0, 1, None)[i], glow=hex_rgb('#ffb703'))
        tc.append(cv)
    save_gif(tc, OUT + '/sample_tomes.gif', 140, scale=6)

#!/usr/bin/env python3
"""Generate Faces & Heels procedural wrestler sprite atlases — v1.1.

No external art assets are used. Every wrestler pixel is drawn by Pillow from
polygons, ellipses, lines, faceted shading, and supersampling.

v1.1 extends the polished arcade-action-figure renderer with wrestler identity detailing, per-frame contact anchors, and two additional core moves:
- forearm smash
- running clothesline
- body slam
- vertical suplex
- dragon screw
- ground headlock
- pin and kickout

The browser runtime supplies root-motion choreography, hit stop, camera shake,
mat bounce, and particles. The sprite atlases supply the articulated body poses.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple
import json
import math

from PIL import Image, ImageDraw, ImageFilter

FRAME_W = 320
FRAME_H = 400
SS = 2
W = FRAME_W * SS
H = FRAME_H * SS
OUT = Path(__file__).resolve().parents[1] / "assets" / "sprites" / "generated"


def C(hex_value: str) -> Tuple[int, int, int, int]:
    h = hex_value.lstrip("#")
    if len(h) == 6:
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
    raise ValueError(hex_value)


def shade(c, factor):
    return tuple(max(0, min(255, int(v * factor))) for v in c[:3]) + (c[3],)


@dataclass(frozen=True)
class Style:
    name: str
    skin: Tuple[int, int, int, int]
    skin_light: Tuple[int, int, int, int]
    primary: Tuple[int, int, int, int]
    secondary: Tuple[int, int, int, int]
    hair: Tuple[int, int, int, int]
    hair_dark: Tuple[int, int, int, int]
    boot: Tuple[int, int, int, int]
    beard: str
    hair_style: str


STONE = Style(
    "stone", C("#DE8B4C"), C("#F2A55E"), C("#D0182D"), C("#FFC11B"),
    C("#F7C33E"), C("#C69021"), C("#FFC11B"), "handlebar", "long"
)
VIPER = Style(
    "viper", C("#C87955"), C("#E29468"), C("#161A22"), C("#D1263D"),
    C("#18151A"), C("#09090B"), C("#171B22"), "boxed", "mohawk"
)


def S(v):
    if isinstance(v, tuple):
        return tuple(int(x * SS) for x in v)
    return int(v * SS)


def poly(draw: ImageDraw.ImageDraw, pts, fill):
    draw.polygon([S(p) for p in pts], fill=fill)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(S(box), radius=S(radius), fill=fill, outline=outline, width=S(width))


def ellipse(draw, box, fill, outline=None, width=1):
    draw.ellipse(S(box), fill=fill, outline=outline, width=S(width))


def line(draw, pts, fill, width):
    draw.line([S(p) for p in pts], fill=fill, width=S(width), joint="curve")


def lerp(a, b, t):
    if isinstance(a, (tuple, list)):
        return tuple(lerp(x, y, t) for x, y in zip(a, b))
    return a + (b - a) * t


def pose_mix(a: Dict, b: Dict, t: float) -> Dict:
    keys = set(a) | set(b)
    out = {}
    for k in keys:
        av, bv = a.get(k, b.get(k)), b.get(k, a.get(k))
        if isinstance(av, (tuple, list)) and isinstance(bv, (tuple, list)):
            out[k] = tuple(lerp(x, y, t) for x, y in zip(av, bv))
        elif isinstance(av, (int, float)) and isinstance(bv, (int, float)):
            out[k] = lerp(av, bv, t)
        else:
            out[k] = av if t < 0.5 else bv
    return out


def midpoint(a, b, t=.5):
    return (lerp(a[0], b[0], t), lerp(a[1], b[1], t))


def star_points(cx, cy, r_outer, r_inner, points=5, rotation=-math.pi/2):
    pts=[]
    for i in range(points*2):
        r=r_outer if i%2==0 else r_inner
        a=rotation + i*math.pi/points
        pts.append((cx+math.cos(a)*r, cy+math.sin(a)*r))
    return pts


def base_pose():
    return {
        "root": (160, 350),
        "head": (160, 105),
        "neck": (160, 137),
        "pelvis": (160, 252),
        "l_shoulder": (117, 158), "r_shoulder": (203, 158),
        "l_elbow": (100, 209), "r_elbow": (220, 207),
        "l_hand": (93, 255), "r_hand": (228, 252),
        "l_hip": (140, 252), "r_hip": (180, 252),
        "l_knee": (134, 306), "r_knee": (188, 306),
        "l_ankle": (128, 354), "r_ankle": (195, 354),
        "expression": "ready", "facing": 1,
    }


POINT_KEYS = {
    "root", "head", "neck", "pelvis",
    "l_shoulder", "r_shoulder", "l_elbow", "r_elbow", "l_hand", "r_hand",
    "l_hip", "r_hip", "l_knee", "r_knee", "l_ankle", "r_ankle"
}


def with_points(p, **changes):
    q = dict(p)
    q.update(changes)
    return q


def shifted_pose(p, dx=0, dy=0):
    q = dict(p)
    for k in POINT_KEYS:
        if k in q:
            q[k] = (q[k][0] + dx, q[k][1] + dy)
    return q


def rotated_pose(p, degrees, pivot_key="pelvis"):
    q = dict(p)
    px, py = q[pivot_key]
    a = math.radians(degrees)
    ca, sa = math.cos(a), math.sin(a)
    for k in POINT_KEYS:
        if k not in q:
            continue
        x, y = q[k]
        dx, dy = x - px, y - py
        q[k] = (px + dx * ca - dy * sa, py + dx * sa + dy * ca)
    return q


def apply_identity_proportions(p, style):
    """Small per-wrestler proportion changes preserve shared animation while improving silhouette identity."""
    q=dict(p)
    if style.name == 'stone':
        # Powerhouse: broader shoulders, heavier stance, slightly wider hips/knees.
        for key,dx in [('l_shoulder',-5),('r_shoulder',5),('l_elbow',-3),('r_elbow',3),('l_hand',-2),('r_hand',2),('l_hip',-2),('r_hip',2),('l_knee',-2),('r_knee',2)]:
            x,y=q[key]; q[key]=(x+dx,y)
    else:
        # Viper: leaner torso and more angular/asymmetric ready silhouette.
        for key,dx in [('l_shoulder',2),('r_shoulder',-2),('l_hip',2),('r_hip',-2)]:
            x,y=q[key]; q[key]=(x+dx,y)
        if q.get('expression') == 'ready':
            x,y=q['head']; q['head']=(x+2,y)
    return q


def pose_anchors(p, style):
    q=apply_identity_proportions(p, style)
    chest=midpoint(q['neck'], q['pelvis'], .42)
    upper_chest=midpoint(q['neck'], q['pelvis'], .28)
    waist=(q['pelvis'][0], q['pelvis'][1]-12)
    hands_center=midpoint(q['l_hand'], q['r_hand'])
    return {
        'head':[round(q['head'][0],2),round(q['head'][1],2)],
        'neck':[round(q['neck'][0],2),round(q['neck'][1],2)],
        'chest':[round(chest[0],2),round(chest[1],2)],
        'upper_chest':[round(upper_chest[0],2),round(upper_chest[1],2)],
        'waist':[round(waist[0],2),round(waist[1],2)],
        'l_shoulder':[round(q['l_shoulder'][0],2),round(q['l_shoulder'][1],2)],
        'r_shoulder':[round(q['r_shoulder'][0],2),round(q['r_shoulder'][1],2)],
        'l_hand':[round(q['l_hand'][0],2),round(q['l_hand'][1],2)],
        'r_hand':[round(q['r_hand'][0],2),round(q['r_hand'][1],2)],
        'hands_center':[round(hands_center[0],2),round(hands_center[1],2)],
        'l_knee':[round(q['l_knee'][0],2),round(q['l_knee'][1],2)],
        'r_knee':[round(q['r_knee'][0],2),round(q['r_knee'][1],2)],
        'l_ankle':[round(q['l_ankle'][0],2),round(q['l_ankle'][1],2)],
        'r_ankle':[round(q['r_ankle'][0],2),round(q['r_ankle'][1],2)]
    }


def segment_polygon(a, b, width_a, width_b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    ln = max(1e-6, math.hypot(dx, dy))
    nx, ny = -dy / ln, dx / ln
    return [
        (ax + nx * width_a, ay + ny * width_a),
        (bx + nx * width_b, by + ny * width_b),
        (bx - nx * width_b, by - ny * width_b),
        (ax - nx * width_a, ay - ny * width_a),
    ]



def rgba_blend(a, b, t):
    return tuple(int(a[i] * (1-t) + b[i] * t) for i in range(4))


def draw_limb(draw, a, b, wa, wb, base, outline=C("#35231E")):
    """Stylized tapered limb with shadow plane, mid plane and highlight edge."""
    pts = segment_polygon(a, b, wa, wb)
    dark = shade(base, .72)
    light = shade(base, 1.12)
    poly(draw, pts, dark)
    # Main front plane.
    front = [
        lerp(pts[0], pts[3], .18),
        lerp(pts[1], pts[2], .18),
        lerp(pts[1], pts[2], .70),
        lerp(pts[0], pts[3], .70),
    ]
    poly(draw, front, base)
    # Thin highlight plane on arena-key side.
    hi = [
        lerp(pts[0], pts[3], .08),
        lerp(pts[1], pts[2], .08),
        lerp(pts[1], pts[2], .24),
        lerp(pts[0], pts[3], .24),
    ]
    poly(draw, hi, light)
    line(draw, pts + [pts[0]], shade(outline, .74), 1.05)


def draw_joint_shadow(draw, center, rx, ry, alpha=70):
    x,y=center
    ellipse(draw, (x-rx,y-ry,x+rx,y+ry), (25,15,14,alpha))


def draw_muscle_cap(draw, center, rx, ry, base):
    x,y=center
    ellipse(draw,(x-rx,y-ry,x+rx,y+ry),shade(base,.72))
    ellipse(draw,(x-rx*.88,y-ry*.9,x+rx*.72,y+ry*.82),base)
    ellipse(draw,(x-rx*.55,y-ry*.74,x-rx*.10,y-ry*.16),shade(base,1.16))


def draw_hand(draw, c, skin, fist=True):
    x,y=c
    # Oversized action-figure hand.
    dark=shade(skin,.68)
    light=shade(skin,1.12)
    if fist:
        rounded(draw,(x-17,y-15,x+17,y+16),8,dark,shade(dark,.70),1)
        rounded(draw,(x-14,y-13,x+13,y+12),7,skin)
        poly(draw,[(x-11,y-12),(x+7,y-12),(x+12,y-4),(x-12,y-4)],light)
        for i in range(3):
            line(draw,[(x-10+i*7,y-3),(x-9+i*7,y+8)],shade(skin,.68),1)
    else:
        rounded(draw,(x-13,y-16,x+13,y+16),7,skin,shade(dark,.75),1)
        poly(draw,[(x-9,y-14),(x+4,y-14),(x+9,y-6),(x-10,y-7)],light)


def draw_boot(draw, ankle, style, facing=1):
    x,y=ankle
    boot=style.boot
    dark=shade(boot,.60)
    mid=boot
    light=shade(boot,1.16)
    # Cuff and shaft.
    poly(draw,[(x-18,y-31),(x+17,y-31),(x+15,y+10),(x-15,y+10)],dark)
    poly(draw,[(x-14,y-28),(x+10,y-28),(x+9,y+8),(x-12,y+8)],mid)
    poly(draw,[(x-11,y-26),(x-2,y-26),(x-4,y+5),(x-11,y+6)],light)
    # Foot / toe silhouette and distinct sole.
    toe_x=x+facing*13
    poly(draw,[(x-15,y+5),(x+13,y+5),(toe_x+facing*18,y+11),(toe_x+facing*20,y+24),(x-16,y+23)],dark)
    poly(draw,[(x-12,y+7),(x+10,y+7),(toe_x+facing*15,y+12),(toe_x+facing*14,y+20),(x-13,y+20)],mid)
    rounded(draw,(min(x-17,toe_x+facing*21),y+20,max(x-17,toe_x+facing*21),y+27),3,C("#171A20"))
    # Cuff color band and laces.
    poly(draw,[(x-17,y-31),(x+17,y-31),(x+15,y-23),(x-16,y-23)],style.primary)
    for yy in range(int(y-18),int(y+5),7):
        line(draw,[(x-7,yy),(x+7,yy)],style.secondary,1.25)
    line(draw,[(x-11,y-29),(x-7,y+4)],shade(mid,1.25),1.0)


def draw_face_shape(draw, x, y, style):
    skin=style.skin
    light=style.skin_light
    dark=shade(skin,.72)
    # Squared heroic jaw, face side-shadow, top-plane highlight.
    poly(draw,[(x-24,y-25),(x+23,y-25),(x+28,y-8),(x+24,y+19),(x+13,y+31),(x-13,y+31),(x-25,y+18),(x-29,y-7)],dark)
    poly(draw,[(x-21,y-22),(x+13,y-22),(x+21,y-7),(x+17,y+17),(x+8,y+27),(x-11,y+27),(x-21,y+15),(x-24,y-6)],light)
    poly(draw,[(x-18,y-21),(x+8,y-21),(x+14,y-13),(x-18,y-12)],shade(light,1.08))
    # Ears behind face planes.
    ellipse(draw,(x-32,y-7,x-22,y+10),skin)
    ellipse(draw,(x+22,y-7,x+32,y+10),skin)


def draw_head(draw, pose, style):
    x,y=pose["head"]
    expression=pose.get("expression","ready")
    # Back hair layers first.
    if style.hair_style == "long":
        for ox,oy,w,h in [(-25,-15,13,61),(-16,-23,14,69),(16,-23,14,69),(25,-15,13,61),(-5,-27,15,62),(7,-27,15,62)]:
            rounded(draw,(x+ox-w/2,y+oy,x+ox+w/2,y+oy+h),5,style.hair_dark)
            rounded(draw,(x+ox-w*.34,y+oy+3,x+ox+w*.18,y+oy+h-7),4,style.hair)
    elif style.hair_style == "mohawk":
        poly(draw,[(x-22,y-23),(x-12,y-41),(x-2,y-51),(x+8,y-48),(x+18,y-36),(x+24,y-15)],style.hair_dark)
        poly(draw,[(x-11,y-37),(x-2,y-47),(x+6,y-44),(x+14,y-32),(x+5,y-31)],style.hair)
    draw_face_shape(draw,x,y,style)
    # Stone bandana / Viper hairline.
    if style.name=="stone":
        rounded(draw,(x-29,y-31,x+29,y-17),4,style.primary)
        poly(draw,[(x-7,y-28),(x-1,y-34),(x+4,y-28),(x+11,y-29),(x+4,y-21),(x-3,y-21)],style.secondary)
        poly(draw,[(x+23,y-24),(x+45,y-8),(x+31,y+1)],style.primary)
    else:
        poly(draw,[(x-23,y-23),(x-6,y-31),(x+11,y-29),(x+24,y-18),(x+17,y-12),(x-20,y-12)],style.hair_dark)
    # Brow/eyes.
    eye_y=y-4
    line(draw,[(x-19,eye_y-8),(x-5,eye_y-4)],style.hair_dark,3)
    line(draw,[(x+5,eye_y-4),(x+19,eye_y-8)],style.hair_dark,3)
    ellipse(draw,(x-18,eye_y-3,x-6,eye_y+5),C("#F7F1DF"))
    ellipse(draw,(x+6,eye_y-3,x+18,eye_y+5),C("#F7F1DF"))
    py=eye_y+(3 if expression=="hit" else 1)
    ellipse(draw,(x-13,py-2,x-9,py+2),C("#13212A"))
    ellipse(draw,(x+9,py-2,x+13,py+2),C("#13212A"))
    # Nose wedge and cheek shadow.
    poly(draw,[(x-2,y),(x+6,y+8),(x-3,y+11)],shade(style.skin,.74))
    poly(draw,[(x+12,y+5),(x+21,y+12),(x+13,y+16)],shade(style.skin,.84))
    if style.name == 'viper':
        line(draw,[(x+12,y-10),(x+18,y+5)],C('#773B3F'),1.2)
        line(draw,[(x+14,y-9),(x+19,y-3)],shade(style.skin,1.16),.7)
    # Mouth/expression.
    if expression=="hit":
        rounded(draw,(x-12,y+15,x+13,y+25),4,C("#371C20"))
        line(draw,[(x-8,y+17),(x+9,y+17)],C("#E8DDD3"),1)
    elif expression=="strain":
        line(draw,[(x-12,y+21),(x,y+16),(x+12,y+21)],C("#38211F"),2)
    else:
        line(draw,[(x-10,y+19),(x+10,y+19)],C("#38211F"),2)
    # Facial hair as layered silhouette.
    if style.beard=="handlebar":
        rounded(draw,(x-24,y+7,x-1,y+18),5,style.hair_dark)
        rounded(draw,(x+1,y+7,x+24,y+18),5,style.hair_dark)
        rounded(draw,(x-22,y+7,x-2,y+15),5,style.hair)
        rounded(draw,(x+2,y+7,x+22,y+15),5,style.hair)
        poly(draw,[(x-22,y+11),(x-31,y+26),(x-19,y+22)],style.hair)
        poly(draw,[(x+22,y+11),(x+31,y+26),(x+19,y+22)],style.hair)
    else:
        poly(draw,[(x-22,y+12),(x-15,y+29),(x,y+36),(x+15,y+29),(x+22,y+12),(x+18,y+31),(x,y+42),(x-18,y+31)],style.hair_dark)
        poly(draw,[(x-16,y+17),(x-10,y+27),(x,y+31),(x+10,y+27),(x+16,y+17),(x+10,y+29),(x,y+35),(x-10,y+29)],style.hair)


def draw_torso(draw, p, style):
    neck=p["neck"]; pelvis=p["pelvis"]
    cx=(neck[0]+pelvis[0])/2
    top_y=neck[1]+7
    bottom_y=pelvis[1]+5
    half_top=51
    half_mid=43
    half_bottom=36
    # Dark silhouette / lats.
    dark=shade(style.skin,.68)
    mid=style.skin
    light=style.skin_light
    outline=shade(style.skin,.47)
    poly(draw,[(cx-half_top,top_y),(cx+half_top,top_y),(cx+half_mid,bottom_y-35),(cx+half_bottom,bottom_y),(cx-half_bottom,bottom_y),(cx-half_mid,bottom_y-35)],outline)
    # Main front sculpted plane.
    poly(draw,[(cx-half_top+4,top_y+2),(cx+half_top-5,top_y+2),(cx+half_mid-3,bottom_y-35),(cx+half_bottom-3,bottom_y-3),(cx-half_bottom+4,bottom_y-3),(cx-half_mid+4,bottom_y-35)],mid)
    # Shadow side plane.
    poly(draw,[(cx+half_top-20,top_y+4),(cx+half_top-5,top_y+2),(cx+half_mid-3,bottom_y-35),(cx+half_bottom-3,bottom_y-3),(cx+half_bottom-15,bottom_y-3),(cx+half_mid-17,bottom_y-37)],dark)
    # Key-light upper-left plane.
    poly(draw,[(cx-half_top+8,top_y+4),(cx-7,top_y+5),(cx-11,bottom_y-49),(cx-half_mid+10,bottom_y-40)],shade(light,1.05))
    # Pectorals as broad masses, no boxed six-pack.
    rounded(draw,(cx-42,top_y+9,cx-2,top_y+41),11,shade(light,1.02))
    rounded(draw,(cx+1,top_y+10,cx+39,top_y+41),11,shade(mid,.95))
    line(draw,[(cx,top_y+13),(cx,top_y+39)],shade(mid,.72),1.3)
    # Subtle abdominal planes.
    for off_y,wid in [(49,26),(69,22),(88,18)]:
        yy=top_y+off_y
        poly(draw,[(cx-wid,yy),(cx-4,yy-4),(cx-3,yy+10),(cx-wid+4,yy+12)],shade(mid,1.045))
        poly(draw,[(cx+4,yy-4),(cx+wid,yy),(cx+wid-4,yy+12),(cx+3,yy+10)],shade(mid,.86))
    # Under-chest shadow and clavicle highlight.
    line(draw,[(cx-35,top_y+43),(cx,top_y+48),(cx+35,top_y+43)],shade(mid,.72),1.5)
    line(draw,[(cx-30,top_y+7),(cx,top_y+13),(cx+29,top_y+8)],shade(light,1.08),1.4)


def draw_trunks(draw, pelvis, style):
    x,y=pelvis
    dark=shade(style.primary,.62)
    poly(draw,[(x-43,y-15),(x+43,y-15),(x+37,y+26),(x+20,y+31),(x-20,y+31),(x-37,y+26)],dark)
    poly(draw,[(x-39,y-12),(x+34,y-12),(x+31,y+23),(x+17,y+27),(x-18,y+27),(x-34,y+23)],style.primary)
    poly(draw,[(x-39,y-12),(x+36,y-12),(x+34,y-4),(x-38,y-4)],style.secondary)
    if style.name=="stone":
        poly(draw,[(x-31,y+1),(x-16,y+1),(x-25,y+19),(x-7,y+21),(x-16,y+27),(x-35,y+19)],style.secondary)
        poly(draw,[(x+31,y+1),(x+16,y+1),(x+25,y+19),(x+7,y+21),(x+16,y+27),(x+35,y+19)],style.secondary)
    else:
        poly(draw,[(x-33,y+0),(x-18,y+0),(x-6,y+20),(x-18,y+25),(x-35,y+15)],style.secondary)
        poly(draw,[(x+33,y+0),(x+18,y+0),(x+6,y+20),(x+18,y+25),(x+35,y+15)],style.secondary)
    line(draw,[(x-37,y-7),(x+33,y-7)],shade(style.secondary,1.18),1)


def draw_identity_details(draw, p, style):
    """Procedural gear/tattoo marks that make wrestlers identifiable even at small scale."""
    if style.name == 'stone':
        # Gold stars on knee pads and lightning on wrist tape.
        for key in ('l_knee','r_knee'):
            x,y=p[key]
            poly(draw, star_points(x,y,7,3.1), style.secondary)
        for side in ('l','r'):
            el=p[f'{side}_elbow']; hand=p[f'{side}_hand']
            wx,wy=midpoint(el,hand,.80)
            poly(draw,[(wx-7,wy-5),(wx-1,wy-5),(wx-5,wy+1),(wx+4,wy+1),(wx-5,wy+7),(wx-2,wy+2),(wx-9,wy+2)],style.secondary)
        # Small chest-hair wedge keeps Stone from reading like a plastic mannequin.
        cx=midpoint(p['neck'],p['pelvis'],.28)[0]; cy=midpoint(p['neck'],p['pelvis'],.28)[1]
        for off in (-8,-3,3,8):
            line(draw,[(cx+off,cy+8),(cx+off*.55,cy+18)],C('#6B3F29'),1)
    else:
        # Viper's asymmetrical snake-sleeve tattoo: dark coils with red scale accents.
        a=p['l_shoulder']; b=p['l_elbow']
        for i in range(6):
            t=.12+i*.14; x,y=lerp(a,b,t)
            ellipse(draw,(x-6,y-4,x+6,y+4),C('#37252A'))
            if i%2==0: line(draw,[(x-4,y),(x+4,y)],style.secondary,1)
        a2=p['l_elbow']; b2=p['l_hand']
        for i in range(4):
            t=.16+i*.18; x,y=lerp(a2,b2,t)
            line(draw,[(x-5,y-3),(x+5,y+3)],C('#3B252B'),2)
        # Red fang/chevron on right knee pad.
        x,y=p['r_knee']
        poly(draw,[(x-8,y-6),(x,y+3),(x+8,y-6),(x+3,y+7),(x,y+2),(x-3,y+7)],style.secondary)


def draw_wrestler(pose, style: Style) -> Image.Image:
    # Draw body at supersampled scale, then create silhouette outline/rim layers.
    body=Image.new("RGBA",(W,H),(0,0,0,0))
    d=ImageDraw.Draw(body,"RGBA")
    p=apply_identity_proportions(pose,style); facing=p.get("facing",1); root=p["root"]
    # Ground shadow on body canvas (will remain soft after downsample).
    ellipse(d,(root[0]-58,root[1]-7,root[0]+58,root[1]+12),(0,0,0,72))
    # Legs first.
    for side in ("l","r"):
        hip=p[f"{side}_hip"]; knee=p[f"{side}_knee"]; ankle=p[f"{side}_ankle"]
        draw_limb(d,hip,knee,18,14,style.skin)
        draw_joint_shadow(d,knee,15,7,48)
        # Pad as real over-layer.
        rounded(d,(knee[0]-16,knee[1]-12,knee[0]+16,knee[1]+14),7,shade(style.primary,.66))
        rounded(d,(knee[0]-13,knee[1]-10,knee[0]+12,knee[1]+11),6,style.primary)
        line(d,[(knee[0]-10,knee[1]-8),(knee[0]+9,knee[1]-8)],shade(style.primary,1.18),1)
        draw_limb(d,(knee[0],knee[1]+5),ankle,14,10,style.skin)
        draw_boot(d,ankle,style,facing)
    # Torso and trunks.
    draw_torso(d,p,style)
    draw_trunks(d,p["pelvis"],style)
    # Arms overlap torso with deltoid caps and contact shadows.
    arm_order=("r","l") if facing==1 else ("l","r")
    for side in arm_order:
        sh=p[f"{side}_shoulder"]; el=p[f"{side}_elbow"]; hand=p[f"{side}_hand"]
        draw_joint_shadow(d,sh,17,11,65)
        draw_limb(d,sh,el,19,14,style.skin_light)
        draw_muscle_cap(d,sh,22,20,style.skin_light)
        draw_joint_shadow(d,el,10,6,50)
        draw_limb(d,el,hand,15,11,style.skin_light)
        wx,wy=lerp(el,hand,.80)
        rounded(d,(wx-14,wy-7,wx+14,wy+7),4,shade(style.primary,.72))
        rounded(d,(wx-12,wy-5,wx+12,wy+5),4,style.primary)
        draw_hand(d,hand,style.skin_light,True)
    draw_identity_details(d,p,style)
    draw_head(d,p,style)
    # Rim/outline from body alpha, excluding very faint shadow pixels.
    alpha=body.getchannel('A')
    hard=alpha.point(lambda v: 255 if v>90 else 0)
    expanded=hard.filter(ImageFilter.MaxFilter(9))
    outline_mask=Image.eval(expanded,lambda v:v)
    # subtract original hard alpha to form external band.
    import PIL.ImageChops as ImageChops
    outline_mask=ImageChops.subtract(expanded,hard)
    # dual arena rim offsets behind silhouette.
    rim_left=Image.new('RGBA',(W,H),(0,0,0,0)); rim_right=Image.new('RGBA',(W,H),(0,0,0,0)); outline=Image.new('RGBA',(W,H),(0,0,0,0))
    cyan=C('#36C7FF'); red=C('#FF4969'); black=(8,10,14,210)
    outline.putalpha(outline_mask.point(lambda v:int(v*.76)))
    solid_black=Image.new('RGBA',(W,H),black); solid_black.putalpha(outline.getchannel('A')); outline=solid_black
    lm=Image.new('L',(W,H),0); lm.paste(outline_mask,(S(-3),S(-1)))
    rm=Image.new('L',(W,H),0); rm.paste(outline_mask,(S(3),S(0)))
    cl=Image.new('RGBA',(W,H),cyan); cl.putalpha(lm.point(lambda v:int(v*.42)))
    cr=Image.new('RGBA',(W,H),red); cr.putalpha(rm.point(lambda v:int(v*.32)))
    final=Image.new('RGBA',(W,H),(0,0,0,0))
    final=Image.alpha_composite(final,cl)
    final=Image.alpha_composite(final,cr)
    final=Image.alpha_composite(final,outline)
    final=Image.alpha_composite(final,body)
    return final.resize((FRAME_W,FRAME_H),Image.Resampling.LANCZOS)

def frames_between(a, b, count, ease=True):
    out = []
    for i in range(count):
        t = 0 if count == 1 else i / (count - 1)
        if ease:
            t = t * t * (3 - 2 * t)
        out.append(pose_mix(a, b, t))
    return out


def stitch(phases, target_count):
    frames = []
    for a, b, n in phases:
        fs = frames_between(a, b, n)
        if frames:
            fs = fs[1:]
        frames.extend(fs)
    if len(frames) < target_count:
        frames.extend([frames[-1]] * (target_count - len(frames)))
    return frames[:target_count]


def idle_frames():
    b = base_pose()
    frames = []
    for dy in (0, -2, -1, 1):
        frames.append(shifted_pose(b, 0, dy))
    return frames


def forearm_attacker():
    ready = base_pose()
    step = shifted_pose(with_points(ready, l_knee=(137, 302), r_knee=(191, 304)), 5, 0)
    wind = with_points(step, r_elbow=(207, 165), r_hand=(176, 136), l_elbow=(104, 205), l_hand=(96, 246), expression="strain")
    strike = shifted_pose(with_points(ready, r_elbow=(231, 173), r_hand=(276, 155), l_elbow=(107, 202), l_hand=(99, 244), head=(164, 105)), 8, 0)
    follow = shifted_pose(with_points(ready, r_elbow=(244, 184), r_hand=(283, 189), head=(166, 109)), 9, 1)
    return stitch([(ready, step, 2), (step, wind, 3), (wind, strike, 3), (strike, follow, 2), (follow, ready, 4)], 10)


def forearm_defender():
    ready = base_pose()
    brace = with_points(ready, head=(158, 108), neck=(160, 140))
    hit = shifted_pose(with_points(ready, head=(181, 113), neck=(171, 143), expression="hit", l_shoulder=(124, 166), r_shoulder=(213, 160)), 8, 1)
    recoil = shifted_pose(rotated_pose(with_points(ready, expression="hit"), 8, "pelvis"), 18, 5)
    recover = shifted_pose(with_points(ready, head=(171, 112), expression="strain"), 6, 1)
    return stitch([(ready, brace, 2), (brace, hit, 3), (hit, recoil, 3), (recoil, recover, 3), (recover, ready, 3)], 10)


def clothesline_attacker():
    ready=base_pose()
    load=shifted_pose(with_points(ready,l_knee=(137,302),r_knee=(190,301),r_elbow=(214,178),r_hand=(199,165),expression='strain'),4,0)
    step=shifted_pose(with_points(load,r_elbow=(227,170),r_hand=(250,168),l_elbow=(105,202),l_hand=(98,244)),9,0)
    impact=shifted_pose(with_points(ready,r_elbow=(244,176),r_hand=(283,177),l_elbow=(108,202),l_hand=(99,244),head=(165,106),expression='strain'),12,0)
    follow=shifted_pose(with_points(impact,r_elbow=(251,188),r_hand=(286,198),head=(167,109)),10,1)
    return stitch([(ready,load,2),(load,step,2),(step,impact,3),(impact,follow,2),(follow,ready,4)],10)


def clothesline_defender():
    ready=base_pose()
    brace=with_points(ready,head=(158,108),expression='strain')
    snap=rotated_pose(with_points(ready,head=(178,121),neck=(170,147),r_shoulder=(211,167),l_shoulder=(123,165),expression='hit'),10,'pelvis')
    fall=with_points(ready,head=(213,281),neck=(194,285),pelvis=(150,300),l_hip=(134,302),r_hip=(166,300),l_knee=(111,326),r_knee=(182,323),l_ankle=(88,340),r_ankle=(204,338),l_shoulder=(174,286),r_shoulder=(209,296),l_elbow=(157,318),r_elbow=(230,320),l_hand=(141,336),r_hand=(246,338),expression='hit')
    prone=with_points(fall,head=(214,306),neck=(194,302),pelvis=(145,307))
    return stitch([(ready,brace,2),(brace,snap,3),(snap,fall,3),(fall,prone,4)],10)


def body_slam_attacker():
    ready=base_pose()
    close=shifted_pose(with_points(ready,l_hand=(182,187),r_hand=(201,218),l_elbow=(123,190),r_elbow=(218,198),expression='strain'),5,0)
    scoop=with_points(close,l_hand=(184,214),r_hand=(195,247),head=(157,112),pelvis=(158,262),expression='strain')
    lift=with_points(scoop,l_hand=(187,188),r_hand=(194,217),head=(154,102),neck=(158,134),pelvis=(158,248),l_knee=(132,311),r_knee=(188,311),expression='strain')
    turn=rotated_pose(with_points(lift,head=(150,110),l_hand=(190,194),r_hand=(198,222)), -8,'pelvis')
    drop=with_points(turn,head=(147,145),neck=(151,170),pelvis=(165,270),l_knee=(128,330),r_knee=(197,326),l_ankle=(116,356),r_ankle=(214,354),expression='strain')
    recover=with_points(base_pose(),head=(158,114),pelvis=(160,258),expression='strain')
    return stitch([(ready,close,2),(close,scoop,2),(scoop,lift,3),(lift,turn,2),(turn,drop,3),(drop,recover,3),(recover,ready,3)],14)


def body_slam_defender():
    ready=base_pose()
    caught=with_points(ready,l_hand=(136,186),r_hand=(198,188),l_elbow=(137,201),r_elbow=(194,201),expression='strain')
    sideways=rotated_pose(with_points(caught,head=(177,136),neck=(169,159),pelvis=(163,237),l_knee=(132,277),r_knee=(192,275),l_ankle=(116,315),r_ankle=(211,314),expression='strain'),62,'pelvis')
    carried=shifted_pose(sideways,0,-42)
    rotate=rotated_pose(carried,30,'pelvis')
    slam=with_points(ready,head=(220,302),neck=(198,298),pelvis=(143,302),l_hip=(129,304),r_hip=(157,302),l_knee=(106,324),r_knee=(171,328),l_ankle=(82,338),r_ankle=(198,338),l_shoulder=(177,295),r_shoulder=(207,307),l_elbow=(158,327),r_elbow=(227,330),l_hand=(141,341),r_hand=(244,341),expression='hit')
    prone=with_points(slam,head=(214,309),neck=(194,304),pelvis=(141,308),expression='hit')
    return stitch([(ready,caught,2),(caught,sideways,3),(sideways,carried,3),(carried,rotate,2),(rotate,slam,3),(slam,prone,3)],14)


def suplex_attacker():
    ready = base_pose()
    close = shifted_pose(with_points(ready, r_hand=(204, 164), l_hand=(183, 166), r_elbow=(215, 180), l_elbow=(121, 181)), 4, 0)
    lock = with_points(close, r_hand=(198, 145), l_hand=(181, 147), r_elbow=(219, 166), l_elbow=(118, 167), expression="strain")
    crouch = with_points(lock, head=(156, 119), neck=(158, 149), pelvis=(158, 266), l_hip=(138, 266), r_hip=(178, 266), l_knee=(132, 315), r_knee=(188, 314))
    lift = with_points(lock, head=(154, 101), neck=(158, 133), pelvis=(158, 246), l_hand=(184, 119), r_hand=(201, 118), l_elbow=(116, 146), r_elbow=(220, 145), expression="strain")
    bridge = rotated_pose(with_points(ready, head=(145, 137), neck=(150, 164), pelvis=(164, 257), l_shoulder=(111, 186), r_shoulder=(210, 181), l_elbow=(95, 217), r_elbow=(225, 216), l_hand=(88, 242), r_hand=(239, 240), expression="strain"), -10, "pelvis")
    impact = with_points(bridge, head=(137, 176), neck=(144, 194), pelvis=(168, 269), l_knee=(127, 329), r_knee=(197, 326), l_ankle=(117, 355), r_ankle=(214, 354))
    recover = with_points(base_pose(), head=(157, 113), neck=(159, 144), pelvis=(160, 259), l_knee=(134, 312), r_knee=(189, 311), expression="strain")
    return stitch([(ready, close, 2), (close, lock, 2), (lock, crouch, 2), (crouch, lift, 3), (lift, bridge, 3), (bridge, impact, 2), (impact, recover, 3), (recover, ready, 3)], 14)


def suplex_defender():
    ready = base_pose()
    caught = with_points(ready, l_hand=(131, 168), r_hand=(194, 169), l_elbow=(137, 184), r_elbow=(191, 184), expression="strain")
    bent = rotated_pose(with_points(caught, head=(155, 130), neck=(158, 157), pelvis=(163, 256)), -16, "pelvis")
    lifted = with_points(ready, head=(160, 282), neck=(160, 252), pelvis=(160, 174), l_hip=(140, 174), r_hip=(180, 174), l_knee=(133, 118), r_knee=(188, 119), l_ankle=(127, 68), r_ankle=(195, 69), l_shoulder=(121, 227), r_shoulder=(199, 227), l_elbow=(104, 249), r_elbow=(216, 249), l_hand=(96, 269), r_hand=(224, 269), expression="hit")
    vertical = with_points(lifted, head=(160, 293), neck=(160, 261), pelvis=(160, 166), l_knee=(130, 105), r_knee=(190, 106), l_ankle=(122, 54), r_ankle=(199, 55))
    rotate = rotated_pose(vertical, 34, "pelvis")
    slam = with_points(ready, head=(220, 303), neck=(198, 297), pelvis=(143, 302), l_hip=(129, 304), r_hip=(157, 302), l_knee=(106, 324), r_knee=(171, 328), l_ankle=(82, 338), r_ankle=(198, 338), l_shoulder=(177, 295), r_shoulder=(207, 307), l_elbow=(158, 327), r_elbow=(227, 330), l_hand=(141, 341), r_hand=(244, 341), expression="hit")
    prone = with_points(slam, head=(214, 309), neck=(194, 304), pelvis=(141, 308), expression="hit")
    return stitch([(ready, caught, 2), (caught, bent, 2), (bent, lifted, 3), (lifted, vertical, 2), (vertical, rotate, 2), (rotate, slam, 3), (slam, prone, 2)], 14)


def dragon_screw_attacker():
    ready = base_pose()
    reach = with_points(ready, head=(166, 122), neck=(163, 149), pelvis=(158, 264), l_knee=(129, 315), r_knee=(190, 314), l_hand=(116, 246), r_hand=(205, 247), l_elbow=(108, 214), r_elbow=(211, 215), expression="strain")
    catch = with_points(reach, l_hand=(188, 259), r_hand=(209, 253), l_elbow=(139, 231), r_elbow=(214, 219))
    twist = rotated_pose(with_points(catch, head=(172, 149), neck=(166, 174), pelvis=(157, 279), l_knee=(121, 332), r_knee=(190, 324), l_ankle=(102, 355), r_ankle=(207, 353)), 10, "pelvis")
    kneel = with_points(twist, head=(180, 178), neck=(171, 198), pelvis=(160, 300), l_knee=(123, 344), r_knee=(194, 329), l_ankle=(111, 361), r_ankle=(217, 353))
    recover = with_points(base_pose(), head=(166, 112), expression="strain")
    return stitch([(ready, reach, 2), (reach, catch, 3), (catch, twist, 3), (twist, kneel, 3), (kneel, recover, 3), (recover, ready, 2)], 12)


def dragon_screw_defender():
    ready = base_pose()
    caught = with_points(ready, r_knee=(180, 286), r_ankle=(168, 253), r_hip=(180, 252), expression="strain")
    offbalance = rotated_pose(with_points(caught, head=(176, 118), neck=(169, 146), l_hand=(88, 238), r_hand=(242, 225)), 13, "pelvis")
    twist = rotated_pose(with_points(offbalance, head=(190, 152), neck=(177, 176), pelvis=(158, 280), l_knee=(123, 324), r_knee=(190, 290), r_ankle=(215, 260), expression="hit"), 31, "pelvis")
    fall = with_points(ready, head=(218, 284), neck=(196, 285), pelvis=(150, 300), l_hip=(134, 303), r_hip=(165, 298), l_knee=(111, 326), r_knee=(184, 321), l_ankle=(88, 340), r_ankle=(205, 338), l_shoulder=(176, 283), r_shoulder=(211, 295), l_elbow=(157, 316), r_elbow=(229, 318), l_hand=(141, 335), r_hand=(245, 337), expression="hit")
    prone = with_points(fall, head=(213, 306), pelvis=(145, 307))
    return stitch([(ready, caught, 2), (caught, offbalance, 2), (offbalance, twist, 3), (twist, fall, 3), (fall, prone, 3)], 12)


def prone_pose():
    r = base_pose()
    return with_points(r, head=(215, 306), neck=(194, 300), pelvis=(142, 305), l_hip=(129, 305), r_hip=(155, 305), l_knee=(108, 325), r_knee=(170, 330), l_ankle=(86, 338), r_ankle=(194, 339), l_shoulder=(176, 298), r_shoulder=(205, 310), l_elbow=(159, 328), r_elbow=(226, 332), l_hand=(143, 341), r_hand=(242, 343), expression="hit")


def prone_frames():
    p = prone_pose()
    return [p, p, p, p]


def headlock_attacker():
    r = base_pose()
    kneel = with_points(r, head=(174, 195), neck=(169, 220), pelvis=(164, 300), l_hip=(145, 300), r_hip=(181, 301), l_knee=(124, 340), r_knee=(203, 329), l_ankle=(112, 357), r_ankle=(220, 354), l_shoulder=(137, 232), r_shoulder=(199, 231), l_elbow=(125, 271), r_elbow=(220, 263), l_hand=(117, 300), r_hand=(207, 286), expression="strain")
    cinch = with_points(kneel, r_hand=(194, 282), r_elbow=(215, 257), l_hand=(143, 294), l_elbow=(129, 268), head=(169, 188), expression="strain")
    hold = with_points(cinch, head=(167, 184), neck=(165, 214), pelvis=(162, 301))
    return stitch([(r, kneel, 3), (kneel, cinch, 3), (cinch, hold, 2), (hold, hold, 4)], 10)


def headlock_defender():
    p = prone_pose()
    lift_head = with_points(p, head=(205, 276), neck=(188, 286), l_shoulder=(168, 292), r_shoulder=(198, 301), expression="strain")
    trapped = with_points(lift_head, head=(193, 265), neck=(181, 281), l_hand=(153, 330), r_hand=(226, 326), expression="strain")
    return stitch([(p, lift_head, 3), (lift_head, trapped, 3), (trapped, trapped, 5)], 10)


def pin_attacker():
    r = base_pose()
    dive = with_points(r, head=(184, 224), neck=(176, 245), pelvis=(166, 299), l_hip=(146, 301), r_hip=(183, 303), l_knee=(124, 334), r_knee=(202, 328), l_ankle=(110, 355), r_ankle=(218, 354), l_shoulder=(140, 258), r_shoulder=(199, 255), l_elbow=(123, 286), r_elbow=(220, 282), l_hand=(112, 309), r_hand=(237, 305), expression="strain")
    press = with_points(dive, head=(178, 233), neck=(172, 252), r_hand=(221, 298), l_hand=(124, 310))
    return stitch([(r, dive, 3), (dive, press, 2), (press, press, 3)], 6)


def kickout_defender():
    p = prone_pose()
    coil = with_points(p, head=(205, 292), pelvis=(151, 296), l_knee=(118, 302), r_knee=(180, 287), r_ankle=(203, 251), expression="strain")
    kick = with_points(coil, head=(198, 280), pelvis=(155, 286), l_knee=(117, 292), r_knee=(177, 260), r_ankle=(216, 211), l_hand=(134, 322), r_hand=(234, 311), expression="strain")
    burst = with_points(kick, head=(192, 270), pelvis=(160, 278), r_ankle=(223, 198), expression="strain")
    return stitch([(p, coil, 2), (coil, kick, 2), (kick, burst, 2), (burst, p, 4)], 8)


def atlas(style: Style, anim_name: str, frames: List[Dict], fps: int, impact_frame=None):
    images = [draw_wrestler(p, style) for p in frames]
    sheet = Image.new("RGBA", (FRAME_W * len(images), FRAME_H), (0, 0, 0, 0))
    for i, img in enumerate(images):
        sheet.alpha_composite(img, (i * FRAME_W, 0))
    png = OUT / f"{style.name}_{anim_name}.png"
    sheet.save(png)
    meta = {
        "wrestler": style.name,
        "animation": anim_name,
        "frameWidth": FRAME_W,
        "frameHeight": FRAME_H,
        "frameCount": len(images),
        "fps": fps,
        "impactFrame": impact_frame,
        "origin": [FRAME_W // 2, 360],
        "anchors": [pose_anchors(p, style) for p in frames],
    }
    (OUT / f"{style.name}_{anim_name}.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return meta


def animation_defs():
    return {
        "idle": (idle_frames, 8, None),
        "forearm": (forearm_attacker, 16, 5),
        "forearm_hit": (forearm_defender, 16, 5),
        "clothesline": (clothesline_attacker, 16, 5),
        "clothesline_hit": (clothesline_defender, 16, 5),
        "body_slam": (body_slam_attacker, 16, 9),
        "body_slam_taken": (body_slam_defender, 16, 9),
        "suplex": (suplex_attacker, 16, 9),
        "suplex_taken": (suplex_defender, 16, 9),
        "dragon_screw": (dragon_screw_attacker, 15, 7),
        "dragon_screw_taken": (dragon_screw_defender, 15, 7),
        "headlock": (headlock_attacker, 12, 5),
        "headlock_taken": (headlock_defender, 12, 5),
        "prone": (prone_frames, 8, None),
        "pin": (pin_attacker, 10, None),
        "kickout": (kickout_defender, 14, 4),
    }


def render_job(job):
    style_name, anim_name = job
    style = STONE if style_name == 'stone' else VIPER
    fn, fps, impact = animation_defs()[anim_name]
    frames = fn()
    meta = atlas(style, anim_name, frames, fps, impact)
    return f"{style.name}:{anim_name}", meta


def main():
    from concurrent.futures import ProcessPoolExecutor
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"version": "1.1", "generator": "generate_match_sprites.py", "atlases": {}, "anchorSchema": "frame-local pixel coordinates"}
    names=list(animation_defs())
    jobs=[(style.name,name) for style in (STONE,VIPER) for name in names]
    # Rendering is CPU-heavy because each frame is supersampled and outlined.
    # A small process pool keeps generation practical without excessive memory use.
    with ProcessPoolExecutor(max_workers=4) as pool:
        for key,meta in pool.map(render_job,jobs):
            manifest['atlases'][key]=meta
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Generated {len(manifest['atlases'])} procedural sprite atlases in {OUT}")


if __name__ == "__main__":
    main()

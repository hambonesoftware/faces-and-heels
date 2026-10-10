#!/usr/bin/env python3
"""Original procedural wrestling toy. No assets, fonts, network or AI imagery.
Requires Python 3, Pillow and NumPy. Run: python procedural_wrestler.py
All geometry is built in world coordinates; a small orthographic triangle
renderer supplies z-buffer visibility, faceted lighting and 4x antialiasing.
Joint positions in draw_character can be changed independently.
"""
from pathlib import Path
import argparse
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SIZE = 1200
SS = 4
SKIN = (222, 139, 76)
SKIN_LIGHT = (242, 165, 94)
RED = (208, 24, 45)
GOLD = (255, 193, 27)
HAIR = (247, 195, 62)
DARK = (44, 24, 29)
FACES = []
VIEW = np.array([0.32, 0.19, 0.928]); VIEW /= np.linalg.norm(VIEW)
RIGHT = np.cross([0, 1, 0], VIEW); RIGHT /= np.linalg.norm(RIGHT)
UP = np.cross(VIEW, RIGHT)
LIGHT = np.array([-0.6, 0.8, 1.0]); LIGHT /= np.linalg.norm(LIGHT)
SCALE = 108

def unit(v):
    v = np.asarray(v, dtype=float)
    return v / max(np.linalg.norm(v), 1e-9)

def project(points):
    p = np.asarray(points, dtype=float)
    return np.stack((600 + SCALE * (p @ RIGHT), 1052 - SCALE * (p @ UP), p @ VIEW), axis=-1)

def face(points, color):
    p = np.asarray(points, float)
    n = unit(np.cross(p[1]-p[0], p[2]-p[0]))
    FACES.append((p, np.asarray(color, float), n))

def mesh(vertices, indices, color):
    v = np.asarray(vertices)
    center = v.mean(axis=0)
    for ix in indices:
        p = v[ix]
        n = np.cross(p[1]-p[0], p[2]-p[0])
        if np.dot(n, p.mean(axis=0)-center) < 0:
            p = p[::-1]
        face(p, color)

def basis(a, b):
    y = unit(np.array(b)-a)
    ref = np.array([0, 0, 1.0])
    if abs(y @ ref) > .95:
        ref = np.array([1., 0, 0])
    x = unit(np.cross(y, ref))
    z = unit(np.cross(x, y))
    return np.column_stack((x, y, z))

def block(center, size, color, bevel=.12, rotation=None):
    """Chamfered rectangular solid: 8-point rings plus top/bottom bevels."""
    w, h, d = np.array(size)/2
    r = min(bevel, w*.6, h*.6, d*.6)
    vertices = []
    for y, shrink in [(-h,r),(-h+r,0),(h-r,0),(h,r)]:
        x, z = w-shrink, d-shrink
        c = max(.015, r*.6)
        ring = [(-x+c,-z),(x-c,-z),(x,-z+c),(x,z-c),(x-c,z),(-x+c,z),(-x,z-c),(-x,-z+c)]
        vertices.extend([(a,y,b) for a,b in ring])
    v = np.array(vertices)
    if rotation is not None:
        v = v @ rotation.T
    v += center
    inds = [list(range(7,-1,-1)), list(range(24,32))]
    for j in range(3):
        for i in range(8):
            inds.append([j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i])
    mesh(v, inds, color)

def segment(a, b, widths, color, depth=1.0, sides=10):
    """Independent tapered, bevel-ended limb mesh between two joint anchors."""
    a, b = np.array(a,float), np.array(b,float)
    length = np.linalg.norm(b-a)
    rot = basis(a,b)
    verts = []
    for t, mul in [(0,.78),(.12,1),(.78,1),(1,.78)]:
        radius = ((1-t)*widths[0]+t*widths[1])*mul
        for j in range(sides):
            angle = 2*math.pi*(j+.5)/sides
            verts.append(a + rot @ np.array([radius*math.cos(angle),length*t,radius*depth*math.sin(angle)]))
    inds = [list(range(sides-1,-1,-1)),list(range(3*sides,4*sides))]
    for k in range(3):
        for j in range(sides):
            inds.append([k*sides+j,k*sides+(j+1)%sides,(k+1)*sides+(j+1)%sides,(k+1)*sides+j])
    mesh(verts,inds,color)

def ellipsoid(center, radii, color, rings=8, sides=12):
    verts=[]
    for i in range(rings+1):
        lat=-math.pi/2+math.pi*i/rings
        for j in range(sides):
            lon=2*math.pi*j/sides
            verts.append(np.array(center)+np.array(radii)*[math.cos(lat)*math.cos(lon),math.sin(lat),math.cos(lat)*math.sin(lon)])
    inds=[]
    for i in range(rings):
        for j in range(sides):
            inds.append([i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j])
    mesh(verts,inds,color)

def patch(points, color):
    """A visible front-facing inset or raised costume/facial detail."""
    p=np.array(points,float)
    if np.cross(p[1]-p[0],p[2]-p[0])[2]<0:
        p=p[::-1]
    face(p,color)

def draw_background(n):
    y,x=np.mgrid[0:n,0:n].astype(np.float32)/n
    glow=np.exp(-(((x-.49)/.34)**2+((y-.41)/.40)**2)*2)
    blue=np.exp(-(((x-.12)/.2)**2+((y-.35)/.42)**2)*2)
    red=np.exp(-(((x-.94)/.23)**2+((y-.4)/.40)**2)*2)
    arr=np.zeros((n,n,3),np.float32)
    for k,(base,g,b,r) in enumerate([(7,22,3,46),(12,36,33,2),(23,44,65,12)]):
        arr[:,:,k]=base+glow*g+blue*b+red*r
    im=Image.fromarray(np.uint8(np.clip(arr,0,255)))
    layer=Image.new('RGBA',(n,n)); d=ImageDraw.Draw(layer)
    rng=np.random.default_rng(27)
    def box(v): return tuple(int(t*n/1200) for t in v)
    for row in range(4):
        for i in range(43):
            cx=i*30+rng.uniform(-10,10); cy=590+row*47+rng.uniform(-14,14)
            radius=rng.uniform(7,12)
            d.ellipse(box((cx-radius,cy-radius,cx+radius,cy+radius)),fill=(4,9,20,150))
            d.rounded_rectangle(box((cx-15,cy+6,cx+15,cy+47)),radius=int(9*n/1200),fill=(5,10,22,175))
    layer=layer.filter(ImageFilter.GaussianBlur(n/400))
    im=Image.alpha_composite(im.convert('RGBA'),layer)
    im=im.convert('RGB')
    d=ImageDraw.Draw(im,'RGBA')
    for sx,col in [(100,(72,156,255,14)),(1100,(255,63,93,12))]:
        d.polygon([box((sx,55)),box((sx-270,850)),box((sx+270,850))],fill=col)
    for y0 in [620,713,805]:
        d.line([box((0,y0)),box((1200,y0-72))],fill=(2,5,12,210),width=int(10*n/1200))
        d.line([box((0,y0-3)),box((1200,y0-75))],fill=(105,127,156,105),width=int(5*n/1200))
    d.polygon([box((0,867)),box((1200,817)),box((1200,1200)),box((0,1200))],fill=(22,31,47,255))
    for i in range(9):
        d.line([box((600+(i-4)*90,830)),box((600+(i-4)*310,1200))],fill=(94,127,153,12),width=max(1,n//1200))
    for y0 in [900,1000,1140]:
        d.line([box((0,y0)),box((1200,y0-35))],fill=(94,127,153,14),width=max(1,n//1200))
    return im.convert('RGB')

def draw_shadow(im):
    n=im.width; layer=Image.new('RGBA',im.size); d=ImageDraw.Draw(layer)
    for cx,cy,rx,ry in [(600,1030,295,53),(485,1025,107,27),(780,1038,111,31)]:
        d.ellipse(tuple(int(t*n/1200) for t in (cx-rx,cy-ry,cx+rx,cy+ry)),fill=(0,3,12,170))
    layer=layer.filter(ImageFilter.GaussianBlur(n/95))
    return Image.alpha_composite(im.convert('RGBA'),layer).convert('RGB')

def draw_boot(ankle, near=False):
    x,y,z=ankle
    block((x,.76,z+.23),(1.06,1.48,1.28),GOLD,.18)
    block((x,.26,z+.60),(1.17,.48,1.78),GOLD,.15)
    block((x,.105,z+.60),(1.2,.18,1.82),(86,35,29),.055)
    block((x,1.46,z+.23),(1.11,.22,1.25),RED,.055)
    block((x,.87,z+.88),(.40,1.02,.045),RED,.035)
    for yy in [.49,.69,.89,1.09,1.29]:
        block((x,yy,z+.92),(.45,.055,.055),(255,227,136),.02)
    patch([(x-.48,.26,z+1.5),(x+.45,.26,z+1.5),(x+.30,.38,z+1.45),(x-.37,.38,z+1.45)],(255,220,80))

def draw_leg(hip,knee,ankle):
    segment(hip,knee,(.61,.48),SKIN,1.03)
    ellipsoid(knee,(.43,.39,.42),(171,89,49))
    segment(np.array(knee)+[0,-.19,0],ankle,(.43,.38),SKIN)
    k=np.array(knee)
    block(k+[0,0,.33],(.94,.69,.45),RED,.15)
    block(k+[0,.015,.58],(.70,.42,.045),(228,36,48),.075)
    draw_boot(ankle)

def draw_torso():
    segment((0,3.85,0),(0,6.18,0),(1.13,1.67),SKIN,depth=.49,sides=8)
    # Broad toy pectorals with a deliberate narrow central groove.
    for x in [-.75,.75]:
        block((x,5.73,.64),(1.42,1.04,.44),SKIN_LIGHT,.19)
    block((0,4.61,.54),(1.78,1.05,.36),SKIN,.19)
    for yy,ww in [(4.98,1.47),(4.58,1.32)]:
        for x in [-ww/4,ww/4]:
            block((x,yy,.72),(ww/2-.055,.35,.105),(223,141,77),.065)
    segment((0,6.03,0),(0,6.71,0),(.48,.46),SKIN)
    for x in [-1,1]:
        segment((x*.38,6.31,0),(x*1.48,6.06,0),(.40,.49),SKIN_LIGHT,.96)

def draw_costume():
    block((0,3.91,.025),(2.38,.93,1.33),RED,.17)
    block((0,4.35,.015),(2.39,.24,1.36),(243,178,25),.055)
    # Original angular chevrons, repeated on the two front panels.
    for s in [-1,1]:
        patch([(s*.72,4.18,.711),(s*1.08,4.18,.711),(s*.80,3.68,.711),(s*.34,3.55,.711),(s*.58,3.90,.711)],GOLD)
    block((0,4.34,.723),(.37,.29,.08),RED,.04)
    patch([(-.10,4.33,.78),(0,4.44,.78),(.10,4.33,.78),(0,4.24,.78)],(255,215,59))

def draw_hand(center, rotation=None):
    c=np.array(center)
    rot=np.eye(3) if rotation is None else rotation
    block(c,(.93,.86,.88),SKIN_LIGHT,.16,rot)
    def local(v): return c+rot@np.array(v)
    for x in [-.30,-.10,.10,.30]:
        block(local((x,.14,.405)),(.185,.40,.15),SKIN_LIGHT,.06,rot)
    block(local((.41,-.16,.18)),(.32,.50,.46),SKIN,.09,rot)
    for x in [-.2,0,.2]:
        block(local((x,.11,.491)),(.022,.20,.012),(154,81,47),.004,rot)

def draw_arm(shoulder,elbow,wrist,hand):
    ellipsoid(shoulder,(.67,.64,.62),SKIN_LIGHT,rings=7,sides=12)
    a,b,c,h=map(lambda p:np.array(p,float),(shoulder,elbow,wrist,hand))
    segment(a+(b-a)*.12,b,(.59,.45),SKIN_LIGHT)
    ellipsoid(b,(.40,.40,.40),(181,98,55),rings=6)
    segment(b+(c-b)*.12,c,(.48,.39),SKIN_LIGHT)
    direction=unit(h-c)
    segment(c-direction*.17,c+direction*.16,(.44,.44),RED,1.02)
    segment(c-direction*.12,c-direction*.055,(.454,.454),(249,68,63),1.02)
    draw_hand(h,basis(c,h))

def draw_hair():
    # Sculpted separate locks behind the head and beside the cheeks.
    for i in range(11):
        a=math.pi*(.04+.92*i/10)
        x=.84*math.cos(a); z=-.24-.39*math.sin(a)
        end=(x*1.13,6.17+.13*math.cos(i*2),z+.04)
        segment((x*.90,7.82,z),end,(.24,.16),(218+int(i%3)*10,153+int(i%4)*10,34),.68,7)
    for s in [-1,1]:
        for j in range(3):
            segment((s*(.73+j*.095),7.63,.10-j*.19),(s*(.88+j*.09),6.30+j*.06,.15-j*.15),(.20,.115),HAIR,.60,7)

def draw_head():
    draw_hair()
    block((0,7.23,.05),(1.64,1.64,1.37),SKIN_LIGHT,.26)
    block((0,6.83,.30),(1.38,.63,1.02),SKIN_LIGHT,.20)
    for s in [-1,1]:
        block((s*.83,7.17,.08),(.24,.47,.36),SKIN,.08)
    # Eyes are inset charcoal sockets, cream sclera and blue-black pupils.
    for s in [-1,1]:
        x=s*.38
        block((x,7.40,.747),(.47,.235,.095),(108,60,36),.065)
        block((x,7.397,.80),(.365,.14,.025),(255,242,209),.035)
        block((x-.035,7.395,.825),(.11,.135,.024),(20,45,49),.025)
        block((x-.054,7.425,.842),(.026,.03,.01),(255,255,242),.005)
        patch([(x-s*.25,7.51,.85),(x+s*.24,7.67,.85),(x+s*.23,7.54,.85),(x-s*.23,7.40,.85)],HAIR)
    block((0,7.21,.82),(.29,.40,.34),SKIN_LIGHT,.085)
    block((0,7.04,.91),(.37,.16,.23),(235,149,76),.055)
    block((0,6.80,.831),(.66,.19,.035),DARK,.045)
    block((0,6.85,.86),(.52,.072,.022),(255,239,201),.015)
    # Handlebar moustache with individual tapered polygonal tufts.
    for s in [-1,1]:
        segment((s*.055,7.025,.99),(s*.49,6.995,.92),(.145,.18),HAIR,.62,8)
        segment((s*.49,7.00,.92),(s*.58,6.65,.91),(.18,.14),HAIR,.60,8)
        segment((s*.58,6.68,.91),(s*.43,6.54,.94),(.14,.065),(245,183,44),.65,7)
        for j in range(3):
            segment((s*(.18+j*.095),7.087,.999),(s*(.26+j*.10),6.985,1.022),(.018,.009),(255,225,113),.6,5)
    # Bandana wrap and original lightning diamond (no real logo).
    block((0,7.91,.04),(1.70,.43,1.43),RED,.13)
    block((0,8.065,.075),(1.55,.15,1.24),(236,36,49),.055)
    patch([(-.16,7.92,.79),(0,8.055,.79),(.16,7.92,.79),(0,7.765,.79)],GOLD)
    patch([(-.034,7.99,.801),(.04,8.005,.801),(.025,7.84,.801),(-.049,7.825,.801)],RED)
    ellipsoid((.85,7.89,-.30),(.23,.20,.21),RED,6,8)
    segment((.91,7.85,-.34),(1.37,7.22,-.43),(.17,.085),RED,.39,6)
    segment((.93,7.88,-.38),(1.53,7.55,-.55),(.16,.055),(226,35,49),.35,6)

def draw_character():
    # Named joint coordinates are the only pose-specific limb inputs.
    draw_leg((-.69,3.80,0),(-1.04,2.47,.28),(-1.28,1.04,.12))
    draw_leg((.69,3.80,0),(1.13,2.44,.43),(1.52,1.04,.35))
    draw_torso()
    draw_costume()
    draw_arm((-1.65,5.99,0),(-2.32,5.30,.08),(-2.46,6.24,.51),(-2.48,6.75,.68))
    draw_arm((1.65,5.97,0),(2.14,4.98,.05),(2.48,4.18,.46),(2.63,3.72,.64))
    draw_head()

def render_mesh(im):
    """Rasterize convex mesh faces with per-pixel z buffering at full 4x size."""
    n=im.width
    pixels=np.array(im)
    depth=np.full((n,n),-1e9,np.float32)
    for points,color,normal in FACES:
        if normal @ VIEW <= .00001:
            continue
        diffuse=max(0,float(normal @ LIGHT))
        rim=max(0,1-float(normal @ VIEW))**3
        cool=max(0,normal[0])*.19
        tint=color*(.50+.61*diffuse)+np.array([25,54,81])*cool+np.array([33,45,57])*rim
        tint=np.clip(tint,0,255)
        proj=project(points); proj[:,:2]*=SS
        for j in range(1,len(proj)-1):
            tri=proj[[0,j,j+1]]
            x0=max(0,int(np.floor(tri[:,0].min()))); x1=min(n-1,int(np.ceil(tri[:,0].max())))
            y0=max(0,int(np.floor(tri[:,1].min()))); y1=min(n-1,int(np.ceil(tri[:,1].max())))
            if x1<x0 or y1<y0: continue
            ax,ay,az=tri[0]; bx,by,bz=tri[1]; cx,cy,cz=tri[2]
            den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy)
            if abs(den)<1e-8: continue
            yy,xx=np.mgrid[y0:y1+1,x0:x1+1].astype(np.float32)
            u=((by-cy)*(xx+.5-cx)+(cx-bx)*(yy+.5-cy))/den
            v=((cy-ay)*(xx+.5-cx)+(ax-cx)*(yy+.5-cy))/den
            w=1-u-v
            zz=u*az+v*bz+w*cz
            area=depth[y0:y1+1,x0:x1+1]
            mask=(u>=-1e-5)&(v>=-1e-5)&(w>=-1e-5)&(zz>area)
            # A restrained vertical material gradient preserves the polygon facets.
            grad=1+.025*(.5-yy/n)
            rgb=np.clip(grad[:,:,None]*tint,0,255).astype(np.uint8)
            pixels[y0:y1+1,x0:x1+1][mask]=rgb[mask]
            area[mask]=zz[mask]
    return Image.fromarray(pixels)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=Path(__file__).with_suffix('.png'))
    args=parser.parse_args()
    FACES.clear()
    background=draw_shadow(draw_background(SIZE*SS))
    draw_character()
    result=render_mesh(background).resize((SIZE,SIZE),Image.Resampling.LANCZOS)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    result.save(args.output)
    print(f'Rendered {len(FACES)} procedural faces at {SS}x supersampling: {args.output}')

if __name__=='__main__':
    main()

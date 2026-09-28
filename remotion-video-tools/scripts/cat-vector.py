from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from skimage import measure
D="/home/user/MyFirst/remotion-video-tools/public/local/cat/"
def masks(rgb):
    a=rgb.astype(int);R,G,B=a[:,:,0],a[:,:,1],a[:,:,2];s=a.sum(2)
    red=(R>G+50)&(R>B+50)&(R>120)
    black=(s<420)&~red
    return red,black
def path_of(mask,tol=0.7):
    cs=measure.find_contours(mask.astype(float),0.5);out=[]
    for c in cs:
        if len(c)<8: continue
        c=measure.approximate_polygon(c,tolerance=tol)
        out.append("M"+" L".join(f"{x:.1f} {y:.1f}" for y,x in c)+" Z")
    return " ".join(out)
def svg(W,H,parts,extra=""):
    body="".join(f'<path d="{d}" fill="{col}" fill-rule="evenodd"/>' for col,d in parts if d)+extra
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" shape-rendering="geometricPrecision">{body}</svg>'
def interior(red,black,seed):
    free=~(red|black);lab=measure.label(free,connectivity=1);return lab==lab[seed[1],seed[0]]
# ——— тело (без ладошки и предплечья, край и воротник уже дорисованы в body.png) ———
body=np.array(Image.open(D+"body.png").convert("RGB"));H,W=body.shape[:2]
red,black=masks(body)
em=np.array(Image.open(D+"edge-mask.png").convert("L"))>127
ext=interior(red,black|em,(2,2))                 # наружное белое поле (край под лапой — граница)
inner=~ext&~red&~black&~em                       # белая внутренность фигурки
sil=red|black|inner|em
# Край тела под лапой в body.png нарисован растром и при обводке даёт пилу —
# поверх кладём ту же кривую гладким вектором чуть шире растровой.
EDGE="M893 548 C878 640 952 740 949 946"
open(D+"body-red.svg","w").write(svg(W,H,[("#e61e24",path_of(sil))],
    f'<path d="{EDGE}" fill="none" stroke="#e61e24" stroke-width="64" stroke-linecap="round"/>'))
# Окно под ладошку: белая внутренность тела рисуется ПОВЕРХ руки и прячет всё,
# что рука заносит внутрь тела при движении, — кроме самой ладошки, для неё в
# белом оставлено окно; под окном — отдельная белая заплатка, чтобы в
# прозрачной версии не было дыры.
_core=[(880,663),(920,652),(960,650),(1000,655),(1040,670),(1070,696),(1086,730),(1088,780),(1078,820),(1058,848),(1030,860),(1000,852),(975,840),(950,844),(925,853),(898,849),(878,838),(858,817),(841,792),(834,760),(837,725),(845,704),(855,690)]
_pc=Image.new("L",(W,H),0);ImageDraw.Draw(_pc).polygon(_core,fill=255)
yy0=np.arange(H)[:,None]
_dia=[(884,604),(900,614),(944,652),(950,672),(905,706),(876,720),(858,650),(864,622)]
_pd=Image.new("L",(W,H),0);ImageDraw.Draw(_pd).polygon(_dia,fill=255)
# Окно: ладошка с запасом на ход вниз-влево, предплечье в покое; у самого
# воротника (x < 835, y 686–712) окна нет — туда при движении заходят концы штрихов.
hole=((np.array(_pc.filter(ImageFilter.MaxFilter(51)))>0)&(yy0>712))|((np.array(_pc.filter(ImageFilter.MaxFilter(11)))>0)&(yy0>686))|(np.array(_pd.filter(ImageFilter.MaxFilter(9)))>0)
open(D+"body-white.svg","w").write(svg(W,H,[("#ffffff",path_of((inner|black|em)&~hole))]))
open(D+"body-under.svg","w").write(svg(W,H,[("#ffffff",path_of((inner|em)&hole))]))
# край тела — отдельный слой: он должен лежать ПОД заливкой предплечья, а штрихи тела — над ней
# Под рукой: край тела и продолжение воротника до края — в покое скрыты
# предплечьем, при движении руки выглядят как продолжение рисунка.
open(D+"body-edge.svg","w").write(svg(W,H,[],
    f'<path d="{EDGE}" fill="none" stroke="#000000" stroke-width="26" stroke-linecap="round"/>'
    '<polygon points="826,612 886,602 896,660 826,684" fill="#000000"/>'))
open(D+"body-black.svg","w").write(svg(W,H,[("#000000",path_of(black))]))
# ——— рука целиком: ладошка + предплечье + их красная кайма, из исходника ———
src=np.array(Image.open(D+"open.png").convert("RGB"))
yy=np.arange(H)[:,None];xx=np.arange(W)[None,:]
core=[(880,663),(920,652),(960,650),(1000,655),(1040,670),(1070,696),(1086,730),(1088,780),(1078,820),(1058,848),(1030,860),(1000,852),(975,840),(950,844),(925,853),(898,851),(878,838),(858,817),(841,792),(834,760),(837,725),(845,704),(855,690)]
diamond=[(884,604),(900,614),(944,652),(950,672),(905,706),(876,720),(858,650),(864,622)]
pc=Image.new("L",(W,H),0);ImageDraw.Draw(pc).polygon(core,fill=255)
pd=Image.new("L",(W,H),0);ImageDraw.Draw(pd).polygon(diamond,fill=255)
rf,bf=masks(src)
zone=((np.array(pc.filter(ImageFilter.MaxFilter(41)))>0)&(yy>=644))|(np.array(pd.filter(ImageFilter.MaxFilter(13)))>0)|(rf&(xx>930)&(yy>586)&(yy<716)&(xx<1035))
zone&=~((yy>880)&(xx<962))                       # кайма тела под лапой — не рука
palm_in=interior(rf,bf,(960,750));arm_in=interior(rf,bf,(900,650))
inner=(palm_in|arm_in)&zone
r2=rf&zone;b2=bf&zone
from scipy import ndimage
r2d=ndimage.binary_dilation(r2,iterations=2)
open(D+"arm.svg","w").write(svg(W,H,[("#e61e24",path_of(r2d|b2)),("#ffffff",path_of(inner|b2)),("#000000",path_of(b2))]))
# ——— глаза ———
def eyes(kind):
    el=[]
    for cx in (505,735):
        if kind=="closed":
            el.append(f'<ellipse cx="{cx}" cy="425" rx="60" ry="58" fill="#fff"/>')
            el.append(f'<path d="M{cx-40} 447 A42 32 0 0 1 {cx+40} 447" fill="none" stroke="#000" stroke-width="17" stroke-linecap="round"/>')
        else:
            el.append(f'<rect x="{cx-58}" y="365" width="116" height="60" fill="#fff"/>')
            el.append(f'<path d="M{cx-40} 442 A42 32 0 0 1 {cx+40} 442" fill="none" stroke="#000" stroke-width="17" stroke-linecap="round"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{"".join(el)}</svg>'
open(D+"eyes-closed.svg","w").write(eyes("closed"));open(D+"eyes-half.svg","w").write(eyes("half"))
import os;print({f:os.path.getsize(D+f)//1024 for f in os.listdir(D) if f.endswith(".svg")})

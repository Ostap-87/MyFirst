from PIL import Image, ImageDraw, ImageFilter
import numpy as np
D="/home/user/MyFirst/remotion-video-tools/public/local/cat/"
im=Image.open(D+"open.png").convert("RGBA");W,H=im.size
ImageDraw.Draw(im).ellipse((627-120,855-120,627+120,855+120),fill=(255,255,255,255))   # кружок на груди
a=np.array(im).astype(int);Ssum=a[:,:,:3].sum(2);nonwhite=Ssum<720
red=(a[:,:,0]>170)&(a[:,:,1]<90)&(a[:,:,2]<90);pink=(a[:,:,0]>a[:,:,1]+40)&(a[:,:,0]>a[:,:,2]+40)
yy=np.arange(H)[:,None];xx=np.arange(W)[None,:]
core=[(880,663),(920,652),(960,650),(1000,655),(1040,670),(1070,696),(1086,730),(1088,780),(1078,820),(1058,848),(1030,856),(1000,850),(975,840),(950,844),(925,851),(898,849),(878,836),(858,815),(841,790),(834,760),(837,725),(845,704),(855,690)]
diamond=[(884,604),(900,614),(944,652),(950,672),(905,706),(876,720),(858,650),(864,622)]
pc=Image.new("L",(W,H),0);ImageDraw.Draw(pc).polygon(core,fill=255);mc=np.array(pc.filter(ImageFilter.GaussianBlur(0.6)))
pd=Image.new("L",(W,H),0);ImageDraw.Draw(pd).polygon(diamond,fill=255);md=np.array(pd)>0
band=pink&(xx>935)&(yy>590)&(yy<716)&(xx<1035)
# 1) ладошка
rgba=np.array(im);rgba[:,:,3]=mc;rgba[mc==0]=(255,255,255,0);Image.fromarray(rgba).save(D+"paw.png")
# 2) тело: без ладошки, предплечья и его каймы; край тела под лапой дорисован
big=np.array(pc.filter(ImageFilter.MaxFilter(45)))>0;mid=np.array(pc.filter(ImageFilter.MaxFilter(13)))>0
edge_zone=(xx>=926)&(xx<=1000)&(yy>=860)&(yy<=944)
rest=(xx>936)&(xx<1040)&(yy>590)&(yy<716)          # всё правее плеча — остатки старой каймы          # старый контур ниже лапы — заменяем целиком
arm_in=Image.new("L",(W,H),0);ImageDraw.Draw(arm_in).polygon([(898,606),(950,660),(900,704),(852,644)],fill=255)   # внутренность предплечья — пусто
wm=(big&(yy>716))|(mid&(yy<=716))|md|band|edge_zone|rest|(np.array(arm_in)>0)
base=im.copy();base.paste(Image.new("RGBA",(W,H),(255,255,255,255)),(0,0),Image.fromarray((wm*255).astype(np.uint8)))
d=ImageDraw.Draw(base)
def bez(p0,p1,p2,p3,n=160):
    return [((1-t)**3*p0[0]+3*(1-t)**2*t*p1[0]+3*(1-t)*t**2*p2[0]+t**3*p3[0],(1-t)**3*p0[1]+3*(1-t)**2*t*p1[1]+3*(1-t)*t**2*p2[1]+t**3*p3[1]) for t in [i/n for i in range(n+1)]]
# штрих 18 px, кайма 20 px — как у исходного контура (замер при y=920: чёрный 942–959, красный 960–980)
curve=bez((893,548),(878,640),(952,740),(949,946))   # конец — там, где исходный контур ещё вертикален
# Сам край в body.png не рисуем — его кладёт вектором catvec.py. Здесь только
# маска-граница, чтобы заливка тела при обводке не вытекала под лапу.
em=Image.new("L",(W,H),0);ImageDraw.Draw(em).line(curve,fill=255,width=22,joint="curve");em.save(D+"edge-mask.png")
collar=[(826,612),(892,562),(896,660),(826,684)];wedge=[(836,608),(870,594),(882,616),(848,642)]
d.polygon(collar,fill=(0,0,0,255));d.polygon(wedge,fill=(0,0,0,255))
base.save(D+"body.png")
# 3) плечо: штрих головы с каймой и воротник — поверх заливки предплечья
zone=(xx>=790)&(xx<=935)&(yy>=500)&(yy<=705)
keep=nonwhite&zone&~md&~band
src=np.array(im);al=np.where(keep,255,0).astype(float)
soft=np.clip((760-Ssum)*2,0,255);edge=zone&~md&~band&(al==0)&(soft>0);al=np.where(edge,soft,al)
src[:,:,3]=al.astype(np.uint8);src[al==0]=(0,0,0,0)
sh=Image.fromarray(src);ds=ImageDraw.Draw(sh);ds.polygon(collar,fill=(0,0,0,255));ds.polygon(wedge,fill=(0,0,0,255));sh.save(D+"shoulder.png")
print("layers ok")

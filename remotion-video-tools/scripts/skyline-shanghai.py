# Векторный силуэт Шанхая: синий на белом, окна — тонкие белые линии. Рисуется PIL, без внешних картинок.
from PIL import Image, ImageDraw
import random
BLUE=(2,71,223); LIGHT=(120,160,240); MID=(60,110,232)
def skyline(W,H,cx,base=None,scale=1.0):
    base=base or H+30
    im=Image.new('RGB',(W,H),(255,255,255)); d=ImageDraw.Draw(im)
    rnd=random.Random(7)
    def block(x,w,h,col,win=True,step=14):
        d.rectangle((x,base-h,x+w,base),fill=col)
        if win:
            for y in range(int(base-h)+10,int(base),step): d.line((x+4,y,x+w-4,y),fill=(255,255,255),width=2)
    # дальний план — светлые
    for i in range(16):
        w=rnd.randint(40,90)*scale; h=rnd.randint(160,360)*scale; x=cx-760*scale+i*100*scale+rnd.randint(-15,15)
        block(x,w,h,LIGHT,step=12)
    # средний план
    for i in range(9):
        w=rnd.randint(60,120)*scale; h=rnd.randint(240,460)*scale; x=cx-640*scale+i*160*scale+rnd.randint(-20,20)
        block(x,w,h,MID)
    # Jin Mao — ступенчатая
    x=cx+120*scale; w=100*scale; h=560*scale
    for k,(fw,fh) in enumerate(((1.0,0.55),(0.8,0.75),(0.62,0.9),(0.42,1.0))):
        block(x+w*(1-fw)/2,w*fw,h*fh,BLUE,step=12)
    d.polygon((x+w/2-8,base-h,x+w/2+8,base-h,x+w/2,base-h-70*scale),fill=BLUE)
    # SWFC — с трапецией-«открывашкой» наверху
    x=cx+330*scale; w=110*scale; h=640*scale
    d.polygon((x,base,x+w,base,x+w*0.78,base-h,x+w*0.22,base-h),fill=BLUE)
    d.polygon((x+w*0.34,base-h+8,x+w*0.66,base-h+8,x+w*0.58,base-h+110*scale,x+w*0.42,base-h+110*scale),fill=(255,255,255))
    for y in range(int(base-h)+130,int(base),14): d.line((x+16,y,x+w-16,y),fill=(255,255,255),width=2)
    # Shanghai Tower — самая высокая, со скосом
    x=cx+470*scale; w=120*scale; h=740*scale
    d.polygon((x,base,x+w,base,x+w*0.85,base-h*0.97,x+w*0.25,base-h),fill=BLUE)
    for y in range(int(base-h)+30,int(base),16): d.line((x+14,y,x+w-14,y),fill=(255,255,255),width=2)
    # Восточная жемчужина
    x=cx-160*scale; h=700*scale
    d.polygon((x-38*scale,base,x-8*scale,base,x-4*scale,base-h*0.5,x-14*scale,base-h*0.5),fill=BLUE)
    d.polygon((x+38*scale,base,x+8*scale,base,x+4*scale,base-h*0.5,x+14*scale,base-h*0.5),fill=BLUE)
    d.rectangle((x-9*scale,base-h,x+9*scale,base),fill=BLUE)
    d.rectangle((x-6*scale,base-h-90*scale,x+6*scale,base-h),fill=BLUE)   # шпиль
    for cy,r in ((base-h*0.5,72*scale),(base-h*0.82,44*scale),(base-h*0.97,18*scale)):
        d.ellipse((x-r,cy-r,x+r,cy+r),fill=BLUE); d.ellipse((x-r*0.55,cy-r*0.55,x-r*0.15,cy-r*0.15),fill=(255,255,255))
    d.rectangle((x-80*scale,base-70*scale,x+80*scale,base),fill=BLUE)
    return im
if __name__=='__main__':
    skyline(1920,1080,1050).save('out/deck/skyline-test.png')

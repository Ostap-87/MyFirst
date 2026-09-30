# Перекраска робота-персонажа: синие акценты (очки, кабели, город на пиджаке) → другой цвет,
# белый корпус не трогаем. Режимы: hue <градусы> — сдвиг оттенка; mono <hex> — весь робот в дуотон.
# python3 scripts/deck-robot-recolor.py hue 120 out.png | mono e61e24 out.png
import sys, os, numpy as np
from PIL import Image
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D=os.path.join(ROOT,'public','local','deck')+os.sep
mode,val,out=sys.argv[1],sys.argv[2],sys.argv[3]
im=Image.open(D+'ref-robot.png').convert('RGBA'); a=np.array(im).astype(float)
rgb,al=a[:,:,:3],a[:,:,3]
if mode=='hue':
    hsv=np.array(Image.fromarray(rgb.astype(np.uint8)).convert('HSV')).astype(float)
    h,s,v=hsv[:,:,0],hsv[:,:,1],hsv[:,:,2]
    blue=(h>130)&(h<190)&(s>60)                     # синие оттенки (H в 0..255)
    h=np.where(blue,(h+float(val)*255/360)%255,h)
    hsv=np.dstack([h,s,v]).astype(np.uint8)
    rgb=np.array(Image.fromarray(hsv,'HSV').convert('RGB')).astype(float)
elif mode=='mono':
    c=np.array([int(val[i:i+2],16) for i in (0,2,4)],float)
    g=(rgb@[0.299,0.587,0.114])[:,:,None]/255.0    # 0 — тёмное → цвет, 1 — светлое → белый
    rgb=c*(1-g)+255*g
Image.fromarray(np.dstack([rgb,al]).astype(np.uint8),'RGBA').save(out)

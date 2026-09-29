# Обложка презентации GTT: робот с «двойной экспозицией» города — слой 1920×1080 RGBA.
# Вход: public/local/deck/robot-cut.png (вырезка rembg из public/generated/robotics-expedition-v2/shanghai-v2.png),
# силуэт города — scripts/skyline-shanghai.py (вектор, PIL). Выход: public/local/deck/robot-city.png.
# Запуск: python3 scripts/deck-cover-robot.py [масштаб робота] [центр X] [верх головы Y] [масштаб города]
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import numpy as np, sys
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D=os.path.join(ROOT,'public','local','deck')+os.sep
SK=os.path.join(ROOT,'scripts','skyline-shanghai.py')
W,H=1920,1080
BLUE=np.array([2,71,223],float)
robot=Image.open(D+'robot-cut.png').convert('RGBA')
a=np.array(robot)[:,:,3]; ys,xs=np.where(a>10); top,bot,l,r=ys.min(),ys.max(),xs.min(),xs.max()
cx=(l+r)/2
scale=float(sys.argv[1]) if len(sys.argv)>1 else 1.55
CX=float(sys.argv[2]) if len(sys.argv)>2 else 1050
TOP=float(sys.argv[3]) if len(sys.argv)>3 else 40
rw,rh=int(robot.size[0]*scale),int(robot.size[1]*scale)
rb=robot.resize((rw,rh),Image.LANCZOS)
ox=int(CX-cx*scale); oy=int(TOP-top*scale)
layer=Image.new('RGBA',(W,H),(0,0,0,0)); layer.paste(rb,(ox,oy),rb)
# город: векторный силуэт Шанхая (skyline.py)
import importlib.util
spec=importlib.util.spec_from_file_location('sk',SK); sk=importlib.util.module_from_spec(spec); spec.loader.exec_module(sk)
TX=CX+95                                                                 # центр корпуса (bbox робота включает руки)
full=sk.skyline(W,H,TX-30,base=H+30,scale=float(sys.argv[4]) if len(sys.argv)>4 else 0.55)
# маска: альфа робота × вертикальный градиент (грудь → низ)
L=np.array(layer).astype(float); alpha=L[:,:,3]/255.0
yy=np.arange(H)[:,None].repeat(W,1)
grad=np.clip((yy-(oy+0.30*rh))/(0.30*rh),0,1)**1.2
xx=np.arange(W)[None,:].repeat(H,0)
win=np.clip(1-(np.abs(xx-TX)-170)/130,0,1)          # только корпус и ноги, руки не трогаем
m=alpha*grad*win
rgb=L[:,:,:3]; cityrgb=np.array(full).astype(float)
out=rgb*(1-m[:,:,None])+ (rgb*cityrgb/255.0)*m[:,:,None]                # multiply внутри маски
res=np.dstack([np.clip(out,0,255),L[:,:,3]]).astype(np.uint8)
Image.fromarray(res,'RGBA').save(D+'robot-city.png'); print('ok',ox,oy,rw,rh)

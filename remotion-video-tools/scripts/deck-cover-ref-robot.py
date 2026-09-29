# Вырезка робота из референс-обложки GTT: буквы там залиты плоским синим #0247DF,
# а робот стоит поверх них, поэтому силуэт целый. Всё нежелтое-небелое минус синие
# буквы (с запасом 3 px под сглаживание) → самая большая компонента с головой →
# заливка дыр (город в пиджаке и очки). Выход: public/local/deck/ref-robot.png (RGBA).
import os, numpy as np
from PIL import Image
from scipy import ndimage
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D=os.path.join(ROOT,'public','local','deck')+os.sep
im=Image.open(D+'ref-cover.webp').convert('RGB'); a=np.array(im).astype(int); H,W=a.shape[:2]
s=a.sum(2); nonwhite=s<735
blue=np.abs(a-np.array([2,71,223])).sum(2)<70                      # плоская заливка букв
blue=ndimage.binary_dilation(blue,iterations=3)
yy,xx=np.mgrid[0:H,0:W]
cand=nonwhite&~blue&~((xx>1560)&(yy>720))                           # правый низ — скобка и подпись
lab,n=ndimage.label(cand); keep=lab==lab[300,1050]                   # компонента с головой
pad=np.vstack([keep,np.ones((1,W),bool)]); keep=ndimage.binary_fill_holes(pad)[:-1]   # низ открыт — дыры закрываем через «пол»
keep=ndimage.binary_opening(keep,iterations=2)
lab,n=ndimage.label(keep); keep=lab==lab[300,1050]
alpha=ndimage.gaussian_filter(keep.astype(float),0.8)
rgba=np.dstack([a.clip(0,255),(alpha*255)]).astype(np.uint8)
Image.fromarray(rgba,'RGBA').save(D+'ref-robot.png')
ys,xs=np.where(keep); print('robot bbox x',xs.min(),xs.max(),'y',ys.min(),ys.max(),'area',keep.sum())

# Flatten transparent PNG frames onto a cream background for review.
import sys
from PIL import Image
for f in sys.argv[1:]:
    im=Image.open(f).convert('RGBA')
    bg=Image.new('RGBA',im.size,(250,247,240,255))
    bg.alpha_composite(im)
    out=f.replace('.png','_v.jpg')
    bg.convert('RGB').save(out,quality=88)
    print(out, im.getpixel((5,5)))

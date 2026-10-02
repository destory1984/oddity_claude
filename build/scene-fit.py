# Fits a picture ordered with build/art-order.sh to the size the game uses.
#   python -X utf8 build/scene-fit.py scene <in.png> <out.png> [width height]   (default 384 216)
#     a 16:9 scene: cropped to the ratio, shrunk to its pixel grid, 64 colours.
#   python -X utf8 build/scene-fit.py card <in.png> <out.png> [width height]    (default 384 192)
#     a drawing on a plain magenta ground: the ground made transparent (hard-edged), the
#     drawing trimmed, shrunk to fit and set on the bottom middle of a clear canvas.
import sys

import numpy as np
from PIL import Image

mode, src, out = sys.argv[1:4]
size = tuple(int(n) for n in sys.argv[4:6]) or ((384, 216) if mode == 'scene' else (384, 192))
im = Image.open(src).convert('RGB')

if mode == 'scene':
    want = size[0] / size[1]
    w, h = im.size
    if w / h > want:
        cut = int(round(h * want))
        im = im.crop(((w - cut) // 2, 0, (w - cut) // 2 + cut, h))
    else:
        cut = int(round(w / want))
        im = im.crop((0, (h - cut) // 2, w, (h - cut) // 2 + cut))
    im = im.resize(size, Image.BOX).quantize(64, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    im.save(out, optimize=True)
else:
    a = np.asarray(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # Magenta: red and blue high, green well under both.
    ground = (r > 150) & (b > 150) & (g < np.minimum(r, b) - 60)
    ys, xs = np.nonzero(~ground)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    rgba = np.dstack([a, np.where(ground, 0, 255)]).astype('uint8')
    cut = Image.fromarray(rgba, 'RGBA').crop(box)
    scale = min(size[0] / cut.width, size[1] / cut.height)
    new = (max(1, round(cut.width * scale)), max(1, round(cut.height * scale)))
    # Shrink colour and coverage apart, so the magenta never bleeds into the edge.
    rgb = Image.fromarray(np.where(ground[..., None], 0, a).astype('uint8'), 'RGB').crop(box)
    cover = cut.getchannel('A').resize(new, Image.BOX)
    weight = np.maximum(np.asarray(cover).astype(float) / 255, 1e-6)
    small = np.asarray(rgb.resize(new, Image.BOX)).astype(float) / weight[..., None]
    small = Image.fromarray(np.clip(small, 0, 255).astype('uint8'), 'RGB').quantize(48, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    alpha = cover.point(lambda v: 255 if v >= 128 else 0)
    small.putalpha(alpha)
    canvas = Image.new('RGBA', size, (0, 0, 0, 0))
    canvas.alpha_composite(small, ((size[0] - new[0]) // 2, size[1] - new[1]))
    canvas.save(out, optimize=True)
print(out, Image.open(out).size)

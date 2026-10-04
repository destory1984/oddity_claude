# Take the lines of latitude and longitude out of a map that was published with them
# drawn in (Voyager 2's map of Triton, PIA18668: a line every 30 degrees). Each line is
# a pixel or two wide: the strip it lies in is painted over with a blend of the pixels
# on either side of it. usage: ungrid-map.py in.jpg out.jpg [degrees between lines]
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
step = float(sys.argv[3]) if len(sys.argv) > 3 else 30.0
img = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
h, w, _ = img.shape
# A drawn line is darker than what is beside it along most of its length (Triton's: over
# 80%). A column that merely crosses many craters is so along a fifth or a third.
DRAWN = 0.6
# How far either side of a line the strip reaches, and where the blend is taken from.
HALF = 2
FROM = 4


def strip(a, at, length):
    """Paint over the strip round position `at` along axis 1 of a (wraps round)."""
    lo, hi = int(np.floor(at)) - HALF, int(np.ceil(at)) + HALF
    left = a[:, (lo - FROM + np.arange(FROM)) % length].mean(axis=1)
    right = a[:, (hi + 1 + np.arange(FROM)) % length].mean(axis=1)
    for k, x in enumerate(range(lo, hi + 1)):
        t = (k + 1) / (hi - lo + 2)
        a[:, x % length] = left * (1 - t) + right * t


def darker(a, at, length):
    """How much of the line at `at` is darker than the pixels beside it: the larger of
    its two halves, since a map may be drawn on one half only (Triton's north is filled in).
    A line between two pixels may show in either: both are looked at."""
    best = 0.0
    for x in {int(np.floor(at)) % length, int(np.ceil(at)) % length}:
        beside = (a[:, (x - 3) % length] + a[:, (x + 3) % length]) / 2
        dark = (a[:, x] - beside).mean(axis=1) < -3
        half = len(dark) // 2
        best = max(best, float(dark[:half].mean()), float(dark[half:].mean()))
    return best


found = []
# Lines of longitude: columns, the left edge included (it is the same line as the right).
for k in range(int(round(360 / step))):
    at = k * w * step / 360
    if darker(img, at, w) > DRAWN:
        strip(img, at, w)
        found.append(f'lon {k * step - 180:g}')
# Lines of latitude: rows. Turn the picture on its side and do the same; no wrap matters
# here because the poles themselves carry no line.
turned = np.swapaxes(img, 0, 1).copy()
for k in range(1, int(round(180 / step))):
    at = k * h * step / 180
    if darker(turned, at, h) > DRAWN:
        strip(turned, at, h)
        found.append(f'lat {90 - k * step:g}')
out = np.swapaxes(turned, 0, 1)
Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save(dst, quality=92)
print('painted over:', ', '.join(found))

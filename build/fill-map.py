# Fill the part of a map that has no data (black) by carrying the colours at its edge
# into it, soft and seamless. usage: fill_map.py in.jpg out.jpg [preview.png]
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
img = np.asarray(Image.open(src).convert('RGB')).astype(np.float64) / 255
h, w, _ = img.shape
lum = img @ np.array([0.299, 0.587, 0.114])
valid = lum > 0.07
if lum[-1].min() > 0.07 and lum[-1].std() < 0.005 and lum[0].std() > 0.005:
    # No black: the gap was painted one flat shade, up from the bottom edge.
    shade = np.median(img[-1], axis=0)
    flat = (np.abs(img - shade).max(axis=2) < 0.03)
    hole = np.cumprod(flat[::-1], axis=0)[::-1].astype(bool)
    valid = ~hole
# The edge of the data is dark and jagged from compression: step back from it.

def blur(a, sigma):
    # Gaussian blur by FFT: wraps left to right; top and bottom are padded with the edge row.
    p = min(int(3 * sigma) + 1, a.shape[0])
    b = np.pad(a, ((p, p), (0, 0)), mode='edge')
    fy = np.fft.fftfreq(b.shape[0])[:, None]
    fx = np.fft.fftfreq(b.shape[1])[None, :]
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (fx * fx + fy * fy))
    return np.real(np.fft.ifft2(np.fft.fft2(b) * g))[p:-p]

valid = blur(valid.astype(np.float64), 3) > 0.97

print('no data: %.1f%%' % (100 * (1 - valid.mean())))
m = valid.astype(np.float64)
fill = np.zeros_like(img)
known = np.zeros((h, w), bool)
for sigma in [3, 6, 12, 24, 48, 96, 192, 384]:
    weight = blur(m, sigma)
    ok = (weight > 0.02) & ~known
    if ok.any():
        for c in range(3):
            fill[..., c][ok] = (blur(img[..., c] * m, sigma) / np.maximum(weight, 1e-9))[ok]
        known |= ok
if not known.all():
    mean = img[valid].mean(axis=0)
    fill[~known] = mean
# Smooth the fill itself, so the steps between scales do not show.
hole = ~valid
for c in range(3):
    f = np.where(hole, fill[..., c], img[..., c])
    for _ in range(3):
        f = np.where(hole, blur(f, 10), img[..., c])
    fill[..., c] = f
# Toward a pole every longitude is the same spot: run the rows together there.
rows = np.arange(h)[:, None]
lat = np.abs(rows / (h - 1) - 0.5) * 2            # 0 at the equator, 1 at a pole
to_mean = np.clip((lat - 0.75) / 0.2, 0, 1)
for c in range(3):
    row_mean = fill[..., c].mean(axis=1, keepdims=True)
    fill[..., c] = np.where(hole, fill[..., c] * (1 - to_mean) + row_mean * to_mean, fill[..., c])
# Feather across the edge.
soft = np.clip(blur(m, 5) * 1.6 - 0.3, 0, 1)[..., None]
out = img * soft + fill * (1 - soft)
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst, quality=90)
if len(sys.argv) > 3:
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).resize((1024, 512)).save(sys.argv[3])

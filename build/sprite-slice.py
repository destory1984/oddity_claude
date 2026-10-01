# Cuts a painted four-frame sheet (2172x724) into 192x256 frames by the gaps between
# the figures, not by equal cells: a ribbon that flies past its cell's edge is kept
# whole. Each figure is placed with its feet (the lowest sixth of it) centred, at the
# sheet's own height, so the body does not jump between frames.
#   python -X utf8 build/sprite-slice.py assets/land-touch-sheet.png out-folder [dx dy]
# dx, dy: move every frame by this many pixels (to line the feet up with another sheet).
# Then run build/sprite-clean.py on the frames it writes.
import sys
from pathlib import Path

import numpy as np
from PIL import Image

FRAME = (192, 256)
sheet_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
dx, dy = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (0, 0)
sheet = Image.open(sheet_path).convert('RGBA')
scale = FRAME[1] / sheet.height
alpha = np.array(sheet)[..., 3] >= 128
filled = alpha.any(axis=0)

# Runs of filled columns; the three widest gaps between them part the four figures.
runs = []
start = None
for x, on in enumerate(list(filled) + [False]):
    if on and start is None:
        start = x
    elif not on and start is not None:
        runs.append([start, x])
        start = None
gaps = sorted(range(len(runs) - 1), key=lambda i: runs[i + 1][0] - runs[i][1], reverse=True)[:3]
figures = []
first = 0
for cut in sorted(gaps):
    figures.append((runs[first][0], runs[cut][1]))
    first = cut + 1
figures.append((runs[first][0], runs[-1][1]))
assert len(figures) == 4, figures

name = sheet_path.name.replace('-sheet.png', '')
out_dir.mkdir(parents=True, exist_ok=True)
for k, (left, right) in enumerate(figures):
    part = alpha[:, left:right]
    rows = np.nonzero(part.any(axis=1))[0]
    top, bottom = rows[0], rows[-1]
    feet = part[int(bottom - (bottom - top) / 6):bottom + 1]
    cols = np.nonzero(feet.any(axis=0))[0]
    middle = left + (cols[0] + cols[-1]) / 2
    width = round((right - left) * scale)
    small = sheet.crop((left, 0, right, sheet.height)).resize((width, FRAME[1]), Image.NEAREST)
    frame = Image.new('RGBA', FRAME, (0, 0, 0, 0))
    frame.paste(small, (round(FRAME[0] / 2 - (middle - left) * scale) + dx, dy))
    target = out_dir / f'{name}-{k + 1}.png'
    frame.save(target)
    print(target, 'columns', left, right, 'feet at', round(middle))

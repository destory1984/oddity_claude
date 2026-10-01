# Makes drawings sliced from a painted sheet match the other sprites: hard-edged
# transparency (no half-transparent fringe), 48 colours, and no scraps of the next
# frame at the left or right edge.
#   python -X utf8 build/sprite-clean.py assets/photo-v2-1.png ...
# Writes public/assets/seora-sprites/<same name>.
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path('public/assets/seora-sprites')
SIZE = (192, 256)
COLOURS = 47  # plus one transparent entry
SCRAP_MAX = 400  # an edge-touching island smaller than this is a scrap of the neighbour


def islands(mask):
    """Label 4-connected islands of True; returns (labels, sizes)."""
    labels = np.zeros(mask.shape, dtype=np.int32)
    sizes = [0]
    h, w = mask.shape
    for y0, x0 in zip(*np.nonzero(mask)):
        if labels[y0, x0]:
            continue
        label = len(sizes)
        labels[y0, x0] = label
        queue = deque([(y0, x0)])
        count = 0
        while queue:
            y, x = queue.popleft()
            count += 1
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = label
                    queue.append((ny, nx))
        sizes.append(count)
    return labels, sizes


def clean(path):
    image = Image.open(path).convert('RGBA')
    if image.size != SIZE:
        image = image.resize(SIZE, Image.NEAREST)
    pixels = np.array(image)
    solid = pixels[..., 3] >= 128
    labels, sizes = islands(solid)
    dropped = 0
    for label in set(labels[:, 0]) | set(labels[:, -1]):
        if label and sizes[label] < SCRAP_MAX:
            solid[labels == label] = False
            dropped += sizes[label]
    rgb = Image.fromarray(pixels[..., :3])
    # Only the solid pixels choose the palette.
    sample = Image.fromarray(pixels[..., :3][solid].reshape(-1, 1, 3))
    palette = sample.quantize(COLOURS, method=Image.MEDIANCUT)
    indexed = np.array(rgb.quantize(palette=palette, dither=Image.NONE))
    indexed[~solid] = COLOURS
    out = Image.fromarray(indexed.astype(np.uint8), 'P')
    out.putpalette(palette.getpalette()[:COLOURS * 3] + [0, 0, 0])
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / Path(path).name
    out.save(target, transparency=COLOURS, optimize=True)
    print(f'{target}: {target.stat().st_size} bytes, {dropped} px of edge scraps removed')


for name in sys.argv[1:]:
    clean(name)

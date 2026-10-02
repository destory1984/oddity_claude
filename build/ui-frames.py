"""Draw the two pictures of the screen's skin that CSS cannot draw itself: the leather
cover round the journal's page (stretched by border-image: the corners stay, the edges
and the middle stretch) and the stepped point under Seora's speech bubble.

    python build/ui-frames.py        (writes public/assets/ui/frame-book.png, bubble-tail.png)

Buttons, labels and notices have no picture: their pixel borders are shadows in
style.css. (They were stretched pictures for a day; the corners looked crude and the
stretched middle showed seams.)
"""
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'assets', 'ui')

NAVY = (10, 17, 50)
LINE = (207, 208, 242)
LINE_DIM = (122, 127, 160)
EDGE = (5, 10, 34)
GOLD = (246, 185, 81)
GOLD_DARK = (192, 122, 28)
BLUE = (61, 91, 181)
PAPER = (255, 253, 244)
INK = (26, 40, 148)
PAGE = (242, 230, 200)
BROWN = (90, 61, 34)


def inside(x, y, n, inset, notch):
    """Whether a cell is in the shape drawn `inset` cells in, with corners cut by `notch`."""
    if not (inset <= x < n - inset and inset <= y < n - inset):
        return False
    cx = min(x - inset, n - 1 - inset - x)
    cy = min(y - inset, n - 1 - inset - y)
    return cx + cy >= notch


def frame(n, rings, fill, notch, margin=0, corner=0):
    """An n x n picture. rings: colours from the outside in, one pixel thick each.
    fill: RGBA of the middle. notch: how far the corners are cut. margin: clear pixels
    left round the shape. corner: within this many pixels of a corner the pale line is
    drawn in gold (0 for none)."""
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    px = im.load()
    for y in range(n):
        for x in range(n):
            depth = 0
            while depth <= len(rings) and inside(x, y, n, margin + depth, notch):
                depth += 1
            if depth > len(rings):
                px[x, y] = fill
            elif depth > 0:
                px[x, y] = rings[depth - 1] + (255,)
            if corner and 0 < depth <= len(rings) and rings[depth - 1] == LINE:
                # The line turns gold where it rounds a corner (darker at the lower right,
                # away from the light).
                if min(x, n - 1 - x) < corner and min(y, n - 1 - y) < corner:
                    px[x, y] = (GOLD_DARK if x > n // 2 and y > n // 2 else GOLD) + (255,)
    return im


def tail():
    """The point under the speech bubble: 8 x 5 cells, paper with an ink edge."""
    w, h = 8, 5
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    for y in range(h):
        left, right = y, w - 1 - y
        for x in range(left, right + 1):
            px[x, y] = (INK if x in (left, right) or y == h - 1 else PAPER) + (255,)
    return im.resize((w * 2, h * 2), Image.NEAREST)


FRAMES = {
    # name: (size, rings, fill, notch, margin, corner). The journal as a paper notebook: a
    # worn leather cover round a cream page, each ring 2 px. CSS slices it at 12.
    'frame-book': (40, [c for c in [(43, 23, 12), (107, 61, 30), (138, 84, 40), (58, 32, 16), (217, 199, 155)] for _ in (0, 1)], PAGE + (255,), 2, 0, 0),
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, (n, rings, fill, notch, margin, corner) in FRAMES.items():
        frame(n, rings, fill, notch, margin, corner).save(os.path.join(OUT, f'{name}.png'))
    tail().save(os.path.join(OUT, 'bubble-tail.png'))
    print(len(FRAMES) + 1, 'pictures in', os.path.normpath(OUT))

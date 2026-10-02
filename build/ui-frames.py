"""Draw the frames of the flight screen's buttons, labels and notices as small pixel-art
pictures that CSS stretches (border-image: the corners stay, the edges and the middle
stretch). The look follows the mock-ups ordered on 2026-10-02 (docs/art-order-ui.md):
navy inside, a pale lavender line, cut corners, gold brackets on a button's corners.

    python build/ui-frames.py        (writes public/assets/ui/frame-*.png)

One cell of the drawing is UNIT x UNIT picture pixels, so a line is 2 px on screen.
"""
import os
from PIL import Image

UNIT = 2
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


def frame(n, rings, fill, notch, brackets=0):
    """rings: colours from the outside in, one cell thick each (None leaves it clear).
    fill: RGBA of the middle. brackets: gold on the outermost ring this far from a corner."""
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    px = im.load()
    for y in range(n):
        for x in range(n):
            depth = 0
            while depth <= len(rings) and inside(x, y, n, depth, notch):
                depth += 1
            if depth == 0:
                continue
            colour = rings[depth - 1] if depth <= len(rings) else None
            if depth > len(rings):
                px[x, y] = fill
            elif colour is not None:
                px[x, y] = colour + (255,)
            if brackets and depth == 1 and min(x, n - 1 - x) < brackets and min(y, n - 1 - y) < brackets:
                # Lit from the upper left: the lower and right brackets are a shade darker.
                px[x, y] = (GOLD_DARK if (y > n // 2 or x > n // 2) and (x + y) > n else GOLD) + (255,)
    return im.resize((n * UNIT, n * UNIT), Image.NEAREST)


def tail():
    """The point under the speech bubble: 8 x 5 cells, paper with an ink edge."""
    w, h = 8, 5
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()
    for y in range(h):
        left, right = y, w - 1 - y
        for x in range(left, right + 1):
            px[x, y] = (INK if x in (left, right) or y == h - 1 else PAPER) + (255,)
    return im.resize((w * UNIT, h * UNIT), Image.NEAREST)


FRAMES = {
    # name: (cells, rings, fill, notch, brackets). The slice is (rings + notch) cells.
    'frame-button': (16, [EDGE, LINE], NAVY + (235,), 2, 4),
    'frame-button-down': (16, [EDGE, GOLD], (26, 42, 108, 245), 2, 4),
    'frame-button-off': (16, [EDGE, LINE_DIM], NAVY + (150,), 2, 0),
    'frame-pill': (16, [EDGE, GOLD], NAVY + (235,), 2, 0),
    'frame-toast': (12, [BLUE], (8, 17, 43, 225), 1, 0),
    'frame-label': (12, [BLUE], NAVY + (120,), 1, 0),
    'frame-label-gold': (12, [GOLD], NAVY + (170,), 1, 0),
    'frame-bubble': (16, [INK], PAPER + (255,), 2, 0),
    # The journal as a paper notebook: a worn leather cover round the page, index tabs,
    # and small buttons lined in brown ink like a rubber stamp's edge.
    'frame-book': (20, [(43, 23, 12), (107, 61, 30), (138, 84, 40), (58, 32, 16), (217, 199, 155)], PAGE + (255,), 1, 0),
    'frame-paper-button': (12, [BROWN], (250, 243, 222, 255), 1, 0),
    'frame-paper-button-down': (12, [BROWN], (227, 210, 166, 255), 1, 0),
    'frame-tab': (12, [BROWN], (220, 201, 160, 255), 1, 0),
    'frame-tab-on': (12, [BROWN], (242, 193, 78, 255), 1, 0),
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, (n, rings, fill, notch, brackets) in FRAMES.items():
        frame(n, rings, fill, notch, brackets).save(os.path.join(OUT, f'{name}.png'))
    tail().save(os.path.join(OUT, 'bubble-tail.png'))
    print(len(FRAMES) + 1, 'pictures in', os.path.normpath(OUT))

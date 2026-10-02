"""Cut a sheet of white-on-black icons (ordered with build/art-order.sh, see
docs/art-order-ui.md) into the game's icons: 24 x 24, white and clear only.

    python build/ui-icons.py <sheet.png>      (writes public/assets/ui/icon-*.png)

The sheet is a grid of 4 across and 3 down, in the order of NAMES. Each icon is found
by its own bright pixels inside its cell, made square, shrunk to 24 x 24 by averaging,
and then every pixel is made either white or clear, so no grey edge is left.
"""
import os
import sys
from PIL import Image

NAMES = [
    'sound-on', 'sound-off', 'music-on', 'music-off',
    'help', 'pause', 'play', 'journal',
    'camera', 'forward', 'back', 'stop',
]
COLS, ROWS = 4, 3
SIZE = 24
# Room left round the drawing inside the 24 x 24 picture.
MARGIN = 2
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'assets', 'ui')


def cut(sheet):
    grey = sheet.convert('L')
    w, h = grey.size
    icons = []
    for i, name in enumerate(NAMES):
        col, row = i % COLS, i // COLS
        cell = grey.crop((col * w // COLS, row * h // ROWS, (col + 1) * w // COLS, (row + 1) * h // ROWS))
        mask = cell.point(lambda v: 255 if v > 110 else 0)
        box = mask.getbbox()
        if not box:
            raise SystemExit(f'nothing drawn in the cell for {name}')
        drawn = mask.crop(box)
        side = max(drawn.size)
        square = Image.new('L', (side, side), 0)
        square.paste(drawn, ((side - drawn.width) // 2, (side - drawn.height) // 2))
        inner = SIZE - 2 * MARGIN
        small = square.resize((inner, inner), Image.BOX).point(lambda v: 255 if v >= 120 else 0)
        alpha = Image.new('L', (SIZE, SIZE), 0)
        alpha.paste(small, (MARGIN, MARGIN))
        icon = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 0))
        icon.putalpha(alpha)
        icons.append((name, icon))
    return icons


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    os.makedirs(OUT, exist_ok=True)
    for name, icon in cut(Image.open(sys.argv[1])):
        icon.save(os.path.join(OUT, f'icon-{name}.png'))
    print(len(NAMES), 'icons in', os.path.normpath(OUT))

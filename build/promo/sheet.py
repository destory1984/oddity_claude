"""A sheet of stills from recorded shots, to look at before cutting.
Run: python -P build/promo/sheet.py <lang> <shot> [<shot> ...]  ->  assets/promo/<lang>/sheet.jpg
Each shot gives three stills (a fifth, half and four fifths of the way in), side by side."""
import json, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'promo')
lang, shots = sys.argv[1], sys.argv[2:]
W, H = 216, 384
sheet = Image.new('RGB', (W * 3 + 20, (H + 24) * len(shots)), (20, 20, 28))
d = ImageDraw.Draw(sheet)
for row, shot in enumerate(shots):
    folder = os.path.join(ROOT, lang, shot)
    frames = sorted(f for f in os.listdir(folder) if f.endswith('.jpg'))
    d.text((6, row * (H + 24) + 5), f'{shot} ({len(frames)} frames)', fill=(230, 230, 230))
    for col, share in enumerate((0.2, 0.5, 0.8)):
        im = Image.open(os.path.join(folder, frames[int(share * (len(frames) - 1))])).convert('RGB').resize((W, H))
        sheet.paste(im, (col * (W + 10), row * (H + 24) + 22))
out = os.path.join(ROOT, lang, 'sheet.jpg')
sheet.save(out, quality=88)
print(out)

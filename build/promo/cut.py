"""Cuts the promo video from the recorded shots (build/promo/shoot.cjs) and the captions
(build/promo/captions.cjs): each shot's stretch, its caption laid over it, a short blend
between shots, and the end card over a blurred still of the last shot.
The sound: each shot's own effects where the shot stands, over the music recorded
alone (the shot 'music'), faded out at the end, brought to YouTube's loudness (-14 LUFS).
Run: python -P build/promo/cut.py <lang>  ->  assets/promo/oddity-<lang>.mp4 (30 fps, 1080 x 1920)
"""
import json, os, shutil, subprocess, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'promo')
FPS = 30
SIZE = (1080, 1920)
BLEND = 8  # frames over which one shot gives way to the next

# shot, from (s into its recording), length (s). The caption of the same name goes over it.
# Which film: the first (none), 'gaze' (2026-10-16, what space-out is) or 'thatday'
# (2026-10-16, six days played again; not used: it showed nothing of the game itself), by FILM.
FILM = os.environ.get('FILM', '')
CUTS = {
  '': [
    ('earth', 2.0, 3.5),
    ('fly', 0.6, 4.0),
    ('naro', 8.0, 4.0),
    ('aurora', 0.5, 3.5),
    ('apollo', 11.0, 4.0),
    ('jupiter', 0.5, 3.5),
    ('saturn', 0.5, 3.5),
    ('journal', 1.0, 2.6),
  ],
  'gaze': [
    ('earth', 2.0, 3.5),
    ('fly', 0.6, 4.0),
    ('spaceout', 0.1, 4.0),
    ('hide', 0.2, 4.0),
    ('aurora', 0.5, 3.5),
    ('jupiter', 0.5, 3.5),
    ('calm', 0.8, 4.2),
  ],
  'thatday': [
    ('dart', 0.6, 4.6),
    ('hayabusa', 1.2, 4.2),
    ('soho', 0.6, 4.4),
    ('osiris', 0.2, 4.6),
    ('herschel', 11.5, 4.2),
    ('tess', 1.0, 4.4),
  ],
}
CUT = CUTS[FILM]
# The end card stands on a blurred still of this shot's last frame.
END_ON = {'': -2, 'thatday': -1, 'gaze': -1}[FILM]
END_S = 3.2


SCALE = SIZE[0] / 405


def fingertip(im, touch, now):
    """A fingertip on the key while it is held (touch.json from shots.cjs): a soft white
    disc that lands with a ring going out from it."""
    held = now - touch['from']
    if held < 0 or now > touch['to']:
        return
    x, y = touch['x'] * SCALE, touch['y'] * SCALE
    r = touch['w'] * SCALE * 0.42
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    land = min(1, held / 0.15)
    rr = r * (1.25 - 0.25 * land)
    d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(255, 255, 255, int(110 * land)), outline=(255, 255, 255, int(220 * land)), width=6)
    if held < 0.6:
        ring = r * (1 + 1.6 * held / 0.6)
        d.ellipse((x - ring, y - ring, x + ring, y + ring), outline=(255, 255, 255, int(200 * (1 - held / 0.6))), width=5)
    im.alpha_composite(layer)


def shot_frames(lang, name, start, length):
    folder = os.path.join(ROOT, lang, name)
    times = json.load(open(os.path.join(folder, 'times.json')))
    t0 = times[0]
    rel = [t - t0 for t in times]
    caption = Image.open(os.path.join(ROOT, lang, 'captions', f'{name}.png')).convert('RGBA')
    touch_file = os.path.join(folder, 'touch.json')
    touch = json.load(open(touch_file)) if os.path.exists(touch_file) else None
    out, j = [], 0
    for k in range(round(length * FPS)):
        t = start + k / FPS
        while j + 1 < len(rel) and rel[j + 1] <= t:
            j += 1
        im = Image.open(os.path.join(folder, f'{j:05d}.jpg')).convert('RGBA').resize(SIZE, Image.LANCZOS)
        # The caption comes up over the first third of a second.
        a = min(1, k / (FPS / 3))
        c = caption
        if a < 1:
            c = caption.copy()
            c.putalpha(caption.getchannel('A').point(lambda v: int(v * a)))
        if touch:
            fingertip(im, touch, t0 + t)
        im.alpha_composite(c)
        out.append(im.convert('RGB'))
    return out


def main(lang):
    shots = [shot_frames(lang, name, start, length) for name, start, length in CUT]
    # The end card on a darkened, blurred last look (Saturn in the first film).
    back = shots[END_ON][-1].filter(ImageFilter.GaussianBlur(28)).point(lambda v: int(v * 0.35)).convert('RGBA')
    card = Image.open(os.path.join(ROOT, lang, 'captions', 'end.png')).convert('RGBA')
    back.alpha_composite(card)
    shots.append([back.convert('RGB')] * round(END_S * FPS))
    frames = list(shots[0])
    for nxt in shots[1:]:
        for i in range(BLEND):
            frames[-BLEND + i] = Image.blend(frames[-BLEND + i], nxt[i], (i + 1) / (BLEND + 1))
        frames.extend(nxt[BLEND:])
    # A frame unlike both its neighbours, which are alike: something flashed for one frame.
    small = [im.convert('L').resize((135, 240)) for im in frames]
    diff = lambda a, b: ImageStat.Stat(ImageChops.difference(a, b)).mean[0]
    for i in range(1, len(small) - 1):
        a, b = diff(small[i - 1], small[i]), diff(small[i], small[i + 1])
        if a > 15 and b > 15 and diff(small[i - 1], small[i + 1]) < a / 3:
            print(f'FLASH at frame {i} ({i / FPS:.2f} s): look at the shot recorded there')
    tmp = os.path.join(ROOT, lang, 'cut')
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    for i, im in enumerate(frames):
        im.save(os.path.join(tmp, f'{i:05d}.jpg'), quality=95)
    film = os.path.join(ROOT, f'oddity-{FILM + "-" if FILM else ""}{lang}.mp4')
    total = len(frames) / FPS
    inputs, chains, mix = [], [], []
    at = 0.0
    for i, (name, start, length) in enumerate(CUT):
        folder = os.path.join(ROOT, lang, name)
        if os.path.exists(os.path.join(folder, 'audio.webm')):
            first = json.load(open(os.path.join(folder, 'times.json')))[0]
            began = json.load(open(os.path.join(folder, 'audio.json')))['start']
            inputs += ['-i', os.path.join(folder, 'audio.webm')]
            k = len(inputs) // 2
            offset = start + first - began
            ms = int(at * 1000)
            chains.append(f'[{k}:a]atrim={offset:.3f}:{offset + length:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.15,afade=t=out:st={length - 0.3:.3f}:d=0.3,volume=2.5,adelay={ms}|{ms}[fx{i}]')
            mix.append(f'[fx{i}]')
        at += length - BLEND / FPS
    music = os.path.join(ROOT, lang, 'music', 'audio.webm')
    inputs += ['-i', music]
    k = len(inputs) // 2
    chains.append(f'[{k}:a]atrim=0:{total:.3f},asetpts=PTS-STARTPTS,volume=3,afade=t=in:d=0.5,afade=t=out:st={total - 2.0:.3f}:d=2.0[music]')
    mix.append('[music]')
    graph = ';'.join(chains) + f';{"".join(mix)}amix=inputs={len(mix)}:normalize=0:duration=longest,atrim=0:{total:.3f},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(tmp, '%05d.jpg'), *inputs,
                    '-filter_complex', graph, '-map', '0:v', '-map', '[a]',
                    # (The frames are JPEG, full range; a film is played as TV range.)
                    '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', film], check=True)
    print(film, f'{total:.1f} s')


main(sys.argv[1])

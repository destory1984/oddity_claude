"""Cuts the promo video from the recorded shots (build/promo/shoot.cjs) and the captions
(build/promo/captions.cjs): each shot's stretch, its caption laid over it, a short blend
between shots, and the end card over a blurred still of the last shot.
The sound: each shot's own effects where the shot stands, over the music recorded
alone (the shot 'music'), faded out at the end, brought to YouTube's loudness (-14 LUFS).
Run: python -P build/promo/cut.py <lang>  ->  assets/promo/oddity-<lang>.mp4 (30 fps, 1080 x 1920)
"""
import json, os, shutil, subprocess, sys
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'promo')
FPS = 30
SIZE = (1080, 1920)
BLEND = 8  # frames over which one shot gives way to the next

# shot, from (s into its recording), length (s). The caption of the same name goes over it.
CUT = [
    ('earth', 2.0, 3.5),
    ('naro', 7.5, 4.5),
    ('aurora', 0.5, 4.0),
    ('apollo', 10.5, 4.5),
    ('jupiter', 0.5, 4.0),
    ('saturn', 0.5, 4.0),
    ('journal', 1.0, 2.8),
]
END_S = 3.2


def shot_frames(lang, name, start, length):
    folder = os.path.join(ROOT, lang, name)
    times = json.load(open(os.path.join(folder, 'times.json')))
    t0 = times[0]
    rel = [t - t0 for t in times]
    caption = Image.open(os.path.join(ROOT, lang, 'captions', f'{name}.png')).convert('RGBA')
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
        im.alpha_composite(c)
        out.append(im.convert('RGB'))
    return out


def main(lang):
    shots = [shot_frames(lang, name, start, length) for name, start, length in CUT]
    # The end card on a darkened, blurred last look at Saturn.
    back = shots[-2][-1].filter(ImageFilter.GaussianBlur(28)).point(lambda v: int(v * 0.35)).convert('RGBA')
    card = Image.open(os.path.join(ROOT, lang, 'captions', 'end.png')).convert('RGBA')
    back.alpha_composite(card)
    shots.append([back.convert('RGB')] * round(END_S * FPS))
    frames = list(shots[0])
    for nxt in shots[1:]:
        for i in range(BLEND):
            frames[-BLEND + i] = Image.blend(frames[-BLEND + i], nxt[i], (i + 1) / (BLEND + 1))
        frames.extend(nxt[BLEND:])
    tmp = os.path.join(ROOT, lang, 'cut')
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    for i, im in enumerate(frames):
        im.save(os.path.join(tmp, f'{i:05d}.jpg'), quality=95)
    film = os.path.join(ROOT, f'oddity-{lang}.mp4')
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

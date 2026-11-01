"""Cuts a Short of one tour course from one long shot (build/promo/shoot.cjs): the frames as
they were recorded, the captions of a take over them, the shot's own sound (the game's
music, faded out over the end) and the end card, 30 seconds (a Short may run 60). cut.py
holds every frame in memory, 10 GB for a long shot, so this goes straight to ffmpeg.
Run: python -P build/promo/tour.py <lang> <shot> <take>  ->  assets/promo/tour-<shot>-<take>-<lang>.mp4
"""
import json, os, subprocess, sys
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'promo')
SIZE = (1080, 1920)
START_S = 0.1
SHOT_S = 24.9
END_S = 5.0
FADE_S = 2.5
# From and to (s) of each caption of a take: <shot>-<take>-<n>.png (captions.cjs).
TAKES = {
    'auroraDrift': {
        '1': [(0, 6), (6, 13), (13, 20), (20, 26)],
        '2': [(0, 9), (9, 24.9)],
    },
}


def main(lang, name, take):
    folder = os.path.abspath(os.path.join(ROOT, lang, name))
    times = json.load(open(os.path.join(folder, 'times.json')))
    rel = [t - times[0] for t in times]
    picked = [i for i, t in enumerate(rel) if START_S <= t <= START_S + SHOT_S]
    # The end card on a darkened, blurred last look.
    last = Image.open(os.path.join(folder, f'{picked[-1]:05d}.jpg')).convert('RGB').resize(SIZE, Image.LANCZOS)
    back = last.filter(ImageFilter.GaussianBlur(28)).point(lambda v: int(v * 0.35)).convert('RGBA')
    back.alpha_composite(Image.open(os.path.join(ROOT, lang, 'captions', 'end.png')).convert('RGBA'))
    end = os.path.join(folder, 'end.jpg')
    back.convert('RGB').save(end, quality=95)
    # Each frame stays until the next was recorded.
    lines = []
    for a, b in zip(picked, picked[1:]):
        lines += [f"file '{os.path.join(folder, f'{a:05d}.jpg')}'".replace('\\', '/'), f'duration {rel[b] - rel[a]:.4f}']
    lines += [f"file '{os.path.join(folder, f'{picked[-1]:05d}.jpg')}'".replace('\\', '/')]
    frames = os.path.join(folder, 'frames.txt')
    open(frames, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    total = rel[picked[-1]] - rel[picked[0]] + END_S
    if total > 60:
        raise SystemExit(f'{total:.1f} s is longer than a Short')
    audio = json.load(open(os.path.join(folder, 'audio.json')))['start']
    offset = START_S + times[0] - audio
    spans = TAKES[name][take]
    inputs = ['-f', 'concat', '-safe', '0', '-i', frames]
    graph = [f'[0:v]fps=30,scale={SIZE[0]}:{SIZE[1]}[f0]']
    for n, (a, b) in enumerate(spans, 1):
        length = round(b - a, 2)
        inputs += ['-loop', '1', '-t', str(length), '-framerate', '30', '-i', os.path.join(ROOT, lang, 'captions', f'{name}-{take}-{n}.png')]
        graph.append(f'[{n}:v]format=rgba,fade=t=in:st=0:d=0.4:alpha=1,fade=t=out:st={length - 0.4}:d=0.4:alpha=1,setpts=PTS+{a}/TB[w{n}]')
        graph.append(f'[f{n - 1}][w{n}]overlay=eof_action=pass[f{n}]')
    k = len(spans)
    inputs += ['-i', os.path.join(folder, 'audio.webm'), '-loop', '1', '-t', str(END_S), '-framerate', '30', '-i', end]
    graph.append(f'[f{k}]scale=in_range=pc:out_range=tv,format=yuv420p,setsar=1[main]')
    graph.append(f'[{k + 2}:v]fps=30,scale={SIZE[0]}:{SIZE[1]}:in_range=pc:out_range=tv,format=yuv420p,setsar=1[end]')
    graph.append('[main][end]concat=n=2:v=1:a=0[v]')
    graph.append(f'[{k + 1}:a]atrim={offset:.3f}:{offset + total:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.3,'
                 f'afade=t=out:st={min(total, rel[-1] - START_S) - FADE_S:.3f}:d={FADE_S},apad=whole_dur={total:.3f},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]')
    film = os.path.join(ROOT, f'tour-{name}-{take}-{lang}.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(graph), '-map', '[v]', '-map', '[a]',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-c:a', 'aac', '-b:a', '192k',
                    '-movflags', '+faststart', film], check=True)
    print(film, f'{total:.1f} s, {len(picked)} frames')


main(*sys.argv[1:4])

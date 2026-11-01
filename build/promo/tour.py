"""Cuts a Short of one tour course from one long shot (build/promo/shoot.cjs): the frames as
they were recorded, its caption over them, the shot's own sound (the game's music, faded
out over the end) and the end card, 30 seconds (a Short may run 60). cut.py holds every frame in memory,
10 GB for a shot this long, so this goes straight to ffmpeg.
Run: python -P build/promo/tour.py <lang> <shot>  ->  assets/promo/tour-<shot>-<lang>.mp4
"""
import json, os, subprocess, sys
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'promo')
SIZE = (1080, 1920)
START_S = 0.5
SHOT_S = 26.5
END_S = 3.2
FADE_S = 2.5


def main(lang, name):
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
    graph = (
        f'[0:v]fps=30,scale={SIZE[0]}:{SIZE[1]}[film];'
        f'[1:v]format=rgba,fade=t=in:st=0:d=0.5:alpha=1,fade=t=out:st=4.5:d=0.5:alpha=1[words];'
        f'[film][words]overlay=eof_action=pass,scale=in_range=pc:out_range=tv,format=yuv420p,setsar=1[main];'
        f'[3:v]fps=30,scale={SIZE[0]}:{SIZE[1]}:in_range=pc:out_range=tv,format=yuv420p,setsar=1[end];'
        f'[main][end]concat=n=2:v=1:a=0[v];'
        f'[2:a]atrim={offset:.3f}:{offset + total:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.3,'
        f'afade=t=out:st={total - FADE_S:.3f}:d={FADE_S},apad=whole_dur={total:.3f},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]'
    )
    film = os.path.join(ROOT, f'tour-{name}-{lang}.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', frames,
                    '-loop', '1', '-t', '5.3', '-framerate', '30', '-i', os.path.join(ROOT, lang, 'captions', f'{name}.png'),
                    '-i', os.path.join(folder, 'audio.webm'), '-loop', '1', '-t', str(END_S), '-framerate', '30', '-i', end, '-filter_complex', graph, '-map', '[v]', '-map', '[a]',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-c:a', 'aac', '-b:a', '192k',
                    '-movflags', '+faststart', film], check=True)
    print(film, f'{total:.1f} s, {len(picked)} frames')


main(sys.argv[1], sys.argv[2])

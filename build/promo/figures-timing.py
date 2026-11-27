"""Times the Short of 달에는 누가 살까 to 하린's lines in one language (as moon-timing.py): how long each part of the course is
shown (build/promo/figures.cjs PARTS), when each caption stands and each line is read
(build/promo/tour.py). The lines are assets/promo/<lang>/voice/figuresShort2-NN-<lang>.mp3,
the last read over the end card.
Run: python -P build/promo/figures-timing.py <lang>  ->  assets/promo/<lang>/figures-timing.json
"""
import json, os, subprocess, sys

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'promo')
# Which lines (from 0) are read over each part of figures.cjs PARTS (the 10th over the end card).
PARTS_LINES = [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]]
N = sum(len(p) for p in PARTS_LINES)  # lines over the parts; one more over the end card
LEAD, GAP, TAIL = 0.45, 0.35, 0.45  # seconds before a part's first line, between lines, after its last
CAPTION_EARLY = 0.25  # a caption comes up this much before its line
TITLE = 2.8  # seconds of the title over the morning Earth before the first line


def length(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                         capture_output=True, text=True, check=True).stdout
    return float(out)


def main(lang):
    folder = os.path.join(ROOT, lang, 'voice')
    lines = [length(os.path.join(folder, f'figuresShort2-{n:02d}-{lang}.mp3')) for n in range(1, N + 2)]
    starts, spans, films = [0.0] * N, [None] * N, []
    t0 = 0.0
    for k0, part in enumerate(PARTS_LINES):
        t = t0 + LEAD + (TITLE if k0 == 0 else 0)
        for i in part:
            starts[i] = round(t, 2)
            t += lines[i] + GAP
        film = round(t - GAP + TAIL - t0 + 0.05, 1)
        films.append(film)
        end = t0 + film
        for k, i in enumerate(part):
            a = round(max(t0 + (TITLE if i == 0 else 0), starts[i] - CAPTION_EARLY), 2)
            b = round(starts[part[k + 1]] - CAPTION_EARLY, 2) if k + 1 < len(part) else round(end - 0.1, 2)
            spans[i] = [a, b]
        t0 = end
    shot = round(t0 - 0.1, 2)
    end_s = round(0.5 + lines[N] + 1.6, 1)
    out = {'films': films, 'spans': [[0.2, TITLE - 0.1]] + spans, 'voice': starts + [round(t0 + 0.5, 2)], 'shot': shot, 'end': end_s}
    json.dump(out, open(os.path.join(ROOT, lang, 'figures-timing.json'), 'w', encoding='utf-8'))
    print(lang, f'{t0 + end_s:.1f} s', films)
    if t0 + end_s > 60:
        print('longer than 60 s')


main(sys.argv[1])

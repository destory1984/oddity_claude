"""Times the Moon Short to 하린's lines in one language: how long each part of the course is
shown (build/promo/moon.cjs PARTS), when each caption stands and each line is read
(build/promo/tour.py). The lines are assets/promo/<lang>/voice/moonShort2-NN-<lang>.mp3,
the last read over the end card.
Run: python -P build/promo/moon-timing.py <lang>  ->  assets/promo/<lang>/moon-timing.json
"""
import json, os, subprocess, sys

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'promo')
# Which lines (from 0) are read over each part of moon.cjs PARTS.
PARTS_LINES = [[0, 1, 2], [3, 4], [5], [6, 7], [8, 9, 10], [11, 12, 13], [14]]
LEAD, GAP, TAIL = 0.45, 0.35, 0.45  # seconds before a part's first line, between lines, after its last
CAPTION_EARLY = 0.25  # a caption comes up this much before its line


def length(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                         capture_output=True, text=True, check=True).stdout
    return float(out)


def main(lang):
    folder = os.path.join(ROOT, lang, 'voice')
    lines = [length(os.path.join(folder, f'moonShort2-{n:02d}-{lang}.mp3')) for n in range(1, 17)]
    starts, spans, films = [0.0] * 15, [None] * 15, []
    t0 = 0.0
    for part in PARTS_LINES:
        t = t0 + LEAD
        for i in part:
            starts[i] = round(t, 2)
            t += lines[i] + GAP
        film = round(t - GAP + TAIL - t0 + 0.05, 1)
        films.append(film)
        end = t0 + film
        for k, i in enumerate(part):
            a = round(max(t0, starts[i] - CAPTION_EARLY), 2)
            b = round(starts[part[k + 1]] - CAPTION_EARLY, 2) if k + 1 < len(part) else round(end - 0.1, 2)
            spans[i] = [a, b]
        t0 = end
    shot = round(t0 - 0.1, 2)
    end_s = round(0.5 + lines[15] + 1.6, 1)
    out = {'films': films, 'spans': spans, 'voice': starts + [round(t0 + 0.5, 2)], 'shot': shot, 'end': end_s}
    json.dump(out, open(os.path.join(ROOT, lang, 'moon-timing.json'), 'w', encoding='utf-8'))
    print(lang, f'{t0 + end_s:.1f} s', films)
    if t0 + end_s > 60:
        print('longer than 60 s')


main(sys.argv[1])

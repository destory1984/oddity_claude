# -*- coding: utf-8 -*-
"""Tools for the English version (src/core/i18n.js, src/i18n/en.json).

  python build/i18n.py tag <file.js ...>   wrap the Korean strings of these files in t('…') / t`…`
  python build/i18n.py todo [out.txt]      list the keys that have no English yet, numbered
  python build/i18n.py merge <done.txt>    add "number<TAB>English" lines to src/i18n/en.json
  python build/i18n.py check               count keys with and without English

A key is the Korean sentence itself; in a template each ${…} is written {} in the key and
{0}, {1}… in the English. Keys come from index.html (texts and the title, aria-label, alt,
placeholder and data-label attributes) and from every t('…') and t`…` under src/.
"""
import io, json, os, re, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.stdout.reconfigure(encoding='utf-8')
HANGUL = re.compile(r'[가-힣]')
EN_JSON = 'src/i18n/en.json'
TODO = 'assets/i18n/todo.json'
# Particles joined to a name: they have no English and are never looked up.
PARTICLES = {'을', '를', '과', '와', '이', '가', '로', '으로', '은', '는', '에서', '에'}
ATTRS = ('title', 'aria-label', 'alt', 'placeholder', 'data-label')


def read(path):
    return io.open(path, encoding='utf-8').read()


def write(path, text):
    io.open(path, 'w', encoding='utf-8', newline='\n').write(text)


# ---- a small scanner of JavaScript: finds string literals and templates outside comments

def scan(src):
    """Yields (kind, start, end, parts): kind 'str' (parts = the text between the quotes)
    or 'tpl' (parts = [static pieces], with nested templates yielded too)."""
    out = []

    def template(i):
        # src[i] is the opening backtick. Returns the index after the closing one.
        start = i
        i += 1
        pieces = ['']
        while i < len(src):
            c = src[i]
            if c == '\\':
                pieces[-1] += src[i:i + 2]
                i += 2
            elif c == '`':
                out.append(('tpl', start, i + 1, pieces))
                return i + 1
            elif c == '$' and src[i + 1:i + 2] == '{':
                i = code(i + 2, True)
                pieces.append('')
            else:
                pieces[-1] += c
                i += 1
        return i

    def code(i, inside):
        depth = 0
        while i < len(src):
            c = src[i]
            two = src[i:i + 2]
            if two == '//':
                j = src.find('\n', i)
                i = len(src) if j < 0 else j
            elif two == '/*':
                j = src.find('*/', i)
                i = len(src) if j < 0 else j + 2
            elif c in '\'"':
                j = i + 1
                while j < len(src) and src[j] != c:
                    j += 2 if src[j] == '\\' else 1
                out.append(('str', i, j + 1, src[i + 1:j]))
                i = j + 1
            elif c == '`':
                i = template(i)
            elif c == '{':
                depth += 1
                i += 1
            elif c == '}':
                if inside and depth == 0:
                    return i + 1
                depth -= 1
                i += 1
            else:
                i += 1
        return i

    code(0, False)
    return sorted(out, key=lambda x: x[1])


def unescape(s):
    return (s.replace('\\n', '\n').replace("\\'", "'").replace('\\"', '"').replace('\\`', '`').replace('\\\\', '\\'))


def tagged(src, item):
    kind, start, end, parts = item
    before = src[:start].rstrip()
    if kind == 'tpl':
        return src[start - 1:start] == 't' and not (src[start - 2:start - 1].isalnum() or src[start - 2:start - 1] in '_$.')
    return before.endswith('t(') and not (before[-3:-2].isalnum() or before[-3:-2] in '_$.')


def keys_of_js(src):
    keys = []
    for item in scan(src):
        kind, start, end, parts = item
        if not tagged(src, item):
            continue
        key = unescape('{}'.join(parts)) if kind == 'tpl' else unescape(parts)
        if HANGUL.search(key):
            keys.append(key)
    return keys


def tag(path):
    src = read(path)
    edits = []
    for item in scan(src):
        kind, start, end, parts = item
        text = ''.join(parts) if kind == 'tpl' else parts
        if not HANGUL.search(text) or tagged(src, item):
            continue
        line_start = src.rfind('\n', 0, start) + 1
        line = src[line_start:src.find('\n', start)]
        if line.lstrip().startswith('import '):
            continue
        if kind == 'tpl':
            edits.append((start, start, 't'))
            continue
        if text.strip() in PARTICLES:
            continue
        before = src[:start].rstrip()
        after = src[end:].lstrip()
        # A property name, or a case label: left alone.
        if after.startswith(':') and before[-1:] in '{,':
            continue
        if before.endswith('case'):
            continue
        edits.append((start, start, 't('))
        edits.append((end, end, ')'))
    if not edits:
        return 0
    for at, _, text in sorted(edits, key=lambda e: -e[0]):
        src = src[:at] + text + src[at:]
    if not re.search(r"import \{[^}]*\bt\b[^}]*\} from '[./]+(core/)?i18n\.js'", src):
        rel = os.path.relpath('src/core/i18n.js', os.path.dirname(path)).replace(os.sep, '/')
        if not rel.startswith('.'):
            rel = './' + rel
        line = "import { t } from '%s';\n" % rel
        m = list(re.finditer(r"^import .*?;\n", src, re.M | re.S))
        # After the last import at the head of the file, else at the very top.
        at = 0
        for imp in m:
            if src[:imp.start()].strip() == '' or src[at:imp.start()].strip() == '' or all(l.strip() == '' or l.lstrip().startswith(('//', 'import', '/*', '*')) for l in src[:imp.start()].split('\n')):
                at = imp.end()
        src = src[:at] + line + src[at:]
    write(path, src)
    return len(edits)


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.keys = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
        for name, value in attrs:
            if name in ATTRS and value and HANGUL.search(value):
                self.keys.append(value)

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip and HANGUL.search(data):
            self.keys.append(data.strip())


def all_keys():
    page = Page()
    page.feed(read('index.html'))
    keys = list(page.keys)
    for d, _, files in os.walk('src'):
        for f in sorted(files):
            if f.endswith('.js'):
                keys += keys_of_js(read(os.path.join(d, f)))
    seen = set()
    return [k for k in keys if not (k in seen or seen.add(k))]


def load():
    return json.loads(read(EN_JSON)) if os.path.exists(EN_JSON) else {}


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if cmd == 'tag':
        for path in sys.argv[2:]:
            print(path, tag(path))
    elif cmd == 'todo':
        have = load()
        todo = [k for k in all_keys() if k not in have]
        os.makedirs(os.path.dirname(TODO), exist_ok=True)
        write(TODO, json.dumps(todo, ensure_ascii=False, indent=0))
        text = ''.join('%d\t%s\n' % (i, k.replace('\n', '\\n')) for i, k in enumerate(todo))
        if len(sys.argv) > 2:
            write(sys.argv[2], text)
        else:
            sys.stdout.write(text)
        print(len(todo), 'without English')
    elif cmd == 'merge':
        todo = json.loads(read(TODO))
        have = load()
        n = 0
        for line in read(sys.argv[2]).split('\n'):
            if not line.strip():
                continue
            num, en = line.split('\t', 1)
            ko = todo[int(num)]
            en = en.replace('\\n', '\n')
            assert ko.count('\n') == en.count('\n') or '\n' not in ko, (num, ko, en)
            have[ko] = en
            n += 1
        write(EN_JSON, json.dumps(have, ensure_ascii=False, indent=1) + '\n')
        print('added', n, 'total', len(have))
    else:
        have = load()
        keys = all_keys()
        print(len(keys), 'keys,', sum(1 for k in keys if k in have), 'with English,', len([k for k in have if k not in keys]), 'English entries no longer used')


main()

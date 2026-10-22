import { t } from '../core/i18n.js';
import { SPEAKERS, CLUES, HIDDEN, radioWeb } from '../core/radioFriend.js';

const SVG = 'http://www.w3.org/2000/svg';

// The journal's radio page (core/radioFriend.js radioWeb): what was heard drawn as a
// star chart on the paper, points and the lines between them, the young radio operator in
// the middle (the user, 2026-10-22, of ways to show it: "C도 넣어"). No words stand by the
// points, the page being narrow on a phone: a press on one writes it out under the chart.
// onJump(id): the "순간 이동" key of an open hidden place.
export function createRadioWeb(chart, detail, { onJump }) {
  let shown = null;
  let chosen = 'shota';

  function tellOf(node) {
    if (node.kind === 'centre') return { title: t('하야시 쇼타'), text: t('1973년, 바다 건너 무전기를 켜던 열여덟 살 소년. 무전으로 들은 말이 이 둘레에 쌓인다.') };
    if (!node.known) return { title: t('아직 모르는 곳'), text: t('누군가에게 들으면 이어진다.') };
    if (node.kind === 'speaker') return { title: SPEAKERS.find((s) => s.id === node.id).name, text: t('무전으로 이야기를 들려준 이.') };
    if (node.kind === 'clue') return { title: t('들은 말'), text: CLUES.find((c) => c.id === node.id).text };
    const place = HIDDEN.find((h) => h.id === node.id);
    if (node.found) return { title: place.name, text: place.text };
    return { title: place.name, text: node.open ? t('단서가 모여 열렸다. 가 보자.') : t('단서가 더 모이면 열린다.') };
  }

  function tell() {
    const node = shown.nodes.find((n) => n.id === chosen) ?? shown.nodes[0];
    const { title, text } = tellOf(node);
    const head = document.createElement('strong');
    head.textContent = title;
    const body = document.createElement('p');
    body.textContent = text;
    const parts = [head, body];
    if (node.kind === 'hidden' && node.open) {
      const go = document.createElement('button');
      go.textContent = t('순간 이동');
      go.addEventListener('click', () => onJump(node.id));
      parts.push(go);
    }
    detail.replaceChildren(...parts);
  }

  function draw(radio) {
    shown = radioWeb(radio);
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '-4 -4 108 108');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', t('무전으로 이어진 그물'));
    const at = new Map(shown.nodes.map((n) => [n.id, n.at.map((v) => v * 100)]));
    for (const [from, to] of shown.links) {
      const [a, b] = [at.get(from), at.get(to)];
      if (!a || !b) continue;
      const line = document.createElementNS(SVG, 'line');
      line.setAttribute('x1', a[0]);
      line.setAttribute('y1', a[1]);
      line.setAttribute('x2', b[0]);
      line.setAttribute('y2', b[1]);
      line.setAttribute('class', 'radioLink');
      svg.append(line);
    }
    for (const node of shown.nodes) {
      const [x, y] = at.get(node.id);
      const r = { centre: 5, speaker: 3.4, clue: 2, hidden: 3.8 }[node.kind];
      const point = document.createElementNS(SVG, node.kind === 'hidden' ? 'rect' : 'circle');
      if (node.kind === 'hidden') {
        // A hidden place is a small diamond.
        point.setAttribute('x', x - r * 0.7);
        point.setAttribute('y', y - r * 0.7);
        point.setAttribute('width', r * 1.4);
        point.setAttribute('height', r * 1.4);
        point.setAttribute('transform', `rotate(45 ${x} ${y})`);
      } else {
        point.setAttribute('cx', x);
        point.setAttribute('cy', y);
        point.setAttribute('r', r);
      }
      point.setAttribute('class', `radioPoint ${node.kind}${node.known ? ' known' : ''}${node.open ? ' open' : ''}${node.found ? ' found' : ''}${node.id === chosen ? ' chosen' : ''}`);
      point.dataset.id = node.id;
      // (A bigger ring round each point takes the finger.)
      const hit = document.createElementNS(SVG, 'circle');
      hit.setAttribute('cx', x);
      hit.setAttribute('cy', y);
      hit.setAttribute('r', 6);
      hit.setAttribute('class', 'radioHit');
      hit.addEventListener('click', () => {
        chosen = node.id;
        draw(radio);
      });
      svg.append(point, hit);
    }
    chart.replaceChildren(svg);
    tell();
  }

  return { draw };
}

// docs/바뀐-것들.md from src/core/changes.js: the game's own "바뀐 것들" page as a
// document to read on GitHub (the user, 2026-10-09, having looked there: "바뀐것들.md
// 같은게 없네"). One source, so the two cannot drift: tests/changesDoc.test.js fails
// when the file is not what this makes. Run: node build/changes-doc.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CHANGES, STARTED } from '../src/core/changes.js';

export const CHANGES_DOC = 'docs/바뀐-것들.md';

export function changesDoc(changes = CHANGES, started = STARTED) {
  const [y, m, d] = started.split('-').map(Number);
  const lines = [
    '# 바뀐 것들',
    '',
    '게임 설정의 "바뀐 것들" 쪽과 같은 내용이다. 플레이어가 화면에서 보거나 듣는 변화만 한 줄씩 적는다. 새것이 위에 온다.',
    '',
    `만들기 시작한 날은 ${y}년 ${m}월 ${d}일이고, 지금까지 ${changes.length}줄이다. 어떻게 만들었는지는 [상세기획서](Space-Oddity-상세기획서.md)에 날짜별로 있다.`,
    '',
    '이 파일은 직접 고치지 않는다. `src/core/changes.js` 에 한 줄을 넣고 `node build/changes-doc.mjs` 를 돌리면 다시 만들어진다.',
  ];
  let day = null;
  for (const change of changes) {
    if (change.day !== day) {
      day = change.day;
      lines.push('', `## ${day}`, '');
    }
    // (A tilde would be read as a strike-through by some markdown editors.)
    lines.push(`- ${change.text.replaceAll('~', '→')}`);
  }
  return `${lines.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(new URL(`../${CHANGES_DOC}`, import.meta.url), changesDoc());
  console.log(`${CHANGES_DOC}: ${CHANGES.length} lines`);
}

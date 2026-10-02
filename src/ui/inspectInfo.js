const $ = (id) => document.getElementById(id);

// Something to read while a target is looked at closely ("확대 관찰"): its name, a few
// numbers and two paragraphs or more (core/readings.js for bodies and craft,
// core/storyDetails.js for story places). It sits over the top of the view, scrolls, and
// folds away to its title so the view can be seen whole. Under the reading of a body or
// a craft there is one question about it (core/readingQuiz.js).
// onSolve(id): the question was answered right.
export function createInspectInfo({ onSolve = () => {} } = {}) {
  const panel = $('inspectInfo');
  const fold = $('inspectFold');
  let folded = false;
  function setFolded(now) {
    folded = now;
    panel.classList.toggle('folded', folded);
    fold.textContent = folded ? '펴기' : '접기';
    fold.setAttribute('aria-expanded', String(!folded));
  }
  fold.addEventListener('click', () => setFolded(!folded));

  // Three choices; a wrong one shows the answer, and it can be tried again next time.
  function showQuiz(quiz) {
    $('inspectQuiz').hidden = !quiz;
    if (!quiz) return;
    $('inspectQuizQuestion').textContent = `한 문제. ${quiz.question}`;
    $('inspectQuizResult').textContent = quiz.solved ? '전에 맞힌 문제입니다.' : '';
    const buttons = quiz.choices.map((choice, i) => {
      const button = document.createElement('button');
      button.textContent = choice;
      button.addEventListener('click', () => {
        const right = i === quiz.right;
        buttons[quiz.right].classList.add('right');
        if (!right) button.classList.add('wrong');
        for (const b of buttons) b.disabled = true;
        $('inspectQuizResult').textContent = right ? '맞았습니다.' : `답은 "${quiz.choices[quiz.right]}"입니다. 다음에 다시 풀 수 있습니다.`;
        if (right) onSolve(quiz.id);
      });
      return button;
    });
    if (quiz.solved) buttons[quiz.right].classList.add('right');
    $('inspectQuizChoices').replaceChildren(...buttons);
  }

  return {
    // entry: { kicker, name, nameEn, facts: [[label, value]], text, quiz } or null to put
    // it away. quiz: { id, question, choices, right, solved } or nothing.
    show(entry) {
      panel.hidden = !entry;
      if (!entry) return;
      $('inspectKicker').textContent = entry.kicker ?? '';
      $('inspectName').textContent = entry.name;
      $('inspectNameEn').textContent = entry.nameEn ?? '';
      const facts = $('inspectFacts');
      facts.replaceChildren();
      for (const [label, value] of entry.facts ?? []) {
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        facts.append(dt, dd);
      }
      facts.hidden = !(entry.facts ?? []).length;
      const text = $('inspectText');
      text.replaceChildren(...entry.text.split('\n\n').map((words) => {
        const p = document.createElement('p');
        p.textContent = words;
        return p;
      }));
      showQuiz(entry.quiz);
      $('inspectBody').scrollTop = 0;
      setFolded(false);
    },
  };
}

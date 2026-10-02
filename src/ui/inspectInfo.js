const $ = (id) => document.getElementById(id);

// Something to read while a target is looked at closely ("확대 관찰"): its name, a few
// numbers and two paragraphs or more (core/readings.js for bodies and craft,
// core/storyDetails.js for story places). It sits over the top of the view, scrolls, and
// folds away to its title so the view can be seen whole.
export function createInspectInfo() {
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

  return {
    // entry: { kicker, name, nameEn, facts: [[label, value]], text } or null to put it away.
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
      $('inspectBody').scrollTop = 0;
      setFolded(false);
    },
  };
}

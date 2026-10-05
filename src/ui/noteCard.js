import { t } from '../core/i18n.js';
const $ = (id) => document.getElementById(id);

// A note from grandmother, on paper (core/story.js NOTES). The game waits while it is
// open. onClose gets the note and whether it was being read for the first time.
export function createNoteCard({ onOpen, onClose }) {
  const dialog = $('noteCard');
  const gate = $('gateScene');
  let shown = null;
  const done = () => {
    const was = shown;
    shown = null;
    onClose(was.note, was.first);
  };
  // A note told over several pages (the opening): the button turns the page until the last.
  let page = 0;
  const pagesOf = () => (shown?.first && shown.note.pages) || null;
  function picture(file, alt) {
    $('noteCardImage').hidden = !file;
    if (!file) return;
    $('noteCardImage').src = `${import.meta.env.BASE_URL}assets/notebook/${file}`;
    $('noteCardImage').alt = alt ?? '';
  }
  function turnTo(index) {
    const pages = pagesOf();
    page = index;
    const now = pages[index];
    // A page without a picture of its own keeps the last one shown.
    const drawn = [...pages.slice(0, index + 1)].reverse().find((p) => p.image);
    picture(drawn?.image, drawn?.imageAlt);
    $('noteCardScene').textContent = now.scene ?? '';
    $('noteCardScene').hidden = !now.scene;
    $('noteCardPaper').hidden = !now.text;
    $('noteCardText').textContent = now.text ?? '';
    $('noteCardSay').textContent = now.say ?? '';
    $('noteCardSay').hidden = !now.say;
    $('closeNoteCard').textContent = index + 1 < pages.length ? t('다음') : shown.note.button;
    dialog.scrollTop = 0;
  }
  $('closeNoteCard').addEventListener('click', () => {
    const pages = pagesOf();
    if (pages && page + 1 < pages.length) turnTo(page + 1);
    else dialog.close();
  });
  dialog.addEventListener('close', () => {
    // The last page, first time: the scene at the gate follows before the game goes on.
    if (!shown.first || !shown.note.gate) return done();
    $('gateText').textContent = shown.note.gate;
    $('gateLine').textContent = `"${shown.note.line}"`;
    return gate.showModal();
  });
  $('closeGate').addEventListener('click', () => gate.close());
  gate.addEventListener('close', done);

  return {
    isOpen: () => dialog.open || gate.open,
    // first: false when read again from the journal.
    show(note, first = true) {
      if (dialog.open || gate.open) return;
      shown = { note, first };
      $('noteCardTitle').textContent = note.title;
      if (pagesOf()) turnTo(0);
      else {
        $('noteCardScene').textContent = first ? note.scene ?? '' : '';
        $('noteCardScene').hidden = !first || !note.scene;
        picture(first ? note.image : null, note.imageAlt);
        $('noteCardPaper').hidden = false;
        $('noteCardText').textContent = note.text;
        $('noteCardSay').hidden = true;
        $('closeNoteCard').textContent = first ? note.button : t('쪽지를 접는다');
      }
      onOpen();
      dialog.showModal();
    },
  };
}

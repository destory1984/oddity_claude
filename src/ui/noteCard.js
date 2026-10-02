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
  $('closeNoteCard').addEventListener('click', () => dialog.close());
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
      $('noteCardScene').textContent = first ? note.scene : '';
      $('noteCardScene').hidden = !first;
      const picture = first && note.image ? note.image : null;
      $('noteCardImage').hidden = !picture;
      if (picture) {
        $('noteCardImage').src = `${import.meta.env.BASE_URL}assets/notebook/${picture}`;
        $('noteCardImage').alt = note.imageAlt ?? '';
      }
      $('noteCardTitle').textContent = note.title;
      $('noteCardText').textContent = note.text;
      $('closeNoteCard').textContent = first ? note.button : '쪽지를 접는다';
      onOpen();
      dialog.showModal();
    },
  };
}

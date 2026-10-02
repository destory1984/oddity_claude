const $ = (id) => document.getElementById(id);

// A note from grandmother, on paper (core/story.js NOTES). The game waits while it is
// open. onClose gets the note and whether it was being read for the first time.
export function createNoteCard({ onOpen, onClose }) {
  const dialog = $('noteCard');
  let shown = null;
  $('closeNoteCard').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    const was = shown;
    shown = null;
    onClose(was.note, was.first);
  });

  return {
    isOpen: () => dialog.open,
    // first: false when read again from the journal.
    show(note, first = true) {
      if (dialog.open) return;
      shown = { note, first };
      $('noteCardScene').textContent = first ? note.scene : '';
      $('noteCardScene').hidden = !first;
      $('noteCardTitle').textContent = note.title;
      $('noteCardText').textContent = note.text;
      $('closeNoteCard').textContent = first ? note.button : '쪽지를 접는다';
      onOpen();
      dialog.showModal();
    },
  };
}

import { t } from '../core/i18n.js';
const $ = (id) => document.getElementById(id);

// Side by side (core/famous.js): the traveler's photo and the real photograph the
// mission follows, with who took the real one and a word about it. Opens when such a
// mission is first met, and from the album.
export function createPair() {
  const dialog = $('pair');
  $('closePair').addEventListener('click', () => dialog.close());

  return {
    isOpen: () => dialog.open,
    // image: the traveler's photo (a data URL). where: its day and place.
    // famous: what famousFor gave.
    show(image, where, famous) {
      if (!famous || dialog.open) return;
      $('pairTitle').textContent = famous.name;
      $('pairMine').src = image;
      $('pairMineCaption').textContent = t`내 사진 · ${where}`;
      $('pairReal').src = `${import.meta.env.BASE_URL}assets/${famous.file}`;
      $('pairReal').alt = t`${famous.name}의 실제 사진`;
      $('pairRealCaption').textContent = t`실제 사진 · ${famous.by}`;
      $('pairNote').textContent = famous.note;
      $('pairCredit').textContent = t`사진: ${famous.credit}`;
      dialog.showModal();
      dialog.scrollTop = 0;
    },
  };
}

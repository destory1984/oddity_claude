import { t } from '../core/i18n.js';

const $ = (id) => document.getElementById(id);

// The photo a "사진 보기" key opens: the picture fills the screen, its words on a dark band
// at the foot; with more than one, a swipe or a press on either side goes to the next,
// and dots say which it is (the user, 2026-10-16, of three looks: "3").
// slides: [{ file, title, caption, credit }] (core/photoSlides.js).
export function createPhotoView({ onOpen, onClose }) {
  const dialog = $('photoView');
  const picture = $('photoViewPicture');
  let slides = [];
  let at = 0;

  function draw() {
    const slide = slides[at];
    picture.src = `${import.meta.env.BASE_URL}assets/${slide.file}`;
    picture.alt = slide.title;
    $('photoViewTitle').textContent = slide.title;
    $('photoViewCaption').textContent = slide.caption;
    $('photoViewCredit').textContent = slide.credit;
    const dots = $('photoViewDots');
    dots.hidden = slides.length < 2;
    dots.replaceChildren(...slides.map((_, i) => {
      const dot = document.createElement('i');
      dot.className = i === at ? 'on' : '';
      return dot;
    }));
  }

  function go(step) {
    if (slides.length < 2) return;
    at = (at + step + slides.length) % slides.length;
    draw();
  }

  // A press on the left third goes back, anywhere else on the picture forward.
  picture.addEventListener('click', (event) => {
    // (The press that ends a swipe has moved it already.)
    if (swiped) {
      swiped = false;
      return;
    }
    const box = picture.getBoundingClientRect();
    go(event.clientX < box.left + box.width / 3 ? -1 : 1);
  });
  let downX = null;
  let swiped = false;
  dialog.addEventListener('pointerdown', (event) => {
    downX = event.clientX;
    swiped = false;
  });
  dialog.addEventListener('pointerup', (event) => {
    if (downX === null) return;
    const moved = event.clientX - downX;
    downX = null;
    if (Math.abs(moved) > 40) {
      swiped = true;
      go(moved < 0 ? 1 : -1);
    }
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') go(1);
    if (event.key === 'ArrowLeft') go(-1);
  });
  $('photoViewClose').addEventListener('click', () => dialog.close());
  $('photoViewClose').setAttribute('aria-label', t('닫기'));
  dialog.addEventListener('close', () => onClose?.());

  return {
    show(list) {
      if (!list.length) return;
      slides = list;
      at = 0;
      draw();
      onOpen?.();
      dialog.showModal();
    },
  };
}

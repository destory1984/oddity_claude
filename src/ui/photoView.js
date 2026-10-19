import { t } from '../core/i18n.js';

const $ = (id) => document.getElementById(id);

// The photo a "사진 보기" key opens: the picture fills the screen, its words on a dark band
// at the foot; with more than one, a swipe goes to the next and dots say which it is
// (the user, 2026-10-16, of three looks: "3"). A press anywhere puts it away, as ✕ does
// (the user, 2026-10-17: "그냥 화면 아무데나 눌러도, 이전 화면으로 보내줘").
// slides: [{ file, title, caption, credit }] (core/photoSlides.js).
// Under the photo, the page goes on with what there is to read about it (main.js
// readingFor: { kicker, text }), scrolled to (the user, 2026-10-19: "사진버튼을 누르면,
// 해당 물체의 좀 더 자세한 설명을 붙여줘. 필요하면, 페이지 스크롤도 넣고..").
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

  // A press on the words is for reading them, not for leaving.
  $('photoViewMore').addEventListener('click', (event) => event.stopPropagation());
  dialog.addEventListener('click', () => {
    // (The press that ends a swipe has moved it on instead.)
    if (swiped) {
      swiped = false;
      return;
    }
    dialog.close();
  });
  let downX = null;
  let swiped = false;
  dialog.addEventListener('pointerdown', (event) => {
    // A press on a key (the ✕, the key at the foot) is never the start of a swipe: a thumb
    // that slid on the ✕ turned the photo instead of closing (code review, 2026-10-20).
    downX = event.target.closest?.('button') ? null : event.clientX;
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
  // At the very end of the page, under the reading (or under the words when there is
  // none), a key to leave, as the ✕ does (the user, 2026-10-19: "스크롤 내용 가장 밑 부분에
  // \"닫기\" 버튼 추가"; named as every way back to flying is). Its press is its own: not a
  // press on the page, nor the end of a swipe.
  $('photoViewBack').addEventListener('click', (event) => {
    event.stopPropagation();
    swiped = false;
    $('photoViewClose').click();
  });
  $('photoViewClose').setAttribute('aria-label', t('닫기'));
  dialog.addEventListener('close', () => onClose?.());

  return {
    show(list, about = null) {
      if (!list.length) return;
      slides = list;
      at = 0;
      draw();
      const text = about?.text ?? '';
      $('photoViewMore').hidden = !text;
      $('photoViewHint').hidden = !text;
      $('photoViewHint').textContent = t('아래로 내리면 자세한 설명이 있습니다');
      $('photoViewKicker').textContent = about?.kicker ?? '';
      $('photoViewText').replaceChildren(...text.split('\n\n').map((part) => {
        const p = document.createElement('p');
        p.textContent = part;
        return p;
      }));
      dialog.scrollTop = 0;
      onOpen?.();
      dialog.showModal();
    },
  };
}

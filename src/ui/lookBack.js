import { lookBackPlan } from '../core/lookBack.js';
import { photoCaption } from '../core/album.js';

const $ = (id) => document.getElementById(id);
// The fade between two photos, as in style.css (#lookImage).
const FADE_MS = 350;

// Looking back (core/lookBack.js): a sheet over the journal that turns through the
// album's photos by itself, the oldest first, each with its day and place. It closes at
// the end, or when "그만 보기" is pressed.
export function createLookBack({ missions }) {
  const dialog = $('lookBack');
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const stop = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  dialog.addEventListener('close', stop);
  $('lookClose').addEventListener('click', () => dialog.close());

  return {
    play(album) {
      const { photos, each } = lookBackPlan(album);
      if (!photos.length) return;
      stop();
      const image = $('lookImage');
      const show = (index) => {
        if (index >= photos.length) {
          dialog.close();
          return;
        }
        image.classList.add('out');
        later(() => {
          image.src = photos[index].image;
          $('lookCaption').textContent = photoCaption(photos[index], missions).title;
          $('lookCount').textContent = `${index + 1} / ${photos.length}`;
          image.classList.remove('out');
        }, index ? FADE_MS : 0);
        later(() => show(index + 1), each * 1000 + (index ? FADE_MS : 0));
      };
      image.removeAttribute('src');
      if (!dialog.open) dialog.showModal();
      show(0);
    },
  };
}

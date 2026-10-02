import { phoneFrame } from './core/screen.js';

// The outer page on a wide window: it holds the game in a frame shaped like a phone
// (core/screen.js) and nothing else. The game itself runs inside the frame, where the
// window really is that narrow, so its phone layout and all its sizes apply as they are.
export function startShell() {
  const frame = document.createElement('iframe');
  frame.id = 'phoneFrame';
  frame.title = 'Space Oddity';
  frame.allow = 'fullscreen; autoplay; web-share';
  frame.src = location.href;

  function layout() {
    const fit = phoneFrame({ width: innerWidth, height: innerHeight });
    // Dragged narrow: the frame simply fills the window.
    const { width, height, scale } = fit ?? { width: innerWidth, height: innerHeight, scale: 1 };
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    frame.style.transform = `translateX(-50%) scale(${scale})`;
    // The game draws its picture this much finer, to stay sharp when scaled up
    // (render/world.js reads it).
    frame.dataset.scale = String(scale);
    frame.contentWindow?.dispatchEvent(new Event('resize'));
  }

  document.body.append(frame);
  layout();
  addEventListener('resize', layout);
  // Keys go to the game: give it the focus at the start and whenever the page outside
  // the frame is clicked or a key lands there.
  const focus = () => frame.contentWindow?.focus();
  frame.addEventListener('load', () => {
    layout();
    focus();
  });
  addEventListener('pointerdown', focus);
  addEventListener('keydown', focus);
}

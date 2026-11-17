import { t, language } from '../core/i18n.js';
import { clockOffset, sleepState } from '../core/calm.js';

// The user: "5,6,7 해보자". Tonight's timer is deliberately never stored.
export function createCalm({ sound }) {
  const clock = document.getElementById('gazeClock');
  const veil = document.getElementById('sleepVeil');
  const clockButton = document.getElementById('gazeClockButton');
  const sleepButton = document.getElementById('sleepButton');
  const key = 'oddity.gazeClock';
  let enabled = false;
  try { enabled = localStorage.getItem(key) === '1'; } catch { /* This window only. */ }
  let gazing = false;
  let ready = false;
  let reveal = 0;
  let deadline = null;
  let duration = 0;
  let fading = false;
  let finished = false;
  let wakeClickPending = false;
  let sentinel = null;
  let requesting = false;
  const wantsWake = () => gazing && enabled && !finished && !document.hidden;
  const syncWake = async () => {
    if (!wantsWake()) {
      const held = sentinel;
      sentinel = null;
      try { await held?.release(); } catch { /* Already released by the device. */ }
      return;
    }
    if (sentinel || requesting || !navigator.wakeLock?.request) return;
    requesting = true;
    try {
      const held = await navigator.wakeLock.request('screen');
      if (wantsWake()) {
        sentinel = held;
        held.addEventListener('release', () => { if (sentinel === held) sentinel = null; });
      } else await held.release();
    } catch { /* Unsupported or denied: the clock still works. */ }
    finally { requesting = false; }
  };
  const showButtons = () => {
    clockButton.textContent = enabled ? t('켜짐') : t('꺼짐');
    clockButton.setAttribute('aria-pressed', String(enabled));
    sleepButton.textContent = duration ? t`잠들기: ${duration}분` : t('잠들기: 끔');
  };
  const update = () => {
    const now = Date.now();
    const state = sleepState(deadline, now);
    if (deadline !== null && now >= deadline && !fading) {
      fading = true;
      // If the tab slept through part of the fade, resume at the right level.
      sound.sleepVolume(state.music, 0);
      sound.sleepVolume(0, (1 - state.fade) * 60);
    }
    if (fading) veil.style.opacity = String(state.veil);
    if (state.done && !finished) { finished = true; syncWake(); }
    clock.classList.toggle('visible', gazing && enabled && ready);
    if (gazing && enabled) {
      const locale = language();
      const date = new Date(now);
      clock.querySelector('time').textContent = new Intl.DateTimeFormat(locale, {
        hour: '2-digit', minute: '2-digit', ...(locale === 'en' ? {} : { hourCycle: 'h23' }),
      }).format(date);
      clock.querySelector('.gazeDate').textContent = new Intl.DateTimeFormat(locale, {
        month: 'long', day: 'numeric', weekday: 'long',
      }).format(date);
      const left = clock.querySelector('.gazeSleep');
      left.textContent = state.minutes ? t`☾ ${state.minutes}분` : '';
      left.hidden = !state.minutes;
      const offset = clockOffset(now);
      clock.style.setProperty('--clock-x', `${offset.x}px`);
      clock.style.setProperty('--clock-y', `${offset.y}px`);
    }
  };
  const cancelSleep = () => {
    deadline = null;
    duration = 0;
    fading = false;
    finished = false;
    veil.style.transitionDuration = '400ms';
    veil.style.opacity = '0';
    sound.sleepVolume(1, 0.4);
    showButtons();
    syncWake();
    update();
  };
  for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, (event) => {
    // Check the deadline as well: a throttled tab may not have painted the veil yet.
    if (!fading && !(deadline !== null && Date.now() >= deadline)) {
      if (type === 'pointerdown') wakeClickPending = false;
      return;
    }
    if (type === 'pointerdown') wakeClickPending = true;
    event.preventDefault();
    event.stopImmediatePropagation();
    cancelSleep();
  }, { capture: true });
  // A phone may still send click after pointerdown was cancelled; consume that gesture.
  document.addEventListener('click', (event) => {
    if (!wakeClickPending) return;
    wakeClickPending = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });
  sleepButton.addEventListener('click', () => {
    const next = { 0: 15, 15: 30, 30: 60, 60: 0 }[duration];
    cancelSleep();
    duration = next;
    deadline = next ? Date.now() + next * 60000 : null;
    veil.style.transitionDuration = '250ms';
    showButtons();
    update();
  });
  clockButton.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem(key, enabled ? '1' : '0'); } catch { /* This window only. */ }
    showButtons();
    update();
    syncWake();
  });
  document.addEventListener('visibilitychange', () => { update(); syncWake(); });
  window.addEventListener('pagehide', () => { gazing = false; syncWake(); });
  setInterval(update, 250);
  showButtons();
  update();
  return {
    setGazing(on) {
      gazing = on;
      ready = false;
      clearTimeout(reveal);
      update();
      syncWake();
    },
    reveal() {
      clearTimeout(reveal);
      reveal = setTimeout(() => { ready = true; update(); }, 600);
    },
  };
}

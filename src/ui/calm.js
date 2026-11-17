import { t, language } from '../core/i18n.js';
import { clockOffset, sleepState } from '../core/calm.js';

// The user: "5,6,7 해보자". Tonight's timer is deliberately never stored.
export function createCalm({ sound }) {
  const clock = document.getElementById('gazeClock');
  const veil = document.getElementById('sleepVeil');
  const clockButton = document.getElementById('gazeClockButton');
  const sleepButton = document.getElementById('sleepButton');
  // The same timer beside the music key while just looking (the user, 2026-11-18: "우주멍에
  // 잠들기 단추도 넣어"): a timer drawn when off (style.css; it was "Zz" till the user, 2026-11-18:
  // "zz보다 타이어 아이콘을 그려넣는게 어때?", a timer meant), the minutes left when on.
  const gazeSleepKey = document.getElementById('gazeSleep');
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
    if (gazeSleepKey) {
      gazeSleepKey.setAttribute('aria-label', sleepButton.textContent);
      gazeSleepKey.title = sleepButton.textContent;
      gazeSleepKey.classList.toggle('on', Boolean(duration));
    }
  };
  // Each line as wide as the title above it (style.css #gazeClock), measured again only
  // when its words or the title's width change. A long date (in English) is not made
  // smaller than can be read: it may then reach past the title.
  let fitted = '';
  // The hand font comes in only when first used: measured before, the lines came out a
  // third too narrow. Measure again once it is in.
  document.fonts?.addEventListener?.('loadingdone', () => { fitted = ''; });
  const fitLines = (sleepWords) => {
    const time = clock.querySelector('time');
    const date = clock.querySelector('.gazeDate');
    const width = document.getElementById('gazeLogo')?.getBoundingClientRect?.().width || 92;
    const key = `${time.textContent}|${date.textContent}|${sleepWords}|${width}`;
    if (key === fitted) return;
    fitted = key;
    const fit = (el, least, most) => {
      el.style.fontSize = '40px';
      const natural = el.getBoundingClientRect?.().width;
      if (natural) el.style.fontSize = `${Math.max(least, Math.min(most, (40 * width) / natural))}px`;
    };
    fit(time, 16, 48);
    fit(date, 10, 22);
    clock.querySelector('.gazeSleep').style.fontSize = date.style.fontSize;
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
    if (gazeSleepKey) {
      const words = state.minutes ? t`${state.minutes}분` : '';
      if (gazeSleepKey.textContent !== words) gazeSleepKey.textContent = words;
    }
    clock.classList.toggle('visible', gazing && enabled && ready);
    if (gazing && enabled) {
      const locale = language();
      const date = new Date(now);
      clock.querySelector('time').textContent = new Intl.DateTimeFormat(locale, {
        hour: '2-digit', minute: '2-digit', ...(locale === 'en' ? {} : { hourCycle: 'h23' }),
      }).format(date);
      // Short, as people write it: "Wed, Nov 18", "11월 18일 (수)" (the user, 2026-11-18: "줄임말로 쓰지").
      clock.querySelector('.gazeDate').textContent = new Intl.DateTimeFormat(locale, {
        month: 'short', day: 'numeric', weekday: 'short',
      }).format(date);
      const left = clock.querySelector('.gazeSleep');
      left.textContent = state.minutes ? t`☾ ${state.minutes}분` : '';
      left.hidden = !state.minutes;
      fitLines(left.textContent);
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
  const nextSleep = () => {
    const next = { 0: 15, 15: 30, 30: 60, 60: 0 }[duration];
    cancelSleep();
    duration = next;
    deadline = next ? Date.now() + next * 60000 : null;
    veil.style.transitionDuration = '250ms';
    showButtons();
    update();
  };
  sleepButton.addEventListener('click', nextSleep);
  // A press of that key says what it did, at the foot of the screen for five seconds (the
  // user, 2026-11-18: "버튼을 누르면, 화면 아래 중앙에 '잠들기 / 몇 분 후에 화면이 꺼집니다'라고
  // 5초간 띄워줘"): "Zz" alone told them nothing.
  const note = document.getElementById('gazeNote');
  let noteTimer = 0;
  gazeSleepKey?.addEventListener('click', () => {
    nextSleep();
    if (!note) return;
    note.querySelector('strong').textContent = t('잠들기');
    note.querySelector('span').textContent = duration ? t`${duration}분 후에 화면이 꺼집니다.` : t('타이머를 껐습니다.');
    note.hidden = false;
    note.classList.remove('gone');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      note.classList.add('gone');
      noteTimer = setTimeout(() => { note.hidden = true; }, 600);
    }, 5000);
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

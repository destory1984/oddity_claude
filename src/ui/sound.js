// Synthesized game sounds (Web Audio). No sound files: every cue is built from
// oscillators and a noise buffer, so nothing is downloaded and nothing is licensed.

import { callFor } from '../core/voice.js';
import { BAR_S, barPlan, tuneFor, nextTuneBar, tuneOrder, barInOrder } from '../core/music.js';

const MUTE_KEY = 'oddity.muted';
const MUSIC_KEY = 'oddity.music';
// Music sits well under the effects.
const PAD_VOLUME = 0.02;
const BASS_VOLUME = 0.03;
const MASTER_VOLUME = 0.8;

function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

// Background music is on unless the player turned it off.
function loadMusic() {
  try {
    return localStorage.getItem(MUSIC_KEY) !== '0';
  } catch {
    return true;
  }
}

function saveMusic(on) {
  try {
    localStorage.setItem(MUSIC_KEY, on ? '1' : '0');
  } catch {
    // Not remembered in this window; still applies now.
  }
}

function saveMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Not remembered in this window; still applies now.
  }
}

export function createSound() {
  let ctx = null;
  let master;
  let noiseBuffer;
  let engine;
  const FLIGHT_VOLUME = 0.8;
  let muted = loadMuted();
  let musicOn = loadMusic();
  let musicBus;
  // Effects (cues, the flight sound) go through their own switch, so effects and music
  // can be turned off separately. `muted` means the effects are off.
  let sfx;
  // When the next bar of music starts (audio clock) and which bar it is.
  let nextBarAt = 0;
  // Bars played so far; the tunes go round in an order drawn afresh each sitting.
  let barNumber = 0;
  const order = tuneOrder();
  let playing = null;

  // Browsers only allow audio after a user gesture, so this runs on the first key or tap.
  function ensure() {
    if (ctx) return ctx;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(ctx.destination);
    sfx = ctx.createGain();
    sfx.gain.value = muted ? 0 : 1;
    sfx.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? 1 : 0;
    musicBus.connect(master);

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Flight: a quiet wind and nothing else (there is no air out here; it is a game).
    // A soft band of noise with a lower one under it, swelling slowly like gusts.
    // Faster flight slides it a little higher. (It had a snapping cape and a whoosh on
    // setting off at first; those were too much.)
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(sfx);
    const air = ctx.createBufferSource();
    air.buffer = noiseBuffer;
    air.loop = true;
    const rush = ctx.createBiquadFilter();
    rush.type = 'bandpass';
    rush.frequency.value = 300;
    rush.Q.value = 0.6;
    const rushLevel = ctx.createGain();
    rushLevel.gain.value = 1;
    air.connect(rush).connect(rushLevel).connect(gain);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 160;
    const lowLevel = ctx.createGain();
    lowLevel.gain.value = 0.8;
    air.connect(low).connect(lowLevel).connect(gain);
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.23;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 0.2;
    gust.connect(gustDepth).connect(rushLevel.gain);
    gust.start();
    air.start();
    engine = { gain, rush, low };

    return ctx;
  }

  function tone({ freq, to = freq, type = 'sine', start = 0, length = 0.2, volume = 0.2, out = sfx, attack = 0.01 }) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + length);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volume, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }

  // One held note of the pad: two slightly detuned triangles behind a low-pass filter,
  // swelling in over 2.5 s and fading out over 3 s so bars melt into each other.
  function padNote(freq, start, volume) {
    const t = ctx.currentTime + start;
    const end = t + BAR_S + 3;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(volume, t + 2.5);
    env.gain.setValueAtTime(volume, end - 3);
    env.gain.linearRampToValueAtTime(0.0001, end);
    filter.connect(env).connect(musicBus);
    for (const cents of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(t);
      osc.stop(end + 0.05);
    }
  }

  // plan from core/music.js barPlan(); start is seconds from now.
  function playBar(plan, start) {
    for (const freq of plan.pad) padNote(freq, start, PAD_VOLUME);
    tone({ freq: plan.bass, start, length: BAR_S, volume: BASS_VOLUME, out: musicBus });
    for (const note of plan.notes) {
      const { length, overtone, overtoneVolume, wave = 'sine' } = plan.bell;
      tone({ freq: note.freq, type: wave, start: start + note.at, length, volume: note.volume, out: musicBus });
      tone({ freq: note.freq * overtone, start: start + note.at, length: length * 0.3, volume: note.volume * overtoneVolume, out: musicBus });
    }
  }

  // attack: seconds to swell from silence. 0 starts at full volume, which is a hard
  // tick at the front of the sound.
  function noise({ start = 0, length = 0.1, volume = 0.2, type = 'highpass', freq = 2000, to = freq, attack = 0 }) {
    const t = ctx.currentTime + start;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (to !== freq) filter.frequency.exponentialRampToValueAtTime(to, t + length);
    const env = ctx.createGain();
    if (attack > 0) {
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(volume, t + attack);
    } else {
      env.gain.setValueAtTime(volume, t);
    }
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(filter).connect(env).connect(sfx);
    src.start(t);
    src.stop(t + length + 0.05);
  }

  // Kalimba: a sine with a quick decay, a faint octave overtone and a tiny tine click.
  function pluck(freq, start = 0, volume = 0.16, length = 0.9) {
    tone({ freq, start, length, volume });
    tone({ freq: freq * 2, start, length: length * 0.4, volume: volume * 0.25 });
    noise({ start, length: 0.015, volume: volume * 0.5, freq: 4000 });
  }

  // Music box: high, bell-like, with a third-harmonic shimmer.
  function bell(freq, start = 0, volume = 0.1) {
    tone({ freq, start, length: 1.1, volume });
    tone({ freq: freq * 3, start, length: 0.35, volume: volume * 0.2 });
  }

  const PENTATONIC = [523, 587, 659, 784, 880, 1047, 1175, 1319];

  const CUES = {
    discovered: () => [523, 659, 784, 880, 1047].forEach((f, i) => pluck(f, i * 0.1, 0.14)),
    // Touching down: a soft low thump, no tick. (It was a burst of noise at full volume
    // with a plucked note, which came out as a hard "tack".)
    landed: () => {
      noise({ length: 0.3, volume: 0.16, type: 'lowpass', freq: 420, to: 140, attack: 0.03 });
      tone({ freq: 174, to: 131, length: 0.55, volume: 0.13 });
    },
    shutter: () => {
      noise({ length: 0.03, volume: 0.3, type: 'bandpass', freq: 2500 });
      noise({ start: 0.05, length: 0.06, volume: 0.22, type: 'bandpass', freq: 1400, to: 900 });
    },
    mission: () => [784, 988, 784, 1175, 1568].forEach((f, i) => bell(f, i * 0.12)),
    complete: () => [523, 659, 784, 1047, 988, 784, 1047, 1319].forEach((f, i) => bell(f, i * 0.16, 0.12)),
    // Stopping: "puk", like sinking into a cushion: muffled low noise only, no note.
    // The user chose it by ear from eleven candidates. (Tried before and not liked: a
    // band of noise that began at full volume, 2,600 Hz, a sharp "tack"; a breath of low
    // noise under a falling note; two music-box notes; a shoe skid with two squeaks; a
    // low thump of 0.2 s, then of 0.1 s.)
    brake: () => noise({ length: 0.14, volume: 0.2, type: 'lowpass', freq: 380, to: 140, attack: 0.02 }),
    click: () => pluck(1319, 0, 0.05, 0.2),
    // Docking: air rushing up as the approach begins, a tick for each count, then the
    // latch: a low clunk and two rising bells. Letting go plays the bells falling.
    docking: () => {
      noise({ length: 1.2, volume: 0.1, type: 'bandpass', freq: 500, to: 1700 });
      pluck(392, 0, 0.1, 0.8);
    },
    count: () => tone({ freq: 880, length: 0.09, volume: 0.07 }),
    // Contact: a low clunk and, with it, pshhh, the seal filling with air, bright at first
    // and sinking as it fades; two rising bells close it. (The craft jolts at the same
    // moment: core/dock.js latchJolt.)
    dock: () => {
      noise({ length: 0.16, volume: 0.4, type: 'lowpass', freq: 700, to: 180 });
      tone({ freq: 98, length: 0.4, volume: 0.22 });
      noise({ start: 0.05, length: 1.6, volume: 0.32, type: 'highpass', freq: 4200, to: 1400 });
      noise({ start: 0.05, length: 0.9, volume: 0.14, type: 'bandpass', freq: 2600, to: 900 });
      bell(659, 0.9);
      bell(988, 1.08);
    },
    // A jump, six seconds like the flash (ui/warp.js). All bells and clear tones, no low
    // noise: music-box notes climbing a five-note scale faster and faster for 2.6 s, a
    // bright chord as the screen goes white, then a few slow chimes drifting down as
    // the new place appears. (The first version was a band of noise swept up from
    // 200 Hz, which sounded like breaking wind.)
    warp: () => {
      const scale = [392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637, 3136];
      scale.forEach((freq, k) => {
        // Bunched toward the end: the last notes are a tenth of a second apart.
        const at = 2.6 * (1 - (1 - k / scale.length) ** 1.7);
        bell(freq, at, 0.03 + 0.045 * (k / scale.length));
      });
      // A thin, high shimmer under the climb.
      tone({ freq: 1568, to: 3136, start: 0.6, length: 2.1, volume: 0.018 });
      noise({ start: 1.6, length: 1.2, volume: 0.035, type: 'highpass', freq: 6000, to: 9000 });
      // Arrival: a wide, bright chord.
      [1047, 1319, 1568, 2093, 2637].forEach((freq, i) => bell(freq, 2.72 + i * 0.03, 0.085 - i * 0.008));
      tone({ freq: 523, start: 2.72, length: 1.6, volume: 0.05 });
      // Settling: slow chimes stepping down.
      [[2093, 3.5], [1568, 4.0], [1319, 4.5], [1047, 5.0]].forEach(([freq, at], i) => bell(freq, at, 0.045 - i * 0.007));
    },
    undock: () => {
      noise({ length: 0.25, volume: 0.18, type: 'bandpass', freq: 900, to: 2400 });
      bell(988, 0.02, 0.07);
      bell(659, 0.16, 0.07);
    },
  };

  return {
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
    },
    cue(name) {
      if (!ctx || muted || !CUES[name]) return;
      CUES[name]();
    },
    // { gain, pitch, sparkle } from core/audio.js engineSound(); called every frame.
    engine({ gain, pitch }) {
      if (!ctx) return;
      const t = ctx.currentTime;
      // A little quieter than the first flight sounds were.
      engine.gain.gain.setTargetAtTime(gain * FLIGHT_VOLUME, t, 0.3);
      // pitch runs 330..660 with speed: the wind slides from 300 up to 750 Hz.
      const k = Math.max(0, Math.min(1, (pitch - 330) / 330));
      engine.rush.frequency.setTargetAtTime(300 + 450 * k, t, 0.5);
      engine.low.frequency.setTargetAtTime(160 + 120 * k, t, 0.5);
    },
    // Called every frame with the mood from core/music.js moodFor(); starts each bar a
    // little ahead of time so the audio clock, not the frame rate, keeps the beat.
    music(mood) {
      if (!ctx || !musicOn || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      // After a pause or a hidden tab, pick up from now rather than catching up.
      if (nextBarAt < now) nextBarAt = now + 0.1;
      if (nextBarAt - now > 0.5) return;
      const bar = barInOrder(barNumber, order);
      playBar(barPlan(bar, mood), nextBarAt - now);
      playing = tuneFor(bar).name;
      barNumber += 1;
      nextBarAt += BAR_S;
    },
    musicOn: () => musicOn,
    // The name of the tune being played (null before the first bar).
    tuneName: () => playing,
    // Jump to the next tune at the coming bar; returns its name.
    nextTune() {
      barNumber = nextTuneBar(barNumber);
      return tuneFor(barInOrder(barNumber, order)).name;
    },
    setMusic(on) {
      musicOn = on;
      saveMusic(on);
      if (ctx) musicBus.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.3);
    },
    // Spoken by the browser's own voice (no sound files): in Korean on a device set to
    // Korean, in English on any other (core/voice.js). Silent when muted or when the
    // browser has no speech.
    // Speech queues: a new line waits for the one being said, and a countdown would
    // drift late. So anything still being said is cut off first.
    say(text) {
      if (muted || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();
      // The speaker is named outright: with the language alone the device chooses.
      // (The list of voices fills in a moment after the page opens.)
      const call = callFor(text, navigator.language, window.speechSynthesis.getVoices());
      const words = new SpeechSynthesisUtterance(call.text);
      words.lang = call.lang;
      if (call.voice) words.voice = call.voice;
      words.rate = 1.2;
      // Half of what it was (0.9): the voice stood out over everything else.
      words.volume = 0.45;
      window.speechSynthesis.speak(words);
    },
    // Stop talking at once (the docking was called off).
    hush() {
      window.speechSynthesis?.cancel();
    },
    muted: () => muted,
    setMuted(value) {
      muted = value;
      saveMuted(muted);
      if (muted) window.speechSynthesis?.cancel();
      if (ctx) sfx.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
    },
  };
}

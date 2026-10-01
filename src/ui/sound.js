// Synthesized game sounds (Web Audio). No sound files: every cue is built from
// oscillators and a noise buffer, so nothing is downloaded and nothing is licensed.

import { BAR_S, barPlan } from '../core/music.js';

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
  let muted = loadMuted();
  let musicOn = loadMusic();
  let musicBus;
  // When the next bar of music starts (audio clock) and which bar it is.
  let nextBarAt = 0;
  let barNumber = 0;

  // Browsers only allow audio after a user gesture, so this runs on the first key or tap.
  function ensure() {
    if (ctx) return ctx;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? 1 : 0;
    musicBus.connect(master);

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Flight: paper fluttering in the wind. A band of noise, its loudness chopped by a
    // flutter oscillator; faster flight flutters quicker and brighter. No tones under
    // it, so it never hums like an engine.
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(master);
    const air = ctx.createBufferSource();
    air.buffer = noiseBuffer;
    air.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1800;
    band.Q.value = 0.9;
    const flutterGain = ctx.createGain();
    flutterGain.gain.value = 0.5;
    air.connect(band).connect(flutterGain).connect(gain);
    const flutter = ctx.createOscillator();
    flutter.type = 'square';
    flutter.frequency.value = 9;
    const flutterDepth = ctx.createGain();
    flutterDepth.gain.value = 0.35;
    flutter.connect(flutterDepth).connect(flutterGain.gain);
    air.start();
    flutter.start();
    engine = { gain, band, flutter };

    return ctx;
  }

  function tone({ freq, to = freq, type = 'sine', start = 0, length = 0.2, volume = 0.2, out = master }) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + length);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volume, t + 0.01);
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
      tone({ freq: note.freq, start: start + note.at, length: 1.4, volume: note.volume, out: musicBus });
      tone({ freq: note.freq * 3, start: start + note.at, length: 0.4, volume: note.volume * 0.2, out: musicBus });
    }
  }

  function noise({ start = 0, length = 0.1, volume = 0.2, type = 'highpass', freq = 2000, to = freq }) {
    const t = ctx.currentTime + start;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (to !== freq) filter.frequency.exponentialRampToValueAtTime(to, t + length);
    const env = ctx.createGain();
    env.gain.setValueAtTime(volume, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(filter).connect(env).connect(master);
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
    landed: () => {
      noise({ length: 0.12, volume: 0.35, type: 'lowpass', freq: 900, to: 250 });
      pluck(196, 0.02, 0.18, 0.7);
    },
    shutter: () => {
      noise({ length: 0.03, volume: 0.3, type: 'bandpass', freq: 2500 });
      noise({ start: 0.05, length: 0.06, volume: 0.22, type: 'bandpass', freq: 1400, to: 900 });
    },
    mission: () => [784, 988, 784, 1175, 1568].forEach((f, i) => bell(f, i * 0.12)),
    complete: () => [523, 659, 784, 1047, 988, 784, 1047, 1319].forEach((f, i) => bell(f, i * 0.16, 0.12)),
    brake: () => noise({ length: 0.3, volume: 0.22, type: 'bandpass', freq: 2600, to: 500 }),
    click: () => pluck(1319, 0, 0.05, 0.2),
    // Docking: air rushing up as the approach begins, a tick for each count, then the
    // latch: a low clunk and two rising bells. Letting go plays the bells falling.
    docking: () => {
      noise({ length: 1.2, volume: 0.1, type: 'bandpass', freq: 500, to: 1700 });
      pluck(392, 0, 0.1, 0.8);
    },
    count: () => tone({ freq: 880, length: 0.09, volume: 0.07 }),
    dock: () => {
      noise({ length: 0.16, volume: 0.4, type: 'lowpass', freq: 700, to: 180 });
      tone({ freq: 98, length: 0.4, volume: 0.22 });
      // Pshhh: the seal filling with air, bright at first and sinking as it fades.
      noise({ start: 0.08, length: 1.6, volume: 0.32, type: 'highpass', freq: 4200, to: 1400 });
      noise({ start: 0.08, length: 0.9, volume: 0.14, type: 'bandpass', freq: 2600, to: 900 });
      bell(659, 0.5);
      bell(988, 0.68);
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
    engine({ gain, pitch, sparkle }, dt = 1 / 60) {
      if (!ctx) return;
      const t = ctx.currentTime;
      engine.gain.gain.setTargetAtTime(gain, t, 0.15);
      // pitch runs 330..660 with speed: flutter 8..20 times a second, brighter band.
      engine.flutter.frequency.setTargetAtTime(8 + ((pitch - 330) / 330) * 12, t, 0.3);
      engine.band.frequency.setTargetAtTime(1200 + pitch * 2.5, t, 0.3);
      // Now and then a soft kalimba note, about `sparkle` per second.
      if (!muted && sparkle > 0 && Math.random() < sparkle * dt) {
        pluck(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)], 0, 0.035, 0.6);
      }
    },
    // Called every frame with the mood from core/music.js moodFor(); starts each bar a
    // little ahead of time so the audio clock, not the frame rate, keeps the beat.
    music(mood) {
      if (!ctx || muted || !musicOn || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      // After a pause or a hidden tab, pick up from now rather than catching up.
      if (nextBarAt < now) nextBarAt = now + 0.1;
      if (nextBarAt - now > 0.5) return;
      playBar(barPlan(barNumber, mood), nextBarAt - now);
      barNumber += 1;
      nextBarAt += BAR_S;
    },
    musicOn: () => musicOn,
    setMusic(on) {
      musicOn = on;
      saveMusic(on);
      if (ctx) musicBus.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.3);
    },
    // Spoken English, by the browser's own voice (no sound files). Silent when muted
    // or when the browser has no speech.
    // Speech queues: a new line waits for the one being said, and a countdown would
    // drift late. So anything still being said is cut off first.
    say(text) {
      if (muted || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();
      const words = new SpeechSynthesisUtterance(text);
      words.lang = 'en-US';
      words.rate = 1.2;
      words.volume = 0.9;
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
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.05);
    },
  };
}

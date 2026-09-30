// Synthesized game sounds (Web Audio). No sound files: every cue is built from
// oscillators and a noise buffer, so nothing is downloaded and nothing is licensed.

const MUTE_KEY = 'oddity.muted';
const MASTER_VOLUME = 0.8;

function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
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

  // Browsers only allow audio after a user gesture, so this runs on the first key or tap.
  function ensure() {
    if (ctx) return ctx;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);

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

  function tone({ freq, to = freq, type = 'sine', start = 0, length = 0.2, volume = 0.2 }) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + length);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + length + 0.05);
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
    zoneUp: () => {
      pluck(523);
      pluck(784, 0.12);
    },
    zoneDown: () => {
      pluck(784);
      pluck(523, 0.12);
    },
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
    muted: () => muted,
    setMuted(value) {
      muted = value;
      saveMuted(muted);
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.05);
    },
  };
}

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

    // Engine: two slightly detuned saws through a low-pass, plus a band of rushing noise.
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(master);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 300;
    lowpass.connect(gain);
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscA.frequency.value = 55;
    oscB.frequency.value = 55 * 1.012;
    oscA.connect(lowpass);
    oscB.connect(lowpass);
    const rush = ctx.createBufferSource();
    rush.buffer = noiseBuffer;
    rush.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 500;
    band.Q.value = 0.8;
    const rushGain = ctx.createGain();
    rushGain.gain.value = 0.5;
    rush.connect(band).connect(rushGain).connect(gain);
    oscA.start();
    oscB.start();
    rush.start();
    engine = { gain, lowpass, oscA, oscB, band };
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

  const CUES = {
    zoneUp: () => tone({ freq: 440, to: 880, type: 'triangle', length: 0.3, volume: 0.15 }),
    zoneDown: () => tone({ freq: 660, to: 300, type: 'triangle', length: 0.35, volume: 0.15 }),
    discovered: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.11, length: 0.35, volume: 0.14 })),
    landed: () => {
      tone({ freq: 110, to: 38, length: 0.45, volume: 0.45 });
      noise({ length: 0.3, volume: 0.25, type: 'lowpass', freq: 600, to: 120 });
    },
    shutter: () => {
      noise({ length: 0.04, volume: 0.35, freq: 3000 });
      noise({ start: 0.07, length: 0.05, volume: 0.25, freq: 2200 });
    },
    mission: () => [784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, start: i * 0.09, length: 0.6, volume: 0.12 })),
    complete: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.14, length: 0.5, volume: 0.14 })),
    brake: () => noise({ length: 0.35, volume: 0.2, type: 'bandpass', freq: 1800, to: 200 }),
    click: () => tone({ freq: 1200, length: 0.05, volume: 0.06 }),
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
    // { gain, pitch } from core/audio.js engineSound().
    engine({ gain, pitch }) {
      if (!ctx) return;
      const t = ctx.currentTime;
      engine.gain.gain.setTargetAtTime(gain, t, 0.12);
      engine.oscA.frequency.setTargetAtTime(pitch, t, 0.2);
      engine.oscB.frequency.setTargetAtTime(pitch * 1.012, t, 0.2);
      engine.lowpass.frequency.setTargetAtTime(150 + pitch * 4, t, 0.2);
      engine.band.frequency.setTargetAtTime(300 + pitch * 8, t, 0.2);
    },
    muted: () => muted,
    setMuted(value) {
      muted = value;
      saveMuted(muted);
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.05);
    },
  };
}

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(frequency, duration, { type = "sine", gain = 0.3, detune = 0, attack = 0.005, decay } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const effectiveDecay = decay ?? duration;
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  osc.detune.value = detune;

  vol.gain.setValueAtTime(0, now);
  vol.gain.linearRampToValueAtTime(gain, now + attack);
  vol.gain.exponentialRampToValueAtTime(0.001, now + effectiveDecay);

  osc.connect(vol);
  vol.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playNoise(duration, { gain = 0.15, filterFreq = 2000, filterQ = 1, attack = 0.003, decay } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const effectiveDecay = decay ?? duration;
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;

  const vol = ctx.createGain();
  vol.gain.setValueAtTime(0, now);
  vol.gain.linearRampToValueAtTime(gain, now + attack);
  vol.gain.exponentialRampToValueAtTime(0.001, now + effectiveDecay);

  source.connect(filter);
  filter.connect(vol);
  vol.connect(ctx.destination);
  source.start(now);
}

const PLACEMENT_SOUNDS = {
  barn() {
    playTone(120, 0.25, { type: "triangle", gain: 0.35, decay: 0.22 });
    playTone(80, 0.3, { type: "sine", gain: 0.2, decay: 0.28 });
    playNoise(0.08, { gain: 0.12, filterFreq: 600 });
  },

  fence() {
    playTone(440, 0.1, { type: "square", gain: 0.12, decay: 0.08 });
    playTone(520, 0.08, { type: "square", gain: 0.08, decay: 0.06 });
    playNoise(0.05, { gain: 0.08, filterFreq: 3000 });
  },

  "hay-bale"() {
    playNoise(0.18, { gain: 0.2, filterFreq: 1200, filterQ: 0.5, decay: 0.16 });
    playTone(150, 0.12, { type: "sine", gain: 0.1, decay: 0.1 });
  },

  cow() {
    playTone(180, 0.2, { type: "sawtooth", gain: 0.15, detune: 10, decay: 0.18 });
    playTone(200, 0.15, { type: "sine", gain: 0.1, decay: 0.12 });
    playNoise(0.06, { gain: 0.06, filterFreq: 800 });
  },

  chicken() {
    playTone(800, 0.06, { type: "sine", gain: 0.2, decay: 0.05 });
    playTone(1000, 0.05, { type: "sine", gain: 0.15, decay: 0.04 });
    playTone(900, 0.07, { type: "triangle", gain: 0.1, decay: 0.06 });
  },

  "apple-tree"() {
    playTone(200, 0.2, { type: "triangle", gain: 0.2, decay: 0.18 });
    playNoise(0.2, { gain: 0.1, filterFreq: 3500, filterQ: 0.3, decay: 0.18 });
    playTone(260, 0.12, { type: "sine", gain: 0.08, decay: 0.1 });
  },
};

export function playPlacementSound(objectId) {
  const soundFn = PLACEMENT_SOUNDS[objectId];
  if (soundFn) {
    try {
      soundFn();
    } catch {
      // Audio not available — fail silently
    }
  }
}

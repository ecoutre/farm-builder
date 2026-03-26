const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TOOLBAR_ID = "toolbar-buttons";
const PLACEMENT_LAYER_ID = "placement-layer";
const PLACE_GRID_SIZE = 12;
const AMBIENT_LOOP_DURATION = 12;
const AMBIENT_MASTER_VOLUME = 0.16;

const FARM_OBJECTS = [
  { id: "barn", label: "Barn", icon: "🏠" },
  { id: "coop", label: "Coop", icon: "🐔" },
  { id: "silo", label: "Silo", icon: "🛢️" },
  { id: "tree", label: "Tree", icon: "🌳" },
  { id: "crop", label: "Crops", icon: "🌾" },
  { id: "pond", label: "Pond", icon: "💧" },
];

const state = {
  activeObjectId: FARM_OBJECTS[0].id,
  ambientAudioStarted: false,
  ambientAudioContext: null,
  ambientMasterGain: null,
};
const SOURCE_TILE_SIZE = 32;
const TILE_SCALE = 3;
const TILE_DRAW_SIZE = SOURCE_TILE_SIZE * TILE_SCALE;
const GRASS_PALETTE = ["#5e9345", "#679c4b", "#70a852", "#7eb760", "#8bc96b"];
let cachedGrassTiles = null;
const BLADE_STAMPS = [
  {
    blade: [
      [0, 2, 2],
      [1, 1, 3],
      [2, 0, 4],
    ],
    shadow: [
      [0, 3, 0],
      [1, 3, 0],
    ],
  },
  {
    blade: [
      [0, 0, 4],
      [1, 1, 3],
      [2, 2, 2],
    ],
    shadow: [
      [1, 3, 0],
      [2, 3, 0],
    ],
  },
  {
    blade: [
      [0, 1, 2],
      [1, 0, 3],
    ],
    shadow: [[0, 2, 0]],
  },
  {
    blade: [
      [0, 2, 2],
      [1, 2, 3],
      [2, 1, 3],
      [3, 0, 4],
    ],
    shadow: [
      [1, 3, 0],
      [2, 3, 0],
    ],
  },
];

function hash2D(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function clampSample(value) {
  return Math.max(-1, Math.min(1, value));
}

function getWrappedDistance(position, center, loopDuration) {
  let delta = position - center;

  if (delta > loopDuration / 2) {
    delta -= loopDuration;
  } else if (delta < -loopDuration / 2) {
    delta += loopDuration;
  }

  return delta;
}

function addLoopedEvent(buffer, loopDuration, sampleRate, centerTime, radius, renderSample) {
  const startIndex = Math.floor((centerTime - radius) * sampleRate);
  const endIndex = Math.ceil((centerTime + radius) * sampleRate);
  const totalSamples = buffer.length;

  for (let index = startIndex; index <= endIndex; index += 1) {
    const wrappedIndex = ((index % totalSamples) + totalSamples) % totalSamples;
    const position = wrappedIndex / sampleRate;
    const delta = getWrappedDistance(position, centerTime, loopDuration);

    if (Math.abs(delta) > radius) {
      continue;
    }

    buffer[wrappedIndex] += renderSample(delta, position);
  }
}

function createLoopingNoise(length, random) {
  const noise = new Float32Array(length);

  for (let index = 0; index < length; index += 1) {
    noise[index] = random() * 2 - 1;
  }

  return noise;
}

function sampleLoopingNoise(noise, samplePosition) {
  const length = noise.length;
  const wrappedPosition = ((samplePosition % length) + length) % length;
  const baseIndex = Math.floor(wrappedPosition);
  const nextIndex = (baseIndex + 1) % length;
  const fraction = wrappedPosition - baseIndex;

  return noise[baseIndex] * (1 - fraction) + noise[nextIndex] * fraction;
}

function createAmbientLoopBuffer(audioContext) {
  const sampleRate = audioContext.sampleRate;
  const frameCount = Math.floor(sampleRate * AMBIENT_LOOP_DURATION);
  const buffer = audioContext.createBuffer(2, frameCount, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  let randomSeed = 0.421;

  const random = () => {
    randomSeed = (randomSeed * 16807) % 2147483647;
    return (randomSeed - 1) / 2147483646;
  };

  const windNoise = createLoopingNoise(4096, random);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / sampleRate;
    const loopPhase = (frame / frameCount) * Math.PI * 2;
    const breezeBody =
      Math.sin(loopPhase - 0.6) * 0.48 +
      Math.sin(loopPhase * 2 + 0.8) * 0.26 +
      Math.sin(loopPhase * 3 - 1.4) * 0.18;
    const gustEnvelope =
      0.23 +
      0.07 * Math.sin(loopPhase * 2 - 0.2) +
      0.04 * Math.sin(loopPhase * 5 + 1.3) +
      0.03 * Math.sin(loopPhase * 7 - 0.8);
    const hissLeft =
      Math.sin(loopPhase * 17 + 0.3) * 0.026 +
      Math.sin(loopPhase * 29 - 1.1) * 0.02 +
      Math.sin(loopPhase * 43 + 0.9) * 0.014;
    const hissRight =
      Math.sin(loopPhase * 19 - 0.5) * 0.024 +
      Math.sin(loopPhase * 31 + 0.7) * 0.018 +
      Math.sin(loopPhase * 47 - 1.4) * 0.015;

    left[frame] = breezeBody * gustEnvelope + hissLeft;
    right[frame] = breezeBody * (gustEnvelope * 0.97) + hissRight;
  }

  const mooEvents = [1.8, 7.6];
  for (const centerTime of mooEvents) {
    addLoopedEvent(left, AMBIENT_LOOP_DURATION, sampleRate, centerTime, 0.9, (delta) => {
      const progress = (delta + 0.9) / 1.8;
      const envelope = Math.sin(progress * Math.PI) ** 2;
      const frequency =
        166 +
        8 * Math.sin(progress * Math.PI * 2) +
        4 * Math.sin(progress * Math.PI * 5);
      const phase = delta * Math.PI * 2 * frequency;
      return envelope * (Math.sin(phase) * 0.09 + Math.sin(phase * 0.5 + 0.5) * 0.05);
    });

    addLoopedEvent(right, AMBIENT_LOOP_DURATION, sampleRate, centerTime + 0.08, 0.9, (delta) => {
      const progress = (delta + 0.9) / 1.8;
      const envelope = Math.sin(progress * Math.PI) ** 2;
      const frequency =
        162 +
        10 * Math.sin(progress * Math.PI * 2 + 0.3) +
        4 * Math.sin(progress * Math.PI * 4.5);
      const phase = delta * Math.PI * 2 * frequency;
      return envelope * (Math.sin(phase) * 0.085 + Math.sin(phase * 0.5 + 0.2) * 0.05);
    });
  }

  const cluckEvents = [
    { time: 0.95, pan: -0.22, pitch: 690 },
    { time: 2.9, pan: 0.18, pitch: 760 },
    { time: 4.4, pan: -0.1, pitch: 720 },
    { time: 6.15, pan: 0.26, pitch: 810 },
    { time: 8.95, pan: -0.28, pitch: 740 },
    { time: 10.7, pan: 0.12, pitch: 780 },
  ];

  for (const { time, pan, pitch } of cluckEvents) {
    for (const channel of [
      { buffer: left, gain: 1 - Math.max(0, pan) },
      { buffer: right, gain: 1 + Math.min(0, pan) },
    ]) {
      addLoopedEvent(
        channel.buffer,
        AMBIENT_LOOP_DURATION,
        sampleRate,
        time,
        0.2,
        (delta, position) => {
          const progress = (delta + 0.2) / 0.4;
          const envelope = Math.sin(progress * Math.PI) ** 3;
          const chirpFrequency = pitch + 120 * Math.sin(progress * Math.PI);
          const chirpPhase = delta * Math.PI * 2 * chirpFrequency;
          const chatter =
            sampleLoopingNoise(windNoise, (position * 820 + pitch) % windNoise.length) * 0.03;

          return (
            channel.gain *
            envelope *
            (Math.sin(chirpPhase) * 0.05 + Math.sin(chirpPhase * 1.95) * 0.025 + chatter)
          );
        },
      );
    }
  }

  for (let frame = 0; frame < frameCount; frame += 1) {
    left[frame] = clampSample(left[frame] * 0.62);
    right[frame] = clampSample(right[frame] * 0.62);
  }

  return buffer;
}

function startAmbientAudio() {
  if (state.ambientAudioStarted) {
    if (state.ambientAudioContext?.state === "suspended") {
      state.ambientAudioContext.resume().catch(() => {});
    }

    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  try {
    const audioContext = new AudioContextClass();
    const source = audioContext.createBufferSource();
    const masterGain = audioContext.createGain();

    source.buffer = createAmbientLoopBuffer(audioContext);
    source.loop = true;
    masterGain.gain.setValueAtTime(0, audioContext.currentTime);
    masterGain.gain.linearRampToValueAtTime(
      AMBIENT_MASTER_VOLUME,
      audioContext.currentTime + 1.5,
    );

    source.connect(masterGain);
    masterGain.connect(audioContext.destination);
    source.start();

    state.ambientAudioContext = audioContext;
    state.ambientMasterGain = masterGain;
    state.ambientAudioStarted = true;

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
  } catch (error) {
    console.error("Unable to start ambient audio.", error);
  }
}

function setupAmbientAudio() {
  const { view } = getViewAndCanvas();

  const activateAmbientAudio = () => {
    startAmbientAudio();
  };

  view.addEventListener("pointerdown", activateAmbientAudio, { passive: true });
  window.addEventListener("keydown", activateAmbientAudio, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!state.ambientAudioContext) {
      return;
    }

    if (document.hidden) {
      state.ambientAudioContext.suspend().catch(() => {});
      return;
    }

    state.ambientAudioContext.resume().catch(() => {});
  });
}

function getViewAndCanvas() {
  const view = document.getElementById(VIEW_ID);
  const canvas = document.getElementById(BACKGROUND_ID);

  if (!view || !canvas) {
    throw new Error("Game view or background canvas is missing.");
  }

  return { view, canvas };
}

function drawWrappedPixel(tileCtx, x, y, colorIndex) {
  const wrappedX = (x + SOURCE_TILE_SIZE) % SOURCE_TILE_SIZE;
  const wrappedY = (y + SOURCE_TILE_SIZE) % SOURCE_TILE_SIZE;
  tileCtx.fillStyle = GRASS_PALETTE[colorIndex];
  tileCtx.fillRect(wrappedX, wrappedY, 1, 1);
}

function drawBladeStamp(tileCtx, originX, originY, stamp) {
  for (const [dx, dy, colorIndex] of stamp.blade) {
    drawWrappedPixel(tileCtx, originX + dx, originY + dy, colorIndex);
  }

  for (const [dx, dy, colorIndex] of stamp.shadow) {
    drawWrappedPixel(tileCtx, originX + dx, originY + dy, colorIndex);
  }
}

function createGrassTile(seedOffset) {
  const tile = document.createElement("canvas");
  tile.width = SOURCE_TILE_SIZE;
  tile.height = SOURCE_TILE_SIZE;

  const tileCtx = tile.getContext("2d");
  if (!tileCtx) {
    throw new Error("Failed to create grass tile context.");
  }

  tileCtx.imageSmoothingEnabled = false;
  tileCtx.fillStyle = GRASS_PALETTE[1];
  tileCtx.fillRect(0, 0, SOURCE_TILE_SIZE, SOURCE_TILE_SIZE);

  for (let y = 0; y < SOURCE_TILE_SIZE; y += 1) {
    for (let x = 0; x < SOURCE_TILE_SIZE; x += 1) {
      const macroCluster = hash2D(
        Math.floor((x + seedOffset * 2) / 3),
        Math.floor((y + seedOffset * 4) / 3),
      );
      let colorIndex = 1;

      if (macroCluster > 0.72) {
        colorIndex = 2;
      } else if (macroCluster < 0.24) {
        colorIndex = 0;
      }

      if (hash2D(x + seedOffset * 19, y + seedOffset * 23) > 0.988) {
        colorIndex = 3;
      }

      tileCtx.fillStyle = GRASS_PALETTE[colorIndex];
      tileCtx.fillRect(x, y, 1, 1);
    }
  }

  for (let y = 0; y < SOURCE_TILE_SIZE; y += 2) {
    for (let x = 0; x < SOURCE_TILE_SIZE; x += 2) {
      const placement = hash2D(
        Math.floor((x + seedOffset * 11) / 2),
        Math.floor((y + seedOffset * 7) / 2),
      );

      if (placement < 0.9) {
        continue;
      }

      const stampIndex = Math.floor(
        hash2D(x + seedOffset * 29, y + seedOffset * 31) * BLADE_STAMPS.length,
      );
      const stamp = BLADE_STAMPS[stampIndex];
      drawBladeStamp(tileCtx, x, y, stamp);

      if (hash2D(x + seedOffset * 43, y + seedOffset * 47) > 0.993) {
        drawWrappedPixel(tileCtx, x + 1, y, 4);
      }
    }
  }

  return tile;
}

function getGrassTiles() {
  if (!cachedGrassTiles) {
    cachedGrassTiles = [0, 1, 2].map((seedOffset) => createGrassTile(seedOffset));
  }

  return cachedGrassTiles;
}

function drawBackground(ctx, width, height) {
  const tiles = getGrassTiles();
  const cols = Math.ceil(width / TILE_DRAW_SIZE);
  const rows = Math.ceil(height / TILE_DRAW_SIZE);
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tileIndex = Math.floor(hash2D(col + 11, row + 19) * tiles.length);
      const tile = tiles[tileIndex];

      ctx.drawImage(
        tile,
        col * TILE_DRAW_SIZE,
        row * TILE_DRAW_SIZE,
        TILE_DRAW_SIZE,
        TILE_DRAW_SIZE,
      );
    }
  }
}

function getUIRefs() {
  const toolbarButtons = document.getElementById(TOOLBAR_ID);
  const placementLayer = document.getElementById(PLACEMENT_LAYER_ID);

  if (!toolbarButtons || !placementLayer) {
    throw new Error("Toolbar or placement UI is missing.");
  }

  return { toolbarButtons, placementLayer };
}

function getObjectById(objectId) {
  return FARM_OBJECTS.find((farmObject) => farmObject.id === objectId);
}

function updateActiveUI() {
  const { toolbarButtons } = getUIRefs();

  Array.from(toolbarButtons.querySelectorAll(".farm-object-button")).forEach(
    (button) => {
      const isActive = button.dataset.objectId === state.activeObjectId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    },
  );
}

function setActiveObject(objectId) {
  if (!getObjectById(objectId)) {
    return;
  }

  state.activeObjectId = objectId;
  updateActiveUI();
}

function renderToolbar() {
  const { toolbarButtons } = getUIRefs();
  toolbarButtons.innerHTML = "";

  for (const farmObject of FARM_OBJECTS) {
    const slot = document.createElement("div");
    slot.className = "farm-toolbar__slot";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "farm-object-button";
    button.classList.add(`farm-object-button--${farmObject.id}`);
    button.dataset.objectId = farmObject.id;
    button.setAttribute("aria-label", `Select ${farmObject.label}`);
    button.innerHTML = `
      <span class="farm-object-button__icon" aria-hidden="true">
        ${farmObject.icon}
      </span>
    `;
    button.addEventListener("click", () => setActiveObject(farmObject.id));
    slot.appendChild(button);
    toolbarButtons.appendChild(slot);
  }

  updateActiveUI();
}

function placeObject(clientX, clientY) {
  const activeObject = getObjectById(state.activeObjectId);
  if (!activeObject) {
    return;
  }

  const { view } = getViewAndCanvas();
  const { placementLayer } = getUIRefs();
  const bounds = view.getBoundingClientRect();

  const objectEl = document.createElement("div");
  objectEl.className = "placed-object";
  objectEl.textContent = activeObject.icon;
  objectEl.setAttribute("aria-label", `${activeObject.label} placed`);
  const relativeX = clientX - bounds.left;
  const relativeY = clientY - bounds.top;
  const snappedX = Math.round(relativeX / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  const snappedY = Math.round(relativeY / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  objectEl.style.left = `${snappedX}px`;
  objectEl.style.top = `${snappedY}px`;
  placementLayer.appendChild(objectEl);
}

function setupPlacementInput() {
  const { view } = getViewAndCanvas();
  const toolbar = document.getElementById("farm-toolbar");

  view.addEventListener("click", (event) => {
    if (toolbar && event.target instanceof Element && toolbar.contains(event.target)) {
      return;
    }

    placeObject(event.clientX, event.clientY);
  });
}

function resizeAndRender() {
  const { view, canvas } = getViewAndCanvas();
  const bounds = view.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${Math.round(width)}px`;
  canvas.style.height = `${Math.round(height)}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D rendering context.");
  }

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height);
}

function init() {
  renderToolbar();
  setupAmbientAudio();
  setupPlacementInput();
  resizeAndRender();
  window.addEventListener("resize", resizeAndRender);
}

window.addEventListener("DOMContentLoaded", init);

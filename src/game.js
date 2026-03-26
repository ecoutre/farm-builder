const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TOOLBAR_ID = "toolbar-buttons";
const PLACEMENT_LAYER_ID = "placement-layer";
const PLACE_GRID_SIZE = 12;
const PLACED_OBJECT_SIZE = 40;
const AMBIENT_LOOP_DURATION = 18;
const AMBIENT_MASTER_VOLUME = 0.14;
const AMBIENT_FADE_SECONDS = 1.25;

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
  placements: [],
  ambientAudioStarted: false,
  ambientAudioContext: null,
  ambientMasterGain: null,
  ambientSource: null,
  ambientSuspendTimeoutId: null,
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

function getStereoPanGains(pan) {
  const clampedPan = Math.max(-1, Math.min(1, pan));
  const angle = ((clampedPan + 1) * Math.PI) / 4;

  return {
    left: Math.cos(angle),
    right: Math.sin(angle),
  };
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

    buffer[wrappedIndex] += renderSample(delta);
  }
}

function addLoopedStereoEvent(
  left,
  right,
  loopDuration,
  sampleRate,
  centerTime,
  radius,
  pan,
  renderSample,
) {
  const gains = getStereoPanGains(pan);

  addLoopedEvent(left, loopDuration, sampleRate, centerTime, radius, (delta) => {
    return renderSample(delta) * gains.left;
  });
  addLoopedEvent(right, loopDuration, sampleRate, centerTime, radius, (delta) => {
    return renderSample(delta) * gains.right;
  });
}

function sineAt(loopPhase, frequency, phaseOffset = 0) {
  return Math.sin(loopPhase * frequency * AMBIENT_LOOP_DURATION + phaseOffset);
}

function createAmbientLoopBuffer(audioContext) {
  const sampleRate = audioContext.sampleRate;
  const frameCount = Math.floor(sampleRate * AMBIENT_LOOP_DURATION);
  const buffer = audioContext.createBuffer(2, frameCount, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const loopPhase = (frame / frameCount) * Math.PI * 2;
    const breeze =
      0.5 +
      0.18 * Math.sin(loopPhase - 0.45) +
      0.1 * Math.sin(loopPhase * 2 + 0.9) +
      0.06 * Math.sin(loopPhase * 4 - 1.2);
    const gust =
      0.65 +
      0.2 * Math.sin(loopPhase * 1.5 - 0.8) +
      0.09 * Math.sin(loopPhase * 3.5 + 0.4);
    const windBody =
      (Math.sin(loopPhase * 1.2 - 0.6) * 0.16 +
        Math.sin(loopPhase * 2.1 + 0.7) * 0.1 +
        Math.sin(loopPhase * 3.2 - 1.3) * 0.05) *
      breeze;
    const windHissLeft =
      sineAt(loopPhase, 180, 0.5) * 0.012 +
      sineAt(loopPhase, 310, -0.2) * 0.009 +
      sineAt(loopPhase, 470, 1.1) * 0.006;
    const windHissRight =
      sineAt(loopPhase, 195, -0.1) * 0.011 +
      sineAt(loopPhase, 330, 0.4) * 0.008 +
      sineAt(loopPhase, 455, -0.9) * 0.006;
    const whistleLeft =
      (0.014 + 0.02 * Math.max(0, Math.sin(loopPhase * 2.6 - 0.3))) *
      gust *
      (sineAt(loopPhase, 640, Math.sin(loopPhase * 3.2) * 0.9) +
        sineAt(loopPhase, 930, Math.sin(loopPhase * 4.1 + 0.2) * 0.55) * 0.55);
    const whistleRight =
      (0.014 + 0.018 * Math.max(0, Math.sin(loopPhase * 2.6 + 0.15))) *
      gust *
      (sineAt(loopPhase, 680, Math.sin(loopPhase * 3.4 + 0.2) * 0.85) +
        sineAt(loopPhase, 970, Math.sin(loopPhase * 4.4 - 0.1) * 0.5) * 0.5);

    left[frame] = windBody + windHissLeft * gust + whistleLeft;
    right[frame] = windBody * 0.97 + windHissRight * gust + whistleRight;
  }

  const clucks = [
    { time: 1.2, pan: -0.35, pitch: 620 },
    { time: 3.55, pan: 0.2, pitch: 680 },
    { time: 6.05, pan: -0.15, pitch: 640 },
    { time: 8.9, pan: 0.28, pitch: 700 },
    { time: 13.3, pan: -0.25, pitch: 660 },
    { time: 15.55, pan: 0.12, pitch: 690 },
  ];

  for (const { time, pan, pitch } of clucks) {
    addLoopedStereoEvent(
      left,
      right,
      AMBIENT_LOOP_DURATION,
      sampleRate,
      time,
      0.2,
      pan,
      (delta) => {
        const progress = (delta + 0.2) / 0.4;
        const envelope = Math.sin(progress * Math.PI) ** 2.8;
        const chirpA = Math.sin(delta * Math.PI * 2 * pitch);
        const chirpB = Math.sin(delta * Math.PI * 2 * (pitch * 1.65) + 0.7);
        const throat = Math.sin(delta * Math.PI * 2 * (pitch * 0.48) - 0.2);
        return envelope * (chirpA * 0.025 + chirpB * 0.012 + throat * 0.012);
      },
    );
  }

  const moos = [
    { time: 4.75, pan: -0.45, pitch: 132 },
    { time: 12.45, pan: 0.38, pitch: 128 },
  ];

  for (const { time, pan, pitch } of moos) {
    addLoopedStereoEvent(
      left,
      right,
      AMBIENT_LOOP_DURATION,
      sampleRate,
      time,
      0.9,
      pan,
      (delta) => {
        const progress = (delta + 0.9) / 1.8;
        const envelope = Math.sin(progress * Math.PI) ** 1.8;
        const swell = 0.82 + 0.18 * Math.sin(progress * Math.PI * 2);
        const body = Math.sin(delta * Math.PI * 2 * pitch);
        const throat = Math.sin(delta * Math.PI * 2 * (pitch * 0.5) + 0.45);
        const nasal = Math.sin(delta * Math.PI * 2 * (pitch * 1.48) - 0.3);
        return envelope * swell * (body * 0.038 + throat * 0.03 + nasal * 0.015);
      },
    );
  }

  const oinks = [
    { time: 7.25, pan: 0.45, pitch: 245 },
    { time: 16.15, pan: -0.3, pitch: 230 },
  ];

  for (const { time, pan, pitch } of oinks) {
    addLoopedStereoEvent(
      left,
      right,
      AMBIENT_LOOP_DURATION,
      sampleRate,
      time,
      0.34,
      pan,
      (delta) => {
        const progress = (delta + 0.34) / 0.68;
        const envelope = Math.sin(progress * Math.PI) ** 2.4;
        const snort = Math.sin(delta * Math.PI * 2 * pitch);
        const grunt = Math.sin(delta * Math.PI * 2 * (pitch * 0.52) - 0.4);
        const nose = Math.sin(delta * Math.PI * 2 * (pitch * 1.92) + 0.6);
        return envelope * (snort * 0.024 + grunt * 0.02 + nose * 0.01);
      },
    );
  }

  addLoopedStereoEvent(
    left,
    right,
    AMBIENT_LOOP_DURATION,
    sampleRate,
    10.55,
    0.82,
    0.08,
    (delta) => {
      const progress = (delta + 0.82) / 1.64;
      const envelope = Math.sin(progress * Math.PI) ** 2;
      const syllableA = Math.max(0, Math.sin(progress * Math.PI * 3.1 - 0.45));
      const syllableB = Math.max(0, Math.sin(progress * Math.PI * 5.8 - 2.2));
      const cry =
        Math.sin(delta * Math.PI * 2 * 520) * 0.018 +
        Math.sin(delta * Math.PI * 2 * 780 + 0.4) * 0.013 +
        Math.sin(delta * Math.PI * 2 * 1040 - 0.3) * 0.008;
      return envelope * (syllableA * 0.95 + syllableB * 0.7) * cry;
    },
  );

  for (let frame = 0; frame < frameCount; frame += 1) {
    left[frame] = clampSample(left[frame] * 0.82);
    right[frame] = clampSample(right[frame] * 0.82);
  }

  return buffer;
}

function fadeAmbientGain(targetValue, durationSeconds) {
  if (!state.ambientAudioContext || !state.ambientMasterGain) {
    return;
  }

  const now = state.ambientAudioContext.currentTime;
  const gainParam = state.ambientMasterGain.gain;
  const currentValue = gainParam.value;

  gainParam.cancelScheduledValues(now);
  gainParam.setValueAtTime(currentValue, now);
  gainParam.linearRampToValueAtTime(targetValue, now + durationSeconds);
}

function scheduleAmbientSuspend() {
  if (!state.ambientAudioContext || document.hidden === false) {
    return;
  }

  if (state.ambientSuspendTimeoutId) {
    window.clearTimeout(state.ambientSuspendTimeoutId);
  }

  fadeAmbientGain(0.0001, 0.2);
  state.ambientSuspendTimeoutId = window.setTimeout(() => {
    if (state.ambientAudioContext && document.hidden) {
      state.ambientAudioContext.suspend().catch(() => {});
    }
    state.ambientSuspendTimeoutId = null;
  }, 220);
}

function resumeAmbientAudio() {
  if (!state.ambientAudioContext || !state.ambientMasterGain) {
    return;
  }

  if (state.ambientSuspendTimeoutId) {
    window.clearTimeout(state.ambientSuspendTimeoutId);
    state.ambientSuspendTimeoutId = null;
  }

  const resumeAndFade = () => {
    state.ambientMasterGain.gain.value = 0.0001;
    fadeAmbientGain(AMBIENT_MASTER_VOLUME, AMBIENT_FADE_SECONDS);
  };

  if (state.ambientAudioContext.state === "suspended") {
    state.ambientAudioContext.resume().then(resumeAndFade).catch(() => {});
    return;
  }

  resumeAndFade();
}

function startAmbientAudio() {
  if (state.ambientAudioStarted) {
    resumeAmbientAudio();
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
    masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);

    source.connect(masterGain);
    masterGain.connect(audioContext.destination);
    source.start();

    state.ambientAudioContext = audioContext;
    state.ambientMasterGain = masterGain;
    state.ambientSource = source;
    state.ambientAudioStarted = true;

    resumeAmbientAudio();
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
    if (!state.ambientAudioStarted) {
      return;
    }

    if (document.hidden) {
      scheduleAmbientSuspend();
      return;
    }

    resumeAmbientAudio();
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
  const activeObject = getObjectById(objectId);
  if (!activeObject) {
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

function renderPlacedObject(placement) {
  const { placementLayer } = getUIRefs();
  const objectEl = document.createElement("div");
  objectEl.className = "placed-object";
  objectEl.textContent = placement.icon;
  objectEl.setAttribute("aria-label", `${placement.label} placed`);
  objectEl.style.left = `${placement.x}px`;
  objectEl.style.top = `${placement.y}px`;
  placementLayer.appendChild(objectEl);
}

function getPlacementFootprint(centerX, centerY) {
  const halfSize = PLACED_OBJECT_SIZE / 2;

  return {
    left: centerX - halfSize,
    right: centerX + halfSize,
    top: centerY - halfSize,
    bottom: centerY + halfSize,
  };
}

function overlapsExistingPlacement(centerX, centerY) {
  const nextFootprint = getPlacementFootprint(centerX, centerY);

  return state.placements.some((placement) => {
    const existingFootprint = getPlacementFootprint(placement.x, placement.y);
    return !(
      nextFootprint.right <= existingFootprint.left ||
      nextFootprint.left >= existingFootprint.right ||
      nextFootprint.bottom <= existingFootprint.top ||
      nextFootprint.top >= existingFootprint.bottom
    );
  });
}

function getSnappedPlacement(clientX, clientY) {
  const { view } = getViewAndCanvas();
  const bounds = view.getBoundingClientRect();
  const relativeX = clientX - bounds.left;
  const relativeY = clientY - bounds.top;
  const snappedX = Math.round(relativeX / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  const snappedY = Math.round(relativeY / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  const halfSize = PLACED_OBJECT_SIZE / 2;

  return {
    x: snappedX,
    y: snappedY,
    isInsideBounds:
      snappedX >= halfSize &&
      snappedX <= bounds.width - halfSize &&
      snappedY >= halfSize &&
      snappedY <= bounds.height - halfSize,
  };
}

function placeObject(clientX, clientY) {
  const activeObject = getObjectById(state.activeObjectId);
  if (!activeObject) {
    return false;
  }

  const placement = getSnappedPlacement(clientX, clientY);
  if (!placement.isInsideBounds) {
    return false;
  }

  if (overlapsExistingPlacement(placement.x, placement.y)) {
    return false;
  }

  const placedObject = {
    id: activeObject.id,
    label: activeObject.label,
    icon: activeObject.icon,
    x: placement.x,
    y: placement.y,
  };

  state.placements.push(placedObject);
  renderPlacedObject(placedObject);
  return true;
}

function setupPlacementInput() {
  const { canvas } = getViewAndCanvas();

  canvas.addEventListener("click", (event) => {
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
  setActiveObject(state.activeObjectId);
  setupAmbientAudio();
  setupPlacementInput();
  resizeAndRender();
  window.addEventListener("resize", resizeAndRender);
}

window.addEventListener("DOMContentLoaded", init);

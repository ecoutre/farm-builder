const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TOOLBAR_ID = "toolbar-buttons";
const PLACEMENT_LAYER_ID = "placement-layer";
const PLACE_GRID_SIZE = 12;
const PLACED_OBJECT_SIZE = 40;
const AMBIENT_MASTER_VOLUME = 0.14;
const AMBIENT_FADE_SECONDS = 1.25;
const AMBIENT_MIN_GAIN = 0.0001;
const WIND_SCHEDULE_AHEAD_SECONDS = 10;
const DEFAULT_WIND_CROSSFADE_SECONDS = 1.25;
const AUDIO_ASSET_ROOT = new URL("../assets/audio/", import.meta.url);
const AUDIO_ASSET_FILES = {
  wind: ["farm-wind-whistling-loop.ogg"],
  chickens: ["farm-chickens-clucking-01.ogg", "farm-chickens-clucking-02.ogg"],
  cows: ["farm-cows-mooing-01.ogg", "farm-cows-mooing-02.ogg"],
  rooster: ["farm-rooster-crow-01.ogg"],
  pigs: ["farm-pigs-oinking-01.ogg", "farm-pigs-oinking-02.ogg"],
};
const AMBIENT_ONE_SHOT_GROUPS = {
  chickens: {
    volume: 0.22,
    minDelay: 4,
    maxDelay: 8,
    minPan: -0.45,
    maxPan: 0.35,
    minPlaybackRate: 0.96,
    maxPlaybackRate: 1.05,
  },
  cows: {
    volume: 0.26,
    minDelay: 11,
    maxDelay: 18,
    minPan: -0.5,
    maxPan: 0.45,
    minPlaybackRate: 0.97,
    maxPlaybackRate: 1.02,
  },
  rooster: {
    volume: 0.18,
    minDelay: 19,
    maxDelay: 30,
    minPan: -0.2,
    maxPan: 0.2,
    minPlaybackRate: 0.99,
    maxPlaybackRate: 1.01,
  },
  pigs: {
    volume: 0.18,
    minDelay: 10,
    maxDelay: 17,
    minPan: -0.4,
    maxPan: 0.4,
    minPlaybackRate: 0.96,
    maxPlaybackRate: 1.04,
  },
};

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
  ambientBuffers: null,
  ambientLoadPromise: null,
  ambientSuspendTimeoutId: null,
  ambientWindSchedulerTimeoutId: null,
  ambientWindScheduledUntil: 0,
  ambientOneShotTimeoutIds: {},
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

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function getAudioAssetUrl(fileName) {
  return new URL(fileName, AUDIO_ASSET_ROOT).toString();
}

function getRandomArrayItem(items) {
  if (!items || items.length === 0) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)];
}

async function loadAudioBuffer(audioContext, fileName) {
  const response = await fetch(getAudioAssetUrl(fileName));
  if (!response.ok) {
    throw new Error(`Failed to fetch ${fileName}: ${response.status}`);
  }

  const fileData = await response.arrayBuffer();
  return audioContext.decodeAudioData(fileData.slice(0));
}

async function loadAmbientBuffers(audioContext) {
  if (state.ambientBuffers) {
    return state.ambientBuffers;
  }

  if (state.ambientLoadPromise) {
    return state.ambientLoadPromise;
  }

  state.ambientLoadPromise = Promise.all(
    Object.entries(AUDIO_ASSET_FILES).map(async ([groupName, fileNames]) => {
      const loadedBuffers = [];

      for (const fileName of fileNames) {
        try {
          const buffer = await loadAudioBuffer(audioContext, fileName);
          loadedBuffers.push(buffer);
        } catch (error) {
          console.warn(`Unable to load ambient asset: ${fileName}`, error);
        }
      }

      return [groupName, loadedBuffers];
    }),
  )
    .then((entries) => {
      state.ambientBuffers = Object.fromEntries(entries);

      if (Object.values(state.ambientBuffers).every((buffers) => buffers.length === 0)) {
        console.warn("Ambient audio assets are missing from assets/audio/.");
      }

      return state.ambientBuffers;
    })
    .finally(() => {
      state.ambientLoadPromise = null;
    });

  return state.ambientLoadPromise;
}

function connectWithOptionalPan(audioContext, inputNode, destination, pan) {
  if (typeof audioContext.createStereoPanner === "function") {
    const panner = audioContext.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), audioContext.currentTime);
    inputNode.connect(panner);
    panner.connect(destination);
    return;
  }

  inputNode.connect(destination);
}

function clearAmbientScheduling() {
  if (state.ambientWindSchedulerTimeoutId) {
    window.clearTimeout(state.ambientWindSchedulerTimeoutId);
    state.ambientWindSchedulerTimeoutId = null;
  }

  for (const timeoutId of Object.values(state.ambientOneShotTimeoutIds)) {
    window.clearTimeout(timeoutId);
  }

  state.ambientOneShotTimeoutIds = {};
}

function fadeAmbientGain(targetValue, durationSeconds) {
  if (!state.ambientAudioContext || !state.ambientMasterGain) {
    return;
  }

  const now = state.ambientAudioContext.currentTime;
  const gainParam = state.ambientMasterGain.gain;
  const currentValue = Math.max(AMBIENT_MIN_GAIN, gainParam.value);

  gainParam.cancelScheduledValues(now);
  gainParam.setValueAtTime(currentValue, now);
  gainParam.linearRampToValueAtTime(Math.max(AMBIENT_MIN_GAIN, targetValue), now + durationSeconds);
}

function scheduleWindSource(buffer, startTime) {
  if (!state.ambientAudioContext || !state.ambientMasterGain) {
    return;
  }

  const audioContext = state.ambientAudioContext;
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  const crossfadeSeconds = Math.min(
    DEFAULT_WIND_CROSSFADE_SECONDS,
    Math.max(0.15, buffer.duration / 4),
  );
  const endTime = startTime + buffer.duration;
  const fadeOutStart = Math.max(startTime + crossfadeSeconds, endTime - crossfadeSeconds);

  source.buffer = buffer;
  source.connect(gainNode);
  gainNode.connect(state.ambientMasterGain);
  gainNode.gain.setValueAtTime(AMBIENT_MIN_GAIN, startTime);
  gainNode.gain.linearRampToValueAtTime(1, startTime + crossfadeSeconds);
  gainNode.gain.setValueAtTime(1, fadeOutStart);
  gainNode.gain.linearRampToValueAtTime(AMBIENT_MIN_GAIN, endTime);
  source.start(startTime);
  source.stop(endTime + 0.05);

  return buffer.duration - crossfadeSeconds;
}

function ensureWindScheduled() {
  if (!state.ambientAudioContext || !state.ambientBuffers?.wind?.length || document.hidden) {
    return;
  }

  const audioContext = state.ambientAudioContext;
  const windBuffer = state.ambientBuffers.wind[0];
  const now = audioContext.currentTime;
  let nextStartTime = Math.max(state.ambientWindScheduledUntil, now);

  if (nextStartTime <= now + 0.05) {
    nextStartTime = now;
  }

  while (nextStartTime < now + WIND_SCHEDULE_AHEAD_SECONDS) {
    const intervalSeconds = scheduleWindSource(windBuffer, nextStartTime);
    if (!intervalSeconds) {
      return;
    }

    nextStartTime += intervalSeconds;
  }

  state.ambientWindScheduledUntil = nextStartTime;
  state.ambientWindSchedulerTimeoutId = window.setTimeout(() => {
    state.ambientWindSchedulerTimeoutId = null;
    ensureWindScheduled();
  }, 1000);
}

function playOneShot(buffer, { gain, pan, playbackRate }) {
  if (!state.ambientAudioContext || !state.ambientMasterGain) {
    return;
  }

  const audioContext = state.ambientAudioContext;
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  const now = audioContext.currentTime;
  const clampedPlaybackRate = Math.max(0.5, playbackRate);
  const playbackDuration = buffer.duration / clampedPlaybackRate;
  const fadeInSeconds = Math.min(0.04, playbackDuration / 4);
  const fadeOutSeconds = Math.min(0.08, playbackDuration / 3);
  const fadeOutStart = Math.max(now + fadeInSeconds, now + playbackDuration - fadeOutSeconds);

  source.buffer = buffer;
  source.playbackRate.setValueAtTime(clampedPlaybackRate, now);
  source.connect(gainNode);
  connectWithOptionalPan(audioContext, gainNode, state.ambientMasterGain, pan);

  gainNode.gain.setValueAtTime(AMBIENT_MIN_GAIN, now);
  gainNode.gain.linearRampToValueAtTime(gain, now + fadeInSeconds);
  gainNode.gain.setValueAtTime(gain, fadeOutStart);
  gainNode.gain.linearRampToValueAtTime(AMBIENT_MIN_GAIN, now + playbackDuration);

  source.start(now);
  source.stop(now + playbackDuration + 0.05);
}

function scheduleAnimalGroup(groupName) {
  if (!state.ambientAudioStarted || !state.ambientBuffers || document.hidden) {
    return;
  }

  const groupConfig = AMBIENT_ONE_SHOT_GROUPS[groupName];
  const groupBuffers = state.ambientBuffers[groupName];
  if (!groupConfig || !groupBuffers || groupBuffers.length === 0) {
    return;
  }

  const delayMs = randomBetween(groupConfig.minDelay, groupConfig.maxDelay) * 1000;
  state.ambientOneShotTimeoutIds[groupName] = window.setTimeout(() => {
    const buffer = getRandomArrayItem(groupBuffers);

    if (buffer && !document.hidden) {
      playOneShot(buffer, {
        gain: groupConfig.volume,
        pan: randomBetween(groupConfig.minPan, groupConfig.maxPan),
        playbackRate: randomBetween(
          groupConfig.minPlaybackRate,
          groupConfig.maxPlaybackRate,
        ),
      });
    }

    scheduleAnimalGroup(groupName);
  }, delayMs);
}

function scheduleAnimalGroups() {
  Object.keys(AMBIENT_ONE_SHOT_GROUPS).forEach((groupName) => {
    if (!state.ambientOneShotTimeoutIds[groupName]) {
      scheduleAnimalGroup(groupName);
    }
  });
}

function scheduleAmbientSuspend() {
  if (!state.ambientAudioContext || document.hidden === false) {
    return;
  }

  if (state.ambientSuspendTimeoutId) {
    window.clearTimeout(state.ambientSuspendTimeoutId);
  }

  clearAmbientScheduling();
  fadeAmbientGain(AMBIENT_MIN_GAIN, 0.2);
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
    state.ambientMasterGain.gain.setValueAtTime(
      AMBIENT_MIN_GAIN,
      state.ambientAudioContext.currentTime,
    );
    fadeAmbientGain(AMBIENT_MASTER_VOLUME, AMBIENT_FADE_SECONDS);
    ensureWindScheduled();
    scheduleAnimalGroups();
  };

  if (state.ambientAudioContext.state === "suspended") {
    state.ambientAudioContext.resume().then(resumeAndFade).catch(() => {});
    return;
  }

  resumeAndFade();
}

async function startAmbientAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  try {
    if (!state.ambientAudioContext) {
      const audioContext = new AudioContextClass();
      const masterGain = audioContext.createGain();

      masterGain.gain.setValueAtTime(AMBIENT_MIN_GAIN, audioContext.currentTime);
      masterGain.connect(audioContext.destination);

      state.ambientAudioContext = audioContext;
      state.ambientMasterGain = masterGain;
    }

    if (!state.ambientBuffers) {
      await loadAmbientBuffers(state.ambientAudioContext);
    }

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

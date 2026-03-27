const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TOOLBAR_ID = "toolbar-buttons";
const PLACEMENT_LAYER_ID = "placement-layer";
const AUDIO_SETTINGS_ID = "audio-settings";
const AUDIO_TOGGLE_ID = "audio-enabled-toggle";
const AUDIO_VOLUME_ID = "audio-volume-slider";
const AUDIO_STATUS_ID = "audio-status";
const PLACE_GRID_SIZE = 12;
const PLACED_OBJECT_SIZE = 40;
const AUDIO_SETTINGS_STORAGE_KEY = "farm-builder-audio-settings";
const DEFAULT_AUDIO_SETTINGS = {
  enabled: true,
  volume: 0.32,
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
  audioSettings: loadAudioSettings(),
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

let audioController = null;

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loadAudioSettings() {
  const fallback = { ...DEFAULT_AUDIO_SETTINGS };

  try {
    const storedValue = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!storedValue) {
      return fallback;
    }

    const parsedValue = JSON.parse(storedValue);
    return {
      enabled:
        typeof parsedValue.enabled === "boolean"
          ? parsedValue.enabled
          : fallback.enabled,
      volume:
        typeof parsedValue.volume === "number"
          ? clampNumber(parsedValue.volume, 0, 1)
          : fallback.volume,
    };
  } catch (error) {
    console.warn("Failed to read saved audio settings.", error);
    return fallback;
  }
}

function saveAudioSettings() {
  try {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY,
      JSON.stringify(state.audioSettings),
    );
  } catch (error) {
    console.warn("Failed to save audio settings.", error);
  }
}

function hash2D(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return value - Math.floor(value);
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
  const audioSettings = document.getElementById(AUDIO_SETTINGS_ID);
  const audioToggle = document.getElementById(AUDIO_TOGGLE_ID);
  const audioVolume = document.getElementById(AUDIO_VOLUME_ID);
  const audioStatus = document.getElementById(AUDIO_STATUS_ID);

  if (
    !toolbarButtons ||
    !placementLayer ||
    !audioSettings ||
    !audioToggle ||
    !audioVolume ||
    !audioStatus
  ) {
    throw new Error("Toolbar, placement UI, or audio controls are missing.");
  }

  return {
    toolbarButtons,
    placementLayer,
    audioSettings,
    audioToggle,
    audioVolume,
    audioStatus,
  };
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

function createAudioController() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return {
      isSupported: false,
      start: async () => false,
      setEnabled: () => {},
      setVolume: () => {},
      scheduleAnimalCue: () => {},
      playPlacementTone: () => {},
      getStatusLabel: () => "Audio unavailable",
    };
  }

  let audioContext = null;
  let masterGain = null;
  let ambienceGain = null;
  let effectsGain = null;
  let noiseSource = null;
  let lowpassFilter = null;
  let lfo = null;
  let lfoGain = null;
  let animalTimerId = null;
  let enabled = state.audioSettings.enabled;
  let volume = state.audioSettings.volume;
  let hasStarted = false;

  function ensureContext() {
    if (audioContext) {
      return audioContext;
    }

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    ambienceGain = audioContext.createGain();
    effectsGain = audioContext.createGain();
    lowpassFilter = audioContext.createBiquadFilter();
    lowpassFilter.type = "lowpass";
    lowpassFilter.frequency.value = 900;
    lowpassFilter.Q.value = 0.4;

    masterGain.gain.value = enabled ? volume : 0;
    ambienceGain.gain.value = 0.18;
    effectsGain.gain.value = 0.22;

    ambienceGain.connect(lowpassFilter);
    lowpassFilter.connect(masterGain);
    effectsGain.connect(masterGain);
    masterGain.connect(audioContext.destination);

    const noiseBuffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * 2,
      audioContext.sampleRate,
    );
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseData.length; index += 1) {
      noiseData[index] = (Math.random() * 2 - 1) * 0.55;
    }

    noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const highpass = audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 120;
    highpass.Q.value = 0.15;

    noiseSource.connect(highpass);
    highpass.connect(ambienceGain);
    noiseSource.start();

    lfo = audioContext.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    lfoGain = audioContext.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(ambienceGain.gain);
    lfo.start();

    scheduleAnimalCue();
    return audioContext;
  }

  function setMasterLevel(nextEnabled, nextVolume, rampDuration = 0.35) {
    enabled = nextEnabled;
    volume = clampNumber(nextVolume, 0, 1);

    if (!masterGain || !audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(enabled ? volume : 0, now + rampDuration);
  }

  function playToneCluster({
    frequencies,
    duration,
    gainLevel,
    type = "triangle",
    attack = 0.02,
    release = 0.18,
    filterFrequency = 1600,
    detune = 0,
  }) {
    if (!audioContext || !effectsGain) {
      return;
    }

    const now = audioContext.currentTime;
    const voiceGain = audioContext.createGain();
    const voiceFilter = audioContext.createBiquadFilter();
    voiceFilter.type = "lowpass";
    voiceFilter.frequency.value = filterFrequency;
    voiceFilter.Q.value = 0.9;
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.exponentialRampToValueAtTime(gainLevel, now + attack);
    voiceGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + Math.max(attack + 0.03, duration - release),
    );

    voiceFilter.connect(voiceGain);
    voiceGain.connect(effectsGain);

    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.detune.value = detune + index * 5;
      oscillator.connect(voiceFilter);
      oscillator.start(now);
      oscillator.stop(now + duration);
    });
  }

  function playAnimalCue() {
    if (!enabled || !audioContext) {
      return;
    }

    const animalPresets = [
      {
        frequencies: [320, 430],
        duration: 0.65,
        gainLevel: 0.045,
        type: "triangle",
        attack: 0.02,
        release: 0.24,
        filterFrequency: 1350,
      },
      {
        frequencies: [510, 680, 920],
        duration: 0.38,
        gainLevel: 0.028,
        type: "square",
        attack: 0.01,
        release: 0.16,
        filterFrequency: 2200,
      },
      {
        frequencies: [250, 300, 370],
        duration: 0.72,
        gainLevel: 0.032,
        type: "sawtooth",
        attack: 0.03,
        release: 0.28,
        filterFrequency: 980,
        detune: -7,
      },
    ];

    const preset = animalPresets[Math.floor(Math.random() * animalPresets.length)];
    playToneCluster(preset);
  }

  function scheduleAnimalCue() {
    if (animalTimerId) {
      window.clearTimeout(animalTimerId);
      animalTimerId = null;
    }

    const delayMs = 5000 + Math.random() * 7000;
    animalTimerId = window.setTimeout(() => {
      if (audioContext && enabled) {
        playAnimalCue();
      }
      scheduleAnimalCue();
    }, delayMs);
  }

  return {
    isSupported: true,
    async start() {
      const context = ensureContext();
      if (!context) {
        return false;
      }

      if (context.state === "suspended") {
        await context.resume();
      }

      hasStarted = true;
      setMasterLevel(enabled, volume, 0.45);
      return true;
    },
    setEnabled(nextEnabled) {
      enabled = nextEnabled;
      if (hasStarted) {
        setMasterLevel(enabled, volume);
      }
    },
    setVolume(nextVolume) {
      volume = clampNumber(nextVolume, 0, 1);
      if (hasStarted) {
        setMasterLevel(enabled, volume, 0.2);
      }
    },
    scheduleAnimalCue() {
      if (!hasStarted) {
        return;
      }

      playAnimalCue();
    },
    playPlacementTone() {
      if (!enabled || !audioContext) {
        return;
      }

      playToneCluster({
        frequencies: [660, 990],
        duration: 0.16,
        gainLevel: 0.018,
        type: "triangle",
        attack: 0.01,
        release: 0.08,
        filterFrequency: 2400,
      });
    },
    getStatusLabel() {
      if (!enabled) {
        return "Audio off";
      }
      if (!hasStarted) {
        return "Audio ready";
      }
      return `Audio on - ${Math.round(volume * 100)}%`;
    },
  };
}

function syncAudioUI() {
  const { audioToggle, audioVolume, audioStatus, audioSettings } = getUIRefs();
  const isAudioSupported = Boolean(audioController?.isSupported);
  audioToggle.checked = state.audioSettings.enabled;
  audioVolume.value = String(Math.round(state.audioSettings.volume * 100));
  audioToggle.disabled = !isAudioSupported;
  audioVolume.disabled = !isAudioSupported;
  audioStatus.textContent =
    isAudioSupported && audioController
      ? audioController.getStatusLabel()
      : "Audio unavailable";
  audioSettings.classList.toggle(
    "is-disabled",
    !state.audioSettings.enabled || !isAudioSupported,
  );
}

function updateAudioSetting(partialSettings) {
  state.audioSettings = {
    ...state.audioSettings,
    ...partialSettings,
  };
  saveAudioSettings();

  if (audioController) {
    audioController.setEnabled(state.audioSettings.enabled);
    audioController.setVolume(state.audioSettings.volume);
  }

  syncAudioUI();
}

function setupAudioControls() {
  audioController = createAudioController();
  const { audioToggle, audioVolume } = getUIRefs();
  syncAudioUI();

  const startAudioIfNeeded = async () => {
    if (!audioController || !state.audioSettings.enabled) {
      syncAudioUI();
      return;
    }

    try {
      await audioController.start();
    } catch (error) {
      console.warn("Failed to start audio playback.", error);
    }

    syncAudioUI();
  };

  audioToggle.addEventListener("change", async (event) => {
    const nextEnabled = Boolean(event.currentTarget.checked);
    updateAudioSetting({ enabled: nextEnabled });

    if (nextEnabled) {
      await startAudioIfNeeded();
    }
  });

  audioVolume.addEventListener("input", (event) => {
    const sliderValue = Number(event.currentTarget.value);
    updateAudioSetting({ volume: clampNumber(sliderValue / 100, 0, 1) });
  });

  window.addEventListener("pointerdown", startAudioIfNeeded, { once: true });
  window.addEventListener("keydown", startAudioIfNeeded, { once: true });
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
  if (audioController) {
    audioController.playPlacementTone();
  }
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
  setupAudioControls();
  setupPlacementInput();
  resizeAndRender();
  window.addEventListener("resize", resizeAndRender);
}

window.addEventListener("DOMContentLoaded", init);

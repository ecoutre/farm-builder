const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TOOLBAR_ID = "toolbar-buttons";
const PLACEMENT_LAYER_ID = "placement-layer";
const PLACE_GRID_SIZE = 12;
const SPRITE_VIEWBOX_SIZE = 64;

function createSpriteAsset(content) {
  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${SPRITE_VIEWBOX_SIZE} ${SPRITE_VIEWBOX_SIZE}"
    >
      <g
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke="#2f241b"
        stroke-width="2.25"
      >
        ${content}
      </g>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const FARM_OBJECTS = [
  {
    id: "fence",
    label: "Fence",
    sprite: createSpriteAsset(`
      <ellipse cx="32" cy="53" rx="24" ry="5" fill="#2c5b25" opacity="0.28" stroke="none" />
      <rect x="9" y="18" width="8" height="28" rx="2" fill="#d29a56" />
      <rect x="28" y="14" width="8" height="32" rx="2" fill="#d29a56" />
      <rect x="47" y="18" width="8" height="28" rx="2" fill="#d29a56" />
      <rect x="7" y="22" width="50" height="7" rx="2" fill="#c48545" />
      <rect x="7" y="33" width="50" height="7" rx="2" fill="#c48545" />
    `),
    width: 96,
    height: 60,
    anchorX: 0.5,
    anchorY: 0.72,
  },
  {
    id: "barn",
    label: "Barn",
    sprite: createSpriteAsset(`
      <ellipse cx="32" cy="55" rx="24" ry="5" fill="#27481f" opacity="0.26" stroke="none" />
      <path d="M11 26 32 10 53 26 47 30 32 18 17 30Z" fill="#8a312a" />
      <rect x="15" y="26" width="34" height="26" rx="3" fill="#d85b4d" />
      <rect x="26" y="34" width="12" height="18" rx="2" fill="#7b4324" />
      <path d="M32 34V52" />
      <rect x="26" y="18" width="12" height="10" rx="2" fill="#f2e4a9" />
      <path d="M32 18V28M26 23H38" />
    `),
    width: 92,
    height: 92,
    anchorX: 0.5,
    anchorY: 0.88,
  },
  {
    id: "hay-bale",
    label: "Hay Bale",
    sprite: createSpriteAsset(`
      <ellipse cx="32" cy="53" rx="22" ry="5" fill="#2c5c24" opacity="0.24" stroke="none" />
      <rect x="17" y="16" width="30" height="15" rx="4" fill="#e6ba49" />
      <rect x="11" y="28" width="42" height="18" rx="4" fill="#d8a93b" />
      <path d="M21 16V31M43 16V31M24 22H40M18 34H46M18 40H46" />
      <path d="M19 28V46M45 28V46" />
    `),
    width: 72,
    height: 60,
    anchorX: 0.5,
    anchorY: 0.76,
  },
  {
    id: "cow",
    label: "Cow",
    sprite: createSpriteAsset(`
      <ellipse cx="33" cy="53" rx="23" ry="5" fill="#27511f" opacity="0.24" stroke="none" />
      <rect x="14" y="22" width="30" height="18" rx="8" fill="#fff9f0" />
      <rect x="42" y="24" width="12" height="12" rx="4" fill="#fff9f0" />
      <path d="M44 24 42 19M52 24 54 19" />
      <circle cx="47" cy="29" r="1.1" fill="#2f241b" stroke="none" />
      <path d="M16 41V49M24 41V49M34 41V49M42 40V49M14 24 10 20" />
      <ellipse cx="47" cy="34" rx="5" ry="3.5" fill="#f2b7b1" />
      <circle cx="45" cy="34" r="1" fill="#9b5f5d" stroke="none" />
      <circle cx="49" cy="34" r="1" fill="#9b5f5d" stroke="none" />
      <ellipse cx="24" cy="29" rx="6" ry="5" fill="#433128" />
      <ellipse cx="34" cy="34" rx="4" ry="3" fill="#433128" />
    `),
    width: 88,
    height: 68,
    anchorX: 0.5,
    anchorY: 0.78,
  },
  {
    id: "chicken",
    label: "Chicken",
    sprite: createSpriteAsset(`
      <ellipse cx="31" cy="53" rx="18" ry="4" fill="#2b5723" opacity="0.22" stroke="none" />
      <path d="M17 32 12 28 14 38Z" fill="#7d5533" />
      <ellipse cx="28" cy="34" rx="13" ry="11" fill="#fff5e6" />
      <circle cx="39" cy="28" r="7" fill="#fff5e6" />
      <path d="M42 28 49 30 42 33Z" fill="#e1a130" />
      <path d="M35 22C36 17 39 15 42 16 40 18 40 20 41 23Z" fill="#d74d46" />
      <path d="M23 43V50M31 43V50" />
      <path d="M24 50H21M32 50H29" />
      <circle cx="40" cy="27" r="1.1" fill="#2f241b" stroke="none" />
      <path d="M24 33C27 31 31 31 34 34" />
    `),
    width: 64,
    height: 64,
    anchorX: 0.5,
    anchorY: 0.78,
  },
  {
    id: "apple-tree",
    label: "Apple Tree",
    sprite: createSpriteAsset(`
      <ellipse cx="32" cy="56" rx="20" ry="5" fill="#254d1f" opacity="0.28" stroke="none" />
      <path d="M28 36C28 29 30 23 32 18 34 23 36 29 36 36V50H28Z" fill="#8c5a32" />
      <circle cx="24" cy="24" r="10" fill="#63a94f" />
      <circle cx="35" cy="18" r="11" fill="#6fb95a" />
      <circle cx="43" cy="28" r="10" fill="#5f9f4d" />
      <circle cx="31" cy="30" r="12" fill="#72bc5d" />
      <circle cx="22" cy="24" r="2.4" fill="#cb3d34" />
      <circle cx="38" cy="20" r="2.4" fill="#cb3d34" />
      <circle cx="40" cy="31" r="2.4" fill="#cb3d34" />
      <circle cx="29" cy="28" r="2.4" fill="#cb3d34" />
    `),
    width: 92,
    height: 96,
    anchorX: 0.5,
    anchorY: 0.9,
  },
];

const state = {
  activeObjectId: FARM_OBJECTS[0].id,
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
        <img
          class="farm-object-button__sprite"
          src="${farmObject.sprite}"
          alt=""
          draggable="false"
        />
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
  objectEl.setAttribute("aria-label", `${activeObject.label} placed`);
  objectEl.dataset.objectId = activeObject.id;
  const relativeX = clientX - bounds.left;
  const relativeY = clientY - bounds.top;
  const snappedX = Math.round(relativeX / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  const snappedY = Math.round(relativeY / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  const left = Math.min(
    Math.max(0, snappedX - Math.round(activeObject.width * activeObject.anchorX)),
    Math.max(0, bounds.width - activeObject.width),
  );
  const top = Math.min(
    Math.max(0, snappedY - Math.round(activeObject.height * activeObject.anchorY)),
    Math.max(0, bounds.height - activeObject.height),
  );

  objectEl.style.left = `${left}px`;
  objectEl.style.top = `${top}px`;
  objectEl.style.width = `${activeObject.width}px`;
  objectEl.style.height = `${activeObject.height}px`;
  objectEl.style.zIndex = String(Math.max(1, snappedY));

  const sprite = document.createElement("img");
  sprite.className = "placed-object__sprite";
  sprite.src = activeObject.sprite;
  sprite.alt = "";
  sprite.draggable = false;
  objectEl.appendChild(sprite);

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
  setupPlacementInput();
  resizeAndRender();
  window.addEventListener("resize", resizeAndRender);
}

window.addEventListener("DOMContentLoaded", init);

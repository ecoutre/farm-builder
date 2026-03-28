const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TOOLBAR_ID = "toolbar-buttons";
const PLACEMENT_LAYER_ID = "placement-layer";
const PLACE_GRID_SIZE = 12;
const PLACED_OBJECT_BASE_SIZE = 40;
const PLACED_OBJECT_SCALE_UP = 2;
const FARM_OBJECTS = [
  {
    id: "barn",
    label: "Barn",
    imageSrc: "./src/assets/sprites/barn.png",
    placedWidth: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 1.35,
    placedHeight: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 1.2,
  },
  {
    id: "fence",
    label: "Fence",
    imageSrc: "./src/assets/sprites/fence.png",
    placedWidth: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 0.9425,
    placedHeight: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 0.455,
  },
  {
    id: "hay-bale",
    label: "Hay Bale",
    imageSrc: "./src/assets/sprites/hay-bale.png",
    placedWidth: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 0.63,
    placedHeight: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 0.56,
  },
  {
    id: "cow",
    label: "Cow",
    imageSrc: "./src/assets/sprites/cow.png",
    placedWidth: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 0.99,
    placedHeight: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 0.855,
  },
  {
    id: "chicken",
    label: "Chicken",
    imageSrc: "./src/assets/sprites/chicken.png",
    placedWidth: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 0.7,
    placedHeight: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 0.65,
  },
  {
    id: "apple-tree",
    label: "Apple Tree",
    imageSrc: "./src/assets/sprites/apple-tree.png",
    placedWidth: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 1.02,
    placedHeight: PLACED_OBJECT_BASE_SIZE * PLACED_OBJECT_SCALE_UP * 1.275,
  },
];

const state = {
  activeObjectId: null,
  placements: [],
  preview: {
    clientX: 0,
    clientY: 0,
    isPointerActive: false,
  },
};
let activePlacementDrag = null;
const TILE_SIZE = 16;
const TILE_SCALE = 1;
const TILE_DRAW_SIZE = TILE_SIZE * TILE_SCALE;

const GRASS_MID = "#5ba623";
const GRASS_DARK = "#4a9118";
const GRASS_LIGHT = "#6dc42a";
const GRASS_DEEP = "#3e7f14";
const GRASS_HIGHLIGHT = "#7ad635";

const DIRT_MID = "#c8a44a";
const DIRT_DARK = "#b8923a";
const DIRT_LIGHT = "#d4b055";
const DIRT_GRAIN = "#8B6914";
const DIRT_WARM = "#c09038";
const DIRT_PALE = "#dcbc60";
const DIRT_SHADOW_COLOR = "#9a7a28";

const TILLED_DARK = "#6b4e10";
const TILLED_MID = "#85631a";
const TILLED_LIGHT = "#9e7a28";
const TILLED_RIDGE = "#a88830";

const FLOWER_COLORS = ["#f0e040", "#4898e0", "#e85858", "#f0f0f0"];
const PEBBLE_COLORS = ["#9a9a88", "#8a8a78", "#aaa898"];

let cachedGrassTiles = null;
let cachedDirtTiles = null;
let cachedTilledTile = null;

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

function createGrassTile(seed) {
  const T = TILE_SIZE;
  const tile = document.createElement("canvas");
  tile.width = T;
  tile.height = T;
  const c = tile.getContext("2d");
  if (!c) throw new Error("Failed to create grass tile context.");
  c.imageSmoothingEnabled = false;

  const colors = [GRASS_MID, GRASS_DARK, GRASS_LIGHT, GRASS_DEEP, GRASS_HIGHLIGHT];

  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const n = hash2D(x + seed * 17, y + seed * 31);
      const cluster = hash2D(
        Math.floor((x + seed * 3) / 3),
        Math.floor((y + seed * 5) / 3),
      );
      let ci;
      if (cluster < 0.25) {
        ci = n < 0.4 ? 1 : (n < 0.7 ? 3 : 0);
      } else if (cluster > 0.75) {
        ci = n < 0.5 ? 2 : (n < 0.8 ? 4 : 0);
      } else {
        ci = n < 0.35 ? 1 : (n < 0.65 ? 0 : 2);
      }
      c.fillStyle = colors[ci];
      c.fillRect(x, y, 1, 1);
    }
  }

  for (let y = 1; y < T - 1; y += 3) {
    for (let x = 1; x < T - 1; x += 3) {
      const h = hash2D(x + seed * 47, y + seed * 59);
      if (h < 0.25) {
        c.fillStyle = GRASS_DEEP;
        c.fillRect(x, y, 1, 1);
        c.fillRect(x + 1, y, 1, 1);
        c.fillStyle = GRASS_DARK;
        c.fillRect(x, y + 1, 1, 1);
      } else if (h > 0.85) {
        c.fillStyle = GRASS_DARK;
        c.fillRect(x, y, 1, 2);
        c.fillRect(x + 1, y + 1, 1, 1);
      }
    }
  }

  const flowerChance = hash2D(seed * 97, seed * 83);
  if (flowerChance > 0.7) {
    const fx = Math.floor(hash2D(seed * 61, 7) * (T - 2)) + 1;
    const fy = Math.floor(hash2D(seed * 73, 11) * (T - 2)) + 1;
    const fc = FLOWER_COLORS[Math.floor(hash2D(seed * 101, 13) * FLOWER_COLORS.length)];
    c.fillStyle = fc;
    c.fillRect(fx, fy, 1, 1);
    c.fillRect(fx + 1, fy, 1, 1);
    c.fillRect(fx, fy + 1, 1, 1);
  }

  const pebbleChance = hash2D(seed * 113, seed * 107);
  if (pebbleChance > 0.75) {
    const px = Math.floor(hash2D(seed * 67, 17) * (T - 1));
    const py = Math.floor(hash2D(seed * 71, 19) * (T - 1));
    c.fillStyle = PEBBLE_COLORS[Math.floor(hash2D(seed * 79, 23) * PEBBLE_COLORS.length)];
    c.fillRect(px, py, 2, 1);
  }

  return tile;
}

function createDirtTile(seed) {
  const T = TILE_SIZE;
  const tile = document.createElement("canvas");
  tile.width = T;
  tile.height = T;
  const c = tile.getContext("2d");
  if (!c) throw new Error("Failed to create dirt tile context.");
  c.imageSmoothingEnabled = false;

  const baseColors = [DIRT_MID, DIRT_DARK, DIRT_LIGHT, DIRT_WARM, DIRT_PALE];

  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const n = hash2D(x + seed * 13, y + seed * 23);
      const cluster = hash2D(
        Math.floor((x + seed * 7) / 4),
        Math.floor((y + seed * 11) / 4),
      );
      let ci;
      if (cluster < 0.2) {
        ci = n < 0.5 ? 1 : 3;
      } else if (cluster > 0.8) {
        ci = n < 0.5 ? 2 : 4;
      } else {
        ci = n < 0.3 ? 1 : (n < 0.6 ? 0 : (n < 0.85 ? 2 : 3));
      }
      c.fillStyle = baseColors[ci];
      c.fillRect(x, y, 1, 1);
    }
  }

  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const g = hash2D(x + seed * 41, y + seed * 43);
      if (g > 0.93) {
        c.fillStyle = DIRT_GRAIN;
        c.fillRect(x, y, 1, 1);
      }
      if (g < 0.03) {
        const streakLen = Math.floor(hash2D(x + seed * 51, y + seed * 53) * 3) + 1;
        c.fillStyle = DIRT_GRAIN;
        c.fillRect(x, y, streakLen, 1);
      }
    }
  }

  c.fillStyle = DIRT_SHADOW_COLOR;
  for (let x = 0; x < T; x++) {
    const n = hash2D(x + seed * 61, T + seed);
    if (n > 0.3) {
      c.fillRect(x, T - 1, 1, 1);
    }
    if (n > 0.6) {
      c.fillRect(x, T - 2, 1, 1);
    }
  }
  for (let y = 0; y < T; y++) {
    const n = hash2D(T + seed, y + seed * 67);
    if (n > 0.3) {
      c.fillRect(T - 1, y, 1, 1);
    }
    if (n > 0.6) {
      c.fillRect(T - 2, y, 1, 1);
    }
  }

  return tile;
}

function createTilledTile(seed) {
  const T = TILE_SIZE;
  const tile = document.createElement("canvas");
  tile.width = T;
  tile.height = T;
  const c = tile.getContext("2d");
  if (!c) throw new Error("Failed to create tilled tile context.");
  c.imageSmoothingEnabled = false;

  c.fillStyle = TILLED_MID;
  c.fillRect(0, 0, T, T);

  for (let y = 0; y < T; y++) {
    const rowInFurrow = y % 4;
    for (let x = 0; x < T; x++) {
      const n = hash2D(x + seed * 29, y + seed * 37);
      if (rowInFurrow === 0) {
        c.fillStyle = n < 0.5 ? TILLED_DARK : TILLED_MID;
      } else if (rowInFurrow === 1) {
        c.fillStyle = n < 0.4 ? TILLED_DARK : (n < 0.7 ? TILLED_MID : TILLED_LIGHT);
      } else if (rowInFurrow === 2) {
        c.fillStyle = n < 0.3 ? TILLED_MID : (n < 0.7 ? TILLED_LIGHT : TILLED_RIDGE);
      } else {
        c.fillStyle = n < 0.5 ? TILLED_LIGHT : TILLED_RIDGE;
      }
      c.fillRect(x, y, 1, 1);
    }
  }

  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (hash2D(x + seed * 71, y + seed * 73) > 0.96) {
        c.fillStyle = "#5a4010";
        c.fillRect(x, y, 1, 1);
      }
    }
  }

  return tile;
}

function getGrassTiles() {
  if (!cachedGrassTiles) {
    cachedGrassTiles = [];
    for (let s = 0; s < 8; s++) {
      cachedGrassTiles.push(createGrassTile(s));
    }
  }
  return cachedGrassTiles;
}

function getDirtTiles() {
  if (!cachedDirtTiles) {
    cachedDirtTiles = [];
    for (let s = 0; s < 6; s++) {
      cachedDirtTiles.push(createDirtTile(s));
    }
  }
  return cachedDirtTiles;
}

function getTilledTile() {
  if (!cachedTilledTile) {
    cachedTilledTile = [];
    for (let s = 0; s < 4; s++) {
      cachedTilledTile.push(createTilledTile(s));
    }
  }
  return cachedTilledTile;
}

function getDirtRect(mapCols, mapRows) {
  const marginL = Math.floor(mapCols * 0.16);
  const marginR = Math.floor(mapCols * 0.16);
  const marginT = Math.floor(mapRows * 0.14);
  const marginB = Math.floor(mapRows * 0.20);
  return {
    left: marginL,
    top: marginT,
    right: mapCols - marginR,
    bottom: mapRows - marginB,
  };
}

function getTilledPatches(mapCols, mapRows) {
  const dirt = getDirtRect(mapCols, mapRows);
  const dw = dirt.right - dirt.left;
  const dh = dirt.bottom - dirt.top;
  const patches = [];

  const cx = dirt.left + Math.floor(dw * 0.45);
  const cy = dirt.top + Math.floor(dh * 0.40);
  patches.push({ x: cx, y: cy, w: 5, h: 4 });
  patches.push({ x: cx + 7, y: cy, w: 5, h: 4 });
  patches.push({ x: cx, y: cy + 6, w: 5, h: 4 });
  patches.push({ x: cx + 7, y: cy + 6, w: 5, h: 4 });
  patches.push({ x: cx - 8, y: cy + 2, w: 4, h: 5 });

  return patches;
}

function isEdgeTile(col, row, mapCols, mapRows) {
  const dirt = getDirtRect(mapCols, mapRows);
  const inDirt = col >= dirt.left && col < dirt.right &&
                 row >= dirt.top && row < dirt.bottom;
  if (!inDirt) return false;

  const atLeft = col === dirt.left;
  const atRight = col === dirt.right - 1;
  const atTop = row === dirt.top;
  const atBottom = row === dirt.bottom - 1;
  return atLeft || atRight || atTop || atBottom;
}

function isCornerNotch(col, row, mapCols, mapRows) {
  const dirt = getDirtRect(mapCols, mapRows);
  const notchSize = 2;

  if (col < dirt.left + notchSize && row < dirt.top + notchSize) return true;
  if (col >= dirt.right - notchSize && row < dirt.top + notchSize) return true;
  if (col < dirt.left + notchSize && row >= dirt.bottom - notchSize) return true;
  if (col >= dirt.right - notchSize && row >= dirt.bottom - notchSize) return true;
  return false;
}

function isIrregularEdge(col, row, mapCols, mapRows) {
  const dirt = getDirtRect(mapCols, mapRows);
  const inDirt = col >= dirt.left && col < dirt.right &&
                 row >= dirt.top && row < dirt.bottom;
  if (!inDirt) return false;

  const h = hash2D(col * 3 + 777, row * 5 + 333);
  const atEdge = col === dirt.left || col === dirt.right - 1 ||
                 row === dirt.top || row === dirt.bottom - 1;
  if (atEdge && h > 0.7) return true;

  const nearEdge = col === dirt.left + 1 || col === dirt.right - 2 ||
                   row === dirt.top + 1 || row === dirt.bottom - 2;
  if (nearEdge && h > 0.92) return true;

  return false;
}

function getTileType(col, row, mapCols, mapRows) {
  const dirt = getDirtRect(mapCols, mapRows);
  const inDirt = col >= dirt.left && col < dirt.right &&
                 row >= dirt.top && row < dirt.bottom;

  if (isCornerNotch(col, row, mapCols, mapRows)) return "grass";

  if (inDirt && isIrregularEdge(col, row, mapCols, mapRows)) return "grass";

  if (inDirt) {
    const patches = getTilledPatches(mapCols, mapRows);
    for (const p of patches) {
      if (col >= p.x && col < p.x + p.w && row >= p.y && row < p.y + p.h) {
        return "tilled";
      }
    }
    return "dirt";
  }

  const justOutside =
    col >= dirt.left - 1 && col <= dirt.right &&
    row >= dirt.top - 1 && row <= dirt.bottom;
  if (justOutside) {
    const h = hash2D(col * 7 + 111, row * 11 + 222);
    if (h > 0.65) return "transition";
  }

  return "grass";
}

function drawDitherTile(ctx, px, py, col, row) {
  const grassTiles = getGrassTiles();
  const dirtTiles = getDirtTiles();

  const gi = Math.floor(hash2D(col + 11, row + 19) * grassTiles.length);
  ctx.drawImage(grassTiles[gi], px, py, TILE_DRAW_SIZE, TILE_DRAW_SIZE);

  const ditherSeed = col * 31 + row * 47;
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const h = hash2D(x + ditherSeed, y + ditherSeed * 3);
      if ((x + y) % 2 === 0 && h > 0.35) {
        const di = Math.floor(hash2D(x + col * 5, y + row * 7) * 3);
        const dirtColors = [DIRT_MID, DIRT_DARK, DIRT_LIGHT];
        ctx.fillStyle = dirtColors[di];
        ctx.fillRect(px + x * TILE_SCALE, py + y * TILE_SCALE, TILE_SCALE, TILE_SCALE);
      }
    }
  }
}

function drawBackground(ctx, width, height) {
  const grassTiles = getGrassTiles();
  const dirtTiles = getDirtTiles();
  const tilledTiles = getTilledTile();
  const mapCols = Math.ceil(width / TILE_DRAW_SIZE);
  const mapRows = Math.ceil(height / TILE_DRAW_SIZE);
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < mapRows; row++) {
    for (let col = 0; col < mapCols; col++) {
      const px = col * TILE_DRAW_SIZE;
      const py = row * TILE_DRAW_SIZE;
      const type = getTileType(col, row, mapCols, mapRows);

      if (type === "grass") {
        const ti = Math.floor(hash2D(col + 11, row + 19) * grassTiles.length);
        ctx.drawImage(grassTiles[ti], px, py, TILE_DRAW_SIZE, TILE_DRAW_SIZE);
      } else if (type === "dirt") {
        const ti = Math.floor(hash2D(col + 7, row + 13) * dirtTiles.length);
        ctx.drawImage(dirtTiles[ti], px, py, TILE_DRAW_SIZE, TILE_DRAW_SIZE);
      } else if (type === "tilled") {
        const ti = Math.floor(hash2D(col + 3, row + 5) * tilledTiles.length);
        ctx.drawImage(tilledTiles[ti], px, py, TILE_DRAW_SIZE, TILE_DRAW_SIZE);
      } else {
        drawDitherTile(ctx, px, py, col, row);
      }
    }
  }

  drawDirtEdgeShadow(ctx, mapCols, mapRows);
  drawScatteredDetails(ctx, width, height, mapCols, mapRows);
}

function drawDirtEdgeShadow(ctx, mapCols, mapRows) {
  const dirt = getDirtRect(mapCols, mapRows);

  ctx.fillStyle = "rgba(80, 55, 15, 0.25)";
  for (let col = dirt.left; col < dirt.right; col++) {
    const type = getTileType(col, dirt.bottom - 1, mapCols, mapRows);
    if (type === "dirt" || type === "tilled") {
      ctx.fillRect(
        col * TILE_DRAW_SIZE,
        (dirt.bottom - 1) * TILE_DRAW_SIZE + TILE_DRAW_SIZE - 2 * TILE_SCALE,
        TILE_DRAW_SIZE,
        2 * TILE_SCALE,
      );
    }
  }
  for (let row = dirt.top; row < dirt.bottom; row++) {
    const type = getTileType(dirt.right - 1, row, mapCols, mapRows);
    if (type === "dirt" || type === "tilled") {
      ctx.fillRect(
        (dirt.right - 1) * TILE_DRAW_SIZE + TILE_DRAW_SIZE - 2 * TILE_SCALE,
        row * TILE_DRAW_SIZE,
        2 * TILE_SCALE,
        TILE_DRAW_SIZE,
      );
    }
  }
}

function drawScatteredDetails(ctx, width, height, mapCols, mapRows) {
  for (let i = 0; i < 50; i++) {
    const col = Math.floor(hash2D(i * 7 + 501, i * 11 + 601) * mapCols);
    const row = Math.floor(hash2D(i * 13 + 701, i * 17 + 801) * mapRows);
    const type = getTileType(col, row, mapCols, mapRows);
    if (type !== "grass") continue;

    const h = hash2D(i * 23 + 901, i * 29 + 1001);
    if (h > 0.5) continue;

    const px = col * TILE_DRAW_SIZE + Math.floor(hash2D(i * 31, i * 37) * (TILE_SIZE - 2)) * TILE_SCALE;
    const py = row * TILE_DRAW_SIZE + Math.floor(hash2D(i * 41, i * 43) * (TILE_SIZE - 2)) * TILE_SCALE;

    if (h < 0.15) {
      const fc = FLOWER_COLORS[Math.floor(h / 0.15 * FLOWER_COLORS.length)];
      ctx.fillStyle = fc;
      ctx.fillRect(px, py, TILE_SCALE, TILE_SCALE);
      ctx.fillRect(px + TILE_SCALE, py, TILE_SCALE, TILE_SCALE);
      ctx.fillRect(px, py + TILE_SCALE, TILE_SCALE, TILE_SCALE);
    } else {
      ctx.fillStyle = PEBBLE_COLORS[Math.floor((h - 0.15) / 0.35 * PEBBLE_COLORS.length)];
      ctx.fillRect(px, py, 2 * TILE_SCALE, TILE_SCALE);
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

function createPlacementImage(imageSrc = "") {
  const img = document.createElement("img");
  img.src = imageSrc;
  img.alt = "";
  img.draggable = false;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  img.style.imageRendering = "pixelated";
  return img;
}

function updatePlacedObjectPosition(placement, x = placement.x, y = placement.y) {
  if (!placement.element) {
    return;
  }

  placement.element.style.left = `${x}px`;
  placement.element.style.top = `${y}px`;
  placement.element.style.width = `${placement.width}px`;
  placement.element.style.height = `${placement.height}px`;
}

function ensurePreviewObject() {
  const { placementLayer } = getUIRefs();
  let previewEl = placementLayer.querySelector(".placement-preview");

  if (!previewEl) {
    previewEl = document.createElement("div");
    previewEl.className = "placed-object placement-preview";
    previewEl.dataset.preview = "true";
    previewEl.setAttribute("aria-hidden", "true");
    previewEl.appendChild(createPlacementImage());
    placementLayer.appendChild(previewEl);
  }

  if (placementLayer.lastElementChild !== previewEl) {
    placementLayer.appendChild(previewEl);
  }

  return previewEl;
}

function hidePlacementPreview() {
  const { placementLayer } = getUIRefs();
  const previewEl = placementLayer.querySelector(".placement-preview");

  if (!previewEl) {
    return;
  }

  previewEl.classList.remove("is-visible", "is-blocked");
}

function syncPreviewObject() {
  const activeObject = getObjectById(state.activeObjectId);
  const previewEl = ensurePreviewObject();
  const previewImage = previewEl.querySelector("img");

  if (!previewImage) {
    throw new Error("Placement preview image is missing.");
  }

  if (!activeObject) {
    previewImage.removeAttribute("src");
    previewEl.removeAttribute("data-object-id");
    previewEl.style.width = "0px";
    previewEl.style.height = "0px";
    hidePlacementPreview();
    return;
  }

  previewImage.src = activeObject.imageSrc;
  previewEl.dataset.objectId = activeObject.id;
  previewEl.style.width = `${activeObject.placedWidth}px`;
  previewEl.style.height = `${activeObject.placedHeight}px`;

  if (!state.preview.isPointerActive) {
    hidePlacementPreview();
  }
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
  if (objectId == null) {
    state.activeObjectId = null;
    updateActiveUI();
    syncPreviewObject();
    hidePlacementPreview();
    return;
  }

  const activeObject = getObjectById(objectId);
  if (!activeObject) {
    return;
  }

  state.activeObjectId = objectId;
  updateActiveUI();
  syncPreviewObject();

  if (state.preview.isPointerActive) {
    updatePlacementPreview(state.preview.clientX, state.preview.clientY);
  }
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
        <img src="${farmObject.imageSrc}" alt="" draggable="false" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;" />
      </span>
    `;
    button.addEventListener("click", () => {
      const nextObjectId =
        state.activeObjectId === farmObject.id ? null : farmObject.id;
      setActiveObject(nextObjectId);
    });
    slot.appendChild(button);
    toolbarButtons.appendChild(slot);
  }

  updateActiveUI();
}

function renderPlacedObject(placement) {
  const { placementLayer } = getUIRefs();
  const objectEl = document.createElement("div");
  objectEl.className = "placed-object";
  const img = createPlacementImage(placement.imageSrc);

  objectEl.appendChild(img);
  objectEl.setAttribute("aria-label", `${placement.label} placed`);
  placement.element = objectEl;
  updatePlacedObjectPosition(placement);
  objectEl.addEventListener("pointerdown", (event) =>
    startPlacementDrag(placement, objectEl, event),
  );
  objectEl.addEventListener("pointermove", handlePlacementDragMove);
  objectEl.addEventListener("pointerup", endPlacementDrag);
  objectEl.addEventListener("pointercancel", endPlacementDrag);
  placementLayer.appendChild(objectEl);
}

function getPlacementFootprint(centerX, centerY, width, height) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return {
    left: centerX - halfWidth,
    right: centerX + halfWidth,
    top: centerY - halfHeight,
    bottom: centerY + halfHeight,
  };
}

function overlapsExistingPlacement(
  centerX,
  centerY,
  width,
  height,
  excludedPlacement = null,
) {
  const nextFootprint = getPlacementFootprint(centerX, centerY, width, height);

  return state.placements.some((placement) => {
    if (placement === excludedPlacement) {
      return false;
    }

    const existingFootprint = getPlacementFootprint(
      placement.x,
      placement.y,
      placement.width,
      placement.height,
    );
    return !(
      nextFootprint.right <= existingFootprint.left ||
      nextFootprint.left >= existingFootprint.right ||
      nextFootprint.bottom <= existingFootprint.top ||
      nextFootprint.top >= existingFootprint.bottom
    );
  });
}

function getSnappedPlacement(
  clientX,
  clientY,
  width,
  height,
  offsetX = 0,
  offsetY = 0,
) {
  const { view } = getViewAndCanvas();
  const bounds = view.getBoundingClientRect();
  const relativeX = clientX - bounds.left - offsetX;
  const relativeY = clientY - bounds.top - offsetY;
  const snappedX = Math.round(relativeX / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  const snappedY = Math.round(relativeY / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return {
    x: snappedX,
    y: snappedY,
    isInsideBounds:
      snappedX >= halfWidth &&
      snappedX <= bounds.width - halfWidth &&
      snappedY >= halfHeight &&
      snappedY <= bounds.height - halfHeight,
  };
}

function updatePlacementPreview(clientX, clientY) {
  const activeObject = getObjectById(state.activeObjectId);
  if (!activeObject) {
    hidePlacementPreview();
    return;
  }

  syncPreviewObject();
  const previewEl = ensurePreviewObject();
  const placement = getSnappedPlacement(
    clientX,
    clientY,
    activeObject.placedWidth,
    activeObject.placedHeight,
  );
  const isBlocked =
    placement.isInsideBounds &&
    overlapsExistingPlacement(
      placement.x,
      placement.y,
      activeObject.placedWidth,
      activeObject.placedHeight,
    );

  previewEl.style.left = `${placement.x}px`;
  previewEl.style.top = `${placement.y}px`;
  previewEl.classList.toggle("is-visible", placement.isInsideBounds);
  previewEl.classList.toggle("is-blocked", isBlocked);
}

function placeObject(clientX, clientY) {
  const activeObject = getObjectById(state.activeObjectId);
  if (!activeObject) {
    return false;
  }

  const placement = getSnappedPlacement(
    clientX,
    clientY,
    activeObject.placedWidth,
    activeObject.placedHeight,
  );
  if (!placement.isInsideBounds) {
    return false;
  }

  if (
    overlapsExistingPlacement(
      placement.x,
      placement.y,
      activeObject.placedWidth,
      activeObject.placedHeight,
    )
  ) {
    return false;
  }

  const placedObject = {
    id: activeObject.id,
    label: activeObject.label,
    imageSrc: activeObject.imageSrc,
    x: placement.x,
    y: placement.y,
    width: activeObject.placedWidth,
    height: activeObject.placedHeight,
  };

  state.placements.push(placedObject);
  renderPlacedObject(placedObject);
  return true;
}

function startPlacementDrag(placement, objectEl, event) {
  if (activePlacementDrag) {
    return;
  }

  event.preventDefault();

  const { view } = getViewAndCanvas();
  const bounds = view.getBoundingClientRect();
  activePlacementDrag = {
    placement,
    objectEl,
    pointerId: event.pointerId,
    originX: placement.x,
    originY: placement.y,
    previewX: placement.x,
    previewY: placement.y,
    offsetX: event.clientX - bounds.left - placement.x,
    offsetY: event.clientY - bounds.top - placement.y,
    isValidDrop: true,
  };

  objectEl.classList.add("is-dragging");
  objectEl.setPointerCapture(event.pointerId);
}

function handlePlacementDragMove(event) {
  if (
    !activePlacementDrag ||
    activePlacementDrag.pointerId !== event.pointerId
  ) {
    return;
  }

  const snappedPlacement = getSnappedPlacement(
    event.clientX,
    event.clientY,
    activePlacementDrag.placement.width,
    activePlacementDrag.placement.height,
    activePlacementDrag.offsetX,
    activePlacementDrag.offsetY,
  );

  activePlacementDrag.previewX = snappedPlacement.x;
  activePlacementDrag.previewY = snappedPlacement.y;
  activePlacementDrag.isValidDrop =
    snappedPlacement.isInsideBounds &&
    !overlapsExistingPlacement(
      snappedPlacement.x,
      snappedPlacement.y,
      activePlacementDrag.placement.width,
      activePlacementDrag.placement.height,
      activePlacementDrag.placement,
    );

  activePlacementDrag.objectEl.classList.toggle(
    "is-invalid-drop",
    !activePlacementDrag.isValidDrop,
  );
  updatePlacedObjectPosition(
    activePlacementDrag.placement,
    snappedPlacement.x,
    snappedPlacement.y,
  );
}

function endPlacementDrag(event) {
  if (
    !activePlacementDrag ||
    activePlacementDrag.pointerId !== event.pointerId
  ) {
    return;
  }

  const {
    placement,
    objectEl,
    originX,
    originY,
    previewX,
    previewY,
    isValidDrop,
  } = activePlacementDrag;

  if (event.type === "pointerup" && isValidDrop) {
    placement.x = previewX;
    placement.y = previewY;
  } else {
    updatePlacedObjectPosition(placement, originX, originY);
  }

  objectEl.classList.remove("is-dragging", "is-invalid-drop");
  activePlacementDrag = null;
  if (objectEl.hasPointerCapture(event.pointerId)) {
    objectEl.releasePointerCapture(event.pointerId);
  }
  updatePlacedObjectPosition(placement);
}

function setupPlacementInput() {
  const { canvas } = getViewAndCanvas();

  canvas.addEventListener("pointermove", (event) => {
    state.preview.clientX = event.clientX;
    state.preview.clientY = event.clientY;
    state.preview.isPointerActive = true;
    updatePlacementPreview(event.clientX, event.clientY);
  });

  canvas.addEventListener("pointerleave", () => {
    state.preview.isPointerActive = false;
    hidePlacementPreview();
  });

  canvas.addEventListener("click", (event) => {
    state.preview.clientX = event.clientX;
    state.preview.clientY = event.clientY;

    if (placeObject(event.clientX, event.clientY)) {
      // Keep the freshly placed object visible until the pointer moves again.
      state.preview.isPointerActive = false;
      hidePlacementPreview();
      return;
    }

    state.preview.isPointerActive = true;
    updatePlacementPreview(event.clientX, event.clientY);
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

  if (state.preview.isPointerActive) {
    updatePlacementPreview(state.preview.clientX, state.preview.clientY);
  }
}

export function init() {
  renderToolbar();
  syncPreviewObject();
  setActiveObject(state.activeObjectId);
  setupPlacementInput();
  resizeAndRender();
  window.addEventListener("resize", resizeAndRender);
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById(VIEW_ID)) {
      init();
    }
  });
}

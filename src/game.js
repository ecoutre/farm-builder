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
const TILE = 16;
const TILE_DRAW_SIZE = TILE;

const GRASS_A = "#4A8C2A";
const GRASS_B = "#72C040";
const GRASS_SHADOW = "#2E6018";
const GRASS_DEEP = "#3A7020";
const GRASS_BRIGHT = "#5AAA30";

const DIRT_A = "#C8A050";
const DIRT_B = "#D4A843";
const DIRT_NOISE_DARK = "#B89038";
const DIRT_NOISE_LIGHT = "#D8B458";
const DIRT_HOLE = "#A07830";
const DIRT_HOLE_RIM = "#B8923A";

const TILLED_BASE = "#8B5E3C";
const TILLED_DARK = "#7A4F2D";
const TILLED_LINE = "#5C3A1E";
const TILLED_CENTER = "#8C5A34";
const TILLED_EDGE = "#6A4020";

let cachedGrassTile = null;
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

function buildGrassTile() {
  const tile = document.createElement("canvas");
  tile.width = TILE;
  tile.height = TILE;
  const c = tile.getContext("2d");
  if (!c) throw new Error("Failed to create grass tile context.");
  c.imageSmoothingEnabled = false;

  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      c.fillStyle = ((x + y) % 2 === 0) ? GRASS_A : GRASS_B;
      c.fillRect(x, y, 1, 1);
    }
  }

  return tile;
}

function getGrassTile() {
  if (!cachedGrassTile) {
    cachedGrassTile = buildGrassTile();
  }
  return cachedGrassTile;
}

function buildDirtTile(seed) {
  const tile = document.createElement("canvas");
  tile.width = TILE;
  tile.height = TILE;
  const c = tile.getContext("2d");
  if (!c) throw new Error("Failed to create dirt tile context.");
  c.imageSmoothingEnabled = false;

  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      c.fillStyle = ((x + y) % 2 === 0) ? DIRT_A : DIRT_B;
      c.fillRect(x, y, 1, 1);
    }
  }

  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const h = hash2D(x + seed * 17, y + seed * 31);
      if (h < 0.025) {
        c.fillStyle = DIRT_NOISE_DARK;
        c.fillRect(x, y, 1, 1);
      } else if (h > 0.975) {
        c.fillStyle = DIRT_NOISE_LIGHT;
        c.fillRect(x, y, 1, 1);
      }
    }
  }

  return tile;
}

function getDirtTiles() {
  if (!cachedDirtTiles) {
    cachedDirtTiles = [0, 1, 2, 3].map((s) => buildDirtTile(s));
  }
  return cachedDirtTiles;
}

function buildTilledTile() {
  const tile = document.createElement("canvas");
  tile.width = TILE;
  tile.height = TILE;
  const c = tile.getContext("2d");
  if (!c) throw new Error("Failed to create tilled tile context.");
  c.imageSmoothingEnabled = false;

  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      c.fillStyle = ((x + y) % 2 === 0) ? TILLED_BASE : TILLED_DARK;
      c.fillRect(x, y, 1, 1);
    }
  }

  c.fillStyle = TILLED_LINE;
  c.fillRect(0, 0, TILE, 1);
  c.fillRect(0, 0, 1, TILE);
  c.fillRect(0, TILE - 1, TILE, 1);
  c.fillRect(TILE - 1, 0, 1, TILE);

  c.fillStyle = TILLED_CENTER;
  c.fillRect(4, 4, 8, 8);

  c.fillStyle = TILLED_EDGE;
  c.fillRect(2, 2, 12, 1);
  c.fillRect(2, 13, 12, 1);
  c.fillRect(2, 2, 1, 12);
  c.fillRect(13, 2, 1, 12);

  return tile;
}

function getTilledTile() {
  if (!cachedTilledTile) {
    cachedTilledTile = buildTilledTile();
  }
  return cachedTilledTile;
}

function getBoundaryOffset(col, mapCols, mapRows, side) {
  const center = mapCols / 2;
  const dist = (col - center) / (mapCols / 2);

  if (side === "top") {
    const dip = Math.round(2.5 * Math.cos(dist * Math.PI * 0.8));
    const wave = Math.round(1.5 * Math.sin(col * 0.7 + 1.0));
    const jitter = Math.round((hash2D(col * 3, 77) - 0.5) * 1.5);
    return dip + wave + jitter;
  }
  if (side === "bottom") {
    const wave = Math.round(1.2 * Math.sin(col * 0.6 + 2.5));
    const jitter = Math.round((hash2D(col * 5, 199) - 0.5) * 1.5);
    return wave + jitter;
  }
  return 0;
}

function getBoundaryOffsetV(row, mapRows, side) {
  const center = mapRows / 2;
  const dist = (row - center) / (mapRows / 2);

  const wave = Math.round(1.5 * Math.sin(row * 0.65 + (side === "left" ? 0.5 : 3.2)));
  const jitter = Math.round((hash2D(side === "left" ? 311 : 499, row * 7) - 0.5) * 1.5);
  return wave + jitter;
}

function getDirtRegion(mapCols, mapRows) {
  const grassTop = 5;
  const grassBottom = 4;
  const grassLeft = 8;
  const grassRight = 8;
  return {
    top: grassTop,
    bottom: mapRows - grassBottom,
    left: grassLeft,
    right: mapCols - grassRight,
  };
}

function isDirt(col, row, mapCols, mapRows) {
  const r = getDirtRegion(mapCols, mapRows);
  const topEdge = r.top + getBoundaryOffset(col, mapCols, mapRows, "top");
  const botEdge = r.bottom + getBoundaryOffset(col, mapCols, mapRows, "bottom");
  const leftEdge = r.left + getBoundaryOffsetV(row, mapRows, "left");
  const rightEdge = r.right + getBoundaryOffsetV(row, mapRows, "right");

  return col >= leftEdge && col < rightEdge && row >= topEdge && row < botEdge;
}

function isTilled(col, row, mapCols, mapRows) {
  const r = getDirtRegion(mapCols, mapRows);
  const dw = r.right - r.left;
  const dh = r.bottom - r.top;
  const cx = r.left + Math.floor(dw * 0.42);
  const cy = r.top + Math.floor(dh * 0.35);

  const patches = [
    { x: cx, y: cy, w: 5, h: 4 },
    { x: cx + 6, y: cy, w: 5, h: 4 },
    { x: cx + 13, y: cy + 1, w: 4, h: 3 },
    { x: cx, y: cy + 6, w: 5, h: 4 },
    { x: cx + 6, y: cy + 6, w: 5, h: 4 },
    { x: cx - 7, y: cy + 3, w: 4, h: 5 },
  ];

  for (const p of patches) {
    if (col >= p.x && col < p.x + p.w && row >= p.y && row < p.y + p.h) {
      return true;
    }
  }
  return false;
}

function isDitherEdge(col, row, mapCols, mapRows) {
  if (isDirt(col, row, mapCols, mapRows)) return false;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (isDirt(col + dx, row + dy, mapCols, mapRows)) return true;
    }
  }
  return false;
}

function drawBackground(ctx, width, height) {
  const grassTile = getGrassTile();
  const dirtTiles = getDirtTiles();
  const tilledTile = getTilledTile();
  const mapCols = Math.ceil(width / TILE_DRAW_SIZE);
  const mapRows = Math.ceil(height / TILE_DRAW_SIZE);
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < mapRows; row++) {
    for (let col = 0; col < mapCols; col++) {
      const px = col * TILE_DRAW_SIZE;
      const py = row * TILE_DRAW_SIZE;
      const inDirt = isDirt(col, row, mapCols, mapRows);

      if (inDirt && isTilled(col, row, mapCols, mapRows)) {
        ctx.drawImage(tilledTile, px, py);
      } else if (inDirt) {
        const ti = ((col * 7 + row * 13) & 3);
        ctx.drawImage(dirtTiles[ti], px, py);
      } else if (isDitherEdge(col, row, mapCols, mapRows)) {
        ctx.drawImage(grassTile, px, py);
        drawDitherOverlay(ctx, px, py, col, row, mapCols, mapRows);
      } else {
        ctx.drawImage(grassTile, px, py);
        drawGrassDetails(ctx, px, py, col, row);
      }
    }
  }

  drawDirtHoles(ctx, mapCols, mapRows);
  drawGrassTufts(ctx, mapCols, mapRows);
}

function drawDitherOverlay(ctx, px, py, col, row, mapCols, mapRows) {
  const dirtUp = isDirt(col, row - 1, mapCols, mapRows);
  const dirtDown = isDirt(col, row + 1, mapCols, mapRows);
  const dirtLeft = isDirt(col - 1, row, mapCols, mapRows);
  const dirtRight = isDirt(col + 1, row, mapCols, mapRows);

  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      let paint = false;

      if (dirtUp && y < 6 && (x + y) % 2 === 0) paint = true;
      if (dirtDown && y >= 10 && (x + y) % 2 === 0) paint = true;
      if (dirtLeft && x < 6 && (x + y) % 2 === 0) paint = true;
      if (dirtRight && x >= 10 && (x + y) % 2 === 0) paint = true;

      if (dirtUp && y < 3) paint = true;
      if (dirtDown && y >= 13) paint = true;
      if (dirtLeft && x < 3) paint = true;
      if (dirtRight && x >= 13) paint = true;

      if (paint) {
        ctx.fillStyle = ((x + y) % 2 === 0) ? DIRT_A : DIRT_B;
        ctx.fillRect(px + x, py + y, 1, 1);
      }
    }
  }
}

function drawGrassDetails(ctx, px, py, col, row) {
  const h = hash2D(col * 13 + 101, row * 17 + 203);

  if (h < 0.15) {
    const sx = Math.floor(hash2D(col * 7, row * 3) * 10) + 2;
    const sy = Math.floor(hash2D(col * 11, row * 5) * 10) + 2;
    ctx.fillStyle = GRASS_SHADOW;
    ctx.fillRect(px + sx, py + sy, 2, 1);
    ctx.fillRect(px + sx, py + sy + 1, 3, 1);
    ctx.fillRect(px + sx + 1, py + sy + 2, 2, 1);
  }
}

function drawPixelOval(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        ctx.fillRect(cx + dx, cy + dy, 1, 1);
      }
    }
  }
}

function drawDirtHoles(ctx, mapCols, mapRows) {
  for (let i = 0; i < 25; i++) {
    const col = Math.floor(hash2D(i * 7 + 401, i * 11 + 503) * mapCols);
    const row = Math.floor(hash2D(i * 13 + 607, i * 17 + 709) * mapRows);
    if (!isDirt(col, row, mapCols, mapRows)) continue;
    if (isTilled(col, row, mapCols, mapRows)) continue;

    const px = col * TILE_DRAW_SIZE + Math.floor(hash2D(i * 23, i * 29) * 6);
    const py = row * TILE_DRAW_SIZE + Math.floor(hash2D(i * 31, i * 37) * 8);
    const rw = Math.floor(hash2D(i * 41, i * 43) * 2) + 4;
    const rh = Math.floor(hash2D(i * 47, i * 53) * 2) + 3;

    drawPixelOval(ctx, px + rw, py + rh, rw + 1, rh + 1, DIRT_HOLE_RIM);
    drawPixelOval(ctx, px + rw, py + rh, rw, rh, DIRT_HOLE);
  }
}

function drawGrassTufts(ctx, mapCols, mapRows) {
  for (let i = 0; i < 30; i++) {
    const col = Math.floor(hash2D(i * 3 + 811, i * 7 + 913) * mapCols);
    const row = Math.floor(hash2D(i * 11 + 1017, i * 13 + 1119) * mapRows);
    if (!isDirt(col, row, mapCols, mapRows)) continue;

    const r = getDirtRegion(mapCols, mapRows);
    const topEdge = r.top + getBoundaryOffset(col, mapCols, mapRows, "top");
    const botEdge = r.bottom + getBoundaryOffset(col, mapCols, mapRows, "bottom");
    const leftEdge = r.left + getBoundaryOffsetV(row, mapRows, "left");
    const rightEdge = r.right + getBoundaryOffsetV(row, mapRows, "right");
    const nearEdge = (row - topEdge < 2) || (botEdge - row < 3) ||
                     (col - leftEdge < 2) || (rightEdge - col < 3);
    if (!nearEdge) continue;
    if (hash2D(i * 19 + 1221, i * 23 + 1323) > 0.5) continue;

    const px = col * TILE_DRAW_SIZE + Math.floor(hash2D(i * 29, i * 31) * 10);
    const py = row * TILE_DRAW_SIZE + Math.floor(hash2D(i * 37, i * 41) * 10);

    ctx.fillStyle = GRASS_A;
    ctx.fillRect(px, py, 3, 2);
    ctx.fillRect(px + 1, py + 2, 2, 1);
    ctx.fillStyle = GRASS_B;
    ctx.fillRect(px + 1, py, 1, 1);
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

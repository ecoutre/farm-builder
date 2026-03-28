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
const SOURCE_TILE_SIZE = 16;
const TILE_SCALE = 3;
const TILE_DRAW_SIZE = SOURCE_TILE_SIZE * TILE_SCALE;

const GRASS_LIGHT = ["#5cb338", "#62ba3d", "#58ad34", "#66bf42"];
const GRASS_DARK = ["#4a9e2c", "#4fa530", "#479828", "#52a832"];
const GRASS_ACCENT = ["#3d8a22", "#73c74e", "#80d05a"];
const DIRT_BASE = ["#d4a645", "#dbb24e", "#c99b3d", "#e0b855"];
const DIRT_SHADOW = ["#b8893a", "#c49440", "#ae8034"];
const DIRT_HIGHLIGHT = ["#e8c464", "#eecb70", "#f0d07a"];
const FLOWER_COLORS = ["#e85050", "#e8e050", "#e0e0f0", "#f0a0d0", "#50a0e8"];

let cachedGrassTiles = null;
let cachedDirtTiles = null;
let cachedEdgeMap = null;

function hash2D(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function noise2D(px, py) {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const fx = px - ix;
  const fy = py - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2D(ix, iy);
  const b = hash2D(ix + 1, iy);
  const c = hash2D(ix, iy + 1);
  const d = hash2D(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(px, py, octaves) {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2D(px * freq, py * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

function getViewAndCanvas() {
  const view = document.getElementById(VIEW_ID);
  const canvas = document.getElementById(BACKGROUND_ID);

  if (!view || !canvas) {
    throw new Error("Game view or background canvas is missing.");
  }

  return { view, canvas };
}

function createGrassTile(seedOffset, variant) {
  const tile = document.createElement("canvas");
  tile.width = SOURCE_TILE_SIZE;
  tile.height = SOURCE_TILE_SIZE;

  const tileCtx = tile.getContext("2d");
  if (!tileCtx) {
    throw new Error("Failed to create grass tile context.");
  }

  tileCtx.imageSmoothingEnabled = false;
  const palette = variant === 0 ? GRASS_LIGHT : GRASS_DARK;

  tileCtx.fillStyle = palette[0];
  tileCtx.fillRect(0, 0, SOURCE_TILE_SIZE, SOURCE_TILE_SIZE);

  for (let y = 0; y < SOURCE_TILE_SIZE; y++) {
    for (let x = 0; x < SOURCE_TILE_SIZE; x++) {
      const n = hash2D(x + seedOffset * 17, y + seedOffset * 31);
      let ci = 0;
      if (n > 0.6) ci = 1;
      else if (n > 0.35) ci = 2;
      else if (n > 0.15) ci = 3;
      tileCtx.fillStyle = palette[ci];
      tileCtx.fillRect(x, y, 1, 1);
    }
  }

  for (let y = 0; y < SOURCE_TILE_SIZE; y += 2) {
    for (let x = 0; x < SOURCE_TILE_SIZE; x += 2) {
      const h = hash2D(x + seedOffset * 41, y + seedOffset * 53);
      if (h > 0.88) {
        tileCtx.fillStyle = GRASS_ACCENT[Math.floor(h * 30) % GRASS_ACCENT.length];
        tileCtx.fillRect(x, y, 1, 1);
      }
      if (h < 0.06) {
        tileCtx.fillStyle = GRASS_ACCENT[0];
        tileCtx.fillRect(x, y, 1, 2);
      }
    }
  }

  if (hash2D(seedOffset * 97, variant * 83) > 0.5) {
    const fx = Math.floor(hash2D(seedOffset * 61, variant * 71) * (SOURCE_TILE_SIZE - 2));
    const fy = Math.floor(hash2D(seedOffset * 73, variant * 89) * (SOURCE_TILE_SIZE - 2));
    const fc = FLOWER_COLORS[Math.floor(hash2D(seedOffset * 101, variant * 103) * FLOWER_COLORS.length)];
    tileCtx.fillStyle = fc;
    tileCtx.fillRect(fx, fy, 2, 2);
    tileCtx.fillStyle = "#f0e860";
    tileCtx.fillRect(fx, fy + 1, 1, 1);
  }

  return tile;
}

function createDirtTile(seedOffset) {
  const tile = document.createElement("canvas");
  tile.width = SOURCE_TILE_SIZE;
  tile.height = SOURCE_TILE_SIZE;

  const tileCtx = tile.getContext("2d");
  if (!tileCtx) {
    throw new Error("Failed to create dirt tile context.");
  }

  tileCtx.imageSmoothingEnabled = false;
  tileCtx.fillStyle = DIRT_BASE[0];
  tileCtx.fillRect(0, 0, SOURCE_TILE_SIZE, SOURCE_TILE_SIZE);

  for (let y = 0; y < SOURCE_TILE_SIZE; y++) {
    for (let x = 0; x < SOURCE_TILE_SIZE; x++) {
      const macro = hash2D(
        Math.floor((x + seedOffset * 5) / 3),
        Math.floor((y + seedOffset * 7) / 3),
      );
      let color;
      if (macro > 0.75) {
        color = DIRT_HIGHLIGHT[Math.floor(hash2D(x + seedOffset * 11, y) * DIRT_HIGHLIGHT.length)];
      } else if (macro < 0.2) {
        color = DIRT_SHADOW[Math.floor(hash2D(x, y + seedOffset * 13) * DIRT_SHADOW.length)];
      } else {
        color = DIRT_BASE[Math.floor(hash2D(x + seedOffset * 3, y + seedOffset * 9) * DIRT_BASE.length)];
      }
      tileCtx.fillStyle = color;
      tileCtx.fillRect(x, y, 1, 1);
    }
  }

  for (let y = 0; y < SOURCE_TILE_SIZE; y += 2) {
    for (let x = 0; x < SOURCE_TILE_SIZE; x += 2) {
      const h = hash2D(x + seedOffset * 41, y + seedOffset * 43);
      if (h > 0.97) {
        tileCtx.fillStyle = "#a07828";
        tileCtx.fillRect(x, y, 1, 1);
      }
      if (h < 0.015) {
        tileCtx.fillStyle = "#c0a050";
        tileCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  return tile;
}

function getGrassTiles() {
  if (!cachedGrassTiles) {
    cachedGrassTiles = [];
    for (let s = 0; s < 3; s++) {
      cachedGrassTiles.push(createGrassTile(s, 0));
      cachedGrassTiles.push(createGrassTile(s, 1));
    }
  }
  return cachedGrassTiles;
}

function getDirtTiles() {
  if (!cachedDirtTiles) {
    cachedDirtTiles = [0, 1, 2].map((s) => createDirtTile(s));
  }
  return cachedDirtTiles;
}

function getDirtBoundary(width, height) {
  const cx = width * 0.50;
  const cy = height * 0.46;
  const rx = width * 0.38;
  const ry = height * 0.38;
  return { cx, cy, rx, ry };
}

function isInDirt(px, py, width, height) {
  const { cx, cy, rx, ry } = getDirtBoundary(width, height);
  const nx = (px - cx) / rx;
  const ny = (py - cy) / ry;
  const baseDist = nx * nx + ny * ny;

  const wobble = fbm(px * 0.008 + 3.7, py * 0.008 + 7.3, 4) * 0.55
    + fbm(px * 0.02 + 11.1, py * 0.02 + 5.5, 3) * 0.18;

  return baseDist + wobble < 1.0;
}

function getEdgeDistance(px, py, width, height) {
  const { cx, cy, rx, ry } = getDirtBoundary(width, height);
  const nx = (px - cx) / rx;
  const ny = (py - cy) / ry;
  const baseDist = nx * nx + ny * ny;
  const wobble = fbm(px * 0.008 + 3.7, py * 0.008 + 7.3, 4) * 0.55
    + fbm(px * 0.02 + 11.1, py * 0.02 + 5.5, 3) * 0.18;
  return 1.0 - (baseDist + wobble);
}

function drawBackground(ctx, width, height) {
  const grassTiles = getGrassTiles();
  const dirtTiles = getDirtTiles();
  const cols = Math.ceil(width / TILE_DRAW_SIZE);
  const rows = Math.ceil(height / TILE_DRAW_SIZE);
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tileX = col * TILE_DRAW_SIZE;
      const tileY = row * TILE_DRAW_SIZE;
      const checkerboard = (col + row) % 2;
      const seedVar = Math.floor(hash2D(col + 11, row + 19) * 3);
      const tileIndex = seedVar * 2 + checkerboard;
      ctx.drawImage(grassTiles[tileIndex], tileX, tileY, TILE_DRAW_SIZE, TILE_DRAW_SIZE);
    }
  }

  const step = TILE_DRAW_SIZE;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tileX = col * step;
      const tileY = row * step;
      const tcx = tileX + step / 2;
      const tcy = tileY + step / 2;

      if (isInDirt(tcx, tcy, width, height)) {
        const tileIndex = Math.floor(hash2D(col + 7, row + 13) * dirtTiles.length);
        ctx.drawImage(dirtTiles[tileIndex], tileX, tileY, step, step);
      }
    }
  }

  drawEdgeTransitions(ctx, width, height, cols, rows, grassTiles, dirtTiles);
  drawDirtDetails(ctx, width, height);
  drawGrassDecorations(ctx, width, height);
}

function drawEdgeTransitions(ctx, width, height, cols, rows, grassTiles, dirtTiles) {
  const step = TILE_DRAW_SIZE;
  const edgeFade = 18;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tileX = col * step;
      const tileY = row * step;
      const tcx = tileX + step / 2;
      const tcy = tileY + step / 2;
      const dist = getEdgeDistance(tcx, tcy, width, height);

      if (dist > -0.08 && dist < 0.08) {
        const progress = (dist + 0.08) / 0.16;

        if (dist > 0) {
          const grassAlpha = 1 - progress;
          if (grassAlpha > 0.05) {
            for (let py = 0; py < step; py += 3) {
              for (let px = 0; px < step; px += 3) {
                const n = hash2D((tileX + px) * 0.1 + 33, (tileY + py) * 0.1 + 77);
                if (n < grassAlpha * 0.6) {
                  const ci = Math.floor(hash2D(px + col * 7, py + row * 11) * GRASS_LIGHT.length);
                  ctx.fillStyle = GRASS_LIGHT[ci];
                  ctx.fillRect(tileX + px, tileY + py, 3, 3);
                }
              }
            }
          }
        } else {
          const dirtAlpha = progress;
          if (dirtAlpha > 0.05) {
            for (let py = 0; py < step; py += 3) {
              for (let px = 0; px < step; px += 3) {
                const n = hash2D((tileX + px) * 0.1 + 55, (tileY + py) * 0.1 + 99);
                if (n < dirtAlpha * 0.5) {
                  const ci = Math.floor(hash2D(px + col * 3, py + row * 5) * DIRT_BASE.length);
                  ctx.fillStyle = DIRT_BASE[ci];
                  ctx.fillRect(tileX + px, tileY + py, 3, 3);
                }
              }
            }
          }
        }
      }
    }
  }
}

function drawDirtDetails(ctx, width, height) {
  for (let i = 0; i < 60; i++) {
    const px = hash2D(i * 7 + 101, i * 13 + 203) * width;
    const py = hash2D(i * 11 + 307, i * 17 + 409) * height;
    if (!isInDirt(px, py, width, height)) continue;
    const dist = getEdgeDistance(px, py, width, height);
    if (dist < 0.05) continue;

    const sz = Math.floor(hash2D(i * 23, i * 29) * 3) + 2;
    ctx.fillStyle = hash2D(i * 31, i * 37) > 0.5 ? "#b89038" : "#a88030";
    ctx.globalAlpha = 0.3 + hash2D(i * 41, i * 43) * 0.3;
    ctx.fillRect(Math.floor(px), Math.floor(py), sz, sz);
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 20; i++) {
    const px = hash2D(i * 53 + 500, i * 59 + 600) * width;
    const py = hash2D(i * 61 + 700, i * 67 + 800) * height;
    if (!isInDirt(px, py, width, height)) continue;
    const dist = getEdgeDistance(px, py, width, height);
    if (dist < 0.1) continue;

    ctx.fillStyle = "#c8a848";
    ctx.globalAlpha = 0.15;
    const w = Math.floor(hash2D(i * 71, i * 73) * 15) + 8;
    const h2 = Math.floor(hash2D(i * 79, i * 83) * 10) + 5;
    ctx.fillRect(Math.floor(px), Math.floor(py), w, h2);
  }
  ctx.globalAlpha = 1;
}

function drawGrassDecorations(ctx, width, height) {
  for (let i = 0; i < 80; i++) {
    const px = hash2D(i * 3 + 901, i * 7 + 1003) * width;
    const py = hash2D(i * 11 + 1107, i * 13 + 1209) * height;
    if (isInDirt(px, py, width, height)) continue;

    const dist = getEdgeDistance(px, py, width, height);
    if (dist > -0.15) continue;

    const h = hash2D(i * 41 + 1301, i * 43 + 1403);
    if (h > 0.4) continue;

    const color = FLOWER_COLORS[Math.floor(h * FLOWER_COLORS.length / 0.4)];
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(px), Math.floor(py), 3, 3);
    ctx.fillStyle = "#f8f040";
    ctx.fillRect(Math.floor(px) + 1, Math.floor(py) + 1, 1, 1);
  }

  for (let i = 0; i < 40; i++) {
    const px = hash2D(i * 5 + 1501, i * 9 + 1603) * width;
    const py = hash2D(i * 15 + 1707, i * 19 + 1809) * height;
    if (isInDirt(px, py, width, height)) continue;
    const dist = getEdgeDistance(px, py, width, height);
    if (dist > -0.1) continue;

    ctx.fillStyle = GRASS_ACCENT[0];
    ctx.globalAlpha = 0.5;
    const sz = Math.floor(hash2D(i * 23 + 1901, i * 29 + 2003) * 6) + 4;
    ctx.fillRect(Math.floor(px), Math.floor(py), sz, sz + 2);
    ctx.globalAlpha = 1;
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

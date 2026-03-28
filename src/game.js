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
const T = 16;
const TILE_DRAW_SIZE = T;

const FARMER_SPRITE_W = 48;
const FARMER_SPRITE_H = 48;
const FARMER_SCALE = 1.5;
const FARMER_DISPLAY_W = FARMER_SPRITE_W * FARMER_SCALE;
const FARMER_DISPLAY_H = FARMER_SPRITE_H * FARMER_SCALE;
const FARMER_SPEED = 2.5;
const FARMER_HITBOX_W = 16 * FARMER_SCALE;
const FARMER_HITBOX_H = 16 * FARMER_SCALE;

const farmerState = {
  x: 0,
  y: 0,
  keys: {},
  element: null,
  spriteUrl: "./src/assets/sprites/farmer.png",
  initialized: false,
  direction: 0, // 0: down, 1: left, 2: up, 3: right
  frame: 0,
  isMoving: false,
  animTimer: 0,
};

const GP = ["#3d6b1e", "#4a7a28", "#5a8c30", "#77a34f", "#8fbc5b"];
const DP = ["#c8a850", "#d4b45a", "#dfc070"];
const FP = ["#7a9030", "#98b048"];

let _grassTiles = null;
let _dirtTiles = null;

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

function tileVar(x, y, n) {
  return (((x * 2654435761) ^ (y * 2246822519)) >>> 0) % n;
}

function getViewAndCanvas() {
  const view = document.getElementById(VIEW_ID);
  const canvas = document.getElementById(BACKGROUND_ID);
  if (!view || !canvas) {
    throw new Error("Game view or background canvas is missing.");
  }
  return { view, canvas };
}

function grassPx(x, y) {
  if ((x + y) % 2 === 0) {
    return GP[1];
  }
  const h = hash2D(x * 131 + 7, y * 197 + 13);
  if (h < 0.75) return GP[2];
  return GP[3];
}

function dirtPx(x, y, seed) {
  const h = hash2D(x + seed * 17, y + seed * 31);
  if (h < 0.08) return DP[1];
  if (h > 0.95) return DP[2];
  return DP[0];
}

function buildGrassTiles() {
  const tiles = [];
  for (let v = 0; v < 4; v++) {
    const cvs = document.createElement("canvas");
    cvs.width = T;
    cvs.height = T;
    const c = cvs.getContext("2d");
    if (!c) throw new Error("Failed to create grass tile context.");
    c.imageSmoothingEnabled = false;
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        c.fillStyle = grassPx(x, y);
        c.fillRect(x, y, 1, 1);
      }
    }
    if (v >= 2) {
      c.fillStyle = GP[0];
      c.fillRect(v === 2 ? 3 : 10, v === 2 ? 5 : 9, 2, 2);
    }
    tiles.push(cvs);
  }
  return tiles;
}

function getGrassTiles() {
  if (!_grassTiles) _grassTiles = buildGrassTiles();
  return _grassTiles;
}

function buildDirtTiles() {
  const tiles = [];
  for (let v = 0; v < 3; v++) {
    const cvs = document.createElement("canvas");
    cvs.width = T;
    cvs.height = T;
    const c = cvs.getContext("2d");
    if (!c) throw new Error("Failed to create dirt tile context.");
    c.imageSmoothingEnabled = false;
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        c.fillStyle = dirtPx(x, y, v);
        c.fillRect(x, y, 1, 1);
      }
    }
    tiles.push(cvs);
  }
  return tiles;
}

function getDirtTiles() {
  if (!_dirtTiles) _dirtTiles = buildDirtTiles();
  return _dirtTiles;
}

function buildGrassMap(cols, rows) {
  const map = new Uint8Array(cols * rows);
  const cx = cols / 2;
  const cy = rows / 2;
  const rx = cols / 2 - 4;
  const ry = rows / 2 - 5;

  const lobes = [
    { x: cx - rx * 0.6, y: cy - ry * 0.55, r: 2.5, grass: true },
    { x: cx + rx * 0.65, y: cy + ry * 0.45, r: 2.2, grass: true },
    { x: cx + rx * 0.3, y: cy - ry * 0.9, r: 2.0, grass: false },
    { x: cx - rx * 0.75, y: cy + ry * 0.7, r: 2.3, grass: false },
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = (c - cx) / rx;
      const ny = (r - cy) / ry;
      let d = nx * nx + ny * ny;
      d += (noise2D(c * 0.15 + 5.7, r * 0.15 + 3.3) - 0.5) * 0.25;

      let dirt = d < 1.0;
      for (const l of lobes) {
        const ldx = c - l.x;
        const ldy = r - l.y;
        if (ldx * ldx + ldy * ldy < l.r * l.r) {
          dirt = !l.grass;
        }
      }
      map[r * cols + c] = dirt ? 0 : 1;
    }
  }

  const copy = new Uint8Array(map);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (copy[r * cols + c] !== 1) continue;
      let dirtCardinal = 0;
      let dirtDiag = 0;
      if (r > 0 && copy[(r - 1) * cols + c] === 0) dirtCardinal++;
      if (r < rows - 1 && copy[(r + 1) * cols + c] === 0) dirtCardinal++;
      if (c > 0 && copy[r * cols + c - 1] === 0) dirtCardinal++;
      if (c < cols - 1 && copy[r * cols + c + 1] === 0) dirtCardinal++;
      if (r > 0 && c > 0 && copy[(r - 1) * cols + c - 1] === 0) dirtDiag++;
      if (r > 0 && c < cols - 1 && copy[(r - 1) * cols + c + 1] === 0) dirtDiag++;
      if (r < rows - 1 && c > 0 && copy[(r + 1) * cols + c - 1] === 0) dirtDiag++;
      if (r < rows - 1 && c < cols - 1 && copy[(r + 1) * cols + c + 1] === 0) dirtDiag++;
      if (dirtCardinal >= 2 && dirtDiag >= 1) {
        map[r * cols + c] = 0;
      }
    }
  }

  return map;
}

function isG(map, c, r, cols, rows) {
  if (c < 0 || c >= cols || r < 0 || r >= rows) return true;
  return map[r * cols + c] === 1;
}

function hasDirtNeighbor(map, c, r, cols, rows) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (!isG(map, c + dx, r + dy, cols, rows)) return true;
    }
  }
  return false;
}

function hasGrassNeighbor(map, c, r, cols, rows) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (isG(map, c + dx, r + dy, cols, rows)) return true;
    }
  }
  return false;
}

function renderGrassBorder(ctx, ox, oy, col, row, map, cols, rows) {
  const n = !isG(map, col, row - 1, cols, rows);
  const s = !isG(map, col, row + 1, cols, rows);
  const w = !isG(map, col - 1, row, cols, rows);
  const e = !isG(map, col + 1, row, cols, rows);

  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      let dist = 20;
      if (n) dist = Math.min(dist, y);
      if (s) dist = Math.min(dist, 15 - y);
      if (w) dist = Math.min(dist, x);
      if (e) dist = Math.min(dist, 15 - x);

      if (n && w) dist = Math.min(dist, Math.sqrt(x * x + y * y) * 0.75);
      if (n && e) dist = Math.min(dist, Math.sqrt((15 - x) * (15 - x) + y * y) * 0.75);
      if (s && w) dist = Math.min(dist, Math.sqrt(x * x + (15 - y) * (15 - y)) * 0.75);
      if (s && e) dist = Math.min(dist, Math.sqrt((15 - x) * (15 - x) + (15 - y) * (15 - y)) * 0.75);

      const skipF = ((col + row * 7) % 10) >= 8;
      const fW = skipF ? 0 : (hash2D(col * 53 + 301, row * 59 + 401) < 0.5 ? 1 : 2);

      let color;
      if (dist >= 6) {
        color = grassPx(x, y);
      } else if (dist >= 4) {
        color = (x + y) % 2 === 0 ? grassPx(x, y) : DP[0];
      } else if (dist >= fW) {
        color = dirtPx(x, y, tileVar(col, row, 3));
      } else if (fW > 0) {
        color = (x + y) % 2 === 0 ? FP[0] : FP[1];
      } else {
        color = dirtPx(x, y, tileVar(col, row, 3));
      }

      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

function renderDirtBorder(ctx, ox, oy, col, row, map, cols, rows) {
  const dirtTiles = getDirtTiles();
  ctx.drawImage(dirtTiles[tileVar(col, row, dirtTiles.length)], ox, oy);

  const gN = isG(map, col, row - 1, cols, rows);
  const gS = isG(map, col, row + 1, cols, rows);
  const gW = isG(map, col - 1, row, cols, rows);
  const gE = isG(map, col + 1, row, cols, rows);
  const gNW = isG(map, col - 1, row - 1, cols, rows);
  const gNE = isG(map, col + 1, row - 1, cols, rows);
  const gSW = isG(map, col - 1, row + 1, cols, rows);
  const gSE = isG(map, col + 1, row + 1, cols, rows);

  const skipFringe = ((col + row * 7) % 10) >= 8;
  const fringeW = skipFringe ? 0 : (hash2D(col * 53 + 301, row * 59 + 401) < 0.5 ? 1 : 2);

  if (gN && fringeW > 0) {
    for (let x = 0; x < T; x++) {
      ctx.fillStyle = (x + 0) % 2 === 0 ? FP[0] : FP[1];
      ctx.fillRect(ox + x, oy, 1, 1);
      if (fringeW === 2) {
        ctx.fillStyle = (x + 1) % 2 === 0 ? FP[1] : DP[0];
        ctx.fillRect(ox + x, oy + 1, 1, 1);
      }
    }
  }
  if (gS && fringeW > 0) {
    for (let x = 0; x < T; x++) {
      ctx.fillStyle = (x + 0) % 2 === 0 ? FP[0] : FP[1];
      ctx.fillRect(ox + x, oy + 15, 1, 1);
      if (fringeW === 2) {
        ctx.fillStyle = (x + 1) % 2 === 0 ? FP[1] : DP[0];
        ctx.fillRect(ox + x, oy + 14, 1, 1);
      }
    }
  }
  if (gW && fringeW > 0) {
    for (let y = 0; y < T; y++) {
      ctx.fillStyle = (y + 0) % 2 === 0 ? FP[0] : FP[1];
      ctx.fillRect(ox, oy + y, 1, 1);
      if (fringeW === 2) {
        ctx.fillStyle = (y + 1) % 2 === 0 ? FP[1] : DP[0];
        ctx.fillRect(ox + 1, oy + y, 1, 1);
      }
    }
  }
  if (gE && fringeW > 0) {
    for (let y = 0; y < T; y++) {
      ctx.fillStyle = (y + 0) % 2 === 0 ? FP[0] : FP[1];
      ctx.fillRect(ox + 15, oy + y, 1, 1);
      if (fringeW === 2) {
        ctx.fillStyle = (y + 1) % 2 === 0 ? FP[1] : DP[0];
        ctx.fillRect(ox + 14, oy + y, 1, 1);
      }
    }
  }

  if (gN && gW && !gNW) {
    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        if (dx + dy <= 3) {
          ctx.fillStyle = grassPx(dx, dy);
          ctx.fillRect(ox + dx, oy + dy, 1, 1);
        }
      }
    }
  }
  if (gN && gE && !gNE) {
    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        if (dx + dy <= 3) {
          ctx.fillStyle = grassPx(15 - dx, dy);
          ctx.fillRect(ox + 15 - dx, oy + dy, 1, 1);
        }
      }
    }
  }
  if (gS && gW && !gSW) {
    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        if (dx + dy <= 3) {
          ctx.fillStyle = grassPx(dx, 15 - dy);
          ctx.fillRect(ox + dx, oy + 15 - dy, 1, 1);
        }
      }
    }
  }
  if (gS && gE && !gSE) {
    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        if (dx + dy <= 3) {
          ctx.fillStyle = grassPx(15 - dx, 15 - dy);
          ctx.fillRect(ox + 15 - dx, oy + 15 - dy, 1, 1);
        }
      }
    }
  }
}

function drawGrassTufts(ctx, map, cols, rows) {
  for (let i = 0; i < 40; i++) {
    const col = Math.floor(hash2D(i * 3 + 811, i * 7 + 913) * cols);
    const row = Math.floor(hash2D(i * 11 + 1017, i * 13 + 1119) * rows);
    if (isG(map, col, row, cols, rows)) continue;
    if (!hasGrassNeighbor(map, col, row, cols, rows)) continue;
    if (hash2D(i * 19 + 1221, i * 23 + 1323) > 0.6) continue;

    const px = col * T + Math.floor(hash2D(i * 29, i * 31) * 10);
    const py = row * T + Math.floor(hash2D(i * 37, i * 41) * 10);

    ctx.fillStyle = GP[1];
    ctx.fillRect(px, py, 3, 2);
    ctx.fillRect(px + 1, py + 2, 2, 1);
    ctx.fillStyle = GP[3];
    ctx.fillRect(px + 1, py, 1, 1);
  }
}

function drawBackground(ctx, width, height) {
  const cols = Math.ceil(width / T);
  const rows = Math.ceil(height / T);
  const map = buildGrassMap(cols, rows);
  const grassTiles = getGrassTiles();
  const dirtTiles = getDirtTiles();
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = col * T;
      const py = row * T;
      const grass = isG(map, col, row, cols, rows);

      if (grass && !hasDirtNeighbor(map, col, row, cols, rows)) {
        ctx.drawImage(grassTiles[tileVar(col, row, grassTiles.length)], px, py);
      } else if (!grass && !hasGrassNeighbor(map, col, row, cols, rows)) {
        ctx.drawImage(dirtTiles[tileVar(col, row, dirtTiles.length)], px, py);
      } else if (grass) {
        renderGrassBorder(ctx, px, py, col, row, map, cols, rows);
      } else {
        renderDirtBorder(ctx, px, py, col, row, map, cols, rows);
      }
    }
  }

  drawGrassTufts(ctx, map, cols, rows);
}

function getView() {
  const view = document.getElementById(VIEW_ID);

  if (!view) {
    throw new Error("Game view is missing.");
  }

  return view;
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
  const view = getView();
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

  const view = getView();
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
  const view = getView();

  view.addEventListener("pointermove", (event) => {
    state.preview.clientX = event.clientX;
    state.preview.clientY = event.clientY;
    state.preview.isPointerActive = true;
    updatePlacementPreview(event.clientX, event.clientY);
  });

  view.addEventListener("pointerleave", () => {
    state.preview.isPointerActive = false;
    hidePlacementPreview();
  });

  view.addEventListener("click", (event) => {
    state.preview.clientX = event.clientX;
    state.preview.clientY = event.clientY;

    if (placeObject(event.clientX, event.clientY)) {
      state.preview.isPointerActive = false;
      hidePlacementPreview();
      return;
    }

    state.preview.isPointerActive = true;
    updatePlacementPreview(event.clientX, event.clientY);
  });
}

function createFarmerElement() {
  const { placementLayer } = getUIRefs();
  const el = document.createElement("div");
  el.className = "farmer-character";
  el.setAttribute("aria-label", "Farmer");

  el.style.width = `${FARMER_DISPLAY_W}px`;
  el.style.height = `${FARMER_DISPLAY_H}px`;
  el.style.backgroundImage = `url(${farmerState.spriteUrl})`;
  el.style.backgroundSize = `${FARMER_DISPLAY_W * 4}px ${FARMER_DISPLAY_H * 4}px`;
  el.style.backgroundRepeat = "no-repeat";
  
  placementLayer.appendChild(el);
  farmerState.element = el;
}

function initFarmer() {
  const view = getView();
  const bounds = view.getBoundingClientRect();
  farmerState.x = bounds.width / 2;
  farmerState.y = bounds.height / 2;
  createFarmerElement();
  updateFarmerPosition();
  farmerState.initialized = true;
}

function updateFarmerPosition() {
  if (!farmerState.element) return;
  farmerState.element.style.left = `${farmerState.x}px`;
  farmerState.element.style.top = `${farmerState.y}px`;

  const bgX = -(farmerState.frame * FARMER_DISPLAY_W);
  const bgY = -(farmerState.direction * FARMER_DISPLAY_H);
  farmerState.element.style.backgroundPosition = `${bgX}px ${bgY}px`;
}

function getFarmerFootprint(cx, cy) {
  const halfW = FARMER_HITBOX_W / 2;
  const halfH = FARMER_HITBOX_H / 2;
  const bottomY = cy + FARMER_DISPLAY_H / 2;
  return {
    left: cx - halfW,
    right: cx + halfW,
    top: bottomY - FARMER_HITBOX_H,
    bottom: bottomY,
  };
}

function farmerCollidesWithPlacements(cx, cy) {
  const fp = getFarmerFootprint(cx, cy);
  return state.placements.some((p) => {
    const pf = getPlacementFootprint(p.x, p.y, p.width, p.height);
    return !(
      fp.right <= pf.left ||
      fp.left >= pf.right ||
      fp.bottom <= pf.top ||
      fp.top >= pf.bottom
    );
  });
}

function updateFarmerMovement() {
  if (!farmerState.initialized) return;

  const { keys } = farmerState;
  let dx = 0;
  let dy = 0;
  if (keys["ArrowLeft"] || keys["a"]) dx -= 1;
  if (keys["ArrowRight"] || keys["d"]) dx += 1;
  if (keys["ArrowUp"] || keys["w"]) dy -= 1;
  if (keys["ArrowDown"] || keys["s"]) dy += 1;

  farmerState.isMoving = dx !== 0 || dy !== 0;

  if (farmerState.isMoving) {
    // Determine direction
    // Sprout Lands format: 0=Down, 1=Up, 2=Left, 3=Right
    if (dy > 0) farmerState.direction = 0;
    else if (dy < 0) farmerState.direction = 1;
    else if (dx < 0) farmerState.direction = 2;
    else if (dx > 0) farmerState.direction = 3;

    farmerState.animTimer += 1;
    if (farmerState.animTimer > 8) {
      farmerState.animTimer = 0;
      farmerState.frame = (farmerState.frame + 1) % 4;
    }
  } else {
    farmerState.frame = 0;
    farmerState.animTimer = 0;
  }

  if (dx === 0 && dy === 0) {
    updateFarmerPosition();
    return;
  }

  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.SQRT2;
    dx *= inv;
    dy *= inv;
  }

  const nextX = farmerState.x + dx * FARMER_SPEED;
  const nextY = farmerState.y + dy * FARMER_SPEED;

  const view = getView();
  const bounds = view.getBoundingClientRect();
  const halfW = FARMER_DISPLAY_W / 2;
  const halfH = FARMER_DISPLAY_H / 2;

  const clampedX = Math.max(halfW, Math.min(bounds.width - halfW, nextX));
  const clampedY = Math.max(halfH, Math.min(bounds.height - halfH, nextY));

  if (!farmerCollidesWithPlacements(clampedX, clampedY)) {
    farmerState.x = clampedX;
    farmerState.y = clampedY;
  } else if (!farmerCollidesWithPlacements(clampedX, farmerState.y)) {
    farmerState.x = clampedX;
  } else if (!farmerCollidesWithPlacements(farmerState.x, clampedY)) {
    farmerState.y = clampedY;
  }

  updateFarmerPosition();
}

function setupFarmerInput() {
  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "w", "s", "d"].includes(e.key)) {
      e.preventDefault();
      farmerState.keys[e.key] = true;
    }
  });
  window.addEventListener("keyup", (e) => {
    farmerState.keys[e.key] = false;
  });
}

let _gameLoopRunning = false;
function startGameLoop() {
  if (_gameLoopRunning) return;
  _gameLoopRunning = true;
  function tick() {
    updateFarmerMovement();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function resizeAndRender() {
  const view = getView();
  const canvas = document.getElementById(BACKGROUND_ID);
  if (!canvas) return;

  const bounds = view.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

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
  initFarmer();
  setupFarmerInput();
  startGameLoop();
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById(VIEW_ID)) {
      init();
    }
  });
}

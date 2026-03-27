const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TOOLBAR_ID = "toolbar-buttons";
const PLACEMENT_LAYER_ID = "placement-layer";
const PLACE_GRID_SIZE = 12;
const PLACED_OBJECT_SIZE = 40;
const SKY_HEIGHT_RATIO = 0.36;

const FARM_OBJECTS = [
  { id: "barn", label: "Barn", imageSrc: "./src/assets/sprites/barn.png" },
  { id: "fence", label: "Fence", imageSrc: "./src/assets/sprites/fence.png" },
  { id: "hay-bale", label: "Hay Bale", imageSrc: "./src/assets/sprites/hay-bale.png" },
  { id: "cow", label: "Cow", imageSrc: "./src/assets/sprites/cow.png" },
  { id: "chicken", label: "Chicken", imageSrc: "./src/assets/sprites/chicken.png" },
  { id: "apple-tree", label: "Apple Tree", imageSrc: "./src/assets/sprites/apple-tree.png" },
];

const state = {
  activeObjectId: FARM_OBJECTS[0].id,
  placements: [],
  preview: {
    clientX: 0,
    clientY: 0,
    isPointerActive: false,
  },
};
let activePlacementDrag = null;
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

function getFarmTop(height) {
  return Math.round(height * SKY_HEIGHT_RATIO);
}

function drawBackground(ctx, width, height) {
  const farmTop = getFarmTop(height);
  const skyGradient = ctx.createLinearGradient(0, 0, 0, farmTop);
  skyGradient.addColorStop(0, "#78c6ff");
  skyGradient.addColorStop(1, "#d9f4ff");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, farmTop);
  ctx.fillStyle = "#d8e9a0";
  ctx.fillRect(0, Math.max(0, farmTop - 8), width, 8);

  const tiles = getGrassTiles();
  const cols = Math.ceil(width / TILE_DRAW_SIZE);
  const rows = Math.ceil(height / TILE_DRAW_SIZE);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, farmTop, width, Math.max(0, height - farmTop));
  ctx.clip();

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

  ctx.restore();
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
  objectEl.setAttribute("aria-label", `${placement.label} placed`);
  
  const img = document.createElement("img");
  img.src = placement.imageSrc;
  img.alt = "";
  img.draggable = false;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  img.style.imageRendering = "pixelated";
  
  objectEl.appendChild(img);
  placement.element = objectEl;
  objectEl.addEventListener("pointerdown", (event) =>
    startPlacementDrag(placement, objectEl, event),
  );
  objectEl.addEventListener("pointermove", handlePlacementDragMove);
  objectEl.addEventListener("pointerup", endPlacementDrag);
  objectEl.addEventListener("pointercancel", endPlacementDrag);
  objectEl.addEventListener("lostpointercapture", endPlacementDrag);
  updatePlacedObjectPosition(placement);
  placementLayer.appendChild(objectEl);
}

function ensurePreviewObject() {
  const { placementLayer } = getUIRefs();
  let previewEl = placementLayer.querySelector(".placement-preview");

  if (!previewEl) {
    previewEl = document.createElement("div");
    previewEl.className = "placed-object placement-preview";
    previewEl.setAttribute("aria-hidden", "true");

    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    img.style.imageRendering = "pixelated";

    previewEl.appendChild(img);
    placementLayer.appendChild(previewEl);
  }

  return previewEl;
}

function syncPreviewObject() {
  const activeObject = getObjectById(state.activeObjectId);
  const previewEl = ensurePreviewObject();
  const img = previewEl.querySelector("img");

  if (!activeObject || !img) {
    return;
  }

  img.src = activeObject.imageSrc;
}

function hidePlacementPreview() {
  const previewEl = ensurePreviewObject();
  previewEl.classList.remove("is-visible", "is-blocked");
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

function updatePlacedObjectPosition(placement, x = placement.x, y = placement.y) {
  if (!placement.element) {
    return;
  }

  placement.element.style.left = `${x}px`;
  placement.element.style.top = `${y}px`;
}

function overlapsExistingPlacement(centerX, centerY, ignoredPlacement = null) {
  const nextFootprint = getPlacementFootprint(centerX, centerY);

  return state.placements.some((placement) => {
    if (placement === ignoredPlacement) {
      return false;
    }

    const existingFootprint = getPlacementFootprint(placement.x, placement.y);
    return !(
      nextFootprint.right <= existingFootprint.left ||
      nextFootprint.left >= existingFootprint.right ||
      nextFootprint.bottom <= existingFootprint.top ||
      nextFootprint.top >= existingFootprint.bottom
    );
  });
}

function getSnappedPlacement(clientX, clientY, offsetX = 0, offsetY = 0) {
  const { view } = getViewAndCanvas();
  const bounds = view.getBoundingClientRect();
  const relativeX = clientX - bounds.left - offsetX;
  const relativeY = clientY - bounds.top - offsetY;
  const snappedX = Math.round(relativeX / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  const snappedY = Math.round(relativeY / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  const halfSize = PLACED_OBJECT_SIZE / 2;
  const farmTop = getFarmTop(bounds.height);
  const isInsideBounds =
    snappedX >= halfSize &&
    snappedX <= bounds.width - halfSize &&
    snappedY >= halfSize &&
    snappedY <= bounds.height - halfSize;
  const isInFarmArea = snappedY >= farmTop + halfSize;

  return {
    x: snappedX,
    y: snappedY,
    isInsideBounds,
    isInFarmArea,
    isPlaceable: isInsideBounds && isInFarmArea,
  };
}

function updatePlacementPreview(clientX, clientY) {
  const activeObject = getObjectById(state.activeObjectId);
  if (!activeObject) {
    hidePlacementPreview();
    return;
  }

  const previewEl = ensurePreviewObject();
  const placement = getSnappedPlacement(clientX, clientY);
  const isBlocked =
    placement.isPlaceable && overlapsExistingPlacement(placement.x, placement.y);

  previewEl.style.left = `${placement.x}px`;
  previewEl.style.top = `${placement.y}px`;
  previewEl.classList.toggle("is-visible", placement.isPlaceable);
  previewEl.classList.toggle("is-blocked", isBlocked);
}

function placeObject(clientX, clientY) {
  const activeObject = getObjectById(state.activeObjectId);
  if (!activeObject) {
    return false;
  }

  const placement = getSnappedPlacement(clientX, clientY);
  if (!placement.isPlaceable) {
    return false;
  }

  if (overlapsExistingPlacement(placement.x, placement.y)) {
    return false;
  }

  const placedObject = {
    id: activeObject.id,
    label: activeObject.label,
    imageSrc: activeObject.imageSrc,
    x: placement.x,
    y: placement.y,
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
    placeObject(event.clientX, event.clientY);
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

function init() {
  renderToolbar();
  syncPreviewObject();
  setActiveObject(state.activeObjectId);
  setupPlacementInput();
  resizeAndRender();
  window.addEventListener("resize", resizeAndRender);
}

window.addEventListener("DOMContentLoaded", init);

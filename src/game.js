const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TOOLBAR_ID = "toolbar-buttons";
const PLACEMENT_LAYER_ID = "placement-layer";
const PLACE_GRID_SIZE = 12;
const PLACED_OBJECT_BASE_SIZE = 40;
const PLACED_OBJECT_SCALE_UP = 2;
const SKY_HEIGHT_RATIO = 0.34;
const PATH_BAND_HEIGHT = 12;
const PATH_STEP = 6;
const DIRT_PALETTE = ["#7f5a2f", "#9d7240", "#b88649", "#d7a55a"];
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
    element: null,
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

function snapToPixelStep(value, step = PATH_STEP) {
  return Math.round(value / step) * step;
}

function getPathMetrics(y, width, height, farmTop) {
  const depth = Math.max(0, (y - farmTop) / Math.max(1, height - farmTop));
  const sway =
    Math.sin(depth * Math.PI * 1.2 + 0.3) * width * 0.05 +
    Math.sin(depth * Math.PI * 3.7 + 1.1) * width * 0.018 +
    (hash2D(Math.floor(depth * 22), 13) - 0.5) * 14;
  const centerX = snapToPixelStep(width * 0.5 + sway);
  const halfWidth = snapToPixelStep(
    width * (0.058 + depth * 0.05) +
      Math.sin(depth * Math.PI * 2.4 + 0.7) * 10 +
      hash2D(Math.floor(depth * 28), 41) * 10,
  );

  return {
    centerX,
    halfWidth: Math.max(PATH_STEP * 4, halfWidth),
  };
}

function drawDirtPath(ctx, width, height, farmTop) {
  const farmHeight = Math.max(0, height - farmTop);

  if (farmHeight <= 0) {
    return;
  }

  for (let y = farmTop; y < height; y += PATH_BAND_HEIGHT) {
    const bandCenterY = y + PATH_BAND_HEIGHT / 2;
    const bandIndex = Math.floor((y - farmTop) / PATH_BAND_HEIGHT);
    const { centerX, halfWidth } = getPathMetrics(bandCenterY, width, height, farmTop);
    const leftEdge = Math.max(0, centerX - halfWidth);
    const rightEdge = Math.min(width, centerX + halfWidth);
    const pathWidth = Math.max(0, rightEdge - leftEdge);

    if (pathWidth <= 0) {
      continue;
    }

    const innerInset = PATH_STEP * 2;
    const innerWidth = Math.max(0, pathWidth - innerInset * 2);
    const highlightWidth = Math.max(PATH_STEP * 2, Math.floor(innerWidth * 0.4 / PATH_STEP) * PATH_STEP);
    const highlightX = snapToPixelStep(centerX - highlightWidth / 2);
    const leftShoulder = Math.max(0, leftEdge - PATH_STEP);
    const rightShoulder = Math.min(width, rightEdge + PATH_STEP);
    const grassDepth = (bandCenterY - farmTop) / farmHeight;

    ctx.fillStyle = bandIndex % 2 === 0 ? GRASS_PALETTE[2] : GRASS_PALETTE[1];
    ctx.fillRect(leftShoulder, y, PATH_STEP, PATH_BAND_HEIGHT);
    ctx.fillRect(rightEdge, y, PATH_STEP, PATH_BAND_HEIGHT);

    ctx.fillStyle = bandIndex % 3 === 0 ? DIRT_PALETTE[0] : DIRT_PALETTE[1];
    ctx.fillRect(leftEdge, y, pathWidth, PATH_BAND_HEIGHT);

    ctx.fillStyle = DIRT_PALETTE[2];
    ctx.fillRect(leftEdge + innerInset, y, innerWidth, PATH_BAND_HEIGHT);

    if (bandIndex % 3 !== 1) {
      ctx.fillStyle = DIRT_PALETTE[3];
      ctx.fillRect(highlightX, y, highlightWidth, PATH_STEP);
    }

    ctx.fillStyle = DIRT_PALETTE[0];
    ctx.fillRect(leftEdge, y, PATH_STEP, PATH_BAND_HEIGHT);
    ctx.fillRect(rightEdge - PATH_STEP, y, PATH_STEP, PATH_BAND_HEIGHT);

    const edgeTuftColor = grassDepth > 0.5 ? GRASS_PALETTE[4] : GRASS_PALETTE[3];
    ctx.fillStyle = edgeTuftColor;

    if (hash2D(bandIndex, 5) > 0.32) {
      ctx.fillRect(leftEdge, y + PATH_STEP, PATH_STEP, PATH_STEP);
    }

    if (hash2D(bandIndex, 9) > 0.4) {
      ctx.fillRect(rightEdge - PATH_STEP, y, PATH_STEP, PATH_STEP);
    }

    if (hash2D(bandIndex, 15) > 0.7) {
      ctx.fillRect(leftShoulder, y, PATH_STEP, PATH_STEP);
    }

    if (hash2D(bandIndex, 21) > 0.66) {
      ctx.fillRect(rightEdge, y + PATH_STEP, PATH_STEP, PATH_STEP);
    }
  }
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

  drawDirtPath(ctx, width, height, farmTop);

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
  if (objectId == null) {
    state.activeObjectId = null;
    updateActiveUI();
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
  const img = document.createElement("img");
  img.src = placement.imageSrc;
  img.alt = "";
  img.draggable = false;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  img.style.imageRendering = "pixelated";

  objectEl.appendChild(img);
  objectEl.setAttribute("aria-label", `${placement.label} placed`);
  objectEl.style.left = `${placement.x}px`;
  objectEl.style.top = `${placement.y}px`;
  objectEl.style.width = `${placement.width}px`;
  objectEl.style.height = `${placement.height}px`;
  objectEl.addEventListener("pointerdown", (event) => {
    startPlacementDrag(placement, objectEl, event);
  });
  objectEl.addEventListener("pointermove", handlePlacementDragMove);
  objectEl.addEventListener("pointerup", endPlacementDrag);
  objectEl.addEventListener("pointercancel", endPlacementDrag);
  placementLayer.appendChild(objectEl);
  placement.objectEl = objectEl;
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
  ignoredPlacement = null,
) {
  const nextFootprint = getPlacementFootprint(centerX, centerY, width, height);

  return state.placements.some((placement) => {
    if (placement === ignoredPlacement) {
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

function getSnappedPosition(clientX, clientY, offsetX = 0, offsetY = 0) {
  const { view } = getViewAndCanvas();
  const bounds = view.getBoundingClientRect();
  const relativeX = clientX - bounds.left - offsetX;
  const relativeY = clientY - bounds.top - offsetY;

  return {
    x: Math.round(relativeX / PLACE_GRID_SIZE) * PLACE_GRID_SIZE,
    y: Math.round(relativeY / PLACE_GRID_SIZE) * PLACE_GRID_SIZE,
    bounds,
  };
}

function getSnappedPlacement(clientX, clientY, width, height) {
  const { x: snappedX, y: snappedY, bounds } = getSnappedPosition(clientX, clientY);
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

function updatePlacedObjectPosition(
  placement,
  nextX = placement.x,
  nextY = placement.y,
) {
  if (!placement.objectEl) {
    return;
  }

  placement.objectEl.style.left = `${nextX}px`;
  placement.objectEl.style.top = `${nextY}px`;
}

function ensurePreviewObject() {
  const activeObject = getObjectById(state.activeObjectId);

  if (!activeObject) {
    return null;
  }

  if (state.preview.element?.isConnected) {
    return state.preview.element;
  }

  const { placementLayer } = getUIRefs();
  const previewEl = document.createElement("div");
  const img = document.createElement("img");

  previewEl.className = "placed-object placement-preview";
  previewEl.setAttribute("aria-hidden", "true");
  img.alt = "";
  img.draggable = false;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  img.style.imageRendering = "pixelated";
  previewEl.appendChild(img);
  placementLayer.appendChild(previewEl);
  state.preview.element = previewEl;

  return previewEl;
}

function hidePlacementPreview() {
  if (!state.preview.element) {
    return;
  }

  state.preview.element.classList.remove("is-visible", "is-blocked");
}

function syncPreviewObject() {
  const activeObject = getObjectById(state.activeObjectId);

  if (!activeObject) {
    state.preview.element?.remove();
    state.preview.element = null;
    return;
  }

  const previewEl = ensurePreviewObject();
  if (!previewEl) {
    return;
  }

  const img = previewEl.querySelector("img");
  if (img instanceof HTMLImageElement) {
    img.src = activeObject.imageSrc;
  }

  previewEl.style.width = `${activeObject.placedWidth}px`;
  previewEl.style.height = `${activeObject.placedHeight}px`;
  hidePlacementPreview();
}

function updatePlacementPreview(clientX, clientY) {
  const activeObject = getObjectById(state.activeObjectId);
  if (!activeObject) {
    hidePlacementPreview();
    return;
  }

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
  previewEl.classList.toggle("is-blocked", placement.isInsideBounds && isBlocked);
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
  );
  const pointerPosition = getSnappedPosition(
    event.clientX,
    event.clientY,
    activePlacementDrag.offsetX,
    activePlacementDrag.offsetY,
  );

  activePlacementDrag.previewX = pointerPosition.x;
  activePlacementDrag.previewY = pointerPosition.y;
  activePlacementDrag.isValidDrop =
    pointerPosition.x >= activePlacementDrag.placement.width / 2 &&
    pointerPosition.x <=
      activePlacementDrag.objectEl.parentElement.getBoundingClientRect().width -
        activePlacementDrag.placement.width / 2 &&
    pointerPosition.y >= activePlacementDrag.placement.height / 2 &&
    pointerPosition.y <=
      activePlacementDrag.objectEl.parentElement.getBoundingClientRect().height -
        activePlacementDrag.placement.height / 2 &&
    !overlapsExistingPlacement(
      pointerPosition.x,
      pointerPosition.y,
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
    pointerPosition.x,
    pointerPosition.y,
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

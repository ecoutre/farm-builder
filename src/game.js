const VIEW_ID = "game-view";
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

function handleResize() {
  if (state.preview.isPointerActive) {
    updatePlacementPreview(state.preview.clientX, state.preview.clientY);
  }
}

export function init() {
  renderToolbar();
  syncPreviewObject();
  setActiveObject(state.activeObjectId);
  setupPlacementInput();
  handleResize();
  window.addEventListener("resize", handleResize);
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById(VIEW_ID)) {
      init();
    }
  });
}

const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TOOLBAR_ID = "toolbar-buttons";
const ACTIVE_OBJECT_LABEL_ID = "active-object-label";
const PLACEMENT_LAYER_ID = "placement-layer";

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
};

function getViewAndCanvas() {
  const view = document.getElementById(VIEW_ID);
  const canvas = document.getElementById(BACKGROUND_ID);

  if (!view || !canvas) {
    throw new Error("Game view or background canvas is missing.");
  }

  return { view, canvas };
}

function drawBackground(ctx, width, height) {
  // Base green field layer.
  ctx.fillStyle = "#8ac967";
  ctx.fillRect(0, 0, width, height);
}

function getUIRefs() {
  const toolbarButtons = document.getElementById(TOOLBAR_ID);
  const activeObjectLabel = document.getElementById(ACTIVE_OBJECT_LABEL_ID);
  const placementLayer = document.getElementById(PLACEMENT_LAYER_ID);

  if (!toolbarButtons || !activeObjectLabel || !placementLayer) {
    throw new Error("Toolbar or placement UI is missing.");
  }

  return { toolbarButtons, activeObjectLabel, placementLayer };
}

function getObjectById(objectId) {
  return FARM_OBJECTS.find((farmObject) => farmObject.id === objectId);
}

function updateActiveUI() {
  const { toolbarButtons, activeObjectLabel } = getUIRefs();
  const activeObject = getObjectById(state.activeObjectId);

  Array.from(toolbarButtons.querySelectorAll(".farm-object-button")).forEach(
    (button) => {
      const isActive = button.dataset.objectId === state.activeObjectId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    },
  );

  activeObjectLabel.textContent = activeObject
    ? `Active: ${activeObject.label}`
    : "Active: None";
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
    const button = document.createElement("button");
    button.type = "button";
    button.className = "farm-object-button";
    button.dataset.objectId = farmObject.id;
    button.setAttribute("aria-label", `Select ${farmObject.label}`);
    button.innerHTML = `
      <span class="farm-object-button__icon" aria-hidden="true">${farmObject.icon}</span>
      <span class="farm-object-button__label">${farmObject.label}</span>
    `;
    button.addEventListener("click", () => setActiveObject(farmObject.id));
    toolbarButtons.appendChild(button);
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
  objectEl.textContent = activeObject.icon;
  objectEl.setAttribute("aria-label", `${activeObject.label} placed`);
  objectEl.style.left = `${Math.round(clientX - bounds.left)}px`;
  objectEl.style.top = `${Math.round(clientY - bounds.top)}px`;
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
  const { width, height } = view.getBoundingClientRect();
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
  drawBackground(ctx, width, height);
}

function init() {
  renderToolbar();
  setupPlacementInput();
  resizeAndRender();
  window.addEventListener("resize", resizeAndRender);
}

window.addEventListener("DOMContentLoaded", init);

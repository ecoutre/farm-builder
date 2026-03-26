const farmElement = document.getElementById("farm");
const toolbarElement = document.getElementById("toolbar");
const statusElement = document.getElementById("status");

const OBJECTS = {
  tree: { label: "Tree", width: 48, height: 48 },
  barn: { label: "Barn", width: 96, height: 72 },
  plot: { label: "Plot", width: 80, height: 56 },
};

let selectedObjectId = null;
const placedObjects = [];

function setStatus(message) {
  statusElement.textContent = message;
}

function selectToolbarObject(objectId) {
  if (!OBJECTS[objectId]) {
    return;
  }

  selectedObjectId = objectId;

  const buttons = toolbarElement.querySelectorAll(".toolbar-button");
  for (const button of buttons) {
    button.classList.toggle("is-selected", button.dataset.objectId === objectId);
  }

  setStatus(`Selected ${OBJECTS[objectId].label}. Click the farm to place it.`);
}

function getPlacementFromClick(event, definition) {
  const farmRect = farmElement.getBoundingClientRect();
  const clickX = event.clientX - farmRect.left;
  const clickY = event.clientY - farmRect.top;

  // Place objects centered around click.
  let left = clickX - definition.width / 2;
  let top = clickY - definition.height / 2;

  return { left, top };
}

function isWithinFarmBounds(candidateRect) {
  return (
    candidateRect.left >= 0 &&
    candidateRect.top >= 0 &&
    candidateRect.left + candidateRect.width <= farmElement.clientWidth &&
    candidateRect.top + candidateRect.height <= farmElement.clientHeight
  );
}

function isOverlapping(candidateRect) {
  return placedObjects.some((existingRect) => {
    return !(
      candidateRect.left + candidateRect.width <= existingRect.left ||
      existingRect.left + existingRect.width <= candidateRect.left ||
      candidateRect.top + candidateRect.height <= existingRect.top ||
      existingRect.top + existingRect.height <= candidateRect.top
    );
  });
}

function placeObject(event) {
  if (!selectedObjectId) {
    setStatus("Select an object from the toolbar first.");
    return;
  }

  const definition = OBJECTS[selectedObjectId];
  const basePlacement = getPlacementFromClick(event, definition);

  const candidateRect = {
    left: Math.round(basePlacement.left),
    top: Math.round(basePlacement.top),
    width: definition.width,
    height: definition.height,
    objectId: selectedObjectId,
  };

  if (!isWithinFarmBounds(candidateRect)) {
    setStatus("Cannot place object outside the farm area.");
    return;
  }

  if (isOverlapping(candidateRect)) {
    setStatus("Cannot place object on top of another object.");
    return;
  }

  const objectEl = document.createElement("div");
  objectEl.className = `placed-object placed-object--${selectedObjectId}`;
  objectEl.style.left = `${candidateRect.left}px`;
  objectEl.style.top = `${candidateRect.top}px`;
  objectEl.style.width = `${candidateRect.width}px`;
  objectEl.style.height = `${candidateRect.height}px`;
  objectEl.textContent = definition.label;

  farmElement.appendChild(objectEl);
  placedObjects.push(candidateRect);

  setStatus(`${definition.label} placed at (${candidateRect.left}, ${candidateRect.top}).`);
}

toolbarElement.addEventListener("click", (event) => {
  const button = event.target.closest(".toolbar-button");
  if (!button) {
    return;
  }

  selectToolbarObject(button.dataset.objectId);
});

farmElement.addEventListener("click", placeObject);

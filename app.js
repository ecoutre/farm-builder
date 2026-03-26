const objectDefinitions = {
  fence: { src: "./assets/objects/fence.svg", size: 64 },
  barn: { src: "./assets/objects/barn.svg", size: 128 },
  "hay-bale": { src: "./assets/objects/hay-bale.svg", size: 76 },
  cow: { src: "./assets/objects/cow.svg", size: 98 },
  chicken: { src: "./assets/objects/chicken.svg", size: 72 },
  "apple-tree": { src: "./assets/objects/apple-tree.svg", size: 132 },
};

const canvas = document.querySelector("#farm-canvas");
const context = canvas.getContext("2d");
const pickerButtons = [...document.querySelectorAll(".object-button")];

const placedObjects = [];
let selectedObject = "fence";

const loadedImages = Object.fromEntries(
  Object.entries(objectDefinitions).map(([key, definition]) => {
    const image = new Image();
    image.src = definition.src;
    return [key, image];
  })
);

function drawBackdrop() {
  const width = canvas.width;
  const height = canvas.height;

  context.fillStyle = "#bfe5ff";
  context.fillRect(0, 0, width, height * 0.27);

  context.fillStyle = "#7ccf66";
  context.fillRect(0, height * 0.27, width, height * 0.73);

  context.fillStyle = "#90dc76";
  for (let stripe = 0; stripe < width; stripe += 90) {
    context.fillRect(stripe, height * 0.3, 45, height * 0.7);
  }
}

function drawPlacementGhost(mouseX, mouseY) {
  const definition = objectDefinitions[selectedObject];
  const image = loadedImages[selectedObject];

  if (!image?.complete) {
    return;
  }

  const halfSize = definition.size / 2;
  context.save();
  context.globalAlpha = 0.42;
  context.drawImage(image, mouseX - halfSize, mouseY - halfSize, definition.size, definition.size);
  context.restore();
}

let pointer = null;

function redrawCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackdrop();

  for (const item of placedObjects) {
    const image = loadedImages[item.type];
    const { size } = objectDefinitions[item.type];
    if (!image?.complete) {
      continue;
    }

    context.drawImage(image, item.x - size / 2, item.y - size / 2, size, size);
  }

  if (pointer) {
    drawPlacementGhost(pointer.x, pointer.y);
  }
}

for (const image of Object.values(loadedImages)) {
  image.addEventListener("load", redrawCanvas);
}

pickerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextObject = button.dataset.object;
    if (!nextObject || !objectDefinitions[nextObject]) {
      return;
    }

    selectedObject = nextObject;
    pickerButtons.forEach((candidate) => {
      candidate.classList.toggle("active", candidate === button);
    });
    redrawCanvas();
  });
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer = {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
  redrawCanvas();
});

canvas.addEventListener("mouseleave", () => {
  pointer = null;
  redrawCanvas();
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

  placedObjects.push({ type: selectedObject, x, y });
  redrawCanvas();
});

redrawCanvas();

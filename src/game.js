const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TOOLBAR_ID = "toolbar-buttons";
const PLACEMENT_LAYER_ID = "placement-layer";
const PLACE_GRID_SIZE = 12;
const PIXEL_PALETTE = {
  A: "#e33c34",
  B: "#b56b47",
  C: "#e8d6b8",
  D: "#b17642",
  E: "#f1ddb0",
  F: "#d92a32",
  G: "#6b9b45",
  K: "#f0b33a",
  L: "#dd8657",
  M: "#d4ad7f",
  N: "#f3ae98",
  O: "#120d0b",
  P: "#e79ea0",
  R: "#cb5142",
  S: "#3f6c30",
  T: "#9b5c3c",
  W: "#fff5e7",
  Y: "#f2c54b",
  a: "#a32828",
  b: "#7b4a31",
  c: "#cdb89d",
  d: "#6d4427",
  g: "#83b34e",
  h: "#d89f34",
  k: "#ca861d",
  m: "#b78d61",
  p: "#cc6f77",
  r: "#8d2e35",
  t: "#70402b",
};

function createPixelSpriteAsset({ width, height, pixels }) {
  const rects = [];

  pixels.forEach((row, y) => {
    if (row.length > width) {
      throw new Error(`Sprite row exceeds width ${width}.`);
    }

    const paddedRow = row.padEnd(width, ".");

    for (let x = 0; x < paddedRow.length; x += 1) {
      const key = paddedRow[x];
      if (key === ".") {
        continue;
      }

      const color = PIXEL_PALETTE[key];
      if (!color) {
        throw new Error(`Unknown sprite palette key: ${key}`);
      }

      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}" />`);
    }
  });

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
      shape-rendering="crispEdges"
    >
      ${rects.join("")}
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const FARM_OBJECTS = [
  {
    id: "fence",
    label: "Fence",
    sprite: createPixelSpriteAsset({
      width: 30,
      height: 18,
      pixels: [
        "..............................",
        "..............................",
        "..OOOOO.....OOOOO.....OOOOO...",
        "..OEOLO.....OEOLO.....OEOLO...",
        "..OLRLO.....OLRLO.....OLRLO...",
        "..ORRROOOOOORRROOOOOORRRO...",
        "..ORrRORRRRORrRORRRRORrRO...",
        "..ORRROOOOOORRROOOOOORRRO...",
        "..OLRLO.....OLRLO.....OLRLO...",
        "..ORRROOOOOORRROOOOOORRRO...",
        "..ORrRORRRRORrRORRRRORrRO...",
        "..ORRROOOOOORRROOOOOORRRO...",
        "..OLRLO.....OLRLO.....OLRLO...",
        "..OdRdO.....OdRdO.....OdRdO...",
        "..OOOOO.....OOOOO.....OOOOO...",
        "..............................",
        "..............................",
        "..............................",
      ],
    }),
    width: 108,
    height: 66,
    anchorX: 0.5,
    anchorY: 0.76,
  },
  {
    id: "barn",
    label: "Barn",
    sprite: createPixelSpriteAsset({
      width: 30,
      height: 24,
      pixels: [
        "..............................",
        "..............................",
        "..........OOOO......",
        "........OOEMEOO....OOOO",
        ".......OEMRRMEO...OMMMOO",
        ".....OOEMRRRRMEO..OMMMMEO",
        "....OEMRRRRRRRMEOOMMMMmmO",
        "...OEMRRrrrrRRRMEOORRRRmO",
        "..OEMRRrrrrrrRRRMOORRRRmO",
        "..OERRRrrRRrrRRRROORRRRmO",
        ".OERRRRrrrrrrrrRRRORRRRmO",
        ".OERRRRrrEEEErrRRORRRRmO",
        ".OERRRRrrEKKErrRRORRRRmO",
        ".OERRRRrrEEEErrRRORRRRmO",
        ".OERRRRrrrrrrrrRRORRRRmO",
        ".OERRRRRRRRRRRRRRORRRRmO",
        ".OERRRROOOOOOOORRORRRRmO",
        ".OERRRODLLDDLOORORRRRRmO",
        ".OERRRODLDdDLOORORRRRRmO",
        ".OERRRODLDdDLOORORRRRRmO",
        ".OOOOOOOOOOOOOOOOOOOOOOO",
        "..............................",
        "..............................",
        "..............................",
      ],
    }),
    width: 118,
    height: 104,
    anchorX: 0.5,
    anchorY: 0.9,
  },
  {
    id: "hay-bale",
    label: "Hay Bale",
    sprite: createPixelSpriteAsset({
      width: 26,
      height: 18,
      pixels: [
        "..........................",
        "..........................",
        "......OOOOOOOOOOOO......",
        "....OOYYYYYYYYYYYYOO....",
        "...OYYhhYYYYYYhhYYYYO...",
        "..OYYYYYYYYYYYYYYYYYYO..",
        ".OYYhYYYYYYYYYYYYYYYYYO.",
        ".OYYYYYYRYYYYYRYYYYYYYO.",
        "OYYhYYYYRYYYYYRYYYYYYYhO",
        "OYYYYYYYRYYYYYRYYYYYYYYO",
        ".OYYhYYYYRYYYYYRYYYYYYO.",
        ".OYYYYYYYYYYYYYYYYYYYYO.",
        "..OYYYYYYYYYYYYYYYYYYO..",
        "...OYYhhYYYYYYYYhhYYO...",
        "....OOYYYYYYYYYYYYOO....",
        "......OOOOOOOOOOOO......",
        "..........................",
        "..........................",
      ],
    }),
    width: 84,
    height: 58,
    anchorX: 0.5,
    anchorY: 0.76,
  },
  {
    id: "cow",
    label: "Cow",
    sprite: createPixelSpriteAsset({
      width: 32,
      height: 22,
      pixels: [
        "................................",
        "................................",
        ".....................OO.........",
        "...................OOEEOO.......",
        ".......OOOOOOOOOOOOOWWWWOO......",
        ".....OOEBBBBBWWWWWWWWWWWNOO.....",
        "....OOWWBBBBBWWWWWWWWWNNNNO.....",
        "...OOWWWWWWWWWWWWWWWWWNNNNO.....",
        "..OOWWBBBWWBBWWWWWWWWWWWWWO.....",
        "..OWWWWWWWWWWWWWWWWWWWWWWO......",
        "..OWWBBWWWWWWBBWWWWWWWWWO......",
        "..OWWWWWWWWWWWWWWWFWWWWO.......",
        "...OWWWWWWWWWWWWWFKFWWO........",
        "....OWWWWWWWWWWWWWFWWO.........",
        ".....OOWWOO....OOWWOO..........",
        ".....OObbOO....OOccOO..........",
        "......OO.......OO.O............",
        "......P.........P..............",
        "................................",
        "................................",
        "................................",
        "................................",
      ],
    }),
    width: 108,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.8,
  },
  {
    id: "chicken",
    label: "Chicken",
    sprite: createPixelSpriteAsset({
      width: 22,
      height: 18,
      pixels: [
        "......................",
        "......................",
        "..........FF..........",
        ".........OFFO.........",
        "......OOFFWWOO........",
        "....OOOWWWWWWOO.......",
        "...OOWWWWWWWWWWO......",
        "...OWWWWWWWWWWWYOO....",
        "....OWWWWWCWWWWFYO....",
        ".....OWWWCCCWWWFO.....",
        "......OWWWWWWWWO......",
        ".......OOWWWWOO.......",
        "........OOO...........",
        ".......K..K...........",
        ".......K..K...........",
        "......k....k..........",
        "......................",
        "......................",
      ],
    }),
    width: 74,
    height: 68,
    anchorX: 0.5,
    anchorY: 0.8,
  },
  {
    id: "apple-tree",
    label: "Apple Tree",
    sprite: createPixelSpriteAsset({
      width: 24,
      height: 24,
      pixels: [
        "........................",
        ".........OOOO...........",
        "......OOOGggGOOO........",
        ".....OGggggggggGO.......",
        "...OOGggAggggggAggOO....",
        "..OGgggggggggggggggGO...",
        ".OGgAgggSggggSggAgggGO..",
        ".OGgggggggAgggggggggGO..",
        "OGggggSggggggggSgggggGO.",
        "OGgAggggggAggggggggAgGO.",
        "OGgggggggggggggggggggGO.",
        ".OGggSggAggggAggSggggO..",
        ".OGgggggggggggggggggO...",
        "..OOGgggggggggggggOO....",
        "....OOOGggggggGOOO......",
        ".......OOOTTTTOO........",
        "........OOTttOO.........",
        "........OTtttO..........",
        "........OTtttO..........",
        ".......OOTtttOO.........",
        ".......OOTtttOO.........",
        "........OOTtOO..........",
        ".........OOOO...........",
        "........................",
      ],
    }),
    width: 98,
    height: 116,
    anchorX: 0.5,
    anchorY: 0.9,
  },
];

const state = {
  activeObjectId: FARM_OBJECTS[0].id,
};
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

function drawBackground(ctx, width, height) {
  const tiles = getGrassTiles();
  const cols = Math.ceil(width / TILE_DRAW_SIZE);
  const rows = Math.ceil(height / TILE_DRAW_SIZE);
  ctx.imageSmoothingEnabled = false;

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
        <img
          class="farm-object-button__sprite"
          src="${farmObject.sprite}"
          alt=""
          draggable="false"
        />
      </span>
    `;
    button.addEventListener("click", () => setActiveObject(farmObject.id));
    slot.appendChild(button);
    toolbarButtons.appendChild(slot);
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
  objectEl.setAttribute("aria-label", `${activeObject.label} placed`);
  objectEl.dataset.objectId = activeObject.id;
  const relativeX = clientX - bounds.left;
  const relativeY = clientY - bounds.top;
  const snappedX = Math.round(relativeX / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  const snappedY = Math.round(relativeY / PLACE_GRID_SIZE) * PLACE_GRID_SIZE;
  const left = Math.min(
    Math.max(0, snappedX - Math.round(activeObject.width * activeObject.anchorX)),
    Math.max(0, bounds.width - activeObject.width),
  );
  const top = Math.min(
    Math.max(0, snappedY - Math.round(activeObject.height * activeObject.anchorY)),
    Math.max(0, bounds.height - activeObject.height),
  );

  objectEl.style.left = `${left}px`;
  objectEl.style.top = `${top}px`;
  objectEl.style.width = `${activeObject.width}px`;
  objectEl.style.height = `${activeObject.height}px`;
  objectEl.style.zIndex = String(Math.max(1, snappedY));

  const sprite = document.createElement("img");
  sprite.className = "placed-object__sprite";
  sprite.src = activeObject.sprite;
  sprite.alt = "";
  sprite.draggable = false;
  objectEl.appendChild(sprite);

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
}

function init() {
  renderToolbar();
  setupPlacementInput();
  resizeAndRender();
  window.addEventListener("resize", resizeAndRender);
}

window.addEventListener("DOMContentLoaded", init);

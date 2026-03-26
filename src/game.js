const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const SOURCE_TILE_SIZE = 32;
const TILE_SCALE = 3;
const TILE_DRAW_SIZE = SOURCE_TILE_SIZE * TILE_SCALE;
const GRASS_PALETTE = ["#5e9345", "#679c4b", "#70a852", "#7eb760", "#8bc96b"];
let cachedGrassTiles = null;

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
      const cluster = hash2D(
        Math.floor((x + seedOffset * 3) / 4),
        Math.floor((y + seedOffset * 5) / 4),
      );
      const grain = hash2D(x + seedOffset * 17, y + seedOffset * 13);
      let color = GRASS_PALETTE[1];

      if (cluster > 0.68 && grain > 0.46) {
        color = GRASS_PALETTE[2];
      } else if (cluster < 0.31 && grain > 0.52) {
        color = GRASS_PALETTE[0];
      } else if (grain > 0.94) {
        color = GRASS_PALETTE[3];
      }

      tileCtx.fillStyle = color;
      tileCtx.fillRect(x, y, 1, 1);

      // Occasional brighter vertical pixels to suggest tiny grass blades.
      if (hash2D(x + seedOffset * 23, y + seedOffset * 31) > 0.987 && y > 0) {
        tileCtx.fillStyle = GRASS_PALETTE[4];
        tileCtx.fillRect(x, y, 1, 1);
        tileCtx.fillRect(x, y - 1, 1, 1);
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
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height);
}

function init() {
  resizeAndRender();
  window.addEventListener("resize", resizeAndRender);
}

window.addEventListener("DOMContentLoaded", init);

const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TILE_SIZE = 56;

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

function drawBaseField(ctx, width, height) {
  ctx.fillStyle = "#84c960";
  ctx.fillRect(0, 0, width, height);

  const lightGradient = ctx.createLinearGradient(0, 0, width, height);
  lightGradient.addColorStop(0, "rgba(255, 255, 220, 0.16)");
  lightGradient.addColorStop(0.45, "rgba(255, 255, 255, 0.06)");
  lightGradient.addColorStop(1, "rgba(30, 70, 30, 0.12)");

  ctx.fillStyle = lightGradient;
  ctx.fillRect(0, 0, width, height);
}

function drawGrassTiles(ctx, width, height) {
  const cols = Math.ceil(width / TILE_SIZE);
  const rows = Math.ceil(height / TILE_SIZE);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      const tone = hash2D(col, row);

      if (tone > 0.5) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + tone * 0.03})`;
      } else {
        ctx.fillStyle = `rgba(37, 95, 31, ${0.03 + (0.5 - tone) * 0.06})`;
      }

      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = "rgba(70, 110, 52, 0.08)";
      ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
  }
}

function drawGroundPatches(ctx, width, height) {
  const patchCount = Math.max(8, Math.floor((width * height) / 55000));

  for (let index = 0; index < patchCount; index += 1) {
    const px = hash2D(index + 3, 17) * width;
    const py = hash2D(index + 9, 41) * height;
    const radius = 50 + hash2D(index + 27, 5) * 80;
    const gradient = ctx.createRadialGradient(px, py, radius * 0.15, px, py, radius);
    const tint = hash2D(index + 13, 29) > 0.5 ? "255,255,235" : "58,108,44";

    gradient.addColorStop(0, `rgba(${tint}, 0.12)`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
  }
}

function drawDirtEdge(ctx, width, height) {
  const pathY = height * 0.79;
  const lineWidth = Math.max(26, Math.min(width, height) * 0.06);

  ctx.beginPath();
  ctx.moveTo(-width * 0.08, pathY + height * 0.06);
  ctx.quadraticCurveTo(width * 0.28, pathY - height * 0.08, width * 0.67, pathY);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = "rgba(146, 113, 73, 0.14)";
  ctx.stroke();

  ctx.lineWidth = lineWidth * 0.55;
  ctx.strokeStyle = "rgba(208, 175, 126, 0.08)";
  ctx.stroke();
}

function drawGrassTufts(ctx, width, height) {
  const tuftCount = Math.max(16, Math.floor((width * height) / 25000));
  ctx.strokeStyle = "rgba(52, 120, 43, 0.22)";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";

  for (let index = 0; index < tuftCount; index += 1) {
    const x = hash2D(index + 71, 19) * width;
    const y = hash2D(index + 91, 37) * height;
    const size = 5 + hash2D(index + 57, 11) * 5;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * 0.5, y - size);
    ctx.moveTo(x, y);
    ctx.lineTo(x + size * 0.2, y - size * 1.1);
    ctx.moveTo(x, y);
    ctx.lineTo(x + size * 0.65, y - size * 0.95);
    ctx.stroke();
  }
}

function drawBackground(ctx, width, height) {
  drawBaseField(ctx, width, height);
  drawGrassTiles(ctx, width, height);
  drawGroundPatches(ctx, width, height);
  drawDirtEdge(ctx, width, height);
  drawGrassTufts(ctx, width, height);
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

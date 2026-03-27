const VIEW_ID = "game-view";
const BACKGROUND_ID = "farm-background";
const TOOLBAR_ID = "toolbar-buttons";
const PLACEMENT_LAYER_ID = "placement-layer";
const PLACE_GRID_SIZE = 12;
const PLACED_OBJECT_BASE_SIZE = 40;
const PLACED_OBJECT_SCALE_UP = 2;
const DIRT_WIDTH_RATIO = 0.8;
const DIRT_HEIGHT_RATIO = 0.5;
const DIRT_VERTICAL_OFFSET_RATIO = 0.03;
const GRASS_BASE_COLORS = ["#a5d267", "#90c54f", "#79b142"];
const GRASS_VARIATION_COLORS = {
  light: "#b8df75",
  mid: "#96cb58",
  dark: "#679a3c",
};
const GRASS_FLOWER_COLORS = ["#f7efc7", "#f2cde6", "#c8dcff"];
const DIRT_BASE_COLORS = ["#e0bf72", "#d2a554", "#c68d39"];
const DIRT_VARIATION_COLORS = {
  light: "#ebce8c",
  mid: "#d7ad63",
  dark: "#b67d2d",
};
const DIRT_PEBBLE_COLORS = ["#e6cca0", "#ccb17f", "#a58b64"];
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
const colorCache = new Map();

function hash2D(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseHexColor(hexColor) {
  const cached = colorCache.get(hexColor);
  if (cached) {
    return cached;
  }

  const normalized = hexColor.replace("#", "");
  const color = {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };

  colorCache.set(hexColor, color);
  return color;
}

function mixColors(colorA, colorB, amount) {
  const start = parseHexColor(colorA);
  const end = parseHexColor(colorB);
  const blend = clamp(amount, 0, 1);
  const r = Math.round(start.r + (end.r - start.r) * blend);
  const g = Math.round(start.g + (end.g - start.g) * blend);
  const b = Math.round(start.b + (end.b - start.b) * blend);
  return `rgb(${r}, ${g}, ${b})`;
}

function samplePalette(colors, amount) {
  if (colors.length === 1) {
    return colors[0];
  }

  const blend = clamp(amount, 0, 1) * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(blend));
  return mixColors(colors[index], colors[index + 1], blend - index);
}

function getViewAndCanvas() {
  const view = document.getElementById(VIEW_ID);
  const canvas = document.getElementById(BACKGROUND_ID);

  if (!view || !canvas) {
    throw new Error("Game view or background canvas is missing.");
  }

  return { view, canvas };
}

function fillVariationLayer(ctx, area, options) {
  const {
    baseColor,
    gradientColors,
    variationColors,
    cellSize,
    seedOffset,
    alphaScale = 1,
    jitterScale = 0.18,
    minPatchScale = 0.72,
    maxPatchScale = 1.18,
    baseAlpha = 0.012,
  } = options;

  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();

  ctx.globalAlpha = 1;

  if (baseColor) {
    ctx.fillStyle = baseColor;
    ctx.fillRect(area.x, area.y, area.width, area.height);
  }

  if (gradientColors?.length) {
    const gradient = ctx.createLinearGradient(0, area.y, 0, area.y + area.height);
    const stopDivisor = Math.max(1, gradientColors.length - 1);

    gradientColors.forEach((color, index) => {
      gradient.addColorStop(index / stopDivisor, color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(area.x, area.y, area.width, area.height);
  }

  const cols = Math.ceil(area.width / cellSize) + 1;
  const rows = Math.ceil(area.height / cellSize) + 1;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const toneNoise = hash2D(col + seedOffset * 7.1, row + seedOffset * 11.3);
      let fillStyle = variationColors.mid;
      let alpha = baseAlpha;

      if (toneNoise > 0.82) {
        fillStyle = variationColors.light;
        alpha = baseAlpha + 0.018 + (toneNoise - 0.82) * 0.06;
      } else if (toneNoise < 0.18) {
        fillStyle = variationColors.dark;
        alpha = baseAlpha + 0.016 + (0.18 - toneNoise) * 0.05;
      } else if (toneNoise > 0.68) {
        fillStyle = variationColors.mid;
        alpha = baseAlpha + 0.008 + (toneNoise - 0.68) * 0.02;
      }

      const xJitter =
        (hash2D(col + seedOffset * 17.3, row + seedOffset * 19.7) - 0.5) * cellSize * jitterScale;
      const yJitter =
        (hash2D(col + seedOffset * 23.9, row + seedOffset * 29.1) - 0.5) * cellSize * jitterScale;
      const widthScale =
        minPatchScale +
        hash2D(col + seedOffset * 31.7, row + seedOffset * 37.9) *
          (maxPatchScale - minPatchScale);
      const heightScale =
        minPatchScale +
        hash2D(col + seedOffset * 41.3, row + seedOffset * 43.7) *
          (maxPatchScale - minPatchScale);
      const cellX = Math.round(area.x + col * cellSize + xJitter - cellSize * 0.12);
      const cellY = Math.round(area.y + row * cellSize + yJitter - cellSize * 0.12);

      ctx.globalAlpha = alpha * alphaScale;
      ctx.fillStyle = fillStyle;
      ctx.fillRect(
        cellX,
        cellY,
        Math.max(1, Math.round(cellSize * widthScale)),
        Math.max(1, Math.round(cellSize * heightScale)),
      );
    }
  }

  ctx.restore();
}

function drawGrassTufts(ctx, area) {
  const spacing = Math.max(18, Math.round(Math.min(area.width, area.height) * 0.03));
  const cols = Math.ceil(area.width / spacing) + 1;
  const rows = Math.ceil(area.height / spacing) + 1;

  ctx.save();

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const seed = hash2D(col + 131, row + 173);
      if (seed < 0.44) {
        continue;
      }

      const x = area.x + col * spacing + (hash2D(col + 191, row + 211) - 0.5) * spacing;
      const y = area.y + row * spacing + (hash2D(col + 227, row + 239) - 0.5) * spacing;
      const bladeCount = 2 + Math.floor(hash2D(col + 251, row + 263) * 3);

      for (let bladeIndex = 0; bladeIndex < bladeCount; bladeIndex += 1) {
        const bladeHeight = 4 + hash2D(bladeIndex + col * 3 + 281, row + 307) * 8;
        const bladeWidth = 1 + Math.floor(hash2D(bladeIndex + col * 5 + 331, row + 347) * 2);
        const bladeX = x + (bladeIndex - (bladeCount - 1) / 2) * 3;
        const bladeY = y - bladeHeight;

        ctx.globalAlpha = 0.1 + hash2D(bladeIndex + col * 7 + 367, row + 389) * 0.12;
        ctx.fillStyle =
          hash2D(bladeIndex + col * 11 + 401, row + 419) > 0.52
            ? GRASS_VARIATION_COLORS.light
            : GRASS_VARIATION_COLORS.dark;
        ctx.fillRect(bladeX, bladeY, bladeWidth, bladeHeight);
      }
    }
  }

  ctx.restore();
}

function drawGrassFlowers(ctx, area) {
  const spacing = Math.max(52, Math.round(Math.min(area.width, area.height) * 0.09));
  const cols = Math.ceil(area.width / spacing) + 1;
  const rows = Math.ceil(area.height / spacing) + 1;

  ctx.save();

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const seed = hash2D(col + 443, row + 457);
      if (seed < 0.84) {
        continue;
      }

      const x = area.x + col * spacing + hash2D(col + 461, row + 479) * spacing;
      const y = area.y + row * spacing + hash2D(col + 487, row + 503) * spacing;
      const flowerColor = GRASS_FLOWER_COLORS[Math.floor(seed * GRASS_FLOWER_COLORS.length) % GRASS_FLOWER_COLORS.length];

      ctx.globalAlpha = 0.45;
      ctx.fillStyle = flowerColor;
      ctx.fillRect(x, y, 2, 2);
      ctx.fillRect(x + 3, y + 1, 2, 2);
      ctx.fillRect(x + 1, y + 3, 2, 2);
    }
  }

  ctx.restore();
}

function drawGrassPixelDetails(ctx, area) {
  const spacing = Math.max(5, Math.round(Math.min(area.width, area.height) * 0.009));
  const cols = Math.ceil(area.width / spacing) + 1;
  const rows = Math.ceil(area.height / spacing) + 1;

  ctx.save();

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const seed = hash2D(col + 809, row + 821);
      if (seed < 0.52) {
        continue;
      }

      const x = Math.round(
        area.x + col * spacing + (hash2D(col + 823, row + 827) - 0.5) * spacing * 0.7,
      );
      const y = Math.round(
        area.y + row * spacing + (hash2D(col + 829, row + 839) - 0.5) * spacing * 0.7,
      );
      const size = seed > 0.88 ? 2 : 1;

      ctx.globalAlpha = 0.12 + hash2D(col + 853, row + 857) * 0.1;
      ctx.fillStyle =
        seed > 0.84
          ? "#c9ea86"
          : seed < 0.63
            ? "#628f36"
            : "#88bf4a";
      ctx.fillRect(x, y, size, size);

      if (seed > 0.93) {
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = "#5b8533";
        ctx.fillRect(x + 2, y + 1, 1, 1);
      }
    }
  }

  ctx.restore();
}

function getCentralDirtArea(width, height) {
  const dirtWidth = width * DIRT_WIDTH_RATIO;
  const dirtHeight = height * DIRT_HEIGHT_RATIO;

  return {
    x: (width - dirtWidth) / 2,
    y: (height - dirtHeight) / 2 + height * DIRT_VERTICAL_OFFSET_RATIO,
    width: dirtWidth,
    height: dirtHeight,
  };
}

function getDirtSpan(dirtArea, normalizedY, expand = 0) {
  const centeredDistance = Math.abs(normalizedY - 0.5) * 2;
  const roundedProfile = Math.pow(Math.max(0, 1 - centeredDistance), 0.55);
  const endInset = (1 - roundedProfile) * dirtArea.width * 0.18;
  const leftWave =
    Math.sin(normalizedY * Math.PI * 2.4 + 0.4) * dirtArea.width * 0.028 +
    Math.sin(normalizedY * Math.PI * 6.1 + 1.2) * dirtArea.width * 0.012 +
    (hash2D(41, Math.floor(normalizedY * 19) + 17) - 0.5) * dirtArea.width * 0.032;
  const rightWave =
    Math.sin(normalizedY * Math.PI * 2.1 + 1.1) * dirtArea.width * 0.024 +
    Math.sin(normalizedY * Math.PI * 5.7 + 2.2) * dirtArea.width * 0.014 +
    (hash2D(73, Math.floor(normalizedY * 23) + 29) - 0.5) * dirtArea.width * 0.03;
  const leftNotch =
    Math.exp(-Math.pow((normalizedY - 0.24) / 0.11, 2)) * dirtArea.width * 0.07 +
    Math.exp(-Math.pow((normalizedY - 0.79) / 0.1, 2)) * dirtArea.width * 0.04;
  const rightNotch =
    Math.exp(-Math.pow((normalizedY - 0.36) / 0.12, 2)) * dirtArea.width * 0.05 +
    Math.exp(-Math.pow((normalizedY - 0.72) / 0.11, 2)) * dirtArea.width * 0.06;

  const leftInset = clamp(
    dirtArea.width * 0.035 + endInset + leftNotch + leftWave,
    dirtArea.width * 0.02,
    dirtArea.width * 0.42,
  );
  const rightInset = clamp(
    dirtArea.width * 0.03 + endInset + rightNotch + rightWave,
    dirtArea.width * 0.02,
    dirtArea.width * 0.42,
  );

  return {
    x: dirtArea.x + leftInset - expand,
    width: Math.max(dirtArea.width * 0.18, dirtArea.width - leftInset - rightInset + expand * 2),
  };
}

function drawSoftDirtBorder(ctx, dirtArea) {
  const stripHeight = Math.max(2, Math.round(dirtArea.height * 0.012));
  const edgeSize = Math.max(6, Math.round(Math.min(dirtArea.width, dirtArea.height) * 0.016));
  const layers = [
    { expand: edgeSize, color: "#dcbf72", alpha: 0.09 },
    { expand: edgeSize * 0.5, color: "#cfa555", alpha: 0.08 },
    { expand: edgeSize * 0.2, color: "#ba8735", alpha: 0.06 },
  ];

  for (const layer of layers) {
    for (let y = 0; y < dirtArea.height; y += stripHeight) {
      const normalizedY = (y + stripHeight / 2) / dirtArea.height;
      const span = getDirtSpan(dirtArea, normalizedY, layer.expand);

      ctx.globalAlpha = layer.alpha;
      ctx.fillStyle = layer.color;
      ctx.fillRect(
        span.x,
        dirtArea.y + y - layer.expand * 0.22,
        span.width,
        stripHeight + layer.expand * 0.44,
      );
    }
  }

  ctx.globalAlpha = 1;
}

function drawDirtBody(ctx, dirtArea) {
  const stripHeight = 2;
  const pixelWidth = 3;

  for (let y = 0; y < dirtArea.height; y += stripHeight) {
    const normalizedY = (y + stripHeight / 2) / dirtArea.height;
    const span = getDirtSpan(dirtArea, normalizedY);
    const cols = Math.ceil(span.width / pixelWidth) + 1;
    const macroRow = Math.floor(y / 10);

    for (let col = 0; col < cols; col += 1) {
      const macroCol = Math.floor(col / 4);
      const macroNoise = hash2D(macroCol + 887, macroRow + 919);
      const microNoise = hash2D(col + 929, Math.floor(y / stripHeight) + 941);
      const colorAmount = clamp(macroNoise * 0.78 + microNoise * 0.14 + 0.04, 0, 1);
      const blockX = Math.round(span.x + col * pixelWidth);
      const blockWidth = Math.min(pixelWidth, Math.ceil(span.x + span.width - blockX));
      if (blockWidth <= 0) {
        continue;
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = samplePalette(DIRT_BASE_COLORS, colorAmount);
      ctx.fillRect(blockX, dirtArea.y + y, blockWidth, stripHeight);
    }
  }
}

function drawDirtTexture(ctx, dirtArea) {
  const cellHeight = 3;
  const cellWidth = 3;
  const rows = Math.ceil(dirtArea.height / cellHeight) + 1;

  ctx.save();

  for (let row = 0; row < rows; row += 1) {
    const y = row * cellHeight;
    const normalizedY = clamp((y + cellHeight / 2) / dirtArea.height, 0, 1);
    const span = getDirtSpan(dirtArea, normalizedY);
    const cols = Math.ceil(span.width / cellWidth) + 1;

    for (let col = 0; col < cols; col += 1) {
      const macroNoise = hash2D(Math.floor(col / 3) + 521, Math.floor(row / 3) + 547);
      const toneNoise = macroNoise * 0.8 + hash2D(col + 557, row + 563) * 0.2;
      const patchX = Math.round(
        span.x + col * cellWidth + (hash2D(col + 557, row + 563) - 0.5) * cellWidth * 0.65,
      );
      const patchY = Math.round(
        dirtArea.y + y + (hash2D(col + 571, row + 587) - 0.5) * cellHeight * 0.65,
      );
      const patchWidth = 1 + Math.floor(hash2D(col + 593, row + 601) * 2);
      const patchHeight = 1 + Math.floor(hash2D(col + 607, row + 613) * 2);

      if (patchX + patchWidth < span.x || patchX > span.x + span.width) {
        continue;
      }

      if (toneNoise > 0.74) {
        ctx.globalAlpha = 0.045 + (toneNoise - 0.74) * 0.09;
        ctx.fillStyle = DIRT_VARIATION_COLORS.light;
        ctx.fillRect(patchX, patchY, patchWidth, patchHeight);
      } else if (toneNoise < 0.24) {
        ctx.globalAlpha = 0.04 + (0.24 - toneNoise) * 0.08;
        ctx.fillStyle = DIRT_VARIATION_COLORS.dark;
        ctx.fillRect(patchX, patchY, patchWidth, patchHeight);
      } else if (toneNoise > 0.49 && toneNoise < 0.57) {
        ctx.globalAlpha = 0.022;
        ctx.fillStyle = DIRT_VARIATION_COLORS.mid;
        ctx.fillRect(patchX, patchY, 1, 1);
      }

      if (hash2D(col + 617, row + 631) > 0.992) {
        const pebbleSize = 2 + Math.floor(hash2D(col + 641, row + 653) * 2);
        const pebbleColor =
          DIRT_PEBBLE_COLORS[Math.floor(hash2D(col + 659, row + 673) * DIRT_PEBBLE_COLORS.length)];
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = pebbleColor;
        ctx.fillRect(
          patchX + Math.floor(patchWidth * 0.25),
          patchY + Math.floor(patchHeight * 0.3),
          pebbleSize,
          pebbleSize,
        );
      }
    }
  }

  ctx.restore();
}

function drawDirtTransitionPixels(ctx, dirtArea) {
  const rowStep = 2;
  const offsets = [-3, -2, -1, 0, 1, 2];

  ctx.save();

  for (let y = 0; y < dirtArea.height; y += rowStep) {
    const normalizedY = clamp((y + rowStep / 2) / dirtArea.height, 0, 1);
    const span = getDirtSpan(dirtArea, normalizedY);
    const boundaryY = Math.round(dirtArea.y + y);

    for (const side of ["left", "right"]) {
      const boundaryX = side === "left" ? Math.round(span.x) : Math.round(span.x + span.width - 1);

      for (const offset of offsets) {
        const seed = hash2D(boundaryX + offset * 3 + (side === "left" ? 977 : 991), y + 1009);
        if (seed < 0.68) {
          continue;
        }

        const x = side === "left" ? boundaryX + offset : boundaryX - offset;
        const isGrassSide = offset < 0;
        const color = isGrassSide
          ? (seed > 0.86 ? GRASS_VARIATION_COLORS.light : GRASS_VARIATION_COLORS.dark)
          : (seed > 0.87 ? DIRT_VARIATION_COLORS.light : DIRT_VARIATION_COLORS.dark);

        ctx.globalAlpha = isGrassSide ? 0.22 : 0.18;
        ctx.fillStyle = color;
        ctx.fillRect(x, boundaryY, seed > 0.9 ? 2 : 1, 1);
      }
    }
  }

  ctx.restore();
}

function drawDirtEdgeGrass(ctx, dirtArea) {
  const spacing = 4;
  const rows = Math.ceil(dirtArea.height / spacing) + 1;

  ctx.save();

  for (let row = 0; row < rows; row += 1) {
    const normalizedY = clamp((row * spacing + spacing / 2) / dirtArea.height, 0, 1);
    const span = getDirtSpan(dirtArea, normalizedY);
    const baseY = dirtArea.y + row * spacing + (hash2D(row + 683, 701) - 0.5) * spacing * 0.3;

    for (const edgeX of [span.x + 1, span.x + span.width - 3]) {
      const seed = hash2D(row + Math.round(edgeX), 719);
      if (seed < 0.34) {
        continue;
      }

      const bladeCount = 1 + Math.floor(seed * 3);
      for (let bladeIndex = 0; bladeIndex < bladeCount; bladeIndex += 1) {
        const bladeHeight = 2 + Math.floor(hash2D(bladeIndex + row + 733, 743) * 4);
        const bladeX = Math.round(edgeX + bladeIndex);
        ctx.globalAlpha = 0.22;
        ctx.fillStyle =
          hash2D(bladeIndex + row + 751, 761) > 0.5
            ? GRASS_VARIATION_COLORS.light
            : GRASS_VARIATION_COLORS.dark;
        ctx.fillRect(bladeX, Math.round(baseY) - bladeHeight, 1, bladeHeight);
      }
    }
  }

  ctx.restore();
}

function drawBackground(ctx, width, height) {
  const fullArea = { x: 0, y: 0, width, height };
  const dirtArea = getCentralDirtArea(width, height);
  const grassCellSize = 6;
  const grassDetailCellSize = 3;

  ctx.imageSmoothingEnabled = true;

  fillVariationLayer(ctx, fullArea, {
    baseColor: "#92c951",
    variationColors: GRASS_VARIATION_COLORS,
    cellSize: grassCellSize,
    seedOffset: 3,
    alphaScale: 0.34,
    jitterScale: 0.07,
    minPatchScale: 0.76,
    maxPatchScale: 0.98,
    baseAlpha: 0.007,
  });

  fillVariationLayer(ctx, fullArea, {
    variationColors: {
      light: "#c6e684",
      mid: "#8fca56",
      dark: "#5f9238",
    },
    cellSize: grassDetailCellSize,
    seedOffset: 9,
    alphaScale: 0.18,
    jitterScale: 0.04,
    minPatchScale: 0.7,
    maxPatchScale: 0.9,
    baseAlpha: 0.005,
  });

  drawGrassPixelDetails(ctx, fullArea);
  drawGrassTufts(ctx, fullArea);
  drawGrassFlowers(ctx, fullArea);
  drawSoftDirtBorder(ctx, dirtArea);
  drawDirtBody(ctx, dirtArea);
  drawDirtTexture(ctx, dirtArea);
  drawDirtTransitionPixels(ctx, dirtArea);
  drawDirtEdgeGrass(ctx, dirtArea);
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
  const { view } = getViewAndCanvas();
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
    state.preview.clientX = event.clientX;
    state.preview.clientY = event.clientY;

    if (placeObject(event.clientX, event.clientY)) {
      // Keep the freshly placed object visible until the pointer moves again.
      state.preview.isPointerActive = false;
      hidePlacementPreview();
      return;
    }

    state.preview.isPointerActive = true;
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

export function init() {
  renderToolbar();
  syncPreviewObject();
  setActiveObject(state.activeObjectId);
  setupPlacementInput();
  resizeAndRender();
  window.addEventListener("resize", resizeAndRender);
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById(VIEW_ID)) {
      init();
    }
  });
}

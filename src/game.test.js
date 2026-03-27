import { beforeEach, describe, expect, it, vi } from "vitest";

function installDom() {
  document.body.innerHTML = `
    <main id="game-view" class="game-view" aria-label="Farm game view">
      <canvas
        id="farm-background"
        class="background-layer"
        aria-label="Farm ground background"
      ></canvas>
      <section
        id="placement-layer"
        class="placement-layer"
        aria-label="Placed farm objects"
      ></section>
      <section id="farm-toolbar" class="farm-toolbar" aria-label="Farm object toolbar">
        <div
          id="toolbar-buttons"
          class="farm-toolbar__buttons"
          role="group"
          aria-label="Farm objects"
        ></div>
      </section>
    </main>
  `;

  const view = document.getElementById("game-view");
  const canvas = document.getElementById("farm-background");

  if (!view || !canvas) {
    throw new Error("Expected game view markup to be installed.");
  }

  const bounds = {
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
  };

  view.getBoundingClientRect = () => bounds;
  canvas.getBoundingClientRect = () => bounds;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    imageSmoothingEnabled: false,
    fillStyle: "",
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  }));
}

function dispatchPointerMove(target, clientX, clientY) {
  const event = new Event("pointermove", { bubbles: true });
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  target.dispatchEvent(event);
}

function dispatchClick(target, clientX, clientY) {
  const event = new Event("click", { bubbles: true });
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  target.dispatchEvent(event);
}

describe("toolbar placement flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installDom();
  });

  it("shows a stable preview and renders the placed object immediately on click", async () => {
    const { init } = await import("./game.js");
    init();

    const toolbarButton = document.querySelector('[data-object-id="barn"]');
    const canvas = document.getElementById("farm-background");

    if (!(toolbarButton instanceof HTMLButtonElement) || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Expected toolbar button and canvas to exist.");
    }

    toolbarButton.click();
    dispatchPointerMove(canvas, 300, 300);

    const placementLayer = document.getElementById("placement-layer");
    const preview = placementLayer?.querySelector(".placement-preview");

    expect(preview).not.toBeNull();
    expect(preview?.classList.contains("is-visible")).toBe(true);
    expect(preview?.classList.contains("is-blocked")).toBe(false);
    expect(preview?.style.left).toBe("300px");
    expect(preview?.style.top).toBe("300px");
    expect(placementLayer?.lastElementChild).toBe(preview);

    dispatchClick(canvas, 300, 300);

    const placedObjects = placementLayer?.querySelectorAll(
      '.placed-object:not(.placement-preview)',
    );
    expect(placedObjects?.length).toBe(1);

    const placedObject = placedObjects?.[0];
    expect(placedObject?.getAttribute("aria-label")).toBe("Barn placed");
    expect(placedObject?.style.left).toBe("300px");
    expect(placedObject?.style.top).toBe("300px");
    expect(preview?.classList.contains("is-visible")).toBe(false);
  });
});

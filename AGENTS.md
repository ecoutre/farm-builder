# Farm Builder

Browser-based, client-side pixel-art farm building game. Vanilla JS (ES modules), HTML5 Canvas, and the Web Audio API. No backend, database, or build step.

## Cursor Cloud specific instructions

- Dependencies (`vitest`, `jsdom`) are installed by the startup update script (`npm install`). They are only needed for the test suite; the game itself has no runtime dependencies.
- Run tests: `npm test` (runs `vitest run --environment jsdom`).
- There is no `dev`/`build`/`start` script. To run the game, serve the repo root over HTTP and open `index.html`, e.g. `python3 -m http.server 8000` then visit `http://localhost:8000/`. Serving over HTTP (not `file://`) is required because `index.html` uses `<script type="module">`.
- Expected harmless noise: the browser logs 404s for `favicon.ico`, and some sprite PNGs / sound MP3s referenced by the code are not committed (`src/assets/sprites/*.png`, some `src/assets/sounds/*.mp3`). The game degrades gracefully (silent fallback) and core placement mechanics still work.

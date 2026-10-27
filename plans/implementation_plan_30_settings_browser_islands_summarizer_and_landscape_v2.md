# Implementation Plan 30 — Settings Modal, Browser Islands, Fractal Summarizer, Shift/Alt Scroll, Room Palettes & Landscape Optimizations

**Active Project**: `e:\Vector Field Theory\peek_explorer`  
**Date**: 2026-10-27  
**Version**: `0.8.16`

## 1. Objectives & User Requirements

1. **Non-Refreshing File/Folder Creation**:
   - Creating files or folders must NEVER trigger `show()` (which wipes whole-page DOM, camera position, and expanded trees).
   - In rooms: call `await entry.populate();` directly to refresh room items without moving the camera or destroying other rooms.
   - In normal views: insert rows in-place or call `refreshKeep()` to maintain scroll position.

2. **Shift+Scroll Zoom & Fixed File Scrolling in Landscape**:
   - In `renderLandscape`, fix wheel handler so wheel scrolling over open file viewers (`.map-file-body`, `.file-viewer-text`, `.map-html-body`, `.map-browser-body`) scrolls content naturally without triggering camera zoom.
   - `Shift + Scroll`: ALWAYS zooms the camera in/out anywhere on the canvas.
   - `Alt + Scroll`: resizes icons for the room under the cursor.

3. **Folder Sizes in Landscape & Shallow Calculation**:
   - Display direct file payload size in room headers (`🏰 Room · 540×380 · 1.4 MB · 12 items`) with zero latency.
   - Subfolder rows display known cached sizes from `folderSizeCache`.
   - Clicking or hovering `--` calculates shallow/deep folder size on-demand.

4. **Comment Out Lens Mode**:
   - Hide or comment out `lens` options from `<select id="view">`, `<select id="spView">`, and context menus. Preserve internal `renderLandscape` support.

5. **Settings Menu & Full UI / Landscape Customization**:
   - Add `⚙️ Settings` modal button to toolbar.
   - Hotkeys reference table (`Shift+Wheel`, `Alt+Wheel`, `F2`, `Alt+P`, `Alt+S`, etc.).
   - UI Customization: Dark mode, accent colors, custom landscape background (Color, Grid, Image).
   - Landscape Room Themes & Fun Modes:
     - Default, Inherit Parent Color.
     - Selectable Palettes: Rainbow, Neon, Pastel.
     - Disco Mode 🪩: Dynamic animated border hue cycling.

6. **Spawn on Location of Click & Browser Islands with Auto-Sleep**:
   - Canvas right-click context menu captures `(wx, wy)` world coordinates and spawns folder islands, HTML viewers, or Web Browsers exactly where clicked.
   - `spawnBrowserIsland(url, title, prefPos)`: in-map web browser card with address bar, navigation, and sleep toggle.
   - **Brave-like Auto-Sleep**: Off-screen or hibernated browser islands suspend iframe execution to save RAM/CPU, restoring state upon re-entry.

7. **Dozens-to-Hundreds Room Performance Optimization**:
   - Add CSS `contain: layout style paint;` and `content-visibility: auto;` to `.map-room`.
   - Prevent background rendering lag when hundreds of rooms or islands are loaded.

8. **Fractal Polytrope Summarizer Integration**:
   - Port `fractal_summarizer.py` into native zero-dependency JavaScript (`fractal_summarizer.js`).
   - Preview pane includes `[ 📄 Full Text ]` and `[ 🧬 Fractal Polytrope Summary ]` tabs for markdown and text files.
   - Outputs: Level 1 Invariant Singularity, Level 2 7-Plane Geodesic Summary, and Level 3 Section Invariant Spine.

---

## 2. File Modifiers
- `renderer.js`:
  - Wheel listener overhaul (Shift+Wheel zoom, Alt+Wheel room icon resize, natural scrolling inside rooms and files).
  - New file/folder creation without `show()` wipes.
  - Room payload size in header.
  - Comment out Lens mode from view selectors.
  - Spawn at click coordinates `(clickWx, clickWy)`.
  - Browser Island implementation with auto-sleep.
  - Settings modal DOM and event handlers.
  - Room color palettes (Rainbow, Neon, Pastel, Disco, Inherit).
  - Preview pane Fractal Polytrope Summarizer tab.
- `fractal_summarizer.js`:
  - Native client-side port of `fractal_summarizer.py`.
- `styles.css`:
  - Settings modal styling.
  - Browser island styling.
  - Palette and disco mode animations.
  - Preview summary card styles.
- `package.json`:
  - Bump version to `0.8.16`.
- `plans/task.md`:
  - Record v0.8.16 completion.

---

## 3. Verification Plan
- Syntax validation with `node -c`.
- Smoke test verification: `npx electron . --smoke-test --no-sandbox`.
- Confirm 41/41+ smoke tests pass.

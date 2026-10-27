# Implementation Plan 21 — v0.8.6 Native Explorer Parity & Tactical Radar HUD (Phases 1 & 2)

**Project**: Peek Explorer (`e:\Vector Field Theory\peek_explorer`)  
**Status**: Completed  
**Author**: Antigravity (Lazy Senior Dev Mode)  
**Date**: 2026-10-24  

---

## 1. Problem Statement & Architecture Objectives

Following the Gen 1 Agent Breeding Audit by **The Son (Veritas-Struct)** and **The Daughter (Chroma-Horizon)**, this release addresses:
1. **Phase 1: Native Explorer Parity & Ergonomic Polish**:
   - Implement missing native keyboard shortcuts (`Ctrl+Shift+N`, `Alt+Enter`, `Shift+Delete`).
   - Fix 2D spatial arrow navigation in Grid views (`medium`, `large`, `xl`, `tiles`, `small`) so `ArrowDown`/`ArrowUp` jump rows according to dynamic stride $N$ instead of horizontal $\pm 1$.
   - Maintain selection continuity after item deletion (select adjacent index instead of dropping to 0).
   - Eliminate the accidental 550ms mousedown rename trap.
   - Add `requestAnimationFrame` coalescing to Landscape panning to eradicate layout thrashing.
   - Enforce UNC path (`\\server\share`) normalization in breadcrumbs and hierarchy navigation.
2. **Phase 2: Tactical Radar HUD & Draggable Splitter Handle**:
   - Add an interactive 190×130px RTS Minimap Radar canvas to Landscape mode displaying room footprints, camera viewport frustum, and click-to-warp navigation.
   - Add a draggable split resizer handle between `#content` and `#splitPane` with clamped 20%–80% ratio persistence.
   - Wire `Ctrl+F` filter matches to emit golden sonar radar rings on matching rooms and minimap blips.

---

## 2. Technical Implementation Details

### A. Phase 1 — Native Explorer Parity
1. **`main.js`**:
   - Add `ipcMain.handle('deletePermanent', async (_e, paths) => { ... })` using `fs.promises.rm(p, { recursive: true, force: true })`.
2. **`preload.js`**:
   - Expose `deletePermanent: (paths) => ipcRenderer.invoke('deletePermanent', paths)`.
3. **`renderer.js`**:
   - Bind `Ctrl+Shift+N` to create a new folder in `cur` and immediately open inline rename.
   - Bind `Alt+Enter` to call `window.api.props(selectedPath || cur)`.
   - Bind `Shift+Delete` to prompt for permanent deletion confirmation and call `deletePermanent`.
   - Compute dynamic column stride in grid views (`getGridStride()`) and route `ArrowUp`/`ArrowDown` by $\pm \text{stride}$ and `ArrowLeft`/`ArrowRight` by $\pm 1$.
   - In `doDelete()`, capture index before deletion and restore focus to adjacent item after `refreshKeep()`.
   - In `makeItem()`, remove the 550ms hold-timer.
   - In `onPanMove()`, wrap `updateCameraAndLens()` in `requestAnimationFrame` loop.
   - In `renderCrumbs()`, support `\\server\share` UNC segments cleanly.

### B. Phase 2 — Tactical Radar HUD & Draggable Split Pane
1. **`index.html` & `styles.css`**:
   - Add `<div id="splitGrip" class="split-resizer" title="Drag to resize split pane"></div>` between `#content` and `#splitPane`.
   - Add `.landscape-minimap` canvas inside the Landscape viewport overlay.
   - Add `.split-resizer` CSS styling with hover state, active drag cursor, and flex basis updates.
   - Add sonar pulsing radar ring animations (`@keyframes radar-pulse`).
2. **`renderer.js`**:
   - Add `renderMinimap()` function drawing room bounding boxes and the camera viewport rectangle on a 190×130px canvas.
   - Bind pointer events on `.landscape-minimap` to warp the camera coordinates to the clicked world location.
   - Add splitter drag listener updating `--split-ratio` and persisting to `settings.json`.
   - Add search hit highlighting on minimap and rooms when `filterText` matches room items.

---

## 3. Verification Plan
- Verify all 22 existing smoke tests pass.
- Add test assertions for `Ctrl+Shift+N`, `Alt+Enter`, grid stride arrow keys, and minimap presence.
- Ensure 0 lingering Electron processes on exit.

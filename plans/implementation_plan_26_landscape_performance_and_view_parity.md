# Implementation Plan 26: Landscape Performance Optimization, Icon View Parity & 1-Click Open Invariant (v0.8.11)

**Active Project**: `e:\Vector Field Theory\peek_explorer`  
**Date**: 2026-10-25  
**Version**: 0.8.11 (In-Tree R&D)  

## Context & User Feedback
1. **Slow Room Loading**: The user reported: *"is there any way to fix the slow loading? it takes an age to load some rooms"*.
2. **Icon & Text Truncation in Landscape Views**: As shown in the user's screenshot (`media_1792877364194_25900803.png`), switching a room to Large Icons squashed the cards, broke text clamping, and placed a bulky `[🏝️ Bridge]` button inside the filename div that clipped over the title.
3. **1-Click Open Invariant**: The user specified: *"the only place we want '1-click open' is the landscape mode"*. Everywhere else (normal views, Home Dashboard), single-click must select and double-click must open. In Landscape mode, single-click must open and navigate.

## Root Cause Analysis
1. **Thumbnail IPC Crawl Overload**:
   - `ipcMain.handle('icon')` was calling `nativeImage.createThumbnailFromPath(dirPath, { width: 32, height: 32 })` on every single directory. On Windows, querying folder thumbnails causes the shell to inspect folder contents, causing 500ms–2000ms stalls per folder.
   - Text, code, and markdown files (`.txt`, `.md`, `.js`, `.py`) were also calling thumbnail extraction, timing out, and looping through 4096-pixel bitmaps with `isBlank`.
2. **Serial 20-Room Spawning Loop**:
   - When entering Landscape mode, `renderLandscape` executed a blocking sequential `for (let i = 0; i < 20; i++) await spawnRoom(...)` loop, reading up to 20 subfolders and thousands of files from disk before rendering.
3. **Card Layout & Clumsy Inline Button**:
   - `.rm-bridge-btn` was appended inside `.c-name`, breaking flex wrapping and exceeding the fixed card height (110px).
   - Changing view modes in a room did not trigger auto-fit recalculation.

## Architectural Changes

### 1. Instant Folder & File Icon Resolution (`main.js`)
- Dedicated `getFolderIcon(p, px)` helper:
  - Bypasses `nativeImage.createThumbnailFromPath` completely for directories.
  - Caches generic directory icons in memory under `'DIR|' + px` (0 ms lookup).
- Added `THUMB_EXTS` allowlist (`.jpg`, `.png`, `.webp`, `.mp4`, etc.):
  - Only genuine media formats attempt thumbnail extraction.
  - Documents, code, and folders resolve instantly via cached shell icons.

### 2. Fast Parallel Sub-Room Spawning (`renderer.js`)
- Replaced serial 20-room loop with parallel `Promise.all`:
  - Restores rooms saved in `layout.rooms`, or spawns at most the top 4 child rooms on fresh directories.
  - All sub-room filesystem reads and DOM creations execute in parallel.

### 3. Room Card View Parity & Dynamic Auto-Fit (`renderer.js` & `styles.css`)
- Replaced the inline button in `.c-name` with an absolute top-right badge: `.rm-bridge-indicator` (`🏝️` / `🌉`).
- `.c-name` now has 100% of the card width for the filename with clean 2-line ellipsis wrapping.
- Updated card dimensions:
  - `v-medium`: 82px width, min-height 88px, 40px icon, 10px text.
  - `v-large`: 110px width, min-height 122px, 56px icon, 11px text.
  - `v-xl`: 144px width, min-height 156px, 80px icon, 11.5px text.
- `setRoomView()` now invokes `autoFitRoom()` immediately when changing a room's view mode, resizing the room box to perfectly contain the new card format.

### 4. 1-Click Open Exclusively in Landscape Mode (`renderer.js`)
- In Landscape mode:
  - Single-click on a folder card (`.room-item.is-dir`): instantly spawns/bridges the room (if not yet open) and flies the camera to center on it!
  - Single-click on a file card: opens the file.
  - Checkbox click: toggles selection without navigating.
- In normal views and Home Dashboard:
  - Single-click strictly selects and populates the Preview Pane.
  - Double-click navigates / opens.

## Verification
- `npm test` runs 35 automated smoke test assertions in `main.js`. All 35 pass.
- Verified process table is clean with zero lingering Electron processes.
- Strict adherence to No-Portable / No-Zip invariant.

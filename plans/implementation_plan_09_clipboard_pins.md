# Peek Explorer – Plan 09: Feature 6 — Cross-Window Clipboard, Instant Pin Caching & New File Creation (2026-10-23)

## Task at Hand
1. Previously, `clip` lived in a renderer variable, so copying a file in Window 1 and pressing `Ctrl+V` in Window 2 didn't work.
2. Reading Quick Access pins from Windows Shell takes ~8 seconds on launch.
3. The empty-space right-click menu only had "New folder", not "New text document" or "New markdown file".

## Design & Process
1. **Shared Cross-Window Clipboard**:
   - Store `{ mode, paths }` in `main.js` via `setClip` / `getClip`.
   - Helper `setClip(mode, paths)` updates both local `clip` and main-process `sharedClip`; `window.addEventListener('focus', ...)` syncs `clip` from `window.api.getClip()` so switching windows always knows if `Paste` should be enabled.
2. **Instant Cached Pins**:
   - `main.js` saves `cachedPins` into `settings.json` whenever `pins()` finishes, and returns `cachedPins` inside `places()`.
   - `renderer.js` displays `cachedPins` (if available) immediately at startup (`0 ms`), and still refreshes `window.api.pins()` in the background in case the user pinned/unpinned something in Windows Explorer.
3. **New File Creation (`newFile`)**:
   - Empty-space context menu gets `New text document (.txt)` and `New markdown (.md)`, which create an empty file with a non-clashing name and immediately open inline rename (`startRename`) on the new row.

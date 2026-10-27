# Implementation Plan 17 — v0.8.1: Native Bidirectional Drag-and-Drop (Native to Peek & Peek to Native)

**Date**: 2026-10-24  
**Status**: Implemented & Verified  

## 1. Problem Statement
The user requested:
> *"can we get native file drag-drop move so we can drag from peek to native and native to peek? or at least native to peek?"*

Previously:
- **Native to Peek**: `wireDropTarget` strictly checked `if (!e.dataTransfer.types.includes(MIME_PATHS)) return;`. When files were dragged from Windows Explorer, Desktop, or other native applications, `e.dataTransfer.types` contains `'Files'`, not `MIME_PATHS`. Thus, all native OS drops into Peek Explorer were blocked. Furthermore, dropping on empty floor space in `#list` was not wired to `wireDropTarget`.
- **Peek to Native**: Dragging items from Peek Explorer only populated HTML5 `MIME_PATHS` in `e.dataTransfer`, which the Windows OS shell does not recognize as an OLE `CF_HDROP` drag. Electron requires `event.sender.startDrag()` in the main process to bridge the drag to the OS.
- **Cross-Device Move Error**: In `ipcMain.handle('paste')`, `mode === 'cut'` used `fs.promises.rename(s, dest)`. Moving files across different drive mount points (e.g. `C:\` to `E:\`) in Windows threw `EXDEV: cross-device link not permitted`.

## 2. Implemented Architecture

### A. Preload Bridge (`preload.js`)
- Required `webUtils` from Electron.
- Exposed `window.api.getPathForFile(file)` using `webUtils.getPathForFile(file)` (with fallback to `file.path`) to safely resolve absolute paths from native `File` objects in Electron 33.
- Exposed `window.api.startDrag(paths)` sending IPC `start-drag` to the main process.

### B. Main Process Native Drag & Cross-Device Paste (`main.js`)
- Added `ipcMain.on('start-drag', async (event, paths))` to call `event.sender.startDrag({ file: paths[0], files: paths, icon: icon || nativeImage.createEmpty() })` with real shell icons fetched via `app.getFileIcon()`.
- Updated `ipcMain.handle('paste')`: When `mode === 'cut'` throws `EXDEV` or `EPERM` (moving across different drive letters), it gracefully falls back to `fs.promises.cp(s, dest, { recursive: true })` followed by `fs.promises.rm(s, { recursive: true, force: true })`.

### C. Renderer Bidirectional Drag & Drop (`renderer.js`)
- In `wireDropTarget`:
  - Updated `dragover` to accept both `MIME_PATHS` and native `Files` (`hasSupportedDrop(e.dataTransfer.types)`).
  - Configured `e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move'`.
  - In `drop`, resolved source paths from both `MIME_PATHS` and `e.dataTransfer.files` using `window.api.getPathForFile(f)`.
  - Default operation is **move** (`'cut'`), or **copy** (`'copy'`) if `Ctrl` is held.
- Wired `wireDropTarget($('list'), () => cur)` so dropping onto empty floor space in `#list` moves/copies files into the current folder.
- In `makeItem` and Landscape `.room-item`:
  - Added `window.api.startDrag(paths)` on `dragstart` so dragging files out of Peek Explorer initiates a native Windows OS drag that can be dropped into Windows Explorer, Desktop, or third-party apps.

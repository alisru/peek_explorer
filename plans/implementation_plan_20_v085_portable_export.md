# Implementation Plan 20 — v0.8.5 Standalone Portable Export & USB Data Mode

**Project**: Peek Explorer (`e:\Vector Field Theory\peek_explorer`)  
**Status**: Completed  
**Author**: Antigravity (Lazy Senior Dev Mode)  
**Date**: 2026-10-24  

---

## 1. Problem Statement & User Request

### User Request
> "cool, can we get an export like a portable sharable version?"

### Objectives
1. Create a 100% standalone, zero-dependency, self-contained Windows executable package for Peek Explorer.
2. Ensure the recipient or portable user does NOT need Node.js, npm, or admin permissions installed on their system.
3. Support true USB / thumb-drive portable data persistence: if a `data/` directory exists adjacent to `PeekExplorer.exe`, user settings, pins, split configurations, and history are stored locally within that folder instead of the user's host `%APPDATA%`.
4. Provide a repeatable, automated export command (`npm run export`) that bundles the application, verifies it with the smoke test suite, and compresses it into a single `.zip` distribution file.

---

## 2. Technical Architecture

### A. Standalone Binary Extraction
- Peek Explorer uses standard Electron without native binary addons or external runtime dependencies.
- Electron's pre-built binaries in `node_modules/electron/dist/` are copied to `dist/PeekExplorer-portable/`.
- `electron.exe` is renamed to `PeekExplorer.exe`.

### B. Application Payload Assembly
- `resources/default_app.asar` is removed.
- `resources/app/` is populated with the clean runtime payload:
  - `package.json`
  - `main.js`
  - `preload.js`
  - `renderer.js`
  - `index.html`
  - `styles.css`
  - `README.md`
  - `CHANGELOG.md`
  - `docs/`
- All development files (`node_modules/`, `plans/`, temporary scripts) are excluded, keeping the app payload under 300 KB.

### C. Portable Data Isolation (`main.js`)
- Added local data directory detection:
  ```javascript
  const portableDataDir = path.join(path.dirname(process.execPath), 'data');
  if (app.isPackaged && fs.existsSync(portableDataDir)) {
    try { app.setPath('userData', portableDataDir); }
    catch (e) { console.warn('Could not set portable userData path:', e.message); }
  }
  ```
- An empty `data/` folder is bundled in the portable distribution so settings travel with the application on USB drives.
- If the `data/` folder is deleted by the user, Peek Explorer seamlessly falls back to standard Windows `%APPDATA%\peek-explorer`.

### D. Verification & Packaging Pipeline (`export-portable.js`)
- Added `export-portable.js` executable via `npm run export` and `npm run build:portable`.
- Executes `PeekExplorer.exe --smoke-test` on the newly assembled portable folder before packaging to guarantee the export runs cleanly.
- Compresses `dist/PeekExplorer-portable/` into `dist/PeekExplorer-v0.8.4-portable.zip` for sharing.

---

## 3. Verification & Export Output
- **Folder**: `e:\Vector Field Theory\peek_explorer\dist\PeekExplorer-portable` (270.9 MB uncompressed)
- **Zip**: `e:\Vector Field Theory\peek_explorer\dist\PeekExplorer-v0.8.4-portable.zip` (109.7 MB shareable zip)
- **Executable**: `e:\Vector Field Theory\peek_explorer\dist\PeekExplorer-portable\PeekExplorer.exe`
- **Smoke Tests**: 23/23 tests passed on the packaged binary.
- **Lingering Processes**: 0 active processes.

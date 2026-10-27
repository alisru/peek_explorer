# Implementation Plan 28: Spawn Folder from Anywhere & Render HTML in Landscape and Tabs

## Objective
1. **Fix Landscape File Selection**: Ensure files NEVER open on single click in Landscape mode. Single-click exclusively selects and updates preview/status. Double-click opens.
2. **Spawn Folders Directly into Landscape**: Allow spawning any directory from disk into Landscape mode from:
   - Landscape HUD (`➕ Spawn Folder` button with native folder picker).
   - Drag & Drop onto the landscape canvas from sidebar, other windows, or Explorer.
   - Context Menu on ANY folder in the app (`🗺️ Spawn Room in Landscape`).
   - Canvas right-click context menu (`➕ Spawn Folder from Disk...`).
3. **Render HTML Files Inside the Landscape**:
   - Provide an HTML Island (`.map-room.html-room`) with an embedded `<iframe>` rendering the HTML file directly on the landscape canvas.
   - Resizable (`rz-r`, `rz-b`, `rz-br`), draggable header, collision-aware placement.
   - Action controls: Reload, Open in New Tab, Open in Native Browser, Zoom, Close.
   - Radar representation in tactical radar HUD.
   - HUD button: `🌐 Spawn HTML`.
4. **Render HTML Files as New Tabs**:
   - Support opening any HTML file in a new tab inside Peek Explorer (`renderHtmlTab`).
   - Top banner with Reload, Native Browser, View in Landscape, and Show in Folder.
   - Full-bleed responsive `<iframe>` inside the tab workspace.

## Proposed Changes

### 1. `main.js` & `preload.js`
- Enable `webSecurity: false` in `BrowserWindow` `webPreferences` to permit local `file://` `<iframe>` rendering with relative assets.
- Add IPC handlers:
  - `pickFolder`: `dialog.showOpenDialog({ properties: ['openDirectory'] })`
  - `pickHtmlFile`: `dialog.showOpenDialog({ filters: [{ name: 'HTML Files', extensions: ['html', 'htm'] }, { name: 'All Files', extensions: ['*'] }] })`
- Expose `window.api.pickFolder` and `window.api.pickHtmlFile` in `preload.js`.

### 2. `styles.css`
- Styles for `.map-room.html-room` and `.map-html-body` with `iframe.html-island-frame`.
- Styles for `.v-html-tab` with `.html-tab-toolbar` and `.html-tab-frame`.
- Styles for canvas right-click context menu and HUD spawn buttons.

### 3. `renderer.js`
- **File Single-Click Fix**: Update `row.onclick` in `spawnRoom` so non-directories do not trigger `window.api.open`.
- **HTML Island Engine**:
  - `spawnHtmlIsland(filePath, title, prefPos)`: Creates and positions the HTML viewer island.
  - Persists in `layout.htmlIslands`.
  - Integrates with radar renderer and collision separation.
- **Folder Spawning**:
  - Add `spawnFolderFromAnywhere(folderPath)` to spawn an arbitrary directory into the active landscape layout.
  - Canvas drag-and-drop handler on `viewport` converting `clientX/Y` to world coordinates `(wx, wy)`.
- **HTML Tab Engine**:
  - `renderHtmlTab(filePath, container)`: In-tab renderer for HTML files.
  - Updated `show()` check for `/\.html?$/i.test(cur)`.
- **Context Menus**:
  - Update `showMenu` with "Spawn Room in Landscape" for directories.
  - Update `showMenu` with "Open in Landscape (Render HTML)" and "Open in New Tab" for HTML files.
  - Canvas background context menu for empty landscape space.

### 4. Automated Tests
- Test single click on file in Landscape mode does not trigger `window.api.open`.
- Test spawning folder into landscape creates new room island.
- Test spawning HTML file creates `.html-room` with `iframe`.
- Test opening HTML file in tab renders `v-html-tab`.

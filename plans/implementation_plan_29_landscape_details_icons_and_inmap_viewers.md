# Implementation Plan 29: Fix Folder Icons, Tab/Folder View Retention, Landscape Details Fix, and In-Landscape File Open

## Objective
1. **Fix Folder Icon**: Fix `getFolderIcon` in `main.js` so directory icons are real Windows shell folder icons (resolving the issue where folders showed a system drive/chassis icon).
2. **Per-Tab & Per-Folder View Retention**: Store `mode` per tab in `saveTab()`/`loadTab()`, and persist preferred folder view modes in `folderViews[cur]` in `settings.json`.
3. **Landscape Details View Fix & Standard File Info**:
   - Add `flex: 0 0 24px !important;` to `.room-item` in `v-details` to completely eliminate vertical text overlapping/crushing.
   - Expand and balance column widths (Name, Date modified, Type, Size).
   - Add a sticky column header bar (`.rm-details-head`) for Details view inside rooms.
   - Show file size subtitle (`.c-tile-sub`) on Tiles view cards and other room views so file sizes are always visible.
4. **Remove Max Room Size Cap & Remove Disliked W/H Sliders**:
   - Allow rooms to expand up to `2600×1800` without artificial caps.
   - Remove the `W`, `H`, and `Icon` sliders from the landscape HUD.
   - Provide generous, content-aware default room sizing on spawn so rooms fit their contents without immediate scrollbars.
5. **In-Landscape File Opening**:
   - Double-clicking (or pressing Enter on) any file in Landscape mode opens it **within the landscape itself** as an in-map viewer island (`spawnFileViewerIsland`).
   - `Shift + Double-click` (or `Shift + Enter`) opens the file natively in Windows.
6. **Drag Files to Empty Space to Extract/Move into New Subfolder Room**:
   - When files from a room are dropped onto empty canvas space, create a new subfolder in the parent folder, move the dropped files into it, and spawn the new subfolder as a connected island.
7. **Cleanly Disable Gluon Semantic Telemetry**:
   - Remove Gluon telemetry from preview pane and UI while the user works on the concepts.

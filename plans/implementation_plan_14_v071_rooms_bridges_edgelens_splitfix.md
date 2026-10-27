# Implementation Plan 14 — v0.7.1: Fix Split Up/Down Layout, Rooms & Bridges Landscape Architecture, and Inner/Outer Edge Lens

**Date**: 2026-10-23
**Status**: Implementing

## 1. Fix `Split Up` / `Split Down` / `Split Left` / `Split Right` Flexbox Overflow (Image 1)
- **Root Cause**: In `styles.css`, `#content` lacked `overflow: hidden; min-height: 0; flex: 1 1 50%`, so when `#workspace.split-up` (`flex-direction: column-reverse`) was applied, `#content` (especially on the Home Dashboard) expanded past 50% height and pushed `#splitPane` off the top of the window.
- **Fix**:
  - Give `#workspace > #content` and `#workspace > #splitPane` strict `flex: 1 1 50%; min-width: 0; min-height: 0; overflow: hidden;` when split is active.
  - Ensure `.dash` scrolls inside `#list` (`box-sizing: border-box`) without pushing parent flex containers.

## 2. Folders as Islands / Rooms Connected by Bridges (`🗺️ Landscape` Mode)
- Replace scattered spiral nodes with a **Room / Island & Bridge Dungeon-Map Architecture**:
  - **Central Room (Current Folder)**: A clean, structured rectangular Room/Island at the center of the map holding the current folder's files and folders in a neat grid.
  - **Subfolder Rooms Connected by Bridges**:
    - By default in Landscape mode, the top subfolders (and any folder you click `▸` on at any depth) spawn as **neighboring Rooms / Islands** placed cleanly in non-overlapping grid/compass slots around their parent room.
    - An `<svg class="map-bridges">` layer draws **visual Bridges** (styled like map walkways/connectors with direction dots) linking each parent folder card to its child Room/Island.
    - Expanding a subfolder inside a child Room spawns a depth-2 Room further out, connected by another Bridge.
    - Every Room can be dragged freely by its title bar (updating its bridge in real time and saving its position), and files can be dragged between any two Rooms.

## 3. Inner/Outer Frame Edge Lens for Far-Away Files & Rooms (Image 2)
- Match the user's two-rectangle diagram (`media_1792720372761_b94c22fb.png`):
  - **Inner Rectangle (Normal 1:1 Viewport)**: Everything inside the main inner rectangle renders at **100% normal readable size** (no shrinking items in the middle of the screen).
  - **Outer Margin Band (The Edge Lens)**: A visible inner frame boundary separates the main view from the outer **Edge Lens Margin** (76px band around the perimeter).
  - Any Rooms, folders, or files that are **outside the Inner Rectangle** (far away to the East, West, North, or South) project into the **Edge Lens Margin** along the direction they lie, queued outward from the inner border in decreasing size steps (`48px → 34px → 24px → 16px → 10px` squares, matching Image 2).
  - Clicking any item in the Edge Lens Margin smoothly flies the camera to bring that distant Room/file into the Inner Rectangle.

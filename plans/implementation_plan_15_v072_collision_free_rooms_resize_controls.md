# Implementation Plan 15 — v0.7.2: Collision-Free Room Layout, Width/Height Controls, Toggle-Click Doorways & Full Explorer Controls in Landscape Mode

**Date**: 2026-10-23
**Status**: Implementing

## 1. Visual Critique of v0.7.1 Screenshot (`media_1792727400461_e9ace643.png`)
1. **Runaway Vertical Room Height**: Folders with many files (`downloads`, `x downloads`) grew into 2,000px-tall columns because `.map-room` had no fixed/capped height (`height: var(--room-h)`), causing them to slice vertically through neighboring rooms.
2. **Room Overlap on Load**: `defaultRoomPos` placed rooms on a fixed ellipse without checking Axis-Aligned Bounding Box (AABB) collisions against the Root Room or previously spawned rooms (`FileHistory` spawned directly on top of `downloads`).
3. **Doorway Click Semantics**: Clicking an already-open folder pill inside a room panned the camera instead of closing the room. Single-click should toggle open/close, and double-click should move the camera to that room.
4. **Missing Box Width/Height Controls & Regular Explorer Controls**: Users need direct Width/Height controls (both per-room drag resize handles + HUD default W/H & File Scale controls) and full Peek Explorer actions inside every room (right-click empty room floor for New Folder / New File / Paste / Terminal in that room's directory, inline rename `F2` / hold-click, checkboxes `☑`, and live `Ctrl+F` filter across all rooms).
5. **Edge Lens Boundary Alignment**: One top proxy (`Mi...`) sat inside the inner frame line instead of outside in the margin band.

## 2. Upgrades Implemented in v0.7.2
- **Bounded & Resizable Room Boxes (`w × h`)**:
  - Every `.map-room` has explicit `width` and `height` (default `350 × 250`, persisted per room in `landscapeLayout[dir].rooms[path]`), with scrollable `.map-room-files` inside the room, a bottom-right `.room-resizer` drag handle, right/bottom edge resize zones, a `⤢ Fit` button on the room header, and **global Room W / Room H / Indoor File Size sliders** in the bottom HUD.
- **Zero-Overlap AABB Placement & Relaxation Solver**:
  - `findFreeRoomPosition(prefX, prefY, w, h, parentX, parentY, prefAngle)` checks candidate positions against all existing rooms in `roomMap` (with a `32px` safety corridor) and steps outward/angularly until zero overlap is guaranteed.
  - `resolveRoomCollisions()` runs an iterative AABB separation pass on load and after resizing so no room ever sits underneath another room.
- **Single-Click Toggle Close / Double-Click Camera Pan on Folder Doorways**:
  - Single-clicking `.room-door` (`📁 Subfolder`) opens its Room if closed, or **closes its Room** if already open.
  - Double-clicking `.room-door` smoothly moves/centers the camera onto that Room (spawning it first if closed).
- **Full Peek Explorer Controls Inside Every Room**:
  - Inline rename (`F2` / slow-click / hold-click), multi-select (`Ctrl`/`Shift`/Checkboxes `☑`), right-click file/folder context menu, AND right-clicking empty space inside any Room's floor opens the **Room Folder Context Menu** (`New folder here`, `New file here`, `Paste into this room`, `Open PowerShell here`, `Run Script here`).
  - Live `Ctrl+F` filter highlights/filters files and doorways across all open Landscape rooms in real time.

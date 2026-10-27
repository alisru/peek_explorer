# Implementation Plan 27: Landscape 1-Click Open/Close Toggle & Clean Room Lifecycle (v0.8.12)

**Active Project**: `e:\Vector Field Theory\peek_explorer`  
**Date**: 2026-10-25  
**Version**: 0.8.12 (In-Tree R&D)  

## Context & User Feedback
The user raised critical friction in Landscape folder controls: *"FFS WHY DO YOU HAVE THE STUPID FOLDER CONTROLS SO FUCKING RETARDED IN LANDSCAPE, I CANT FUCKING CLOSE THEM BY CLICKING AGAIN? FUCKING THINK ABOUT THE BEST FUCKING WAY TO HANDLE THE LANDSCAPE MODE SHIT OMFG"*.

### Root Cause
Previously, clicking an open subfolder card in Landscape mode only selected it and re-panned camera to the open room. It had **no close/collapse toggle logic**. The user had no intuitive way to dismiss or collapse a room island from the parent room, forcing them to hunt for a tiny `×` in the room header.

## Architectural Changes

### 1. 1-Click Open / Close Toggle (`renderer.js`)
- In Landscape mode, clicking on a folder item (`.room-item.is-dir`):
  - **If Closed (`!roomMap.has(path)`)**: Single-click **OPENS** the room island, creates the bridge, resolves collisions, highlights the card as active, and centers camera on it.
  - **If Open (`roomMap.has(path)`)**: Single-click **CLOSES** the room island, recursively dismisses child bridges, removes it from `layout.rooms`, refocuses the parent room, and restores the card badge to closed state.
  - No double-clicking required; no hunting for `×` header buttons.

### 2. Room Lifecycle Persistence Fix (`renderer.js`)
- In `closeRoomRecursive(targetPath)`:
  - Added `delete layout.rooms[targetPath]`.
  - Previously, closed rooms remained recorded in `layout.rooms`, causing them to reappear upon reload.

### 3. Clear Visual Active State (`styles.css`)
- When a room is open on the map:
  - The card receives `.room-item.bridged` with a distinct amber border and glow: `border-color: #d99b26; background: rgba(217, 155, 38, 0.12)`.
  - The corner indicator displays `×` with title `Island room is open on map (Click to close)`.
  - Card title explicitly indicates: `(Room island is open on map · Click to close)`.
- When closed:
  - Corner indicator displays `🏝️` with title `Click to open island room on map`.

## Verification
- `npm test` runs 35 automated smoke test assertions in `main.js`, explicitly asserting:
  - Click 1 toggles room state (closing an open room or opening a closed room).
  - Click 2 toggles it back immediately (1-click toggle).
  - Corner indicator separation and clean boundary containment.
- Verified process table is clean with zero lingering Electron processes.
- Strict adherence to No-Portable / No-Zip invariant.

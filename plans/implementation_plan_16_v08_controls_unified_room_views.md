# Implementation Plan 16 — v0.8: Controls Overhaul, Unified Room Item Flow, Global & Local View Modes, and Explorer Research & QOL Roadmap

**Date**: 2026-10-24
**Status**: Implementing

## 1. Diagnostics & Root Cause Analysis
- **Clicking & Dragging also Selects**:
  - In `renderer.js` line 676, the global rubber-band mousedown listener on `listEl` checked `if (cur === HOME_URI || e.button !== 0 ...)`. It did **not** check if `mode === 'landscape'`, so when users clicked and dragged the background canvas to pan the map, `#rubber` was activated simultaneously and selected all nodes under the cursor.
  - **Resolution**:
    - Disallow global `#rubber` in Landscape mode (`if (mode === 'landscape' || ...) return;`).
    - Dedicated Canvas Pan: Left-drag on canvas background strictly pans (`camX`, `camY`), with zero selection. Clean click without drag clears selection.
    - Intentional Marquee: `Shift + Drag` on the canvas background performs marquee multi-selection across rooms.
    - Inside Rooms: Clicking items selects them; dragging items starts file drag-and-drop; dragging room header moves room; dragging room borders resizes room.
- **Empty White Desert in Rooms (Screenshot `media_1792801667742_c502ca43.png`)**:
  - Rooms previously split items into two separate compartments: `.map-room-doors` (folders, max-height 76px with scrollbar) and `.map-room-files` (files, taking all remaining room space). In folders with only subdirectories (e.g. `D:\`), files were empty, leaving a huge white void while folders were cramped into 76px.
  - **Resolution**:
    - Unify all folder contents (both subdirectories and files) into a single, cohesive `.map-room-body` that respects the active view mode.
    - Folders and files flow together in sort order or grouped, with folders featuring an inline `[🏝️ Bridge]` toggle button.
- **Global & Local View Modes**:
  - Global View dropdown in toolbar and HUD applies to all rooms (`details`, `tiles`, `list`, `small`, `medium`, `large`, `xl`, `content`).
  - Local View selector in each Room header (`👁 View ▾`) and right-click menu overrides the view for that specific room (persisted per room in `landscapeLayout[dir].rooms[path].view`).
- **Research & QOL Roadmap**:
  - Comprehensive report on community wishlists (DOpus, Files App, Total Commander, Spacedrive) and actionable QOL features for Peek Explorer.

# Implementation Plan 13 — v0.7: Tab Split Dropdown (L/R/U/D), Lens Mode & Video-Game Landscape Map Mode

**Date**: 2026-10-23
**Status**: Implementing

## 1. Concept & Video-Game Map Geometry
Based on the user's spatial sketch (`media_1792719553492_feba677c.png`):
- Instead of treating directories strictly as flat 1D scrolling lists, files and folders can obey **spatial Level-of-Detail (LOD) and camera/lens falloff rules** like a video game map:
  1. **Tab Split Dropdown (`▾` on Tabs → Split Left `◧`, Right `◨`, Up `⬒`, Down `⬓`)**:
     - Every tab gets a `▾` split menu (also in the tab right-click menu and toolbar `◫ Split` button) to split the workspace Left, Right, Up, or Down.
     - Opens a secondary interactive explorer pane with its own path bar, view mode selector, inline folder expansion (`▸`), and cross-pane drag-and-drop.
  2. **Lens Mode (`🔍 Lens` View)**:
     - Displays all items in the folder simultaneously by scaling base tile size to fit the viewport count, combined with a **Focal Lens falloff** around the cursor/focus point.
     - Items near the focal point render as large squares (`110px–135px`) with full thumbnails and labels; items further away step down progressively (`76px → 52px → 34px → 20px → 12px` micro-boxes) just like the user's sketch.
  3. **Landscape Mode (`🗺️ Landscape` View — 2D Canvas + Sub-Containers + Horizon Radar Ring)**:
     - Freeform 2D pannable/zoomable world canvas where folders and files have persistent `(x, y)` coordinates per directory (defaulting to a golden-angle spiral / cluster layout around the origin).
     - **Sub-Containers**: Expanding a folder (`▸`) on the Landscape turns it into a **draggable, resizable 2D Sub-Container territory** on the map containing its children, and users can also create custom visual Zone Containers on the canvas.
     - **Distance LOD & Horizon Ring**: Items far from the camera center shrink via LOD (`scale` + compact indicator mode), and any items outside the visible camera radius project onto a **Perimeter Horizon / Radar Ring** around the viewport edge as tiny clickable indicator squares (`□` / `▪`). Clicking any horizon indicator smoothly pans the camera to that item.

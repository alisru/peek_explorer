# Implementation Plan 12 — v0.6.1: Drag-and-Drop Script Registration & Surgical In-Place Rename

**Date**: 2026-10-23
**Status**: Implemented

## 1. Drag Scripts onto `⚡ Scripts` Button (and Home Dashboard Section)
- Added `wireScriptDrop(el)` in `renderer.js` attached to both `#scriptsBtn` in the top toolbar and the `⚡ Script Connections` section on the `🏠 Home` Dashboard.
- Accepts both internal Peek Explorer drags (`application/x-peek-paths`) and external OS drags from Windows Explorer (`e.dataTransfer.files`).
- Highlights `#scriptsBtn` with `.drop-target` on dragover, registers all dropped script paths into `scripts` (deduplicating case-insensitively), persists settings, updates the status bar, and pops open the `⚡ Scripts` menu immediately so the user sees the newly added script.

## 2. Surgical In-Place Rename (No Full List Refresh / No View Reset)
- Added `applyItemRenameInPlace(it, cell, newPath)` in `renderer.js`.
- Updates `it.path`, `it.name`, `selected`, `anchorPath`, `focusedPath`, `lastClickPath`, `folderSizeCache`, and recursive `expanded` folder paths + child row paths in-place without clearing `#list` or resetting scroll position.
- Used across all 5 rename paths:
  1. Inline rename (`F2` / right-click / hold-click / slow second click)
  2. Preview pane direct rename textbox
  3. Preview pane multi-file Batch Rename
  4. Undo rename (`Ctrl+Z`)
- Also preserved `list.scrollTop` across `show()` refreshes so even full directory refreshes keep scroll position stable.

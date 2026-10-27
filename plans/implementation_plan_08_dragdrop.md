# Peek Explorer – Plan 08: Feature 5 — Drag-and-Drop & Tab Reordering (2026-10-23)

## Task at Hand
Standard file explorers let you drag files/folders into other folders (including expanded folders, sidebar items, and breadcrumb segments) to move or copy them, and drag tabs to reorder them.

## Design & Process
1. **Row Drag Source (`makeItem`)**:
   - Set `cell.draggable = true`.
   - On `dragstart`: if the dragged row is not yet in `selected`, select it first; store `dragPaths = [...selected.keys()]` in `e.dataTransfer` (`application/x-peek-paths`).
2. **Drop Targets (Folder rows, Sidebar items, Breadcrumb segments)**:
   - Any folder row (`it.isDir`), sidebar `.n` item, or `.crumb` highlights with `.drop-target` on `dragover`.
   - Hovering over a collapsed folder row for 650 ms while dragging automatically expands (`cell._expand()`) that folder so you can drop directly into its nested subfolders!
   - Dropping calls `window.api.paste(e.ctrlKey ? 'copy' : 'cut', dragPaths, targetDir)` — preserving our strict no-overwrite safety rule — and refreshes.
3. **Tab Drag-Reordering (`renderTabs`)**:
   - Each `.tab` (except `+`) has `draggable = true`.
   - Dropping tab `fromIdx` onto tab `toIdx` splices the `tabs` array, updates `active`, re-renders the tab bar, and saves session state.

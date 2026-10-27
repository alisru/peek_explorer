# Peek Explorer – Plan 04: Feature 1 — Multi-Select & Rubber-Band Drag (2026-10-23)

## Task at Hand
Up until v0.3, Peek Explorer only tracked a single selected item (`sel` / `selCell`). Standard file explorers require multi-selection across both top-level items and inline-expanded subfolder items.

## Design & Process
1. **Selection State**:
   - Track `selected = new Map()` (`path -> { item, cell }`) and `anchorPath = null` (for `Shift+Click` range selection).
   - Helper `visibleRows()` queries all `.row.item` elements currently in `#list` in top-to-bottom DOM order (including inside open `.kids` containers).
2. **Mouse Selection**:
   - Plain `Click`: selects only clicked row, sets `anchorPath`.
   - `Ctrl+Click`: toggles clicked row in `selected`, sets `anchorPath`.
   - `Shift+Click`: selects all rows in `visibleRows()` between `anchorPath` and clicked row.
   - `Right-Click`: if the right-clicked row is already in `selected`, preserve the multi-selection and open the multi-item context menu; if not, select only the right-clicked row.
3. **Rubber-Band Selection (`#rubber`)**:
   - Mousedown on empty space inside `#content` / `#list` starts a selection rectangle.
   - Mousemove updates `#rubber` bounds and highlights every `.row.item` whose bounding box intersects the rectangle (`Ctrl` held = additive).
4. **Batch Actions & Status Bar**:
   - Status bar shows `N items  |  M items selected (X KB)` when items are selected.
   - `Delete`, `Cut`, `Copy`, and `Copy as path` act on all selected paths at once.
   - `Rename (F2)` acts on the primary/first selected item.

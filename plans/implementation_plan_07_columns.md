# Peek Explorer – Plan 07: Feature 4 — Resizable Columns & Ctrl+Wheel View Scaling (2026-10-23)

## Task at Hand
In Details view, users often have long file types or want wider/narrower columns for `Date modified`, `Type`, and `Size`. Also, standard Windows Explorer lets you hold `Ctrl` and scroll the mouse wheel to step through view modes (`Details` ↔ `Small` ↔ `Medium` ↔ `Large` ↔ `Extra large`).

## Design & Process
1. **CSS Custom Properties (`styles.css`)**:
   - Define `:root { --w-date: 150px; --w-type: 110px; --w-size: 80px; }`.
   - Bind `.c-date { width: var(--w-date); }`, `.c-type { width: var(--w-type); }`, `.c-size { width: var(--w-size); }`.
2. **Drag Handles (`index.html` + `renderer.js`)**:
   - Add `<i class="col-resizer" data-col="date"></i>` inside the column headers.
   - Dragging a handle updates `colWidths[col]` (clamped between `50px` and `450px`), applies the CSS variable immediately, and calls `persist()` to save `colWidths` into `settings.json`.
3. **Ctrl + Mouse Wheel View Scaling**:
   - Listening to `wheel` with `e.ctrlKey` on `#list` steps through the ordered view modes and saves the setting.

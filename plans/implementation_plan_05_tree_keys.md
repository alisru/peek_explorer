# Peek Explorer – Plan 05: Feature 2 — Keyboard Navigation & Tree Keys (2026-10-23)

## Task at Hand
A file viewer designed around inline folder expansion (`▸`/`▾`) needs full keyboard tree navigation so you can move up/down rows and expand/collapse folders without touching the mouse.

## Design & Process
1. **Focus Tracking (`focusedPath`)**:
   - Track `focusedPath` alongside `anchorPath` and `selected`.
   - Clicking a row sets both `anchorPath` and `focusedPath`.
   - Attach `cell._toggleExpand()` and `cell._parentCell` references when building rows so keyboard handlers can expand/collapse and jump to a parent folder row cleanly.
2. **Vertical & Linear Movement (`ArrowDown`, `ArrowUp`, `Home`, `End`, `PageDown`, `PageUp`)**:
   - Operates over `visibleRows()` (which includes any open nested `.kids` rows in visual top-to-bottom order).
   - Plain arrow moves single selection and scrolls row into view (`scrollIntoView({ block: 'nearest' })`).
   - `Shift+Arrow` extends selection range from `anchorPath` to the new `focusedPath`.
3. **Tree Keys (`ArrowRight`, `ArrowLeft`, `Backspace`)**:
   - `ArrowRight` on a collapsed folder: expands it inline (`▸` → `▾`).
   - `ArrowRight` on an already-expanded folder: moves selection to its first child row inside `.kids`.
   - `ArrowLeft` on an expanded folder: collapses it (`▾` → `▸`).
   - `ArrowLeft` on a file or collapsed subfolder inside an expanded parent: jumps selection up to the parent folder's row.
   - `Backspace`: navigates up to parent directory (`go(parent(cur))`), matching Windows Explorer.
4. **Type-to-Select**:
   - Typing printable characters when no input is focused buffers the typed prefix for 700 ms and jumps selection to the first matching visible row.

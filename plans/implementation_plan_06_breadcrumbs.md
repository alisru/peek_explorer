# Peek Explorer – Plan 06: Feature 3 — Interactive Breadcrumb Address Bar (2026-10-23)

## Task at Hand
Replace the plain text `<input id="address">` with a dual-mode Windows 11 Explorer breadcrumb bar (`#addrWrap`) that shows clickable path segments and `›` subfolder dropdowns by default, and switches to text-input mode when clicked on empty space or triggered via `Ctrl+L`.

## Design & Process
1. **DOM Structure (`index.html`)**:
   - `<div id="addrWrap"><div id="crumbs"></div><input id="address" spellcheck="false"></div>`
2. **Segment Parsing (`renderCrumbs(path)`)**:
   - Split Windows path `E:\Vector Field Theory\peek_explorer` into cumulative segments:
     - `E:\` -> `E:\`
     - `Vector Field Theory` -> `E:\Vector Field Theory`
     - `peek_explorer` -> `E:\Vector Field Theory\peek_explorer`
   - Clicking a segment navigates directly to that path (`go(segPath)`), or middle-clicking opens it in a new tab (`newTab(segPath)`).
3. **Subfolder Dropdown (`›` button)**:
   - Clicking `›` after any segment lists all directories inside `segPath` (`window.api.list(segPath)`) and displays them in the popup menu (`#ctx`), allowing instant navigation to any sibling/child folder.
4. **Edit Mode Toggle**:
   - Clicking the blank area of `#crumbs` (or pressing `Ctrl+L` / `Alt+D`) hides `#crumbs`, shows `#address`, and selects the full path string.
   - Pressing `Enter` navigates to the typed path and exits edit mode; `Escape` or `blur` restores `#crumbs`.

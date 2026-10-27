# Peek Explorer – Plan 04 (2026-10-23)

Implementing Roadmap steps 1 through 8 + 10:
1. **Multi-select & Rubber-band Drag**: `selectedPaths` Set, Ctrl+click toggle, Shift+click range, `Ctrl+A` select all, rubber-band drag box on empty space, batch copy/cut/paste/delete, multi-item context menu.
2. **Keyboard Navigation & Tree Keys**: `ArrowUp` / `ArrowDown` / `Home` / `End` to move through visible items; `ArrowRight` to expand folder or step into first child; `ArrowLeft` to collapse folder or step up to parent folder; `Backspace` to go up.
3. **Interactive Breadcrumb Address Bar**: Clickable path segments + `›` dropdowns for sibling folders; clicking empty space in the address box switches to text input mode (`Ctrl+L` or click).
4. **Live Filter / Search Box**: Instant filter input in toolbar that filters current view and expanded folders in real time (`Ctrl+F`).
5. **Resizable Columns**: Drag handles on Details column headers (`Name`, `Date modified`, `Type`, `Size`) saved in settings.
6. **Drag-and-Drop**: Drag selected items onto any folder row or sidebar item to move (or copy with `Ctrl`), and drag tabs to reorder them.
7. **Cross-Window Shared Clipboard + Pin Caching**: Store internal copy/cut clipboard in main process so copy/paste works across tabs and windows; cache Quick Access pins in `settings.json` for instant startup while refreshing in background.
8. **Preview / Details Side Pane**: Toggleable right-hand pane (`Alt+P` or toolbar button) showing large image/text/file preview, dimensions, exact byte size, and timestamps.

# Peek Explorer – Plan 11: v0.6 — Middle-Click Mechanics, Reopen Closed Tabs, Real OS Clipboard, Checkboxes, Group By, Split Pane, Zip/Unzip & Full Documentation Suite (2026-10-23)

## Task at Hand
1. **Middle-Click Mechanics (Fix & Complete)**:
   - Make `auxclick` (`e.button === 1`) work everywhere:
     - Middle-clicking a folder row, sidebar item, breadcrumb segment, or Home Dashboard card opens it in a **background tab** (`switchTo = false`, or `Shift+Middle-Click` to focus immediately), matching standard browser/Explorer muscle memory so you can middle-click 5 folders in a row without losing your place!
     - Middle-clicking the `+` button or empty space in the `#tabs` bar opens a new tab.
     - Middle-clicking `←` Back, `→` Forward, `↑` Up, or `🏠` Home opens that target location in a new tab.
     - Prevent Chromium's default middle-click autoscroll circle (`mousedown` with `e.button === 1` -> `e.preventDefault()`).
2. **Comprehensive Audit of Missing Features (Implemented in v0.6 + Documented)**:
   - **Reopen Closed Tab (`Ctrl+Shift+T`)** + `Close other tabs` / `Close tabs to the right` / `Pin tab`.
   - **Real Windows OS File Clipboard (`CF_HDROP`)**: Sync Copy/Cut with the actual Windows Explorer clipboard so you can `Ctrl+C` in Peek Explorer and `Ctrl+V` in Windows Explorer (or vice-versa).
   - **Split-Pane Dual View (`Alt+S` or `◫ Split` button)**: Optional side-by-side secondary folder pane for instant cross-folder comparison and drag-and-drop.
   - **Group By (`Name`, `Type`, `Date modified`, `Size`)**: Collapsible group headers just like Windows Explorer.
   - **Item Checkboxes (`☑`) & Invert Selection**: Optional multi-select checkboxes on every row (`toggleCheckboxes`), plus `Invert selection` in context menu.
   - **File Extensions Toggle (`.ext`)**: Show or hide file extensions in display labels while keeping full extension awareness.
   - **Pin / Unpin Any Folder to Quick Access** + **Bookmark / Star (`⭐`) Folders**: Right-click any folder to Pin/Unpin in Quick Access or add to Peek Bookmarks.
   - **Batch Rename**: Select multiple files and press `F2` (or right-click → `Batch Rename…`) to rename with numbering (`Name (1).ext`, `Name (2).ext`).
   - **Compress to `.zip` & Extract `.zip`**: Native PowerShell `Compress-Archive` / `Expand-Archive` right in the context menu.
   - **Calculate Folder Size on Demand**: Right-click a folder → `Calculate folder size` (renders size right into the `Size` column and Preview Pane).
   - **Enhanced Preview Pane**: Add HTML5 `<video controls>` and `<audio controls>` playback, plus editable text file saving (`Save changes` button for `.txt`/`.md`/`.json`/`.js`).
3. **Complete Standard Documentation Suite (`docs/` & `README.md`)**:
   - `README.md` (root project overview, quick start, keyboard & mouse reference)
   - `docs/PEEK_EXPLORER.md` (Master Architecture & Feature Matrix — Current vs Proposed)
   - `docs/USER_GUIDE.md` (Complete User Manual, Shortcuts, Mouse Gestures, Script Connections Guide)
   - `docs/MISSING_AND_PROPOSED_FEATURES.md` (Exhaustive gap analysis against Windows 11 Explorer, Directory Opus, XYplorer, Total Commander, and Files)
   - `CHANGELOG.md` (Version history v0.1 → v0.6)

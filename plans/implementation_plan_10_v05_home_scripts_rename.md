# Peek Explorer – Plan 10: v0.5 — Home Dashboard, New Tab Settings, Script Connections, Mouse Back/Forward & Better Rename (2026-10-23)

## Task at Hand
1. **Home Dashboard (`peek://home`) & New Tab Settings**:
   - Add a `🏠` Home button in the toolbar and top of the sidebar that navigates to `peek://home` (a browser/Explorer-style Dashboard showing Pinned Quick Access cards, Drive cards with free/total disk space bars, Recent Folders, and Script Connections).
   - Clicking `+` or pressing `Ctrl+T` opens a clean New Tab at `newTabTarget` (defaults to `peek://home` instead of duplicating the current folder; configurable between `Home Dashboard`, `User Home Folder`, or `Duplicate Current Folder`, plus a right-click `Duplicate tab` on tabs when you actually want a duplicate).
2. **Script Connections (Shortcuts to Scripts)**:
   - Register any `.ps1`, `.bat`, `.cmd`, `.py`, `.js`, or `.vbs` script (either via the `+ Add Script` button on the Home Dashboard / toolbar `⚡ Scripts` menu, or by right-clicking any script file and choosing **⚡ Add to Script Connections**).
   - Run registered scripts from:
     - The toolbar `⚡ Scripts` dropdown (passes current directory `cur` and selected file paths as arguments + `PEEK_DIR` / `PEEK_SELECTED` env vars),
     - Right-clicking any file/folder → **⚡ Run Script Connection ›**,
     - One-click cards on the Home Dashboard.
3. **Mouse Back / Forward Button Triggering**:
   - Wire Mouse Button 4 (`e.button === 3`, browser back) and Mouse Button 5 (`e.button === 4`, browser forward) on `mouseup` / `auxclick` across the window, plus enabled/disabled visual states and right-click history dropdowns on the `←` and `→` toolbar buttons.
4. **Improved File & Folder Renaming**:
   - **Preview Pane Editable Name**: In the Preview Pane, the filename is now a direct `<input class="pv-name-input">` textbox — edit it and press `Enter` (or click away) to rename immediately, with live updates to the list and selection.
   - **Long-Press (Hold ~550 ms) Rename**: Holding left mouse button down on any file or folder label for 550 ms without dragging opens inline rename.
   - **Slow Second-Click Rename**: Clicking the `.nm` label of an already-selected item after 450–1800 ms (outside fast double-click timing) triggers inline rename just like native Windows Explorer.
5. **Additional Standard Native Explorer Features**:
   - **Show/Hide Hidden Files** toggle (`👁` or View menu) & **File Extensions** toggle.
   - **Open Terminal / PowerShell Here** in context menu (`Ctrl+Shift+P`).
   - **Undo (`Ctrl+Z`)** for Rename and Move operations.
   - **Drive Free/Total Capacity** shown on the Home Dashboard and under This PC.

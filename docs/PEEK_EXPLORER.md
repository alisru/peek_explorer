# Peek Explorer — Project Document

*Last updated: 2026-10-23 · Version 0.6 · Folder: `e:\Vector Field Theory\peek_explorer`*
*Companion Docs: [README.md](../README.md) · [USER_GUIDE.md](USER_GUIDE.md) · [COLOR_SYSTEM_SPEC.md](COLOR_SYSTEM_SPEC.md) · [MISSING_AND_PROPOSED_FEATURES.md](MISSING_AND_PROPOSED_FEATURES.md) · [CHANGELOG.md](../CHANGELOG.md)*

---

## 1. What this is, and why

Windows File Explorer makes you open a folder, look, then go back. If you want to check three folders you click in and out six times. Peek Explorer fixes that one thing: **every folder has a `â–¸` arrow that opens its contents right where it sits**, as deep as you like, in every view mode. Everything else is meant to look and feel like the Windows 11 Explorer you already know.

### Why a new app and not an add-on
| Option | Result |
|---|---|
| Add-on / plugin for Windows Explorer | **Not possible.** Explorer's file list is closed. Shell extensions can add right-click items, columns, preview panes and icon overlays. They cannot change how the list draws or add expand arrows. |
| Files app (files.community) | Closest look to Explorer, but the version tested had no inline expansion. Its Columns layout still moves sideways. |
| Directory Opus / XYplorer | Have inline expansion but are paid and look nothing like Explorer. |
| **New app (this project)** | Only way to get exact behaviour wanted. |

### Why Electron
Node 22 was already installed. Tauri needs Rust plus the MSVC build tools, which were not installed and are a big download. Electron runs as-is. The cost is size (~200 MB with its own browser engine) and memory use.

---

## 2. How to run it

| Method | How |
|---|---|
| **Double-click** | `Peek Explorer.lnk` in the project folder (starts with no console window). Copy or pin it to the taskbar / Start / Desktop yourself. |
| Double-click (fallback) | `PeekExplorer.bat` â€” shows a console, and runs `npm install` first if Electron is missing. |
| Double-click (direct) | `PeekExplorer.vbs` â€” what the `.lnk` points to. |
| Developer | `npm start` in the project folder. |

**First-time setup on a new machine:** `npm install`, then `node node_modules\electron\install.js` (this npm setup skips Electron's download step, so the second command is needed).

**Later option, not done yet:** a single installable `.exe` using `electron-builder`. It would remove the need for the project folder and Node.

---

## 3. Current state (v0.2)

### 3.1 Layout
```
â”Œ toolbar:  â†  â†’  â†‘  âŸ³  [ address bar ................ ] [Sort â–¾] [â†‘] [View â–¾] â”
â”œ sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬ file list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Quick access (pins)â”‚  header (Details only): Name | Date | Type | Size       â”‚
â”‚ This PC (drives)   â”‚  â–¾ ðŸ“ folder                                           â”‚
â”‚                    â”‚      ðŸ“„ file inside                                    â”‚
â”‚                    â”‚      â–¸ ðŸ“ sub-folder                                    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ status bar: item count / selected path                                       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 3.2 Feature list â€” done

| Area | Feature | Notes |
|---|---|---|
| **Core idea** | Inline folder expansion (`â–¸` / `â–¾`) | Works in all 8 views. Nested to any depth. Expanded state survives refresh, sorting and view changes. |
| Navigation | Back / Forward / Up / Refresh | Own history list. |
| | Editable address bar | Type a path, press Enter. |
| | Double-click folder opens it, file opens in default app | |
| | Keyboard: `Alt+â†/â†’/â†‘`, `Enter`, `F5` | |
| **Sidebar** | **Real Quick access pins** read from Windows | Uses the Windows shell list, keeps only pinned items (not "recent"). Takes ~8 s after launch; default folders show until then. |
| | This PC drives | C: to Z: that exist. |
| **Views** | Details, List, Tiles, Content, Small / Medium / Large / Extra-large icons | Same names as Explorer. |
| **Sorting** | Name / Date modified / Type / Size, ascending or descending | Dropdown + button, and click column headers in Details. Folders always first, like Explorer. Natural number order (`2` before `10`). |
| **Icons** | Real Windows icons for small views | Cached per file type. Folders share one folder icon. Sidebar items keep their own. |
| | Real Windows thumbnails for big views | Images, video frames, PDFs etc. as Explorer shows them. |
| **Right-click** | File/folder menu: Open, Show in Windows Explorer, Cut, Copy, Paste (into folder), Copy as path, Rename, Delete, Properties | Own menu styled like Windows 11. |
| | Empty-space menu: New folder, Paste, Refresh, Properties | |
| | **Show more options â€º** | Lists the *real* Windows verbs for the item and runs the one you click. |
| **File actions** | Rename (inline box, F2) | Refuses invalid names and name clashes. |
| | New folder | Picks `New folder`, `New folder (2)`, â€¦ |
| | Copy / Cut / Paste | Internal clipboard (see limits). Never overwrites: skips and reports. |
| | Delete | Always asks first, then sends to the **Recycle Bin**. Never permanent. |
| | `Ctrl+C/X/V`, `F2`, `Delete` | |

### 3.2b Tabs, windows and saved settings (v0.3)
- **Tabs:** + button, Ctrl+T new, Ctrl+W close, Ctrl+Tab / Ctrl+Shift+Tab next/previous, Ctrl+1..9 jump. Middle-click a folder (or sidebar item) opens it in a new tab; middle-click a tab closes it. Each tab keeps its own history and its own open (expanded) folders.
- **Windows:** Ctrl+N or right-click a folder > *Open in new window*. New windows cascade 30 px.
- **Saved between runs** in `%APPDATA%\peek-explorer\settings.json`: view mode, sort, window size/position/maximized, and (first window only) all tabs with their history and expanded folders. Ctrl+L focuses the address bar.

### 3.2c Full Explorer Suite (v0.4)
- **Multi-select & Rubber-band Drag**: `Ctrl+Click` toggle, `Shift+Click` range, `Ctrl+A` select all, drag a selection rectangle on empty space, batch Cut/Copy/Paste/Delete/Copy as paths, and multi-item byte total in the status bar.
- **Full Keyboard Tree Navigation**: `ArrowUp`/`ArrowDown`/`Home`/`End`/`PageUp`/`PageDown` move selection across visible rows (including inside expanded folders); `ArrowRight` expands a collapsed folder or steps into its first child; `ArrowLeft` collapses an expanded folder or jumps up to its parent folder row; `Backspace` goes up one directory; typing letters jumps to matching filenames.
- **Interactive Breadcrumb Address Bar**: Click any path segment (`E:\`, `Vector Field Theory`, …) to navigate (or middle-click for a new tab), click `›` between segments for a dropdown menu of sibling/child folders, or click empty space / press `Ctrl+L` (`Alt+D`) to edit the path as text.
- **Live Filter Box (`Ctrl+F`)**: Instant search/filter input in the toolbar that filters the current folder and expanded subfolders as you type (`Escape` clears).
- **Resizable Columns & `Ctrl+Wheel` View Scaling**: Drag the left edge of `Date modified`, `Type`, or `Size` in Details view (saved in `settings.json`); hold `Ctrl` + scroll the mouse wheel to step smoothly through view sizes.
- **Drag-and-Drop + Tab Reordering**: Drag selected files/folders onto any folder row, sidebar item, or breadcrumb segment to move (`Ctrl` = copy). Hovering over a collapsed folder row for 650 ms while dragging automatically expands it inline! Drag tabs left/right to reorder them.
- **Shared Cross-Window Clipboard, Instant Cached Pins & New File Creation**: Copy/Cut works across all open tabs and windows; Quick Access pins are cached in `settings.json` for 0 ms startup while refreshing silently in the background; right-clicking empty space now includes `New text document (.txt)` and `New markdown file (.md)`.
- **Preview & Details Side Pane (`Alt+P` / `▤ Preview`)**: Toggleable right-hand inspector showing high-res image preview with pixel dimensions, safe 8 KB text/code preview, exact byte count, and created/modified dates.
- **Dark Mode (`🌙` / `☀️`)**: Full dark/light theme toggle saved in `settings.json`.

### 3.2d Home Dashboard, Script Connections, Mouse Back/Forward & 4-Way Rename (v0.5)
- **Home Dashboard (`🏠` / `peek://home` / `Alt+Home`)**: Browser-style Home button in the toolbar, sidebar, and breadcrumb root. Opens a dashboard with:
  1. **This PC — Drives** cards with free/total disk space progress bars (also drop targets for moving/copying files),
  2. **Quick Access Pins** cards,
  3. **⚡ Script Connections** one-click launcher cards,
  4. **Recent Folders** history cards.
- **New Tab Settings (No Unwanted Duplication)**: Clicking `+` or pressing `Ctrl+T` now opens a fresh tab at the **Home Dashboard** by default instead of duplicating the current folder. You can change the default (`Home Dashboard` / `User Home Folder` / `Duplicate Current Tab`) either in the top-right of the Home Dashboard or by right-clicking any tab. Right-clicking a tab also gives an explicit **Duplicate tab** option when you want one.
- **⚡ Script Connections (Shortcuts to Scripts)**:
  - Connect any `.ps1`, `.bat`, `.cmd`, `.py`, `.js`, or `.vbs` script via the toolbar `⚡ Scripts` button, the `+ Connect Script…` button on the Home Dashboard, or by right-clicking a script file in the list and choosing **⚡ Add to Script Connections**.
  - Run connected scripts from the toolbar `⚡ Scripts` menu, from the Home Dashboard, or by right-clicking selected files/folders → **⚡ Run Script Connection ›**.
  - Connected scripts automatically receive the current folder as working directory (`PEEK_DIR`), selected paths as command-line arguments and `PEEK_SELECTED`, and display their stdout/stderr output on completion.
- **Back / Forward Triggering**:
  - Hardware **Mouse Back (Button 4)** and **Mouse Forward (Button 5)** work anywhere in the window.
  - `Backspace` (and `Alt+Left`) triggers Back; `Alt+Up` triggers Up.
  - Right-clicking the `←` or `→` toolbar buttons opens the full tab history list so you can jump to any step.
- **4-Way File & Folder Renaming**:
  1. **Preview Pane Direct Textbox**: Open `▤ Preview` (`Alt+P`), select any file or folder, edit the **Rename** textbox directly at the top of the preview pane, and press `Enter` (or click away).
  2. **Hold-Down (~550 ms) Rename**: Hold left-click on any file or folder row for ~0.55 s without dragging to open inline rename immediately.
  3. **Native Explorer Slow Second-Click**: Click the name of an already-selected item after 450–1800 ms (outside fast double-click timing) to open inline rename.
  4. **`F2` or Right-Click → Rename**.
- **Native Explorer Extras**:
  - **`Ctrl+Z` Undo** for Rename and Move operations.
  - **Open PowerShell here** on any folder or empty space.
  - **Hidden files toggle (`👁`)** in the toolbar.

### 3.3 Safety rules built in
1. Listing is read-only. A failed read shows `(error text)` and touches nothing.
2. Delete = confirm dialog â†’ Recycle Bin. There is no permanent delete.
3. Paste and rename check for an existing target and **skip** instead of overwriting.
4. File paths go to PowerShell through an environment variable, never pasted into command text, so odd file names can't run as commands.
5. Failures are reported, never answered by deleting something.

---

## 4. How it is built

### 4.1 Files
| File | Job |
|---|---|
| `main.js` | The Electron "main" process. Has full disk access. Lists folders, makes icons/thumbnails, reads pins, runs file actions, shows the delete confirm. |
| `preload.js` | Safe bridge. Exposes only a fixed list of calls (`window.api.*`) to the page. |
| `index.html` | Page skeleton: toolbar, sidebar, header, list, status bar. |
| `renderer.js` | All page logic: drawing rows, expansion, views, sorting, context menu, keyboard. |
| `styles.css` | Explorer-style look and every view layout. |
| `PeekExplorer.vbs / .bat / Peek Explorer.lnk` | Launchers. |
| `plans/` | Dated implementation plans (kept, never overwritten). |
| `docs/PEEK_EXPLORER.md` | This document. |

### 4.2 Calls between page and main process (`window.api`)
| Call | Does |
|---|---|
| `list(dir)` | Names, sizes, dates, folder flag for one folder. |
| `open(path)` | Open with default app. |
| `places()` | Home, standard folders, drive letters. |
| `pins()` | Real Quick access pins (PowerShell + Windows Shell COM). |
| `icon(path, isDir, px, unique)` | Small shell icon (â‰¤24 px) or Windows thumbnail (bigger). |
| `verbs(path)` / `doVerb(path, index)` | List and run real Windows right-click actions. |
| `props(path)` | Windows Properties window. |
| `copyPath`, `showInFolder` | Clipboard path / reveal in real Explorer. |
| `rename`, `newFolder`, `trash`, `paste` | The file actions above. |

### 4.3 How inline expansion works
Each item is drawn as a *row* plus an empty *kids box* right after it. Clicking `â–¸` fills the box by listing that folder with the same drawing code (depth + 1), so nesting is free. In Details the kids box is a normal block with indented rows. In icon views the box becomes a full-width block with a blue left edge, so the contents sit under the folder.

The set of open folder paths is stored, so a redraw re-opens them.

### 4.4 How the real pins are read
PowerShell asks the Windows Shell for the Quick access namespace (`shell:::{679f85cb-0220-4080-b29b-5540cc05aab6}`). That list holds pinned folders, frequent folders and recent files together. A pinned item is the one that has an "Unpin from Quick access" action, so only those are kept. Items without a normal drive path (Recycle Bin) are skipped.

### 4.5 Why the right-click menu is not the real one
The genuine Explorer menu is a native Windows window built from COM handlers (Open with, 7-Zip, Git, antivirusâ€¦). Electron can't draw that menu itself. A native add-on written in C++ could. Until then: own menu for the common actions, plus **Show more options** which asks Windows for the real actions on that item. Third-party menu entries added through extension handlers may be missing there.

---

## 5. Known limits (honest list)

| Limit | Effect |
|---|---|
| One selected item only | No Ctrl/Shift multi-select, no select-all yet. |
| Cut/Copy/Paste is internal | Can't paste into real Explorer, or paste files copied there. |
| Big folders are drawn all at once | A folder with 10 000+ files will be slow. Needs list virtualization. |
| Thumbnails are created per item as drawn | Large views of big folders can take a moment. |
| No search, no preview pane, no drag and drop, no drag-to-reorder tabs | See roadmap. |
| Copy/Cut clipboard is per window | Copy in one window, paste in another doesn't work yet. |
| Only the first window saves the tab session | Other windows start fresh at the path they were opened with. |
| Real pins take ~8 s | PowerShell start-up. Could be cached to disk. |
| `Show more options` is slow (1â€“2 s) | Same reason. |
| Does not follow Windows dark mode | Light theme only. |
| Not packaged | Needs the project folder and Node-installed `node_modules`. |
| Untested by me on screen | Written and syntax-checked; behaviour confirmed only by your screenshots and your testing. |

---

## 6. Catalogue: what standard file explorers do

This is the reference list for deciding what to build. Status: âœ… done Â· ðŸ”¶ partial Â· â¬œ not yet.

### 6.1 Navigation
| Feature | Explorer | Status |
|---|---|---|
| Back / Forward / Up | yes | âœ… |
| Breadcrumb address bar (click any segment; click the arrows between segments to see sibling folders) | yes | â¬œ (plain text box now) |
| Type-to-edit address with autocomplete | yes | ðŸ”¶ (no autocomplete) |
| Back/Forward history drop-down | yes | â¬œ |
| Tabs (open folder in new tab, drag to reorder, reopen closed tab) | Win 11 | â¬œ |
| Multiple windows / split pane (two folders side by side) | Opus, Total Commander | â¬œ |
| Navigation tree in sidebar (expandable) | yes | â¬œ (flat list now) |
| Quick access (pins + frequent) | yes | ðŸ”¶ pins only |
| Drag a folder into the sidebar to pin | yes | â¬œ |
| OneDrive / network / cloud entries | yes | â¬œ |
| Recent files | yes | â¬œ |
| Search box scoped to folder, with live results | yes | â¬œ |
| Whole-disk indexed search (like Everything) | third-party | â¬œ |

### 6.2 Views and display
| Feature | Status |
|---|---|
| Details / List / Tiles / Content / 4 icon sizes | âœ… |
| Resizable columns, drag to reorder columns | â¬œ |
| Right-click header to add columns (Size, Type, Date created, Dimensions, Length, Authors, â€¦) | â¬œ |
| Group by (Name, Date, Type, Size) with collapsible groups | â¬œ |
| Ctrl + mouse wheel to resize icons smoothly | â¬œ |
| Show/hide hidden files and file extensions | â¬œ (hidden shown, extensions always shown) |
| Preview pane (see a file without opening it) | â¬œ |
| Details pane (metadata of selection) | â¬œ |
| Per-folder remembered view | â¬œ |
| Folder thumbnails showing contents | â¬œ |
| Dark mode / follow system theme | â¬œ |
| **Inline expand (our extra)** | âœ… |
| Breadcrumb "peek" without leaving (our idea: hover a folder for a quick popup) | â¬œ |

### 6.3 Selection
| Feature | Status |
|---|---|
| Click, Ctrl+click, Shift+click | â¬œ |
| Drag-box (rubber-band) select | â¬œ |
| Select all / invert selection | â¬œ |
| Checkboxes | â¬œ |
| Type letters to jump to a name | â¬œ |
| Arrow keys move selection, `Home`/`End`/`PgUp`/`PgDn` | â¬œ |
| `â†’` expands, `â†` collapses (tree-style keys) | â¬œ (natural for our feature) |

### 6.4 File operations
| Feature | Status |
|---|---|
| Rename (F2) | âœ… |
| New folder | âœ… |
| New file (text, Word, shortcutâ€¦) | â¬œ |
| Copy / Cut / Paste | ðŸ”¶ internal only |
| Delete to Recycle Bin | âœ… |
| Permanent delete (`Shift+Delete`) | â¬œ â€” deliberately left out |
| Undo / Redo (`Ctrl+Z`) for rename, move, delete | â¬œ |
| Drag and drop (move; Ctrl = copy; Alt = shortcut) between folders and windows | â¬œ |
| Progress window with speed, pause, cancel | â¬œ |
| Name-clash dialog (Replace / Skip / Keep both) | â¬œ (skips) |
| Batch rename | â¬œ |
| Create zip / extract | â¬œ |
| Send to (Desktop, Mail, â€¦) | â¬œ via Show more options |
| Open withâ€¦ | â¬œ via Show more options |
| Properties | âœ… |
| Real Windows clipboard integration | â¬œ |

### 6.5 Context menu
| Feature | Status |
|---|---|
| File and folder menu | âœ… own menu |
| Empty-space menu | âœ… |
| Real Windows verbs ("Show more options") | âœ… |
| Full native menu with every third-party entry | â¬œ needs native add-on |
| Multi-selection menu | â¬œ |
| Icon row on top (cut/copy/rename/delete icons) like Win 11 | â¬œ |

### 6.6 Appearance and feel
| Feature | Status |
|---|---|
| Real icons and thumbnails | âœ… |
| Icon overlays (OneDrive sync tick, Git status, shortcut arrow) | â¬œ |
| Windows 11 rounded look, Mica/acrylic background | ðŸ”¶ rounded menu only |
| Smooth animation on expand/collapse | â¬œ |
| High-DPI crisp rendering | âœ… (browser engine handles it) |
| Native-feeling scrolling, inertia | âœ… |

### 6.7 Power-user features from other explorers
| Feature | From | Status |
|---|---|---|
| Dual pane | Total Commander, Opus | â¬œ |
| Folder size on demand | Opus, WinDirStat | â¬œ |
| Flat view (all files of all sub-folders as one list) | Opus | â¬œ |
| Bookmarks / hotlist | Total Commander | â¬œ |
| Command palette (`Ctrl+K`) | VS Code style | â¬œ |
| Open terminal here / VS Code here | Files, Opus | â¬œ |
| Duplicate finder | XYplorer | â¬œ |
| Tags and labels | XYplorer, Files | â¬œ |
| Git branch + status in the status bar | Files | â¬œ |
| Queue of file jobs | Opus, TeraCopy | â¬œ |

### 6.8 Accessibility
| Feature | Status |
|---|---|
| Full keyboard use | ðŸ”¶ |
| Screen reader labels | â¬œ |
| High-contrast theme | â¬œ |
| Scale text with system setting | ðŸ”¶ |

---

## 7. Roadmap (suggested order)

Ordered by "makes the app feel complete" and "fits the peek idea".

| Step | Work | Why now |
|---|---|---|
| 1 | **Multi-select** (Ctrl/Shift click, select-all, arrow keys) + multi-item menu and actions | Every action today works on one item; this is the biggest gap. |
| 2 | **Keyboard tree keys** (`â†’` expand, `â†` collapse) and arrow movement | Completes the peek feature. |
| 3 | **Breadcrumb address bar** | Most visible difference from Explorer. |
| 4 | **Resizable columns** + choose columns | Details view is the main one for peeking. |
| 5 | **Tabs** | Matches Win 11 and reduces window clutter. |
| 6 | **Drag and drop** (move/copy, drag onto sidebar to pin) | Expected by everyone. |
| 7 | **Real clipboard** (copy/paste with real Explorer) | Needs a small native helper or PowerShell bridge. |
| 8 | **Search** in current folder | |
| 9 | **List virtualization** | Needed before huge folders are usable. |
| 10 | **Preview pane + details pane** | |
| 11 | **Dark mode** | |
| 12 | **Package as a real `.exe`** with `electron-builder` (installer or portable) | Replaces the launchers. |
| 13 | **Native context menu** via a C++/C# add-on | Only if "Show more options" isn't good enough. |

Not planned unless asked: permanent delete, network drive management, cloud sync clients.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Window doesn't open | Run `PeekExplorer.bat` to see the error. Check `node_modules\electron\dist\electron.exe` exists; if not run `node node_modules\electron\install.js`. |
| `Unable to move the cache: Access is denied` in the log | Harmless. Another copy of the app was still closing. |
| Sidebar shows default folders, not your pins | The pins load takes ~8 s. If they never appear, PowerShell was blocked or timed out. |
| Icons look like blank pages | Thumbnail or icon call failed for that file. Falls back to a plain icon. |
| "Show more options" empty | The item has no shell verbs available to PowerShell (some system or cloud placeholder files). |
| Delete does nothing | You pressed Cancel in the confirm, or the item is in use. Message is shown on error. |

---

## 9. Design principles for this project
1. **Look like Explorer.** Anything not about peeking should match Windows 11 as closely as possible.
2. **Peek is everywhere.** Every view and every new feature must work with inline expansion.
3. **Nothing destructive without a confirm, nothing permanent.**
4. **Simple code.** Plain JavaScript, no framework, no build step, five files. Add complexity only when a feature needs it.
5. **Use Windows itself** (icons, thumbnails, pins, menu verbs) instead of imitating it where Windows will give the real thing.

---

## 10. Change log

| Date | Version | Change |
|---|---|---|
| 2026-10-23 | 0.1 | First version: tree rows, address bar, Quick access defaults, thumbnail toggle. |
| 2026-10-23 | 0.3 | Settings saved between runs (view, sort, window size/position, tabs, open folders in each tab). Tabs and multiple windows. Drive/special-folder icon fixes. |
| 2026-10-23 | 0.2 | Real pins, 8 view modes, sorting, real icons and thumbnails, right-click menu with real Windows verbs, file actions, shortcuts, launchers, this document. |


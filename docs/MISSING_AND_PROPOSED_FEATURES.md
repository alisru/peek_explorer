# Peek Explorer — Exhaustive Gap Analysis: Current vs. Missing & Proposed Features (v0.6)

*Last updated: 2026-10-23 · Reference baseline: Windows 11 Explorer, Directory Opus 13, XYplorer, Total Commander, and Files (`files.community`).*

This document catalogs **every feature missing or partial** in Peek Explorer v0.6 compared to native Windows Explorer and power-user file managers, explains **why** each is missing (architectural constraint vs. not yet built), and defines the **proposed implementation design** for future versions.

---

## 1. Executive Summary of What Is Already Built (v0.1 → v0.6)

| Category | Built & Live in v0.6 |
|---|---|
| **Inline Folder Peek** | `▸`/`▾` inline recursive expansion in all 8 view modes; auto-expand on drag hover (650 ms); keyboard tree navigation (`←`/`→`); state persisted per tab. |
| **Tabs & Windows** | Multi-tab bar, middle-click background tab opening (`Shift+Middle-Click` foreground), middle-click tab to close, middle-click empty bar / `+`, drag-to-reorder tabs, **Pin tab (`📌`)**, **Reopen closed tab (`Ctrl+Shift+T`)**, `Close other tabs`, `Close tabs to the right`, configurable New Tab target (`Home Dashboard`, `User Home`, `Duplicate`), multi-window support (`Ctrl+N`). |
| **Home Dashboard** | `🏠` (`peek://home`) with Drive capacity bars, Quick Access Pins, `⭐` Bookmarks, `⚡` Script Connections, and Recent Folders. |
| **Views, Grouping & Columns** | 8 view modes (`Details`, `List`, `Tiles`, `Content`, `Small`/`Medium`/`Large`/`XL Icons`), `Ctrl+Wheel` scaling, **Group By** (`None`, `Type`, `Date`, `Size`, `Name`) with collapsible headers, resizable Details columns, checkboxes (`☑`), hidden dot-file toggle (`👁`), file extensions toggle (`.ext`). |
| **4-Way Rename & Batch Ops** | Preview Pane direct rename textbox, 550 ms hold-to-rename, slow second-click rename, `F2` inline rename, **Batch Rename** (`Base (1).ext`), `Ctrl+Z` Undo for rename/move, Zip/Unzip (`📦`), on-demand folder size calculation. |
| **Clipboard & Shell Integration** | Cross-window clipboard + real Windows OS clipboard (`CF_HDROP` via `Set-Clipboard`/`Get-Clipboard`), real Quick Access pins (0 ms cached + background sync), real shell icons/thumbnails, real Windows verbs (`Show more options ›`), `Open PowerShell here`. |

---

## 2. Missing Features & Proposed Implementations (Detailed Breakdown)

### Category A: OS Shell & Native Windows Integration Gaps

| # | Missing Feature | Why It Is Missing Today | Proposed Solution & Effort |
|---|---|---|---|
| **A1** | **True Native Win32/Win11 IContextMenu Popup** (with 7-Zip, Git GUI, Tortoise, Nvidia, Dropbox icons & submenus) | Chromium/Electron cannot host an HWND `IContextMenu3` popup directly from JavaScript. Currently we provide a fast custom menu + `Show more options ›` which queries `Shell.Application` COM verbs via PowerShell (which misses some modern `IExplorerCommand` shell extensions). | **Proposed (v0.8)**: Build a small precompiled C++ Node-API (N-API) native addon (`shell_ctx.node`) or lightweight C# helper executable that calls `SHBindToParent` + `IContextMenu::QueryContextMenu` + `TrackPopupMenuEx` at the cursor's screen coordinates. **Effort**: Medium. |
| **A2** | **Drag-and-Drop Out to / In from External Apps** (e.g., dragging a file from Peek Explorer into Discord/Chrome/Photoshop, or from Desktop into Peek) | Internal HTML5 drag-and-drop (`application/x-peek-paths`) moves/copies between rows, tabs, breadcrumbs, and sidebar inside Peek Explorer. Dragging *out* to external Win32 apps requires Electron's `webContents.startDrag({ file, icon })` API. | **Proposed (v0.7)**: Handle external `e.dataTransfer.files` on `drop` (for dragging from Windows Desktop/Explorer *into* Peek), and add an outbound OS drag handle or modifier using `ipcRenderer.send('ondragstart', paths)` → `event.sender.startDrag()`. **Effort**: Low-Medium. |
| **A3** | **Icon Overlays** (OneDrive cloud sync ticks `✔`/`☁`, Git status badges, `.lnk` shortcut arrows) | `app.getFileIcon` and `createThumbnailFromPath` return the base icon/thumbnail without shell overlay handlers (`IShellIconOverlayIdentifier`). | **Proposed (v0.7)**: Inspect file attributes (`fs.stat` + `ReparsePoint` / OneDrive attributes) and `.lnk` extension in `list()`, and render lightweight SVG badge overlays (`↗` for `.lnk`, `☁` for cloud) on `.ico`. **Effort**: Low. |
| **A4** | **Recycle Bin Virtual Folder Browsing & Restore** (`shell:RecycleBinFolder`) | Recycle Bin items are virtual shell items (`::{645FF040-...}`), not standard filesystem paths readable by `fs.readdir`. | **Proposed (v0.8)**: Add `peek://trash` special URI that queries `Shell.Application.Namespace(10)` via PowerShell to list deleted items with original path, deletion date, and a `Restore` action. **Effort**: Medium. |
| **A5** | **This PC Network Locations, MTP Phones & WSL (`\\wsl$\`)** | Sidebar currently scans drive letters `C:\`–`Z:\`. | **Proposed (v0.7)**: Detect mapped network shares (`Get-PSDrive`), `\\wsl.localhost\`, and allow typing UNC paths (`\\server\share`) in the address bar. **Effort**: Low. |
| **A6** | **Native Windows `Hidden` & `System` File Attributes** | Currently `👁` filters dot-files (`.git`, `.env`), whereas Windows also uses DOS `FILE_ATTRIBUTE_HIDDEN` (`0x2`) and `FILE_ATTRIBUTE_SYSTEM` (`0x4`). | **Proposed (v0.7)**: Read `win32` file attributes or filter known system names (`$RECYCLE.BIN`, `System Volume Information`, `pagefile.sys`, `desktop.ini`, `thumbs.db`) when `👁` is toggled off. **Effort**: Low. |

---

### Category B: Performance & Large-Folder Scalability Gaps

| # | Missing Feature | Why It Is Missing Today | Proposed Solution & Effort |
|---|---|---|---|
| **B1** | **DOM Virtualization (Virtual Scrolling) for 10,000+ File Folders** | `renderDir` creates DOM nodes for every item in an open folder. Fine up to ~1,500 items; folders like `C:\Windows\System32` (~4,500 items) or `node_modules` will cause a noticeable DOM layout pause. | **Proposed (v0.7)**: Flatten the visible tree into a linear virtual array and render only the ~45 rows currently inside the `#list` viewport plus a small overscan buffer. **Effort**: Medium. |
| **B2** | **Persistent Persistent PowerShell Co-Process (0 ms Shell Queries)** | Currently `pins`, `verbs`, `zipItems`, and `Set-Clipboard` spawn a fresh `powershell.exe` process each time (~400–1500 ms startup overhead). | **Proposed (v0.7)**: Spawn a single background `powershell.exe -NoProfile -Sta -Command -` worker in `main.js` at app launch and send JSON-line commands over `stdin`/`stdout`. Cuts verb/clipboard/pin latency from ~1s down to **<15 ms**. **Effort**: Low-Medium. |
| **B3** | **Live Filesystem Watcher (`fs.watch`)** | If an external program creates or deletes a file in the currently open folder, you currently press `F5` to see it. | **Proposed (v0.7)**: Attach a debounced (400 ms) `fs.watch` listener on `cur` and any `expanded` paths so external file changes update the list automatically. **Effort**: Low. |
| **B4** | **Recursive Subfolder Search / Indexed Search** | The toolbar `#search` box (`Ctrl+F`) currently filters visible items in the current folder and expanded folders instantaneously, but does not crawl unexpanded subfolders. | **Proposed (v0.7)**: Add a `🔍 Deep Search` toggle (or `Enter` inside `#search`) that runs an async recursive walk (or queries `Everything` CLI `es.exe` if installed) and streams matching results into a flat search results view. **Effort**: Low-Medium. |

---

### Category C: Power-User Layout & File Operation Gaps

| # | Missing Feature | Why It Is Missing Today | Proposed Solution & Effort |
|---|---|---|---|
| **C1** | **Dual-Pane / Split View (`F3` or `Alt+S`)** | Currently you can open two Peek Explorer windows side by side (`Ctrl+N`), but there is no single-window left/right split pane like Total Commander or Directory Opus. | **Proposed (v0.7)**: Allow `#content` to split into two independent tab+list panes (`Pane A` and `Pane B`) with `Tab` switching active pane and `F5`/`F6` copying/moving between panes. **Effort**: Medium. |
| **C2** | **File Operation Progress Dialog & Conflict Resolution Modal (`Replace` / `Skip` / `Keep Both`)** | Currently `paste` strictly skips existing files (`errorOnExist: true`) to guarantee zero accidental overwrites, and runs without a progress bar for multi-GB copies. | **Proposed (v0.7)**: When `paste` detects a name collision, pop up a modal with **Skip**, **Keep Both (`file (2).ext`)**, or **Replace (Move existing to Recycle Bin first!)**, plus a bottom-right transfer progress bar for large files. **Effort**: Medium. |
| **C3** | **Flat View (Mixed Branch View)** | Directory Opus has "Flat View" which shows all files from all subfolders in a single flat list without folder boundaries. | **Proposed (v0.7)**: Add `Flat View` toggle in toolbar that recursively lists all descendant files of `cur` with a `Relative Path` column. **Effort**: Low. |
| **C4** | **Per-Folder Remembered View & Sort** | Currently `view` and `sort` are global across the app (e.g. switching to `Large icons` in `Pictures` switches all folders until changed back). | **Proposed (v0.7)**: Store an optional `folderViews: { [dirPath]: { view, sortKey, sortAsc, groupKey } }` map in `settings.json` + auto-detect image-heavy folders if desired. **Effort**: Low. |
| **C5** | **Customizable Details Columns** (Created Date, Extension, Dimensions, Author, Relative Path, Git Status) | Details view currently has 4 fixed columns (`Name`, `Date modified`, `Type`, `Size`). | **Proposed (v0.8)**: Right-click `#header` to toggle extra columns (`Date created`, `Extension`, `Attributes`, `Dimensions`). **Effort**: Low-Medium. |
| **C6** | **Sidebar Collapsible Folder Tree** | The left sidebar shows `🏠 Home`, `⭐ Bookmarks`, `Quick Access`, and `This PC` drives as flat lists. Native Explorer also has an expandable full directory tree in the left sidebar. | **Proposed (v0.7)**: Add `▸` expand arrows to `This PC` drives and Quick Access items right inside `#nav`, using the same inline tree logic as the main list. **Effort**: Low. |
| **C7** | **Standalone Packaged `.exe` Installer / Portable Build** | Currently launched via `Peek Explorer.lnk` / `PeekExplorer.vbs` using local `node_modules\electron`. | **Proposed (v0.8)**: Add `electron-builder` configuration to `package.json` (`npm run dist`) to output a standalone `PeekExplorer-Portable.exe` and NSIS installer with custom `.ico`. **Effort**: Low. |

---

## 3. Recommended Priority Queue for Next Iteration (v0.7)

1. **External OS Drag-and-Drop (`files` drop in + `startDrag` out)** + **Live `fs.watch` Auto-Refresh**
2. **Conflict Resolution Dialog (`Keep Both` / `Skip` / `Recycle & Replace`)**
3. **Sidebar Expandable Tree (`▸` on Drives/Pins in left nav)**
4. **Dual-Pane Split View (`Alt+S`)** & **Flat Branch View**
5. **Persistent Background PowerShell Worker (<15 ms shell calls)** + **Deep Recursive Search**

# Peek Explorer — User Guide, Shortcuts & Workflows (v0.6)

---

## 1. Mouse Gestures & Middle-Click Reference

| Target | Left-Click | Double-Click | Middle-Click (Wheel Click) | Right-Click |
|---|---|---|---|---|
| **Folder Row** | Select (`Ctrl` toggle, `Shift` range) | Navigate into folder | Open folder in **background tab** (`Shift+Middle-Click` focuses tab) | Folder context menu |
| **Folder `▸` / `▾` Arrow** | Expand / collapse inline peek | — | — | — |
| **File Row** | Select (`Ctrl` toggle, `Shift` range) | Open in default Windows app | — | File context menu |
| **File/Folder Name (Hold ~0.55s)** | Opens **Inline Rename** | — | — | — |
| **Selected Name (Slow 2nd Click)** | Opens **Inline Rename** | Opens item | — | — |
| **Empty List Space** | Clear selection / Drag rubber-band box | — | — | Current folder menu (`New`, `Paste`, `Undo`, `PowerShell`) |
| **Tab** | Switch to tab (Drag to reorder) | — | **Close tab** | Tab menu (`Pin`, `Duplicate`, `Reopen closed`, `Close others`, New-tab setting) |
| **`+` New Tab Button** | Open new tab (uses New Tab preference) | — | **Duplicate current tab** | — |
| **Empty Tab Bar Space** | — | Open new tab | **Open new tab** | — |
| **Sidebar Item / Pin / Drive** | Navigate in current tab | — | Open in **background tab** | Bookmark menu (on Bookmarks) |
| **Breadcrumb Segment** | Navigate to ancestor folder | — | Open ancestor in **background tab** | — |
| **Breadcrumb `›` Arrow** | Dropdown menu of sibling/child folders | — | — | — |
| **Toolbar `←` Back / `→` Forward** | Step back / forward | — | Open back/forward step in **background tab** | Full tab **History Menu** |
| **Toolbar `↑` Up / `🏠` Home** | Go up / Go to Home Dashboard | — | Open Up / Home in **new tab** | — |
| **Mouse Side Button 4 / 5** | **Navigate Back / Forward** anywhere | — | — | — |

---

## 2. Keyboard Shortcuts Reference

### Navigation & Tabs
| Shortcut | Action |
|---|---|
| `Ctrl + T` | Open new tab (at `Home Dashboard` by default; configurable) |
| `Ctrl + Shift + T` | **Reopen last closed tab** |
| `Ctrl + W` | Close current tab (closes window if last tab; pinned tabs are protected) |
| `Ctrl + N` | Open a new Peek Explorer window at current path |
| `Ctrl + Tab` / `Ctrl + Shift + Tab` | Next / Previous tab |
| `Ctrl + 1` … `Ctrl + 9` | Jump to tab 1–9 |
| `Alt + Left` or `Backspace` | Navigate Back |
| `Alt + Right` | Navigate Forward |
| `Alt + Up` | Navigate Up to parent folder (Up from drive root goes to `🏠 Home`) |
| `Alt + Home` | Go to `🏠 Home Dashboard` (`peek://home`) |
| `Ctrl + L` or `Alt + D` | Focus & select full path in Address Bar |
| `Ctrl + F` | Focus live Filter/Search box (`Escape` clears filter) |
| `Alt + P` | Toggle **Preview & Rename Side Pane** |
| `F5` | Refresh current folder and all open inline subfolders |

### Tree Peek & Selection
| Shortcut | Action |
|---|---|
| `ArrowDown` / `ArrowUp` | Move selection down / up across visible rows (including inside expanded folders) |
| `Shift + ArrowDown / Up` | Extend range selection down / up |
| `Home` / `End` | Jump to first / last visible row (`Shift` extends selection) |
| `PageUp` / `PageDown` | Jump 15 rows up / down (`Shift` extends selection) |
| `ArrowRight` | On collapsed folder: **expand inline (`▸` → `▾`)**. On expanded folder: **step into first child**. |
| `ArrowLeft` | On expanded folder: **collapse (`▾` → `▸`)**. On child row: **jump up to parent folder row**. |
| `Enter` | Open selected folder or launch selected file |
| `Ctrl + A` | Select all visible items |
| `Type any letters` | Jump selection to first item starting with typed prefix |
| `Ctrl + Mouse Wheel` | Smoothly cycle through the 8 view modes |

### File Operations
| Shortcut | Action |
|---|---|
| `F2` | Rename selected item inline (or open **Batch Rename** in Preview Pane if multiple items are selected) |
| `Ctrl + C` | Copy selected items (shared across Peek Explorer windows AND pushed to native Windows clipboard) |
| `Ctrl + X` | Cut selected items |
| `Ctrl + V` | Paste into current folder (or into selected folder; supports pasting files copied from Windows Explorer) |
| `Delete` | Move selected items to the **Recycle Bin** (with confirmation dialog) |
| `Ctrl + Z` | **Undo** last Rename, Batch Rename, or Move operation |

---

## 3. The 4-Way Rename System (+ Batch Rename)

1. **Preview Pane Direct Textbox (`Alt+P`)**:
   - Open the `▤ Preview` pane and click any file or folder.
   - The filename at the top of the right-hand pane is an always-ready textbox. Edit the text and press `Enter` (or click away) to rename immediately.
   - **Batch Rename**: Select 2 or more items, open the Preview Pane (or press `F2`), type a base name, and press `Enter` to rename all selected items as `BaseName (1).ext`, `BaseName (2).ext`, etc. (fully undoable with `Ctrl+Z`).
2. **Hold-Down (~550 ms) Rename**:
   - Press and hold the left mouse button on any file or folder row for ~0.55 seconds without dragging. Inline rename opens right under your cursor.
3. **Slow Second-Click Rename**:
   - Click the text label of an already-selected item after 450–1800 ms (just like native Windows Explorer).
4. **`F2` or Right-Click → Rename**:
   - Classic keyboard or context-menu trigger.

---

## 4. Script Connections (`⚡ Scripts`)

Peek Explorer lets you wire up your own scripts (`.ps1`, `.bat`, `.cmd`, `.py`, `.js`, `.vbs`, `.exe`) as one-click tools:

### How to Connect a Script
- **From the File List**: Right-click any `.ps1`, `.bat`, `.cmd`, `.py`, `.js`, or `.vbs` file → **⚡ Add to Script Connections**.
- **From the Toolbar**: Click **⚡ Scripts** → **+ Connect a script…**
- **From the Home Dashboard**: Click **+ Connect Script…** in the Script Connections section.

### How Scripts Receive Context
When you run a connected script (from the toolbar, Home Dashboard, or right-click menu), Peek Explorer automatically provides:
- **Working Directory (`cwd`)**: The current folder open in the active tab.
- **Command-Line Arguments (`argv`)**: Full paths of all currently selected files/folders.
- **Environment Variables**:
  - `PEEK_DIR`: The active folder path.
  - `PEEK_SELECTED`: Semicolon-separated list (`;`) of all selected file/folder paths.
- **Output Reporting**: Any `stdout` or `stderr` printed by the script is displayed on completion, and the folder view refreshes automatically.
- **Drag-and-Drop Registration**: You can also drag any script file (or multiple files) from inside Peek Explorer or from external Windows Explorer directly onto the **`⚡ Scripts`** button in the toolbar (or onto the Script Connections section on the Home Dashboard) to connect them immediately.

---

## 7. Tab Split Dropdown (`Left` / `Right` / `Up` / `Down`)

Every tab in the tab bar has a **`▾` dropdown arrow** (and there is a **`◫ Split`** button in the toolbar + `Alt+S` shortcut):
- **`◧ Split Left` / `◨ Split Right`**: Places the secondary explorer pane to the left or right of the primary pane.
- **`⬒ Split Up` / `⬓ Split Down`**: Stacks the secondary explorer pane above or below the primary pane.
- **Split with Another Open Tab**: Choose any open tab from the dropdown to immediately open it side-by-side.
- **Cross-Pane Drag & Drop**: Drag files or folders directly from one split pane into the other (`Ctrl` to copy, plain drag to move).
- **Swap (`⇄`) / Close (`×`)**: Swap the primary and split pane paths with one click, or close the split pane.

---

## 8. Video-Game Map Modes: `🔍 Lens (LOD)` & `🗺️ Landscape (2D Map)`

Peek Explorer treats large directories with **video-game Level-of-Detail (LOD) and spatial map logic** so you never lose track of where files live:

### A. `🔍 Lens (LOD)` View Mode
- Automatically scales the base tile size so **all items in the folder fit on screen simultaneously**.
- **Dynamic Focal Lens**: Moving your cursor across the view magnifies items near your pointer (`108px–132px` cards with full thumbnails and 2-line titles), while items further away progressively step down in size (`74px → 50px → 32px → 20px → 14px` micro-indicator squares), matching a fisheye / LOD falloff curve.
- Inline folder expansion (`▸`) opens child items inside a bordered sub-group right inside the lens flow.

### B. `🗺️ Landscape (2D Map)` View Mode
- Turns any folder into a **freeform 2D pannable/zoomable world canvas**:
  - **Pan & Zoom**: Drag empty canvas space (Left-drag or Middle-drag) to pan `(X, Y)`; scroll the mouse wheel to zoom (`25%` to `260%`).
  - **Freeform Spatial Positioning**: Drag any file or folder node to place it anywhere on the 2D map. Positions are automatically saved per folder in `settings.json`.
  - **2D Sub-Containers**:
    - Click **`▸`** on any folder node on the map to expand it in-place into a **draggable 2D Sub-Container Territory Box** showing all of its child files/folders inside a bordered window on the map.
    - Click **`+ Sub-Container`** in the bottom-left Map HUD to create custom dashed territory zones on the canvas.
  - **Distance LOD & Perimeter Horizon Radar Ring**:
    - With **`🔍 Map Lens: ON`**, nodes near the center/cursor render at full size while distant nodes shrink into compact indicator squares.
    - Any files or folders that are **off-screen or far away** project onto the **elliptical Perimeter Horizon / Radar Ring** around the edge of the viewport as tiny color-coded indicator blips (`□` gold for folders, `▪` for files, scaled by distance).
    - Hover any blip on the Horizon Ring to inspect its name and distance, or **click the blip to smoothly fly the camera directly to that file or folder**.

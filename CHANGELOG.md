# Changelog — Peek Explorer

All notable changes to **Peek Explorer** (`e:\Vector Field Theory\peek_explorer`) are documented in this file.

---

## [v0.8.8] — 2026-10-25
### Added
- **Native Address Bar Parity & Ergonomic Accessibility**:
  - **Location Icon (`#addrIcon`)**: Added dynamic icon (`🏠` Home, `🧬` Gluon, `💾` Drive, `🌐` UNC Network Share, `📁` Folder) to the left of the address bar. Clicking this icon immediately converts breadcrumbs into the editable URL input with the entire path selected for 1-click copying.
  - **Instant Mousedown Activation**: Clicking anywhere in the address bar (empty space outside breadcrumb links) instantly enters edit mode on `mousedown`, eliminating the delay and click-misses of waiting for mouseup.
  - **Non-Clearing Address Text**: `startAddressEdit()` now preserves and displays the active URI (including `peek://home` and `peek://gluon`) rather than clearing the input, making internal schemes copyable and transparent.
  - **Selection Retention Safeguard (`justStartedAddrEdit`)**: Enforced atomic text selection (`$('address').select()`) using `requestAnimationFrame` + `mouseup` capture so that releasing the mouse never deselects the text.
  - **Address History Chevron Dropdown (`#addrHistBtn` `▾`)**: Dedicated dropdown chevron at the right edge of the address bar displaying recent locations, Home, Semantic Gluons, and a 1-click "Copy current path" option.
  - **Address Bar Context Menu**: Right-clicking the address bar now surfaces native Windows Explorer actions: "Edit address", "Copy address", "Copy address as text", and "Refresh (F5)".
  - **Styling Refinements**: Added Windows 11 subtle hover borders, focus ring, and clean flex layout.
  - **Automated Smoke Tests**: Added assertions verifying `#addrIcon`, `#addrHistBtn`, and 1-click address bar text selection (30/30 tests pass).

---

## [v0.8.7] — 2026-10-25
### Added
- **Semantic Gluon DNA Engine (`gluon_engine.js`)**:
  - Full client-side pure-JS port of `unified_gluon_dna_engine.py` (v5.0 Generation 4 & 5 Universal Synthesis).
  - **QCD $SU(3)$ Color Gauge Physics**:
    - Evaluates Red ($cr$: Thesis / Will $+W$), Green ($cg$: Operational Context / Action $+A$), and Blue ($cb$: Deductive Constraint / Invariant Proof $-N, -X$).
    - Computes **White Hadron Singlet Baryon** balance ($cr \ge 0.12, cg \ge 0.12, cb \ge 0.12, \Delta \le 0.35$) to verify epistemologically balanced reasoning vs ideological skew.
  - **Cornell Confinement Potential & String Snapping**:
    - Calculates $V(r) = -\frac{\alpha_s}{r+\epsilon} + \sigma r$ with QCD strong coupling $\alpha_s = 0.35$ and string tension $\sigma = 0.85$.
    - Detects section-by-section string snapping at critical radius $r_c = 1.529$, flagging non-sequitur leaps across paragraphs.
  - **The 7 Planes of Reality across the 42-Structure**:
    - Classifies documents and sections into $Q_1$ (Metaphysical Driver / Who), $Q_2$ (Possible / What), $Q_3$ (Physical / Where), $Q_4$ (Lyrical / Why), $Q_5$ (Logical / How), $Q_6$ (Historical / Cause), and $Q_7$ (Emotive / Effect).
    - Implements non-commutative directional gauge friction matrix $F(p_1 \to p_2)$ ($Q_3 \to Q_5 \to Q_4 \to Q_1 = 0.8$, inverted leaps = $2.5$).
  - **Optical Thickness & Veritas Scoring**:
    - Calculates vocabulary CEFR density (C1/C2 proportion), Optical Thickness ($\tau$), and Luminescence ($L = e^{-\tau}$).
    - Produces a composite Veritas Rigor Score ($0-100$).
- **Preview Pane Semantic Gluon Telemetry & Drawer**:
  - **Living $SU(3)$ Gauge Bar**: Proportional Red/Green/Blue color gradient bar displaying quark composition.
  - **Hadronic Singlet Badge**: Soft white glowing badge for balanced hadron singlets or polarized indicators.
  - **7-Planes Pub-Test Card**: Immediate human-grounded explanation of the document's plane.
  - **String Snapping Warning**: Amber warning alert detailing any discontinuous leaps across sections.
  - **'🧬 Gluon Resonance' Drawer**: Asynchronously scans neighboring files in the current folder, calculates Cornell distance and affinity percentage, and displays top-4 related documents with instant click-to-preview.
- **Virtual Topic Space (`peek://gluon`)**:
  - Non-destructive semantic navigation grouping files in recent directories across the 7 Planes of Reality.
  - Interactive **7-Plane Prism Bar** (`All Planes`, `👤 Q1 Who`, `✨ Q2 What`, `🌍 Q3 Where`, `🎵 Q4 Why`, `⚙️ Q5 How`, `⏳ Q6 Cause`, `💥 Q7 Effect`) with live card filtering and Veritas badges.
- **Landscape Mode Dynamic Bridge Coloring**:
  - SVG room bridges dynamically highlight constructive depth descents in soft emerald green.
- **Standalone Portable Export**:
  - Added `gluon_engine.js` to `export-portable.js` payload.
  - Built [PeekExplorer-v0.8.7-portable.zip](file:///e:/Vector%20Field%20Theory/peek_explorer/dist/PeekExplorer-v0.8.7-portable.zip) (109.7 MB).
  - All 27 automated smoke tests passing.

---

## [v0.8.6] — 2026-10-24
### Added
- **Native Explorer Keyboard Ergonomics**:
  - `Ctrl+Shift+N`: Instantly creates a "New folder" in the current folder (`cur`) and triggers inline renaming.
  - `Alt+Enter`: Opens native Windows Properties modal for selected file/folder or current directory.
  - `Shift+Delete`: Prompts for permanent file deletion confirmation (`fs.promises.rm`) bypassing the Recycle Bin.
  - **2D Spatial Arrow Key Grid Navigation**:
    - Replaced 1D sequential arrow navigation in grid modes (`medium`, `large`, `xl`, `tiles`, `small`) with true 2D spatial stride jumping.
    - `ArrowDown` jumps vertically to the card directly below ($\text{curIdx} + \text{stride}$); `ArrowUp` jumps vertically to the card directly above ($\text{curIdx} - \text{stride}$).
    - `ArrowLeft` / `ArrowRight` move $\pm 1$ horizontally across columns.
    - Linear views (`details`, `list`, `content`) preserve standard tree expansion and vertical navigation.
  - **Post-Delete Selection Retention**:
    - Deleting item(s) no longer drops selection to zero; focus and selection automatically advance to the adjacent item index ($i$ or $i-1$).
- **Tactical RTS Minimap Radar HUD (Landscape Mode)**:
  - Added a 190×130px canvas minimap docked in the bottom-right HUD of the Landscape canvas.
  - Draws real-time room footprints with depth/type color coding (Root Room highlighted in `#0078d4`, child rooms in translucent white/blue).
  - Renders the live camera viewport frustum box (`#00e676`) showing the visible on-screen region.
  - **Click-to-Warp & Drag-to-Pan**: Clicking or dragging anywhere on the minimap instantly translates the camera to that world quadrant.
  - **Search Hit Golden Sonar Pings**: When filtering with `Ctrl+F`, rooms containing matching items pulse with golden radar waves (`@keyframes radar-pulse`) on the canvas, on edge lens proxies, and on the radar minimap.
- **Draggable Split Pane Resizer Handle**:
  - Added `<div id="splitGrip" class="split-resizer">` between primary `#content` and `#splitPane`.
  - Supports dragging to smoothly adjust split ratios between 20% and 80% with visual blue hover and drag indicators.
  - Persisted `splitRatio` in `settings.json`.
### Fixed
- **Accidental 550ms Mousedown Rename Trap Removed**:
  - Eliminated the 550ms hold-down timer that triggered unexpected inline rename textboxes during slow drags or selection pauses. Inline rename is now cleanly bound to `F2`, slow-second-click, and context menu.
- **Landscape Panning Frame Coalescing**:
  - Wrapped `updateCameraAndLens()` in `requestAnimationFrame` during mouse panning, eliminating layout thrashing and redundant edge margin DOM re-allocations on raw mousemove.
- **UNC Network Path Normalization**:
  - Resolved stripped leading slashes in `renderCrumbs()` and `parent()` for network shares (`\\server\share\sub`).

---

## [v0.8.5] — 2026-10-24
### Added
- **Standalone Portable Export & Shareable Zip**:
  - Implemented an automated export pipeline (`export-portable.js` via `npm run export` or `npm run build:portable`).
  - Assembles a 100% standalone, zero-dependency Windows distribution in `dist/PeekExplorer-portable/` containing `PeekExplorer.exe`.
  - Compresses the package into a single shareable zip: `dist/PeekExplorer-v0.8.4-portable.zip` (109.7 MB).
  - Requires **zero** installation, **zero** Node.js runtime, and **zero** admin privileges on recipient machines.
- **USB Thumb-Drive Portable Data Mode**:
  - Added portable `userData` path detection in `main.js`: if a `data/` folder exists adjacent to `PeekExplorer.exe`, user settings, pins, split setups, and history are stored locally within `data/` instead of `%APPDATA%`.
  - Bundled a default `data/` folder and `README_PORTABLE.txt` instructions in the portable export.
  - Falls back smoothly to standard Windows `%APPDATA%\peek-explorer` if the user removes `data/`.
- **Pre-Packaging Smoke Test Verification**:
  - Automatically runs the full 23-criteria smoke test suite against the packaged executable before zipping to ensure 100% runtime integrity.

---

## [v0.8.4] — 2026-10-24
### Fixed
- **Filename Text Overlap & Neighbor Column Bleed Eliminated**:
  - Resolved horizontal text collision across neighboring cards in Medium, Large, and Extra Large icon views (and inside Landscape room bodies).
  - Root-caused underscore breaking behavior in Chromium where filenames without spaces (e.g. `Reality_Tensor_Air_Matrix.docx`, `fetch_raw_search_urls_20260823.json`) refused to break under standard `word-break: break-word`.
  - Replaced breaking rule with `overflow-wrap: anywhere; word-break: break-all;` and clamped to 2 lines (`-webkit-line-clamp: 2`) with clean `...` ellipsis truncation.
  - Overrode inherited `.c-name { min-width: 120px }` with `min-width: 0 !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box; overflow: hidden;`.
  - Added strict `overflow: hidden; box-sizing: border-box;` to `.row.item` and `.room-item` so cards strictly clip all overflow content.
  - Added automated test assertion to `npm test` verifying that no item filename exceeds its parent card width.

---

## [v0.8.3] — 2026-10-24
### Fixed
- **Whole Window Scrolling Bug Resolved (Locked App Viewport)**:
  - Fixed an issue where scrolling the mouse wheel scrolled the outer Electron window (`document.documentElement` / `body`) rather than strictly scrolling the folder list (`#list`).
  - Added `overflow: hidden !important; width: 100%; height: 100%;` to `html, body` and gave `#list` `flex: 1 1 0; min-height: 0; min-width: 0; overflow-y: auto; overflow-x: hidden;`.
  - Added horizontal scroll containment to `#toolbar` so toolbar button overflow never widens or scrolls the outer document.
  - Verified `htmlScrollHeight === htmlClientHeight` (0px document overflow).
### Added
- **Universal Middle-Click Ubiquity Across Landscape & Split Panes**:
  - **Room Headers & Titles**: Middle-clicking `.map-room-head` or room title opens that room in a background tab (`Shift+Middle-Click` focuses immediately).
  - **Room Zoom Button (`🔍 Enter`)**: Middle-clicking room `🔍 Enter` button opens the room in a new tab.
  - **Room Subfolder Items & Doorways**: Middle-clicking any subfolder row inside a room opens that subfolder in a new tab.
  - **Doorway Bridge Buttons (`🏝️ Open` / `🏝️ Bridge`)**: Middle-clicking bridge toggle opens that folder in a new tab.
  - **Edge Lens Margin Proxies (`.lens-proxy`)**: Middle-clicking off-screen room indicator boxes opens that room in a new tab.
  - **HUD Buttons**: Middle-clicking `🔍 Enter Room` or `🗺️ World` opens active or root room in a new tab.
  - **Split Pane Bar**: Middle-clicking `#spHome`, `#spUp`, `#spBack`, or `#spSwap` opens the corresponding target in a new tab.
- **Relative Map Changelog Audit**:
  - Formatted comprehensive architectural progression audit across the 9 relative map coordinates (`Productive`, `Reductive`, `Regress`, `Constructive`, `is`, `can be`, `is not`, `was like`, `is like`) and the 4 transformation vectors (`inclusive`, `latent active`, `exclusive`, `latent counteractive`) in [relative_map_changelog_audit.md](file:///e:/Vector%20Field%20Theory/peek_explorer/plans/relative_map_changelog_audit.md).

---

## [v0.8.2] — 2026-10-24
### Fixed
- **Landscape Room Rendering Crash (`extType is not defined`)**:
  - Fixed a `ReferenceError: extType is not defined` at `renderer.js:1255` when rendering indoor room file rows.
  - Replaced undefined `extType(it.name)` call with existing `typeOf(it)` helper, restoring full Landscape room rendering for directories with files.
- **Normal Views Vertical Mousewheel Scrolling Restored**:
  - Resolved an issue where opening or initializing Landscape/Lens mode permanently bound canvas wheel zoom listeners to the global `#list` container.
  - When switching back to normal views (`Details`, `Tiles`, `List`, `Small Icons`, `Medium Icons`, `Large Icons`, `Extra Large`, and `Content`), the listener called `e.preventDefault()`, which completely blocked native Chromium mousewheel scrolling on `#list`.
  - Encapsulated all Landscape mode DOM elements (`world`, `innerFrame`, `marginLayer`, `marqueeEl`, `hud`) inside a dedicated `.landscape-viewport` wrapper element. Canvas panning and wheel-zoom listeners are now bound strictly to `.landscape-viewport` and are cleanly destroyed when returning to normal views.
### Added
- **Developer Tools Console (`F12` / `Ctrl+Shift+I` & `🛠️ Console` Toolbar Button)**:
  - Enabled standard `F12` and `Ctrl+Shift+I` shortcuts in `main.js` to toggle Chromium Developer Tools.
  - Added a `🛠️ Console` button to the toolbar for one-click DevTools access.
  - Forwarded renderer console messages (`log`, `warn`, `error`) to CLI/terminal stdout.
- **Global Error Reporting & Clickable Status Bar**:
  - Added global `window.onerror` and `unhandledrejection` handlers in `renderer.js`.
  - Displays red error notification in `#status` bar (`⚠️ Error: ... (Click for Console)`) which opens DevTools immediately when clicked.
- **Automated Smoke Test Runner (`npm test` / `--smoke-test`)**:
  - Added headless automated user test pass in `main.js` and `package.json` verifying 20 test invariants across standard views, landscape room file rendering, HUD controls, view switching regressions, and split pane scrolling.
  - Verified 0 lingering background tasks/processes on test completion.

---

## [v0.8.1] — 2026-10-24
### Added
- **Native Bidirectional Drag-and-Drop**:
  - Dragging files/folders from native Windows Explorer or Desktop into Peek Explorer targets (`#list` floor, folder rows, sidebar destinations, breadcrumb segments, and Landscape rooms).
  - Dragging files out of Peek Explorer into external Windows Explorer folders, Desktop, or applications via `window.api.startDrag` and `event.sender.startDrag` with native shell file icons.
  - Cross-device link fallback handling (`EXDEV`/`EPERM`) in `paste` for moving across Windows drive letters.

---

## [v0.8.0] — 2026-10-24
### Added
- **Controls Decoupling & Unified Room Item Flow**:
  - Decoupled canvas panning from selection; Shift+Drag marquee selection on landscape canvas.
  - Unified `.map-room-doors` and `.map-room-files` into `.map-room-body`.
  - Added Global View selector to HUD and local view overrides per room.
  - Compiled `docs/RESEARCH_AND_QOL_ROADMAP.md`.

---

## [v0.7.0] — 2026-10-23
### Added
- **Tab Split Dropdown (`▾` on Tabs & `◫ Split` Toolbar Button / `Alt+S`)**:
  - Split any tab **Left (`◧`)**, **Right (`◨`)**, **Up (`⬒`)**, or **Down (`⬓`)**, or split directly with another open tab.
  - Independent secondary pane with its own path bar, view mode selector (`Details`, `List`, `Tiles`, `Medium`, `Large`, `🔍 Lens`, `🗺️ Landscape`), swap button (`⇄`), and cross-pane drag-and-drop.
- **`🔍 Lens (LOD)` View Mode**:
  - Displays all files/folders simultaneously using an adaptive base size and dynamic mouse focal magnification (`132px` focus core stepping down to `14px` micro-indicator squares at the periphery).
- **`🗺️ Landscape (2D Map)` View Mode & Perimeter Horizon Radar Ring**:
  - Freeform 2D pannable/zoomable canvas where files and folders can be dragged anywhere and remember their `(x, y)` coordinates per folder (`SPIRAL` and `CLUSTERS` auto-layouts included).
  - **2D Sub-Containers**: Clicking `▸` on any folder on the map expands it into a live draggable 2D Sub-Container box displaying its children; `+ Sub-Container` adds custom territory zones.
  - **Perimeter Horizon / Radar Ring**: Distant or off-screen files/folders project onto a dashed elliptical radar ring around the viewport edge as tiny clickable indicator squares (`□` / `▪`) that fly the camera to that target when clicked.
- **Drag-and-Drop onto `⚡ Scripts` Button**:
  - Dragging script files from inside Peek Explorer or external Windows Explorer onto `#scriptsBtn` (or the Home Dashboard Scripts section) immediately connects them.
- **Surgical In-Place Rename (`applyItemRenameInPlace`)**:
  - Renaming via inline `F2`/hold/slow-click, Preview Pane textbox, Batch Rename, or `Ctrl+Z` undo mutates the DOM node and paths in-place without clearing `#list` or resetting scroll position.

---

## [v0.6.0] — 2026-10-23
### Added
- **Universal Middle-Click Support**:
  - Middle-clicking any folder row, sidebar item, bookmark, breadcrumb segment, or Home Dashboard card opens it in a **background tab** (`Shift + Middle-Click` focuses the new tab immediately).
  - Middle-clicking a tab closes it; middle-clicking empty space on the tab bar (or double-clicking it) opens a new tab; middle-clicking `+` duplicates the current tab.
  - Middle-clicking `←` Back, `→` Forward, `↑` Up, or `🏠` Home opens that target location in a new tab.
  - Suppressed Chromium's default middle-click autoscroll circle globally.
- **Tab Power Features**:
  - **Reopen Closed Tab (`Ctrl+Shift+T`)** and tab right-click menu items: **Pin/Unpin tab (`📌`)**, **Duplicate tab**, **Close other tabs**, and **Close tabs to the right**.
- **Group By (`Group: None / Type / Date / Size / Name`)**:
  - Collapsible group headers in the file list matching Windows 11 Explorer.
- **Toolbar Toggles**:
  - **Item Checkboxes (`☑`)** for effortless mouse-only multi-selection + **Invert selection** in context menu.
  - **File Extensions toggle (`.ext`)** to show/hide extensions in display labels.
- **Real Windows OS File Clipboard Integration**:
  - `Copy` / `Cut` pushes files to the native Windows clipboard (`Set-Clipboard -Path`), and `Paste` reads files copied in native Windows Explorer (`Get-Clipboard -Format FileDropList`).
- **Batch Rename, Zip/Unzip, Folder Size & Bookmarks**:
  - Selecting multiple items and opening the Preview Pane (or pressing `F2`) provides a **Batch Rename** input (`Base (1).ext`, `Base (2).ext`, undoable with `Ctrl+Z`).
  - **📦 Compress to `.zip`** and **📦 Extract zip to folder** in the right-click menu.
  - **Calculate folder size** on demand (in folder right-click menu and Preview Pane).
  - **⭐ Bookmarks** section in the sidebar (right-click any folder → `⭐ Bookmark folder in sidebar`).
- **Video & Audio Playback in Preview Pane**:
  - Selecting `.mp4`, `.webm`, `.mov`, `.mp3`, `.wav`, `.ogg`, or `.flac` files renders an inline HTML5 player inside the `▤ Preview` pane.
- **Full Documentation Suite**:
  - Created [README.md](file:///e:/Vector%20Field%20Theory/peek_explorer/README.md), [docs/USER_GUIDE.md](file:///e:/Vector%20Field%20Theory/peek_explorer/docs/USER_GUIDE.md), [docs/MISSING_AND_PROPOSED_FEATURES.md](file:///e:/Vector%20Field%20Theory/peek_explorer/docs/MISSING_AND_PROPOSED_FEATURES.md), and [CHANGELOG.md](file:///e:/Vector%20Field%20Theory/peek_explorer/CHANGELOG.md).

---

## [v0.5.0] — 2026-10-23
### Added
- **`🏠` Home Dashboard (`peek://home` / `Alt+Home`)**: Drive cards with capacity bars, Quick Access pin cards, Script Connection cards, and Recent Folders.
- **New Tab Settings**: Configurable `+` / `Ctrl+T` target (`Home Dashboard` default, `User Home Folder`, or `Duplicate Current Tab`) so new tabs don't unexpectedly duplicate your current folder.
- **`⚡` Script Connections**: Attach and run `.ps1`, `.bat`, `.cmd`, `.py`, `.js`, and `.vbs` scripts with `PEEK_DIR` and `PEEK_SELECTED` context.
- **Mouse Back/Forward & History Menu**: Hardware Mouse Button 4/5 navigation + right-clicking `←`/`→` shows full tab history list.
- **4-Way Rename**: Direct rename textbox in Preview Pane, ~550 ms hold-down rename on rows, slow second-click rename on labels, and `F2`.
- **Native Extras**: `Ctrl+Z` Undo for rename/move, `Open PowerShell here`, and `👁` hidden dot-file toggle.

---

## [v0.4.0] — 2026-10-23
### Added
- Multi-select (`Ctrl`/`Shift` click, `Ctrl+A`, rubber-band drag box, batch Cut/Copy/Paste/Delete).
- Full keyboard tree navigation (`ArrowUp`/`Down`/`Left`/`Right`/`Home`/`End`/`PgUp`/`PgDn` + type-to-select).
- Interactive breadcrumb address bar with `›` subfolder dropdowns and `Ctrl+L` edit mode.
- Resizable Details columns + `Ctrl + Mouse Wheel` view scaling.
- Drag-and-drop with 650 ms hover auto-expand + drag-to-reorder tabs.
- Cross-window shared clipboard, 0 ms cached Quick Access pins, `New .txt / .md` creation, `▤ Preview` pane (`Alt+P`), and Dark Mode (`🌙`/`☀️`).

---

## [v0.3.0] — 2026-10-23
### Added
- Persistent `settings.json` (view, sort, window bounds, tab session, expanded folders).
- Multi-tab bar and multi-window support (`Ctrl+N`).
- Fixed drive icons and blank OneDrive special-folder icons.

---

## [v0.2.0] — 2026-10-23
### Added
- Real Quick Access pins from Windows Shell COM.
- All 8 standard Explorer view modes + sorting + real Windows icons and high-res thumbnails.
- Custom context menu + real Windows verbs (`Show more options ›`).
- Silent launchers (`Peek Explorer.lnk`, `PeekExplorer.vbs`, `PeekExplorer.bat`).

---

## [v0.1.0] — 2026-10-23
### Added
- Initial prototype with inline folder expansion (`▸`/`▾`) in Details view and optional image thumbnail grid.

# Peek Explorer — File Manager Research, Community Wishlists & Actionable QOL Roadmap

*Author: Antigravity Pair Programmer & Developer Agent*  
*Date: 2026-10-24*  
*Target: Peek Explorer v0.8+ Architecture*  

---

## 1. Executive Summary & Research Methodology

To establish Peek Explorer as a premier file manager for Windows, we conducted deep comparative research across five major file explorer ecosystems:
1. **Windows 11 Native Explorer**: Ubiquitous standard, benchmark for familiar ergonomics and shell integration.
2. **Directory Opus (DOpus 13)**: The benchmark for power-user customizability, dual-pane productivity, flat views, and scriptable toolbars.
3. **Files App (`files.community`)**: Modern WinUI/Fluent open-source benchmark (35k+ GitHub stars), renowned for UI polish, Git integration, and dual-pane layout.
4. **Total Commander**: The 30-year veteran of dual-pane keyboard-driven efficiency, multi-rename tools, and synchronization.
5. **Spacedrive (VDFS)**: The infinite canvas spatial file manager (30k+ GitHub stars), exploring spatial directory clustering and substrate-neutral file organization.

We analyzed real user pain points, feature requests, and complaints sourced from GitHub issues, Reddit (`r/windows`, `r/software`, `r/sysadmin`), and power-user community forums.

---

## 2. Community Research Findings: What People Ask For in File Explorers

### A. The Top 6 Universal Complaints About Windows Explorer
1. **Sluggishness & Refresh Clobbering**: Windows 11 Explorer routinely freezes when refreshing large directories, and renames often trigger a full-tree re-render that resets scroll position to the top and loses focus.
2. **Half-Baked Tab Implementation**: Native Explorer tabs cannot be split side-by-side or stacked top-and-bottom within the same window; you must open separate windows and arrange them manually.
3. **Nested Context Menu Friction**: The two-tier context menu (`Show more options ›`) adds an extra click for common power-user shell verbs (7-Zip, VS Code, Git GUI, Tortoise).
4. **No True "Flat View"**: There is no way to see all files inside subfolders flattened into a single sorted list (e.g., sorting all files across 10 subdirectories by size or modification date).
5. **Rudimentary Batch Renaming**: Native Windows batch rename only supports basic `Name (1).ext`, lacking regex, sequential numbering offsets, prefix/suffix stripping, or extension changing.
6. **No Native Checksum Verification**: Verifying an ISO, installer, or download hash requires launching PowerShell or third-party utilities.

### B. Why Power Users Love Directory Opus and Total Commander
- **Dual-Pane Split Workspaces**: Two folder lists visible simultaneously with single-key transfer (`F5` copy, `F6` move), synchronized directory scrolling, and instant directory comparison.
- **Flat View (Mixed Branch)**: One-click flattening of an entire directory tree so all nested media or documents can be audited in a single list.
- **Customizable Columns**: Instant display of audio bitrates, image dimensions, git status, file hashes, and word counts directly in the file table.
- **High-Velocity Renaming**: Instant preview of batch renames before committing changes to disk.

### C. Why Modern Users Are Drawn to Spatial & Infinite Canvas Explorers (Spacedrive, Miro, Obsidian Canvas)
- **Spatial Memory**: Humans recall location and spatial relationships ("the project is to the right of the reference folder") far better than hierarchical nested paths (`D:\Work\Client\2026\Q3\Assets\Final`).
- **Context Preservation**: In traditional explorers, clicking into a subfolder completely destroys the view of the parent directory. Spatial / Room-based canvas modes preserve the context of parent, sibling, and child directories simultaneously.
- **Two-Rectangle Edge Lens**: Off-screen awareness prevents the "lost in the void" feeling common to infinite 2D canvas interfaces.

---

## 3. How Peek Explorer Solves These Challenges

Peek Explorer v0.8 integrates these concepts into a unified architecture:

| Challenge / Need | Traditional Explorer Approach | Peek Explorer v0.8 Solution |
|---|---|---|
| **Context Loss on Deep Browsing** | Wipes current view on folder double-click. | **Dual Ergonomics**: Inline tree expansion (`▸`/`▾`) in standard view + **Landscape Multi-Folder Rooms connected by Bridges** on a 2D canvas. |
| **Canvas Pan vs Item Selection Conflict** | Many canvas apps select items when dragging background. | **Decoupled Controls**: Left-drag canvas = 100% camera pan. Shift-drag = Marquee box. Click items = Select. |
| **Room Space Utilization** | Subfolders cramped into doorways, files empty. | **Unified Room Body**: Folders and files render together in full view parity (Details, Tiles, List, Icons) with inline `[🏝️ Bridge]` toggles. |
| **Global vs Local Customization** | Global view mode only, or hidden per-folder cache. | **Dual View Modes**: Global HUD view dropdown + per-room local view dropdown (`👁 View ▾`) and context menu. |
| **Rename Scroll Reset** | Explorer re-scans disk and scrolls to top. | **Surgical In-Place DOM Rename** (`applyItemRenameInPlace`): zero flicker, zero scroll reset, 0 ms DOM patch. |
| **Multi-Pane Productivity** | Clunky separate OS windows. | **4-Way Tab Split** (`Alt+S`): Split Left, Right, Up, or Down with full drag-and-drop between panes. |

---

## 4. Prioritized Quality of Life (QOL) Roadmap for Peek Explorer

### Priority 1: High-Impact Ergonomic Upgrades (v0.8.1 – v0.8.2)

1. **Dual-Pane Quick-Toggle (`Ctrl+Shift+D` or `F3`)**:
   - One-press shortcut to split current tab horizontally (Left/Right) or vertically (Up/Down).
   - `Tab` key toggles focus between Primary and Split Pane.
   - `F5` copies selected items to other pane; `F6` moves selected items to other pane.

2. **Landscape Spatial Minimap / Radar Preview**:
   - A semi-transparent interactive minimap overlay in the bottom-right of the Landscape canvas.
   - Shows all active Room boxes as mini rectangles with the Root Room highlighted.
   - Displays the current camera viewport frustum; clicking anywhere on the minimap pans the camera instantly.

3. **Flat View Toggle (Mixed Branch View) (`Ctrl+Shift+F`)**:
   - In standard view or inside any Room, a "Flat View" toggle flattens all nested descendant files into a single list with a `Path` column.
   - Enables sorting all files across deep subdirectories by Size, Date, or Type in one place.

### Priority 2: Power-User & Developer Enhancements (v0.8.3 – v0.8.5)

4. **Git Repository Status & Branch Badges**:
   - Auto-detect `.git` root in current folder or parent tree.
   - Display active branch name in status bar (` main · 2 modified · 1 untracked`).
   - Add status badges next to filenames: modified (`●` yellow), untracked (`+` green), staged (`✔` blue).

5. **Instant Checksum & Hash Calculator in Preview Pane**:
   - When any file is selected, Preview Pane includes a collapsible `Hashes` card.
   - Computes MD5 and SHA-256 asynchronously with a progress indicator and one-click copy button.

6. **Advanced Multi-Token Batch Renamer**:
   - Expand the Preview Pane batch rename modal with token buttons:
     - `[#] Counter`: `{001}`, `{01}`, `{1}` with custom start index and step.
     - `[Date]`: `{YYYY-MM-DD}`, `{YYMMDD}`.
     - `[Parent]`: Folder name token.
     - `[Find & Replace]`: Regex support with live preview before committing.

7. **Quick Open / Jump Palette (`Ctrl+P`)**:
   - Instant search modal across Quick Access pins, Bookmarks, Drives, and Recent Folders with keyboard arrow selection.

### Priority 3: Shell & Ecosystem Completeness (v0.9+)

8. **Recycle Bin Virtual Explorer (`peek://trash`)**:
   - Browse deleted items with original location, deletion date, and one-click Restore.
9. **Native File Drag-Out to External Applications**:
   - Wire Electron's `startDrag` API so dragging files from Peek Explorer into Photoshop, Discord, or desktop works seamlessly.
10. **Portable Packaged Executable**:
    - Self-contained `PeekExplorer.exe` requiring zero external dependencies.

---

## 5. Summary Matrix of Explorer Features

| Feature | Windows 11 Explorer | Directory Opus 13 | Files App | Spacedrive | **Peek Explorer v0.8** |
|---|:---:|:---:|:---:|:---:|:---:|
| **Inline Folder Expansion (`▸`/`▾`)** | ❌ (Tree in sidebar only) | ❌ | ❌ | ❌ | **✅ Built-in (All views)** |
| **Tabbed Browsing** | ✅ Basic | ✅ Full | ✅ Full | ✅ Basic | **✅ Middle-click, Pins, Reopen** |
| **Tab Split (Left/Right/Up/Down)** | ❌ | ✅ | ✅ Dual only | ❌ | **✅ 4-Way Tab Split** |
| **Spatial 2D Multi-Folder Canvas** | ❌ | ❌ | ❌ | ✅ Basic | **✅ Rooms, Bridges & Collision Solvers** |
| **Two-Rectangle Edge Lens** | ❌ | ❌ | ❌ | ❌ | **✅ Outer Shrinking Margin Queue** |
| **Full View Parity inside Canvas Rooms**| ❌ | ❌ | ❌ | ❌ (Tiles only) | **✅ 8 View Modes (Global + Local)** |
| **Script Runner Integration** | ❌ | ✅ Script buttons | ❌ | ❌ | **✅ `⚡ Scripts` + Drag-to-connect** |
| **In-Place DOM Rename (Zero Scroll Reset)** | ❌ | ✅ | ❌ | ✅ | **✅ Surgical DOM patch** |
| **Home Dashboard with Drive Meters** | ❌ ("Home" feed only) | ❌ | ✅ | ✅ | **✅ `peek://home` Dashboard** |

---

## 6. Gen 1 Agent Breeding Audit & Architectural Synthesis (2026-10-24)

Two autonomous agents were spawned and calibrated using the Epistemic Sexual Dimorphism framework ([`agent-breeding-lineage`](file:///e:/Vector%20Field%20Theory/VFT%20Docs/.agents/skills/agent-breeding-lineage/SKILL.md)) to audit Peek Explorer v0.8.5 and establish the next innovation horizon.

### A. The Invariant Verification (♂ The Son — Veritas-Struct, 0.75M / 0.25F)
- **Verified Floors**:
  - Viewport scroll containment (`html, body { overflow: hidden !important; }`) successfully isolates wheel events to `#list` and canvas layers.
  - Two-rectangle edge lens and AABB collision solvers maintain clean room spacing.
  - Universal middle-click works across tabs, crumbs, room headers, and edge proxies.
  - Card-level clamping (`overflow-wrap: anywhere; word-break: break-all; -webkit-line-clamp: 2;`) eradicates horizontal text collisions.
- **Identified Deficiencies**:
  - Missing Windows Explorer keyboard shortcuts (`Ctrl+Shift+N`, `Alt+Enter`, `Shift+Delete`).
  - Broken 2D spatial arrow navigation in Grid modes (navigated horizontally instead of vertical column strides).
  - Deletion drops selection to zero instead of retaining adjacent index.
  - 550ms mousedown hold timer triggers accidental inline renames during slow drags.
  - Landscape panning lacks `requestAnimationFrame` coalescing, causing DOM reflow in the margin layer.

### B. The Possibility Expansion (♀ The Daughter — Chroma-Horizon, 0.25M / 0.75F)
- **Featherweight Pure-JS Semantic Similarity Engine**:
  - Pure JavaScript TF-IDF + BM25 + 3-word MinHash n-gram shingling (< 250 KB JS payload, zero PyTorch/ONNX models).
  - Instant pairwise cosine similarity matrix (< 15 ms for 500 markdown files).
  - Preview Pane `🧬 Semantic Similarity` drawer surfacing top-5 related files across drives.
- **Virtual Topic Spaces (`peek://topic/<name>`)**:
  - Non-destructive aggregation rooms grouping files by concept without altering physical filesystem paths.
  - One-click `📁 Export as Windows Shortcuts` to generate native `.lnk` shortcut folders or NTFS Junctions.
  - "Semantic Git": Sub-file Markdown header (`#`, `##`, `###`) topic drift tracking.
- **Tactical RTS Minimap Radar HUD**:
  - Interactive 190×130px canvas minimap rendering room footprints and camera frustum.
  - Click-to-warp and drag-to-pan camera navigation.
  - Search hit golden sonar pings pulsing on rooms containing matching items.
- **Multi-Polar Semantic Gravity**:
  - Auto-clustering room islands along gravitational barycenters (Notes/Epistemic, Code/Engineering, Studio/Media).

### C. Execution Pipeline
1. **v0.8.6 (Current)**: Phase 1 (Native Explorer Parity & 2D Grid Arrows) + Phase 2 (Tactical Radar HUD & Draggable Splitter).
2. **v0.8.7**: Phase 3 (Featherweight Semantic Similarity Engine & Preview Pane Similarity Badges).
3. **v0.9.0**: Virtual Topic Spaces (`peek://topic/`) and Semantic Git Topic Drift Tracking.

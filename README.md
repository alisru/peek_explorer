# Peek Explorer (v0.6)

**Peek Explorer** is a Windows 11-style file manager built around **inline drop-down folder expansion (`▸`/`▾`)** across every view mode (`Details`, `List`, `Tiles`, `Content`, and `Small`/`Medium`/`Large`/`Extra Large Icons`), combined with browser-style tabs, a `🏠` Home Dashboard, `⚡` Script Connections, and a 4-way rename workflow.

---

## Quick Start (No Terminal Needed)

Double-click any of the launchers in `e:\Vector Field Theory\peek_explorer`:

| Launcher | Description |
|---|---|
| **[Peek Explorer.lnk](file:///e:/Vector%20Field%20Theory/peek_explorer/Peek%20Explorer.lnk)** | Windows shortcut — starts silently with no console window. Pin it to your Taskbar, Start Menu, or Desktop. |
| **[PeekExplorer.vbs](file:///e:/Vector%20Field%20Theory/peek_explorer/PeekExplorer.vbs)** | Direct silent VBScript launcher. |
| **[PeekExplorer.bat](file:///e:/Vector%20Field%20Theory/peek_explorer/PeekExplorer.bat)** | Batch launcher (auto-runs `npm install` if `node_modules` is missing). |
| `npm start` | Developer CLI launch. |

---

## Documentation Index

| Document | Purpose |
|---|---|
| **[docs/PEEK_EXPLORER.md](file:///e:/Vector%20Field%20Theory/peek_explorer/docs/PEEK_EXPLORER.md)** | **Master Architecture & Feature Reference** — Complete technical breakdown, IPC API, safety invariants, and full comparison matrix of current vs. proposed features. |
| **[docs/USER_GUIDE.md](file:///e:/Vector%20Field%20Theory/peek_explorer/docs/USER_GUIDE.md)** | **User Manual, Shortcuts & Mouse Reference** — Every keyboard shortcut, middle-click gesture, 4-way rename guide, and Script Connections tutorial. |
| **[docs/MISSING_AND_PROPOSED_FEATURES.md](file:///e:/Vector%20Field%20Theory/peek_explorer/docs/MISSING_AND_PROPOSED_FEATURES.md)** | **Exhaustive Gap Analysis & Proposed Roadmap** — Every feature still missing compared to Windows 11 Explorer, Directory Opus, XYplorer, Total Commander, and Files (`files.community`), ranked by complexity and priority. |
| **[CHANGELOG.md](file:///e:/Vector%20Field%20Theory/peek_explorer/CHANGELOG.md)** | **Release History** (`v0.1` → `v0.6`). |
| **[plans/task.md](file:///e:/Vector%20Field%20Theory/peek_explorer/plans/task.md)** | **Implementation Log & Historic Plans** (`implementation_plan_01.md` → `implementation_plan_11_v06_complete_explorer_and_docs.md`). |

---

## Core Highlights (v0.6)

- **Inline Folder Peek (`▸` / `▾`)**: Drop down any folder in place to arbitrary nesting depth without leaving your current folder. Works in all 8 view modes.
- **Browser-Grade Middle-Click Everywhere**:
  - Middle-click any folder row, sidebar item, breadcrumb segment, or Home Dashboard card to open it in a **background tab** (`Shift + Middle-Click` switches to it immediately).
  - Middle-click any tab to close it; middle-click empty tab-bar space to open a new tab; middle-click `+` to duplicate the current tab; middle-click `←` / `→` / `↑` / `🏠` to open that navigation target in a new tab.
- **`🏠` Home Dashboard (`peek://home`)**: Shows drive capacity bars, Quick Access pins, `⭐` Bookmarks, `⚡` Script Connections, and Recent Folders, plus a selector for what `+` New Tab opens (`Home Dashboard`, `User Home Folder`, or `Duplicate Current Tab`).
- **4-Way File & Folder Renaming + Batch Rename**:
  1. **Preview Pane Direct Textbox** (`Alt+P`): Select one item to edit its name directly in the preview textbox, or select multiple items to **Batch Rename** them (`Name (1).ext`, `Name (2).ext`).
  2. **Hold-Down (~550 ms) Rename**: Hold left-click on any file or folder for ~0.55 s without dragging.
  3. **Slow Second-Click Rename**: Click the name of an already-selected item after 450–1800 ms.
  4. **`F2` or Right-Click → Rename**.
- **`⚡` Script Connections**: Attach `.ps1`, `.bat`, `.cmd`, `.py`, `.js`, or `.vbs` scripts and run them on the current folder (`PEEK_DIR`) and selected items (`PEEK_SELECTED` + CLI args).
- **Native Windows Integration**: Real Windows Quick Access pins (cached for 0 ms startup), real Windows icons & high-res thumbnails, real Windows shell verbs (`Show more options ›`), and real Windows OS clipboard (`CF_HDROP` via `Set-Clipboard` / `Get-Clipboard`).

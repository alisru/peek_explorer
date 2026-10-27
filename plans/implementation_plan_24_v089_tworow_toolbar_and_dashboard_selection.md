# Implementation Plan 24: Two-Row Fluent Toolbar & Native Home Dashboard Selection (v0.8.9)

**Active Project**: `e:\Vector Field Theory\peek_explorer`  
**Date**: 2026-10-25  
**Version**: 0.8.9  

## Context & User Feedback
1. **Address Bar Width Compression**: The user noted: *"the file url text box should be more accessable like in native"* and *"no i mean the address bar gets shrunk because of all the crap you have on the bar too"*. 18 action buttons on a single row squeezed the address bar down to ~150px.
2. **Premature Card Navigation on Home**: The user reported: *"omfg you made it so i cant select shit because everything opens on click? why?!"*. Clicking any drive, quick access pin, or recent folder immediately navigated (`go(path)`), preventing single-click selection, multi-select, preview inspection, and keyboard navigation.

## Architectural Changes

### 1. Two-Row Fluent Toolbar (`index.html` & `styles.css`)
- **Row 1 (`.toolbar-row.nav-row`)**: Dedicated to navigation and paths:
  - Navigation buttons: `← Back`, `→ Forward`, `↑ Up`, `🏠 Home`, `⟳ Refresh`.
  - `#addrWrap`: Expanded to `flex: 1`, giving it 800px+ of full horizontal width.
  - `#addrIcon`: Location type icon with instant 1-click select-all focus.
  - `#addrHistBtn` (`▾`): Dropdown for fast recent history.
  - `#search`: 240px inline search/filter input.
- **Row 2 (`.toolbar-row.cmd-row`)**: Dedicated to commands and view tools:
  - `⚡ Scripts` dropdown button.
  - Separator (`.cmd-sep`).
  - `#sort` and `#sortDir` sorting controls.
  - `#group` grouping control.
  - Separator (`.cmd-sep`).
  - `#view` selector & `#splitBtn` split screen trigger.
  - Separator (`.cmd-sep`).
  - Toggles: `#checkBtn` (`☑`), `#extBtn` (`.ext`), `#hiddenBtn` (`👁`), `#previewBtn` (`▤ Preview`).
  - Spacer (`.cmd-spacer`).
  - `#themeBtn` (`🌙` / `☀️`) & `#devToolsBtn` (`🛠️ Console`).

### 2. Native Explorer Selection & Double-Click Navigation on Home (`renderer.js`)
- Standardized Home Dashboard cards (`.drive-card`, `.pin-card`, `.recent-card`):
  - **Single Click (`click`)**: Calls `selectClick(card._item, card, e)`. Highlights card with `.sel`, updates status bar with selection telemetry, and loads metadata into the Preview Pane.
  - **Double Click (`dblclick`)**: Calls `go(path)` to navigate into the drive or folder.
  - **Right Click (`contextmenu`)**: Selects card and displays native context menu.
  - **Middle Click (`auxclick`)**: Opens folder in background/foreground tab.
  - **Background Click**: Clicking on empty `.dash` canvas clears selection.
- Added `.dash-card` to `visibleRows()` to enable arrow key navigation and `Ctrl+A` selection on the Home Dashboard.
- Added `.dash-card.sel` CSS styling matching Windows 11 Fluent selection aesthetics.

## Verification & Automated Test Suite
- Extended automated smoke test suite in `main.js` to 31 tests.
- Verified single-click selection on Home cards without triggering premature navigation (`window.cur === 'peek://home'`).
- Packaged portable export: `dist/PeekExplorer-v0.8.9-portable.zip` (109.7 MB) and `dist/PeekExplorer-portable/` (271.0 MB).

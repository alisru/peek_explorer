# Implementation Plan 23: v0.8.8 — Native Address Bar Ergonomics & Accessibility

## 1. Context & Objective
The user requested: *"the file url text box should be more accessable like in native"*, accompanied by screenshots comparing Peek Explorer's address bar to Windows 11 Explorer.

In native Windows File Explorer:
1. **Instant Mousedown Activation**: Clicking anywhere in the address bar (outside a specific crumb button) instantly turns the breadcrumbs into the full raw path text box (`address`) with all text pre-selected for 1-keystroke copying (`Ctrl+C`) or replacing.
2. **Current Location Icon**: An icon representing the current folder/drive/scheme sits at the left of the address bar. Clicking it immediately switches to the editable full path.
3. **Address History Chevron**: A `▾` dropdown button at the right end of the address bar shows recent and parent locations for 1-click navigation.
4. **Context Menu Parity**: Right-clicking the address bar provides "Copy address", "Copy address as text", and "Edit address".
5. **No Selection Clearing Trap**: In Electron/web inputs, mousedown/mouseup races can accidentally deselect text when focusing; a `justStartedEdit` guard guarantees the full text remains selected on click.

## 2. Changes & File Modifications
- **`index.html`**:
  - Update `#addrWrap` to include `<div id="addrIcon" class="addr-icon"></div>` on the left and `<button id="addrHistBtn" class="addr-btn">▾</button>` on the right.
- **`styles.css`**:
  - Style `#addrWrap`, `.addr-icon`, and `#addrHistBtn` with native Windows 11 Explorer ergonomics and theme responsiveness.
- **`renderer.js`**:
  - Add dynamic `updateAddrIcon()` setting the appropriate icon (`🏠`, `🧬`, `💾`, `📁`).
  - Update `startAddressEdit()` to always display `cur` (not clearing on Home or virtual spaces) and select all text cleanly.
  - Add mousedown listener on `#addrWrap` to trigger edit immediately without waiting for mouseup/click.
  - Add click handler for `#addrIcon` and `#addrHistBtn`.
  - Add right-click context menu on `#addrWrap` with "Copy address", "Copy address as text", "Edit address", and "Refresh".
- **`main.js`**:
  - Add smoke test assertions for `#addrIcon`, `#addrHistBtn`, and address bar text selection.
- **`CHANGELOG.md` & `package.json`**:
  - Bump to v0.8.8 and document changes.

## 3. Invariants & Safety
- The 550ms hold-to-rename listener is strictly preserved and untouched.
- Native keyboard shortcuts (`Ctrl+L`, `Alt+D`, `Escape`, `Enter`) continue working seamlessly.

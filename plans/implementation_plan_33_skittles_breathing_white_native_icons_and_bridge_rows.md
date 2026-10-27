# Implementation Plan 33 — Skittles Mode, White Breathing, Native Folder Icons, Bridge Row Origin & Terminal Suite

**Active Project**: `e:\Vector Field Theory\peek_explorer`  
**Version**: `0.8.20`  
**Objective**: Deliver a unified, token-efficient implementation pass resolving the 11 user-reported UI/UX requests with zero regressions.

---

## 1. Scope of Changes

### 1. File Strip & Alt Key
- Prevent <kbd>Alt</kbd> key from dropping down the native Electron menu bar (`w.setAutoHideMenuBar(false); w.setMenuBarVisibility(false)` in `main.js`).
- Rename Settings section `Explorer File Strip` to `File List Display Options` in `index.html`.

### 2. Breathing Mode Redesign
- Redesign Breathing Mode so room borders and backgrounds oscillate between their base theme color and a clean, configurable target color (default `#ffffff` / white light tint) rather than fading to dull desaturated grey.
- Provide a target color picker (`#setBreathTargetColor`) in Settings.
- Selected / opened folders maintain a distinctive darker/accented shade during the breath cycle.

### 3. Static Rainbow Spectrum
- Change `Rainbow Spectrum` to a static, sequential color assignment across rooms (red, orange, yellow, green, cyan, blue, purple) rather than active hue animation.

### 4. Folder Tile Colors Relate to Child Room
- Inside any room, unselected/unopened folder rows carry a gentle, lighter ambient tint of the parent room's color (`rgba(roomColor, 0.08)` / `border-color: rgba(roomColor, 0.25)`).
- Opened/bridged folder rows take the exact color of the child room they open, styled in a rich, darker accent shade (`rgba(childColor, 0.22)` / `border-color: childColor`), creating an intuitive visual thread.

### 5. Glow Controls in Landscape
- Add Room Glow intensity slider (`#setRoomGlow`, 0% to 100%, default 50%) in Settings.
- Connect to CSS custom property `--room-glow-intensity` for ambient room shadows and active room focus halo.

### 6. Skittles Mode
- Add new `Skittles Mode` (`skittles`) featuring authentic candy colors:
  - Strawberry Red: `#e52521`
  - Orange: `#ff7f00`
  - Lemon Yellow: `#ffd700`
  - Green Apple: `#48b438`
  - Grape Purple: `#80276c`
  - Blue Berry: `#0099ff`
  - Wild Berry: `#ff4081`
- Randomly/sequentially assigns bright Skittles colors to rooms and open folder badges, avoiding muddy dark tones.

### 7. Room Locking Excludes from Dynamic Modes
- When a room has `lockFrame: true` or `lockBg: true`, exclude it from all dynamic animation modes (`disco`, `rainbow-wave`, `dusco`, `deep-dusco`, `breathing`).
- Changing palettes in Settings preserves locked rooms untouched.

### 8. Small Room 2-Row Header
- When room width is small (`w < 380px`), toggle `.narrow-room` on `.map-room`.
- Flex-wrap `.map-room-head` so `.rm-title` spans 100% of the top row, keeping the folder name completely legible without clipping, while dims and action buttons sit neatly on row 2.

### 9. Native Windows 11 Folder Icons
- Replace the buggy Electron `app.getFileIcon` directory call (which returned the `C:` drive chassis icon for folders on Windows) with an authentic, high-definition Windows 11 Fluent Folder SVG.
- Drive roots (`C:\`, `D:\`) continue using `app.getFileIcon` for real drive chassis icons.

### 10. Integrated & External Terminal Suite (PowerShell & CMD)
- Add external launchers: `Open PowerShell (External)` and `Open CMD (External)`.
- Add interactive in-app Terminal Island (`spawnTerminalIsland`) in Landscape with shell toggle (`[PowerShell ▾ / CMD]`), clear, and live command execution.
- Add toggleable bottom Terminal Drawer (`#termDrawer`) in normal views.
- Add `📟 Terminal ▾` dropdown button to Toolbar Row 2 and folder context menus.

### 11. Tab Switch Bridge Persistence & Folder Row Origin
- Save `parentPath` in `layout.rooms[roomPath]` and persist `layout.bridges`.
- Upon tab reload, restore all parent-child connections and call `drawBridges()`.
- Originate bridge lines directly from the folder row's Y position `(a.x, rowY)` inside parent room `a` towards child room `c`.

---

## 2. Verification Steps
1. Run `node -c main.js renderer.js preload.js` to ensure zero syntax errors.
2. Run automated test suite: `& "e:\Vector Field Theory\peek_explorer\node_modules\electron\dist\electron.exe" "e:\Vector Field Theory\peek_explorer" --smoke-test`.
3. Bump version in `package.json` to `0.8.20`.
4. Update `plans/task.md`.

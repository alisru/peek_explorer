# Implementation Plan 31 — Multi-Cycle Disco Modes, Breathing Mode, Customizable Hotkeys, Hold-to-Rename Settings, Room Tile Zoom & Comprehensive Auto-Sleep

**Active Project**: `e:\Vector Field Theory\peek_explorer`  
**Date**: 2026-10-27  
**Version**: `0.8.17`

## 1. Objectives & Requirements

1. **Disco Modes & Cycles**:
   - Rename existing mode to **Rainbow Wave**.
   - Create true **Disco Mode**: 7 distinct asynchronous color cycles/speeds randomly assigned per room (staccato/tempo shifts, vibrant room-to-room contrast).
   - Create **Dusco Mode**: dark disco (deep saturated neon/noir colors on dark backgrounds).
   - Create **Deep Dusco Mode**: monochrome/greyscale disco (shifting charcoal, slate, silver, pure white pulses).
   - **Landscape Canvas Background Reaction**: When in Rainbow Wave, Disco, Dusco, or Deep Dusco, the canvas background ambiently pulses and shifts hue with the active mode.

2. **Room Background Color Sync & Locking**:
   - Room backgrounds reflect their border color with a subtle translucent tint across all color modes.
   - Individual Room Customization & Locking: In room context menu, add:
     - 🎨 Set Custom Room Color
     - 🔒 Lock Frame Color
     - 🔒 Lock Background Color
     - 🔄 Reset to Global Palette
   - Global Settings: Option to lock frame color or background color globally.

3. **Relaxing "Breathing" Mode**:
   - Rooms smoothly oscillate saturation and luminescence over a configurable timeframe (slider: 3s–16s).
   - Room border glow / box-shadow expands and contracts gently (`box-shadow: 0 0 8px` to `0 0 28px`), creating an organic, calming breathing atmosphere.

4. **Alt+Scroll Indoor Room Tile Zoom**:
   - `Alt + Scroll` over a room dynamically scales the **entire room interior** (`--room-zoom`: 0.6x to 2.4x) — resizing tiles, rows, text, and icons proportionally, allowing the user to zoom into folder contents without moving the camera or expanding the room box.
   - **Magnifier Loupe**: Quick magnification zone when holding `Ctrl + Shift` over the canvas/rooms to inspect small text and buttons up close.

5. **Hotkeys & Hold-to-Rename Customization**:
   - In Settings Modal > Hotkeys Tab:
     - Hold-to-rename toggle (Enable/Disable).
     - Hold-to-rename delay slider (250ms to 1200ms, default 550ms).
     - Editable keybindings for common commands (`newFolder`, `search`, `preview`, `split`, `zoomIn`, `zoomOut`).

6. **RAM-Efficient Auto-Sleep (Remove "Brave-like" branding)**:
   - Change label from "Brave-like Auto-Sleep" to "Auto-Sleep Background Tabs & Off-Screen Islands (RAM Saver)".
   - Auto-sleep applies to:
     - Off-screen Browser Islands (`iframe` replaced with `about:blank`, restores on enter/click).
     - Off-screen or background file viewer preview tabs when memory threshold is crossed.

---

## 2. Technical Architecture

- **CSS Keyframes (`styles.css`)**:
  - `@keyframes rainbowWave`: smooth 360deg hue rotation.
  - `@keyframes discoCycle1` through `@keyframes discoCycle7`: 7 distinct rhythmic color-cycle animations with varied timing functions (`steps`, `ease-in-out`, cubic-bezier beats).
  - `@keyframes duscoGlow`: dark saturated neon pulsation.
  - `@keyframes deepDuscoGlow`: greyscale luminosity shifting between 10% and 95% brightness.
  - `@keyframes breathingPulse`: smooth saturation and box-shadow expansion/contraction based on `--breath-duration`.
  - `.landscape-viewport.bg-disco`, `.bg-dusco`, `.bg-deep-dusco`, `.bg-rainbow`, `.bg-breathing`: ambient canvas background atmosphere.
  - `.map-room`: indoor scale CSS custom property `--room-zoom` applied to `.room-item`.

- **Renderer State & Settings (`renderer.js`)**:
  - `settings.holdRenameEnabled` (default `true`).
  - `settings.holdRenameDelay` (default `550`).
  - `settings.breathDuration` (default `6`).
  - `settings.lockFrameColor` (default `false`).
  - `settings.lockBgColor` (default `false`).
  - Room layout attributes: `r.lockedFrame`, `r.lockedBg`, `r.customColor`.
  - 7 disco animation classes: `.disco-c1` through `.disco-c7`.
  - Alt+Wheel indoor tile zoom handler updating `--room-zoom`.
  - Settings Modal UI updates with new tabs, sliders, color locks, and key customization.

---

## 3. Execution & Verification

- Consolidated CSS additions in `styles.css`.
- Consolidated markup additions in `index.html`.
- Consolidated JS updates in `renderer.js`.
- Verification with `node -c` and smoke tests (`npx electron . --smoke-test --no-sandbox`).

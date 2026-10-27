# Implementation Plan 19 — v0.8.4 Filename Text Overlap Elimination & Strict Card Boundary Clipping

**Project**: Peek Explorer (`e:\Vector Field Theory\peek_explorer`)  
**Status**: Completed  
**Author**: Antigravity (Lazy Senior Dev Mode)  
**Date**: 2026-10-24  

---

## 1. Problem Statement & Root Cause Analysis

### User Report
- "filenames can overlap" (accompanied by visual screenshot showing long unbroken filenames with underscores like `Reality_Tensor_Air_Matrix.docx` bleeding horizontally across neighbor cards in Medium icons view).

### Root Causes
1. **Underscore Word Breaking**: Standard Chromium typography treats underscores (`_`) as word characters (like letters and digits). Standard CSS rules (`word-break: break-word` or `word-wrap: break-word`) do not split unbroken underscore chains, forcing text out of its container horizontally if no whitespace is present.
2. **Inherited Flex `min-width: 120px`**: A global `#header, .row` rule set `.c-name { flex: 1; min-width: 120px; ... }`. In Medium icons view where `.row.item` is `104px` wide, `.c-name` was forced to be at least `120px` wide, bursting out of the card.
3. **Missing Card-Level Overflow Containment**: Neither `.row.item` nor `.room-item` in Landscape mode had strict `overflow: hidden; box-sizing: border-box;`, allowing overflowing child text to bleed horizontally across adjacent columns and neighbor cards.

---

## 2. Surgical Changes Implemented

### A. CSS Typography & Card Clipping (`styles.css`)
1. **Base Name Class (`.nm`)**:
   - Anchored `.nm` with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;`.
2. **Grid Modes (`.v-medium`, `.v-large`, `.v-xl`)**:
   - Added `overflow: hidden; box-sizing: border-box;` to `.row.item`.
   - Overrode `.c-name` with `min-width: 0 !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box; overflow: hidden;`.
   - Updated `.nm` to use:
     ```css
     width: 100%;
     max-width: 100%;
     overflow: hidden;
     text-overflow: ellipsis;
     display: -webkit-box;
     -webkit-line-clamp: 2;
     -webkit-box-orient: vertical;
     overflow-wrap: anywhere;
     word-break: break-all;
     line-height: 1.25;
     box-sizing: border-box;
     ```
   - Adjusted `.v-medium .row.item` width to `104px` with `gap: 4px`.
3. **Tiles & List Views (`.v-tiles`, `.v-list`, `.v-small`)**:
   - Added `overflow: hidden; box-sizing: border-box;` to `.row.item`.
   - Ensured `.c-name` has `min-width: 0 !important; overflow: hidden;`.
4. **Landscape Room Body (`.map-room-body`)**:
   - Added `overflow: hidden;` to `.room-item`.
   - Mirrored the `overflow-wrap: anywhere; word-break: break-all;`, `width: 100% !important; max-width: 100% !important; min-width: 0 !important; box-sizing: border-box;` and 2-line clamped ellipsis rules to `.map-room-body.v-medium`, `.map-room-body.v-large`, and `.map-room-body.v-xl`.

### B. Automated Smoke Test Suite (`main.js`)
- Added assertion verifying that across all items in Medium view, no `.nm` element's `clientWidth` exceeds `.row.item.clientWidth`, and `.row.item.scrollWidth <= clientWidth + 2`.
- Verified 23 test criteria pass cleanly (`npm test`).
- Verified zero lingering background Electron processes upon test completion.

---

## 3. Verification Evidence
- `npm test` exit code: `0`
- Results:
  ```
  === SMOKE TEST RESULTS ===
  ✓ PASS: List element rendered with items
  ✓ PASS: Wheel scroll permitted on Initial view
  ✓ PASS: Wheel scroll permitted on View: details
  ✓ PASS: Wheel scroll permitted on View: tiles
  ✓ PASS: Wheel scroll permitted on View: list
  ✓ PASS: Wheel scroll permitted on View: small
  ✓ PASS: Wheel scroll permitted on View: medium
  ✓ PASS: Wheel scroll permitted on View: large
  ✓ PASS: Wheel scroll permitted on View: xl
  ✓ PASS: Wheel scroll permitted on View: content
  ✓ PASS: Landscape viewport element exists
  ✓ PASS: Landscape rooms rendered
  ✓ PASS: Landscape loads user folder (E:\Vector Field Theory\VFT Docs\_VFT MD)
  ✓ PASS: Landscape HUD buttons respond without error
  ✓ PASS: Room local view selector works
  ✓ PASS: Middle-click on Room Header opens new tab
  ✓ PASS: Middle-click on Room Folder Item opens new tab
  ✓ PASS: Landscape canvas wheel zoom intercepts event
  ✓ PASS: Wheel scroll permitted on Landscape indoor room body
  ✓ PASS: Wheel scroll permitted on View: details after exiting landscape
  ✓ PASS: Wheel scroll permitted on View: medium after exiting landscape
  ✓ PASS: Medium view filenames bounded without horizontal overlap
  ✓ PASS: Wheel scroll permitted on Split pane list
  ===========================
  ```
- `Get-Process electron`: 0 lingering processes.

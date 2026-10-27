# Implementation Plan 18 — v0.8.2: Scroll Fix & Comprehensive User Test Pass

**Date**: 2026-10-24
**Active Folder**: `e:\Vector Field Theory\peek_explorer`

## 1. Problem & Bug Report
User reported:
> "scrolling on the normal views has broken btw, pls ensure to do a user test pass to find and fix bugs"
> "pls close the viewer when you're done bugfixing too on each pass, otherwise you just leave the chat rnning"

## 2. Root Cause Analysis
1. In `renderer.js` (`renderLandscape`):
   ```javascript
   container.addEventListener('wheel', e => {
     if (e.ctrlKey || e.target.closest('.map-room-body') || ...) return;
     e.preventDefault();
     ...
   });
   container.addEventListener('mousedown', ...);
   ```
2. When the user navigated into Landscape mode or started in Landscape/Lens mode, these event listeners were attached directly to `container` (`$('list')` or `$('spList')`).
3. When the user switched views back to normal modes (`v-details`, `v-tiles`, `v-list`, `v-small`, `v-medium`, `v-large`, `v-xl`, `v-content`), `show()` cleared `list.innerHTML = ''`, but DOM clearing does not remove event listeners attached with `addEventListener` to the parent container element (`#list`).
4. On every subsequent mousewheel event in normal views:
   - `e.ctrlKey` is `false`.
   - `e.target.closest('.map-room-body')` is `null` (since rooms only exist in landscape).
   - `e.preventDefault()` was executed on **every single wheel event**, completely blocking native Chromium vertical scrolling in all normal views!
5. Similarly, canvas panning `mousedown` listeners leaked onto `#list`, inadvertently panning coordinates and clearing selection on empty clicks in normal views.

## 3. Surgical Fix
1. **Isolated Viewport Element**:
   - Inside `renderLandscape`, create a dedicated `.landscape-viewport` wrapper element:
     ```javascript
     const viewport = document.createElement('div');
     viewport.className = 'landscape-viewport';
     container.appendChild(viewport);
     viewport.append(world, innerFrame, marginLayer, marqueeEl, hud);
     ```
   - In `styles.css`:
     ```css
     .landscape-viewport {
       position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden;
       cursor: grab; user-select: none;
     }
     .landscape-viewport.panning { cursor: grabbing; }
     ```
2. **Listener Scoping**:
   - Bind `mousedown` (canvas pan & shift-marquee) and `wheel` (canvas zoom) to `viewport` rather than `container`.
   - When switching back to normal views, `list.innerHTML = ''` cleans up `viewport` and all of its attached listeners completely, leaving `#list` 100% clean with standard native scrolling.
   - Indoor room scrolling (`.map-room-body`) continues to work without zoom interference because `e.target.closest('.map-room-body')` bypasses `e.preventDefault()`.

## 4. Automated User Test Pass (`npm test` / `--smoke-test`)
Added a headless smoke test suite to `main.js` and `package.json`:
- Dispatches synthetic wheel events across all 8 standard views (`details`, `tiles`, `list`, `small`, `medium`, `large`, `xl`, `content`).
- Verifies that `defaultPrevented` is `false` in every standard view.
- Switches to Landscape mode, verifies canvas zoom intercepts (`defaultPrevented === true`) and indoor room bodies allow scrolling (`defaultPrevented === false`).
- Switches back to `details` and `medium` from Landscape, verifying that wheel scroll remains permitted (regression test).
- Tests Split Pane wheel scrolling.
- Automatically exits with code 0 on pass, ensuring no lingering Electron processes or background tasks are left running.

## 5. Verification Results
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
✓ PASS: Landscape canvas wheel zoom intercepts event
✓ PASS: Wheel scroll permitted on Landscape indoor room body
✓ PASS: Wheel scroll permitted on View: details after exiting landscape
✓ PASS: Wheel scroll permitted on View: medium after exiting landscape
✓ PASS: Wheel scroll permitted on Split pane list
===========================
```
Process cleanly exited with code 0.
Lingering processes verified: 0.
Background tasks: None.

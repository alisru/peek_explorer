# Implementation Plan 32: Room Border Bridges, Indoor Zoom & Full Color Settings

## Problem Analysis
1. **Bridge Lines Drawing Over & Through Rooms**: Currently, bridge lines connect center `(a.x, a.y)` to center `(c.x, c.y)`. Because rooms have translucent backgrounds, dashed lines cut straight across the parent room contents (e.g. `E:`) in an ugly starburst pattern.
2. **Alt+Scroll Room Zooming Failing**: Alt+Scroll failed to zoom the room contents because CSS only modified font size for a class `.indoor-zoomed` that was never added, while tile heights had fixed `!important` declarations.
3. **Missing Color Settings**: User wants full color customization: global default room frame, default room background, active room glow/border, background opacity slider, as well as specific per-room frame and background color pickers and locking.

## Proposed Changes
1. **Border-to-Border Bridge Lines**:
   - Implement `getRectBorderIntersection(cx, cy, w, h, tx, ty)`.
   - Lines start at `a`'s outer perimeter and terminate at `c`'s outer perimeter. Zero lines cross into room interiors.
2. **Alt + Scroll & Ctrl + Scroll Room Zooming**:
   - Use Chromium's native CSS `zoom` on `.map-room-body`, `.map-file-body`, and `.map-html-body` (`bodyEl.style.zoom = r.indoorScale`).
   - Add floating `🔍 {percentage}%` zoom badge on room header during scroll with auto-fade.
   - Support Alt+Shift+Scroll to scale room box dimensions (`w` and `h`).
3. **Full Color Customization**:
   - In Settings Modal:
     - Global Default Frame Color (`#setDefaultFrameColor`)
     - Global Default Background Color (`#setDefaultBgColor`)
     - Global Background Opacity (`#setRoomBgOpacity`)
     - Active Room Glow/Border Color (`#setActiveRoomColor`)
     - Active/Selected Room Frame Color (`#setSpecificFrameColor`)
     - Active/Selected Room Background Color (`#setSpecificBgColor`)
     - Active/Selected Room Lock Frame & Lock Bg checkboxes
     - Reset Room Color button
   - In Room Header:
     - Add `🎨` color button in `.rm-actions` for instant color customization of that specific room.
   - In Room Context Menu:
     - Custom frame and background color picker options.

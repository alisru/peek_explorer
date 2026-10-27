# Peek Explorer – Plan 01 (2026-10-23)

Goal: Windows-Explorer-look file viewer with inline drop-down peek into folders (Explorer cannot be extended; Files app has no inline expansion in the user's version).

Stack: Electron (Node 22 present; Rust/Tauri not installed).

v0.1 scope: read-only browsing, tree rows with ▸/▾ expansion in Details view, optional thumbnail grid inside expanded folders, address bar, back/forward/up, quick-access + drives nav, double-click opens.

Not yet: file ops (copy/move/delete – deliberately omitted), tabs, true Win11 icons/thumbnails, search, sort by column, multi-select.

Next: user tests v0.1, then refine look to match Explorer screenshots.

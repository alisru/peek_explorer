# Peek Explorer — Master Color, Mode & Visual Architecture Specification

*Consolidated from all user demands across the project lifecycle.*  
*Path: `e:\Vector Field Theory\peek_explorer\docs\COLOR_SYSTEM_SPEC.md`*

---

## 1. Core Color Rules & Folder-to-Room Relationship

### 1.1 Folder Tile Shading & Pre-Coloring Rules
1. **Regular Default & Inherit Modes (`default`, `inherit`)**:
   - **Default Mode (`default`)**: All rooms use the same baseline color palette (`defaultFrameColor` and `defaultBgColor`). Unopened/unselected folder tiles carry a simple lighter shade of the room's color; opened/selected folder tiles carry a darker/richer accent shade.
   - **Inherit Mode (`inherit`)**: Child rooms inherit from their parent room's color by stepping to a **darker shade, lighter shade, or slightly shifted hue** (`inheritShiftMode`: `darker`, `lighter`, `hue-shift`, or `exact`), and each folder tile previews the shifted shade of the child room it opens into.
2. **Multi-Color / Palette Modes (`rainbow`, `skittles`, `pastel`, `neon`, `dna`, `disco`, etc.)**:
   - Every folder tile inside a room takes the **shade of the room it will open into**:
     - **Unopened / Unselected**: A lighter shade of the target child room's assigned color.
     - **Opened / Selected**: A darker, richer shade of the target child room's assigned color.
   - Spatial bridges originate directly at the opened folder row's location and connect to the child room it opened, matching that color.
3. **Color Inheritance & DNA Mode (`dna`)**:
   - **DNA Mode (`dna`)**: Genetic branching mode where child folders inside a room are assigned random/branched colors from the active palette. When a child folder is opened into a room, that new room inherits that specific folder's color as its room color, while its own sub-folders branch out into new palette colors down the tree.
4. **Zero Unprescribed Random Colors**:
   - No element may ever use arbitrary or dark muddy random colors. Random selection is strictly restricted to modes designed for random palette sampling (**Skittles**, **DNA**, **Disco**, **Rain Puddle**), and always pulls strictly from the active curated or custom palette.

### 1.2 Room Backgrounds, Glow, and Locking Rules
1. **Room Backgrounds Change in ALL Modes**:
   - Every color mode updates **both** the room's frame (`border-color`) **and** the room's floor background (`background-color`, scaled by `roomBgOpacity`, which defaults to `100%`), unless locked.
2. **Landscape Canvas Background Reaction**:
   - In dynamic modes (`disco`, `dusco`, `deep-dusco`, `rainbow-sync`, `rainbow-async`, `breathing`, `rain-puddle`), the landscape canvas backdrop subtly shifts/reacts in harmony with the active mode (toggleable in Settings).
3. **Breathing & Rain Puddle Mechanics (Zero Saturation Filter)**:
   - `filter: saturate()` and `filter: brightness()` are **100% banned**.
   - Breathing smoothly interpolates from the room's base color to the configurable **Peak / Target Color** (default pure white `#ffffff`, never muddy grey).
   - **Full Synchrony + Physical Rim Expansion (`breathScaleSize`)**: The room frame, floor background, outer perimeter glow (`box-shadow` spread controlled by **Breath Expansion Size**), and optionally **file/folder tiles** (`breathAffectTiles` toggle) expand and contract together as the gradient shifts.
   - **Rain Puddle Field Simulation**: Simulates raindrops landing on the 2D canvas field with expanding ripple rings; rooms intersected by (or targeted by) raindrops react with a smooth puddle breath ripple.
4. **Global & Per-Room Frame / Background Locking**:
   - Both per-room (`room.lockFrame`, `room.lockBg`) and global locks allow locking either the frame or the background independently.
   - Locking a room's frame or background **strictly excludes** that locked channel from all dynamic modes, allowing rooms to be locked into specific modes/colors permanently.

---

## 2. Complete Inventory of User-Configurable Color & Timing Controls

| # | Control Name | UI Element in Settings | Storage Variable | Default | Exact Function |
|---|---|---|---|---|---|
| 1 | **Default Room Frame** | Color Picker | `defaultFrameColor` | `#0067c0` | Baseline border rim color for rooms. |
| 2 | **Default Room Background** | Color Picker | `defaultBgColor` | `#1e293b` | Floor background color for room containers. |
| 3 | **Room Background Opacity** | Slider (10%–100%) | `roomBgOpacity` | `100%` | Alpha transparency of room floors across all modes (Default 100%). |
| 4 | **Inherit Shade Shift Style** | Dropdown | `inheritShiftMode` | `lighter` | How child rooms shift from parent in Inherit Mode (`lighter`, `darker`, `hue-shift`, `exact`). |
| 5 | **Selected Folder Color** | Color Picker + Toggle | `selectedFolderColor` | `#0078d4` | Manual highlight color for selected rows / open folders. |
| 6 | **Unselected Folder Tint** | Color Picker / Auto | `unselectedFolderColor`| `auto` | Lighter shade of room/child-room color (or manual override). |
| 7 | **Active Room Focus Color** | Color Picker | `activeRoomBorderColor` | `#00f0ff` | Border and halo color for the currently focused room. |
| 8 | **Room Glow Intensity** | Slider (0%–100%) | `roomGlowIntensity` | `50%` | Outer drop-shadow and perimeter glow alpha/brightness for rooms. |
| 9 | **Room Glow Range (Radius)** | Slider (0–100px) + Number| `roomGlowRange` | `18px` | Outer perimeter glow spread/radius distance in pixels. |
| 10 | **Breathing Peak / Target Rim** | Color Picker | `breathTargetColor` | `#ffffff` | Peak gradient color the rim pulses to (default pure white). |
| 11 | **Breathing Peak Background** | Color Picker | `breathTargetBgColor` | `#334155` | Peak gradient color the floor pulses to in Breathing / Puddle modes. |
| 12 | **Breath / Ripple Expansion Size**| Slider (0–80px) + Number| `breathScaleSize` | `20px` | How much the room rim and glow expand/scale outward during a breath or ripple. |
| 13 | **Breath & Rain Affect Tiles** | Checkbox Toggle | `breathAffectTiles` | `true` | Toggle whether file/folder tiles inside rooms also pulse during Breathing and Rain Puddle modes. |
| 14 | **Breathing / Cycle Pace** | Slider (1–360s) + Number | `breathingDuration` | `6s` | Duration of one breath/wave cycle; editable number supports `1000s+`. |
| 15 | **Rain Puddle Spawn Interval**| Min/Max Number Inputs | `puddleIntervalMin/Max`| `2s` / `8s` | Minimum and maximum delay between raindrops on the field. |
| 16 | **Rain Puddle Ripple Duration**| Slider (1–360s) + Number | `puddleRippleDuration` | `5s` | How long a room and field ripple takes to complete its puddle breath. |
| 17 | **Rain Puddle Max Concurrent**| Slider (1–50) + Number | `puddleMaxConcurrent` | `4` | Max number of rooms/ripples active simultaneously. |
| 18 | **Canvas Background Style** | Dropdown + React Toggle | `landscapeBg` | `grid` | Blueprint Grid, Deep Dark, Slate, Custom Color, Custom Image + Mode Reaction toggle. |
| 19 | **Custom Canvas Color** | Color Picker | `landscapeBgColor` | `#0f172a` | Solid canvas color when custom color is selected. |
| 20 | **Custom Canvas Image** | Text Input | `landscapeBgImage` | `""` | Image URL or local file path when custom image is selected. |
| 21 | **Active Mode Sub-Palette** | Dropdown (1–5 + Custom) | `modePaletteIndex` | `0` | Selects which of the 5 prescribed palettes (or Custom) is active for the current mode. |
| 22 | **Custom Palette Swatches** | 7 Color Pickers | `customPaletteColors` | 7 Swatches | User-definable color swatches used when sub-palette is set to Custom. |
| 23 | **Per-Room Frame & Bg Pickers**| Color Pickers | `roomColor`, `roomBgColor`| Per Room | Individual room frame and background color overrides. |
| 24 | **Global & Per-Room Locks** | Checkboxes | `lockFrame`, `lockBg` | `false` | Locks frame and/or background globally or per-room; excludes from modes. |

---

## 3. All Landscape Color Modes — 5 Curated Palettes + Custom Per Mode

Every mode below is a **separate, independent mode** in the Mode Selector, and each has its own **5 curated palettes + 1 user-editable Custom palette**:

### Mode 1: Rainbow Spectrum Static (`rainbow`)
*All rooms and file/folder tiles are statically painted in sequential colors of the rainbow in load/index order (no cycling, no randomness).*
- **Palette 1 (Classic Spectrum)**: `['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']`
- **Palette 2 (Warm Rainbow)**: `['#e11d48', '#ea580c', '#f59e0b', '#eab308', '#f97316', '#dc2626', '#fb7185']`
- **Palette 3 (Cool Rainbow)**: `['#06b6d4', '#0284c7', '#3b82f6', '#6366f1', '#8b5cf6', '#0d9488', '#14b8a6']`
- **Palette 4 (Deep Spectrum)**: `['#991b1b', '#9a3412', '#854d0e', '#166534', '#155e75', '#1e40af', '#5b21b6']`
- **Palette 5 (Neon Rainbow)**: `['#ff0055', '#ff5500', '#ffcc00', '#00ff66', '#00ccff', '#7700ff', '#ff00cc']`
- **Custom**: User-defined sequential swatches.

### Mode 2: Rainbow Sync Wave (`rainbow-sync`)
*Cyclical spectrum mode where **all rooms and elements cycle through the exact same color in unison**.*
- Shares the 5 Rainbow Spectrum Palettes (Classic, Warm, Cool, Deep, Neon) + Custom, with configurable cycle pace (`1s–1000s+`).

### Mode 3: Rainbow Phase Wave (`rainbow-async`)
*Cyclical spectrum mode where **every room and element cycles through the spectrum at different phase offsets**.*
- Shares the 5 Rainbow Spectrum Palettes (Classic, Warm, Cool, Deep, Neon) + Custom, with configurable cycle pace and phase step offset.

### Mode 4: Skittles Candy Mode (`skittles`)
*Randomly colors all rooms and folder tiles from vibrant candy palettes (zero dark/muddy colors).*
- **Palette 1 (Original Skittles Candy)**: `['#e52521', '#ff6d00', '#ffd600', '#00e676', '#aa00ff', '#00e5ff', '#ff007f']`
- **Palette 2 (Wild Berry)**: `['#ff007f', '#9c27b0', '#00b0ff', '#d500f9', '#ff1744', '#ff4081', '#651fff']`
- **Palette 3 (Tropical Vibes)**: `['#ffd600', '#ff6d00', '#00e5ff', '#00e676', '#ff007f', '#ffab00', '#1de9b6']`
- **Palette 4 (Sour Blast)**: `['#76ff03', '#ffd600', '#ff1744', '#00e5ff', '#ff9100', '#d500f9', '#00ff66']`
- **Palette 5 (Smoothie Pop)**: `['#ff5252', '#ff4081', '#ffab40', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb']`
- **Custom**: User-defined candy swatches.

### Mode 5: DNA Branching Mode (`dna`)
*Folders inside a parent room get random/branched colors from the palette; opening a folder spawns a child room that inherits that folder's color, while its sub-folders branch again.*
- **Palette 1 (Helix Prime)**: `['#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#f43f5e']`
- **Palette 2 (Warm Mutation)**: `['#f97316', '#ef4444', '#eab308', '#ec4899', '#f43f5e', '#fb923c', '#facc15']`
- **Palette 3 (Bioluminescent Cool)**: `['#00f0ff', '#00ff9d', '#3b82f6', '#8b5cf6', '#14b8a6', '#38bdf8', '#a855f7']`
- **Palette 4 (Botanical Lineage)**: `['#22c55e', '#84cc16', '#10b981', '#eab308', '#06b6d4', '#4ade80', '#a3e635']`
- **Palette 5 (Cosmic Ancestry)**: `['#c084fc', '#f472b6', '#38bdf8', '#818cf8', '#fb7185', '#2dd4bf', '#facc15']`
- **Custom**: User-defined genetic swatches.

### Mode 6: Pastel Mode (`pastel`)
*Soft aesthetic pastel tones across rooms and folder tiles.*
- **Palette 1 (Soft Aesthetic)**: `['#93c5fd', '#fca5a5', '#86efac', '#fde047', '#c4b5fd', '#fed7aa', '#f9a8d4']`
- **Palette 2 (Warm Pastel)**: `['#fecdd3', '#fed7aa', '#fef08a', '#ffedd5', '#fbcfe8', '#fda4af', '#fde68a']`
- **Palette 3 (Cool Pastel)**: `['#bae6fd', '#a7f3d0', '#c7d2fe', '#ddd6fe', '#99f6e4', '#a5f3fc', '#bfdbfe']`
- **Palette 4 (Spring Meadow)**: `['#bbf7d0', '#fef08a', '#fed7aa', '#fbcfe8', '#a5f3fc', '#d9f99d', '#f5d0fe']`
- **Palette 5 (Velvet Muted Pastel)**: `['#cbd5e1', '#fecaca', '#bbf7d0', '#fef08a', '#e9d5ff', '#fed7aa', '#bae6fd']`
- **Custom**: User-defined pastel swatches.

### Mode 7: Cyberpunk Neon Mode (`neon`)
*High-contrast vivid electric neon.*
- **Palette 1 (Cyberpunk Prime)**: `['#00f0ff', '#ff007f', '#39ff14', '#bc13fe', '#ffe600', '#ff0055', '#00ffaa']`
- **Palette 2 (Synthwave 80s)**: `['#ff007f', '#7928ca', '#00f0ff', '#ff0055', '#ffbe0b', '#fb5607', '#3a86ff']`
- **Palette 3 (Matrix Terminal)**: `['#00ff66', '#39ff14', '#00cc44', '#10b981', '#059669', '#a3e635', '#4ade80']`
- **Palette 4 (Electric Cyan / Blue)**: `['#00f0ff', '#00b4d8', '#0077b6', '#48cae4', '#90e0ef', '#38bdf8', '#60a5fa']`
- **Palette 5 (Toxic Acid)**: `['#ccff00', '#ff007f', '#00ffc8', '#ff9900', '#9900ff', '#76ff03', '#ff1744']`
- **Custom**: User-defined neon swatches.

### Mode 8: Breathing Mode (`breathing`)
*Continuous synchronized breathing where all unlocked rooms (rim, background, outer glow expansion, and selected folders) pulse smoothly from their base color to the target peak color (default pure white).*
- **Palette 1 (Pure White Horizon)**: Peak rim `#ffffff`, Peak background `#334155`, Glow `#ffffff`
- **Palette 2 (Warm Sunset Glow)**: Peak rim `#ffd54f`, Peak background `#451a03`, Glow `#f59e0b`
- **Palette 3 (Oceanic Calm Glow)**: Peak rim `#38bdf8`, Peak background `#0c4a6e`, Glow `#0284c7`
- **Palette 4 (Zen Emerald Glow)**: Peak rim `#6ee7b7`, Peak background `#064e3b`, Glow `#10b981`
- **Palette 5 (Lavender Dream Glow)**: Peak rim `#d8b4fe`, Peak background `#3b0764`, Glow `#a855f7`
- **Custom**: User-selected peak rim, peak background, and glow colors.

### Mode 9: Rain Puddle Mode (`rain-puddle`)
*Ambient mode similar to Breathing Mode, except **random rooms are selected at random intervals to breathe/ripple** (rim, floor, folder shade, and expanding outer glow pulse to the peak color and settle back), like raindrops hitting a pond.*
- Shares the 5 Breathing Target Palettes (Pure White Horizon, Warm Sunset, Oceanic Calm, Zen Emerald, Lavender Dream) + Custom.
- Dedicated timing controls: **Ripple Duration** (`1s–1000s+`), **Raindrop Interval Min/Max** (`0.5s–600s+`), and **Max Concurrent Ripples** (`1–50`).

### Mode 10: Disco Mode (`disco`) — SEPARATE MODE
*7-cycle asynchronous multi-frequency dance randomly assigned across rooms and folders.*
- **Palette 1 (70s Studio Retro)**: `['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']`
- **Palette 2 (Club Electric)**: `['#ff0055', '#00f0ff', '#ffe600', '#39ff14', '#bc13fe', '#ff6d00', '#00e5ff']`
- **Palette 3 (Vibrant Pastel Disco)**: `['#f472b6', '#38bdf8', '#4ade80', '#facc15', '#a78bfa', '#fb923c', '#2dd4bf']`
- **Palette 4 (High-Voltage Neon)**: `['#ff007f', '#7928ca', '#00ffc8', '#ffea00', '#ff0055', '#00e5ff', '#76ff03']`
- **Palette 5 (Carnival Radiance)**: `['#e11d48', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2']`
- **Custom**: 7 user-editable cycle swatches.

### Mode 11: Dusco Mode (`dusco`) — SEPARATE MODE
*Dark saturated neon disco cycles against deep atmospheric backgrounds.*
- **Palette 1 (Deep Saturated Neon Prime)**: `['#00f0ff', '#ff007f', '#39ff14', '#bc13fe', '#ffd600', '#ff3366', '#00ffaa']`
- **Palette 2 (Midnight Cyberpunk)**: `['#00e5ff', '#d500f9', '#00e676', '#ff1744', '#651fff', '#ff9100', '#1de9b6']`
- **Palette 3 (Dark Sunset Dusco)**: `['#ff0055', '#ff5500', '#aa00ff', '#ff00aa', '#0055ff', '#ffaa00', '#9900ee']`
- **Palette 4 (Deep Oceanic Dusco)**: `['#00b4d8', '#0077b6', '#7209b7', '#4361ee', '#4cc9f0', '#3a0ca3', '#03045e']`
- **Palette 5 (Toxic Midnight)**: `['#76ff03', '#ccff00', '#ff007f', '#00e5ff', '#aa00ff', '#ff6d00', '#00ff66']`
- **Custom**: 7 user-editable cycle swatches.

### Mode 12: Deep Dusco Mode (`deep-dusco`) — SEPARATE MODE
*Monochrome stepped greyscale disco dance.*
- **Palette 1 (Stepped Greyscale Classic)**: `['#ffffff', '#e4e4e7', '#a1a1aa', '#71717a', '#52525b', '#27272a', '#18181b']`
- **Palette 2 (High-Contrast Noir)**: `['#ffffff', '#000000', '#f4f4f5', '#18181b', '#d4d4d8', '#27272a', '#e4e4e7']`
- **Palette 3 (Silver & Steel)**: `['#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155']`
- **Palette 4 (Charcoal Minimalist)**: `['#fafafa', '#d4d4d8', '#a1a1aa', '#52525b', '#3f3f46', '#27272a', '#09090b']`
- **Palette 5 (Warm Slate Greyscale)**: `['#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#292524']`
- **Custom**: 7 user-editable monochrome swatches.

### Non-Palette Baseline Modes
- **Default (`default`)**: Rooms use `defaultFrameColor` and `defaultBgColor`; folders use a lighter shade when unselected and darker when selected.
- **Inherit (`inherit`)**: Child rooms strictly inherit parent room's exact frame and background.

---

## 4. Companion Feature Specifications (For One-Pass Execution)

1. **Standalone Browser Feature (Tabs & Landscape Rooms)**:
   - Ability to open a full Chromium/Electron browser either as a **standalone top-level tab** in the main tab bar (`🌐 New Browser Tab` button / hotkey) OR as a **spawning browser room** inside the 2D Landscape canvas.
   - Includes address bar (URL input + search query support), Back, Forward, Reload, Open in External Browser, and **Auto-Sleep RAM Saver** (automatically suspends inactive browser views/rooms after a configurable idle timer and restores on click).
2. **Spatial Bridges Originating from Folder Rows**:
   - Bridges start directly from the opened folder tile's vertical Y-offset on the parent room's edge and curve smoothly to the child room's header, colored to match the child room, and persist across tab switches.
3. **2-Row Room Header for Narrow Rooms**:
   - When a room is narrow, header wraps cleanly into 2 rows: Row 1 displays the full readable folder name; Row 2 holds the action controls.
4. **Integrated & External PowerShell / CMD**:
   - Open PowerShell or CMD either inside the app (docked terminal drawer OR draggable terminal room on the landscape) or in an external OS window.

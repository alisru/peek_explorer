const $ = id => document.getElementById(id);
const HOME_URI = 'peek://home';
const IMG = /\.(png|jpe?g|gif|webp|bmp|jfif|svg|ico)$/i;
const VID = /\.(mp4|webm|mov|mkv|m4v)$/i;
const AUD = /\.(mp3|wav|ogg|flac|m4a)$/i;
const SCRIPT_EXT = /\.(ps1|bat|cmd|py|js|vbs)$/i;
const ZIP_EXT = /\.zip$/i;

// Prevent default Chromium middle-click autoscroll circle anywhere in the app
window.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); }, true);

// Global Error & Promise Rejection Reporting
function reportError(err) {
  const msg = err && (err.stack || err.message || err.reason || String(err));
  console.error('[Peek Explorer Error]', msg);
  const status = $('status');
  if (status) {
    status.innerHTML = `
      <span style="color:#ef4444;font-weight:700">⚠️ Error: ${String(msg).replace(/\n.*/s, '').slice(0, 110)}</span>
      <button id="copyErrBtn" class="dash-btn" style="margin-left:8px;padding:2px 8px;font-size:10.5px;background:#ef4444;color:#fff;border:none">📋 Copy Error</button>
      <button id="openConsoleBtn" class="dash-btn" style="margin-left:4px;padding:2px 8px;font-size:10.5px">🔍 Console</button>
    `;
    const copyBtn = status.querySelector('#copyErrBtn');
    if (copyBtn) {
      copyBtn.onclick = e => {
        e.stopPropagation();
        navigator.clipboard.writeText(msg).then(() => {
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy Error'; }, 2000);
        });
      };
    }
    const devBtn = status.querySelector('#openConsoleBtn');
    if (devBtn) devBtn.onclick = e => { e.stopPropagation(); window.api.openDevTools(); };
  }
}
window.addEventListener('error', e => reportError(e.error || e.message));
window.addEventListener('unhandledrejection', e => reportError(e.reason));

let cur = HOME_URI, hist = [HOME_URI], hi = 0, totalCount = 0;
let mode = 'details', sortKey = 'name', sortAsc = true, groupKey = 'none';
let folderViews = {}, defaultView = 'details';
let landscapePalette = 'default'; // 'default' | 'inherit' | 'dna' | 'rainbow' | 'rainbow-sync' | 'rainbow-async' | 'skittles' | 'pastel' | 'neon' | 'breathing' | 'rain-puddle' | 'disco' | 'dusco' | 'deep-dusco'
const DEFAULT_CUSTOM_SWATCHES = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];
let modePaletteIndex = {}; // { [modeKey]: 0..5 } (0..4 = 5 Curated Palettes, 5 = Custom Palette)
let customPaletteColors = {}; // { [modeKey]: ['#hex', ...] }
let inheritShiftMode = 'lighter'; // 'lighter' | 'darker' | 'hue-shift' | 'exact'
let landscapeBg = 'grid'; // 'grid' | 'space' | 'plain' | 'custom-color' | 'custom-image'
let landscapeBgColor = '#0f172a';
let landscapeBgImage = '';
let canvasReactMode = true;
let accentColor = '#0067c0';
let defaultFrameColor = '#0067c0';
let defaultBgColor = '#1e293b';
let roomBgOpacity = 100; // Default 100% per spec
let roomGlowIntensity = 50; // 0 to 100%
let roomGlowRange = 18; // 0 to 100px+
let breathTargetColor = '#ffffff';
let breathTargetBgColor = '#334155';
let breathScaleSize = 20; // Rim & glow expansion size in px
let breathAffectTiles = true;
let puddleIntervalMin = 2;
let puddleIntervalMax = 8;
let puddleRippleDuration = 5;
let puddleMaxConcurrent = 4;
let selectedFolderColor = '#0078d4';
let useCustomSelectedFolder = false;
let activeRoomBorderColor = '#00f0ff';
let browserAutoSleep = true;
let autoSummarize = true;
let breathingDuration = 6;
let lockFrame = false;
let lockBg = false;
let holdRenameEnabled = true;
let holdRenameDelay = 550;

const DEFAULT_HOTKEYS = {
  modCameraZoom: 'Shift',
  modCameraPan: 'Alt',
  modIndoorZoom: 'Alt',
  modRoomScale: 'Alt+Shift',
  modLoupe: 'Ctrl+Shift',
  newTab: 'Ctrl+T',
  closeTab: 'Ctrl+W',
  reopenTab: 'Ctrl+Shift+T',
  newFolder: 'Ctrl+Shift+N',
  newWindow: 'Ctrl+N',
  toggleTerminal: 'Ctrl+`',
  togglePreview: 'Alt+P',
  toggleSplit: 'Alt+S',
  focusAddress: 'Ctrl+L',
  focusSearch: 'Ctrl+F',
  goHome: 'Alt+Home',
  rename: 'F2',
  refresh: 'F5'
};
let hotkeys = { ...DEFAULT_HOTKEYS };

function eventToCombo(e) {
  const parts = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    parts.push(k);
  }
  return parts.join('+');
}

function matchesHotkey(e, actionId) {
  const target = (hotkeys[actionId] || DEFAULT_HOTKEYS[actionId] || '').toLowerCase();
  if (!target) return false;
  return eventToCombo(e).toLowerCase() === target;
}

function matchesModifiers(e, modActionId, exact = false) {
  const spec = (hotkeys[modActionId] || DEFAULT_HOTKEYS[modActionId] || '').toLowerCase();
  if (!spec) return false;
  const needCtrl = spec.includes('ctrl');
  const needAlt = spec.includes('alt');
  const needShift = spec.includes('shift');
  if (exact) {
    return !!e.ctrlKey === needCtrl && !!e.altKey === needAlt && !!e.shiftKey === needShift;
  }
  if (needCtrl && !e.ctrlKey) return false;
  if (needAlt && !e.altKey) return false;
  if (needShift && !e.shiftKey) return false;
  return true;
}

// 5 Prescribed Palettes + Custom per Mode (All 14 Modes Covered!)
const MODE_PALETTES = {
  default: [
    { name: '1. Peek Classic Blue', colors: ['#0067c0', '#0284c7', '#2563eb', '#3b82f6', '#0ea5e9', '#1d4ed8', '#38bdf8'] },
    { name: '2. Warm Amber Slate', colors: ['#d97706', '#f59e0b', '#ea580c', '#e11d48', '#fb923c', '#b45309', '#facc15'] },
    { name: '3. Cool Teal & Cyan', colors: ['#0d9488', '#0891b2', '#06b6d4', '#14b8a6', '#0284c7', '#2dd4bf', '#38bdf8'] },
    { name: '4. Emerald Forest', colors: ['#059669', '#10b981', '#16a34a', '#22c55e', '#0d9488', '#34d399', '#4ade80'] },
    { name: '5. Royal Amethyst', colors: ['#7c3aed', '#8b5cf6', '#6366f1', '#9333ea', '#a855f7', '#4f46e5', '#c084fc'] }
  ],
  inherit: [
    { name: '1. Oceanic Hierarchy', colors: ['#0284c7', '#06b6d4', '#3b82f6', '#0ea5e9', '#2563eb', '#38bdf8', '#6366f1'] },
    { name: '2. Warm Solar Hierarchy', colors: ['#ea580c', '#f59e0b', '#e11d48', '#d97706', '#f97316', '#dc2626', '#eab308'] },
    { name: '3. Emerald Canopy Hierarchy', colors: ['#10b981', '#059669', '#0d9488', '#22c55e', '#14b8a6', '#16a34a', '#84cc16'] },
    { name: '4. Violet Nebula Hierarchy', colors: ['#8b5cf6', '#7c3aed', '#ec4899', '#6366f1', '#a855f7', '#d946ef', '#3b82f6'] },
    { name: '5. Monochrome Steel Hierarchy', colors: ['#94a3b8', '#cbd5e1', '#64748b', '#e2e8f0', '#475569', '#f8fafc', '#334155'] }
  ],
  rainbow: [
    { name: '1. Classic Spectrum', colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'] },
    { name: '2. Warm Rainbow', colors: ['#e11d48', '#ea580c', '#f59e0b', '#eab308', '#f97316', '#dc2626', '#fb7185'] },
    { name: '3. Cool Rainbow', colors: ['#06b6d4', '#0284c7', '#3b82f6', '#6366f1', '#8b5cf6', '#0d9488', '#14b8a6'] },
    { name: '4. Deep Spectrum', colors: ['#991b1b', '#9a3412', '#854d0e', '#166534', '#155e75', '#1e40af', '#5b21b6'] },
    { name: '5. Neon Rainbow', colors: ['#ff0055', '#ff5500', '#ffcc00', '#00ff66', '#00ccff', '#7700ff', '#ff00cc'] }
  ],
  skittles: [
    { name: '1. Original Skittles Candy', colors: ['#e52521', '#ff6d00', '#ffd600', '#00e676', '#aa00ff', '#00e5ff', '#ff007f'] },
    { name: '2. Wild Berry', colors: ['#ff007f', '#9c27b0', '#00b0ff', '#d500f9', '#ff1744', '#ff4081', '#651fff'] },
    { name: '3. Tropical Vibes', colors: ['#ffd600', '#ff6d00', '#00e5ff', '#00e676', '#ff007f', '#ffab00', '#1de9b6'] },
    { name: '4. Sour Blast', colors: ['#76ff03', '#ffd600', '#ff1744', '#00e5ff', '#ff9100', '#d500f9', '#00ff66'] },
    { name: '5. Smoothie Pop', colors: ['#ff5252', '#ff4081', '#ffab40', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb'] }
  ],
  dna: [
    { name: '1. Helix Prime', colors: ['#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#f43f5e'] },
    { name: '2. Warm Mutation', colors: ['#f97316', '#ef4444', '#eab308', '#ec4899', '#f43f5e', '#fb923c', '#facc15'] },
    { name: '3. Bioluminescent Cool', colors: ['#00f0ff', '#00ff9d', '#3b82f6', '#8b5cf6', '#14b8a6', '#38bdf8', '#a855f7'] },
    { name: '4. Botanical Lineage', colors: ['#22c55e', '#84cc16', '#10b981', '#eab308', '#06b6d4', '#4ade80', '#a3e635'] },
    { name: '5. Cosmic Ancestry', colors: ['#c084fc', '#f472b6', '#38bdf8', '#818cf8', '#fb7185', '#2dd4bf', '#facc15'] }
  ],
  pastel: [
    { name: '1. Soft Aesthetic', colors: ['#93c5fd', '#fca5a5', '#86efac', '#fde047', '#c4b5fd', '#fed7aa', '#f9a8d4'] },
    { name: '2. Warm Pastel', colors: ['#fecdd3', '#fed7aa', '#fef08a', '#ffedd5', '#fbcfe8', '#fda4af', '#fde68a'] },
    { name: '3. Cool Pastel', colors: ['#bae6fd', '#a7f3d0', '#c7d2fe', '#ddd6fe', '#99f6e4', '#a5f3fc', '#bfdbfe'] },
    { name: '4. Spring Meadow', colors: ['#bbf7d0', '#fef08a', '#fed7aa', '#fbcfe8', '#a5f3fc', '#d9f99d', '#f5d0fe'] },
    { name: '5. Velvet Muted Pastel', colors: ['#cbd5e1', '#fecaca', '#bbf7d0', '#fef08a', '#e9d5ff', '#fed7aa', '#bae6fd'] }
  ],
  neon: [
    { name: '1. Cyberpunk Prime', colors: ['#00f0ff', '#ff007f', '#39ff14', '#bc13fe', '#ffe600', '#ff0055', '#00ffaa'] },
    { name: '2. Synthwave 80s', colors: ['#ff007f', '#7928ca', '#00f0ff', '#ff0055', '#ffbe0b', '#fb5607', '#3a86ff'] },
    { name: '3. Matrix Terminal', colors: ['#00ff66', '#39ff14', '#00cc44', '#10b981', '#059669', '#a3e635', '#4ade80'] },
    { name: '4. Electric Cyan / Blue', colors: ['#00f0ff', '#00b4d8', '#0077b6', '#48cae4', '#90e0ef', '#38bdf8', '#60a5fa'] },
    { name: '5. Toxic Acid', colors: ['#ccff00', '#ff007f', '#00ffc8', '#ff9900', '#9900ff', '#76ff03', '#ff1744'] }
  ],
  breathing: [
    { name: '1. Pure White Horizon', rim: '#ffffff', bg: '#334155', glow: '#ffffff', colors: ['#0284c7', '#06b6d4', '#3b82f6', '#0ea5e9', '#38bdf8', '#2563eb', '#1d4ed8'] },
    { name: '2. Warm Sunset Glow', rim: '#ffd54f', bg: '#451a03', glow: '#f59e0b', colors: ['#ea580c', '#f97316', '#d97706', '#e11d48', '#f59e0b', '#dc2626', '#fb923c'] },
    { name: '3. Oceanic Calm Glow', rim: '#38bdf8', bg: '#0c4a6e', glow: '#0284c7', colors: ['#0284c7', '#0369a1', '#0891b2', '#0d9488', '#06b6d4', '#2563eb', '#0ea5e9'] },
    { name: '4. Zen Emerald Glow', rim: '#6ee7b7', bg: '#064e3b', glow: '#10b981', colors: ['#059669', '#10b981', '#0d9488', '#16a34a', '#22c55e', '#14b8a6', '#34d399'] },
    { name: '5. Lavender Dream Glow', rim: '#d8b4fe', bg: '#3b0764', glow: '#a855f7', colors: ['#7c3aed', '#8b5cf6', '#9333ea', '#a855f7', '#c084fc', '#6366f1', '#d946ef'] }
  ],
  disco: [
    { name: '1. 70s Studio Retro', colors: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'] },
    { name: '2. Club Electric', colors: ['#ff0055', '#00f0ff', '#ffe600', '#39ff14', '#bc13fe', '#ff6d00', '#00e5ff'] },
    { name: '3. Vibrant Pastel Disco', colors: ['#f472b6', '#38bdf8', '#4ade80', '#facc15', '#a78bfa', '#fb923c', '#2dd4bf'] },
    { name: '4. High-Voltage Neon', colors: ['#ff007f', '#7928ca', '#00ffc8', '#ffea00', '#ff0055', '#00e5ff', '#76ff03'] },
    { name: '5. Carnival Radiance', colors: ['#e11d48', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2'] }
  ],
  dusco: [
    { name: '1. Deep Saturated Neon Prime', colors: ['#00f0ff', '#ff007f', '#39ff14', '#bc13fe', '#ffd600', '#ff3366', '#00ffaa'] },
    { name: '2. Midnight Cyberpunk', colors: ['#00e5ff', '#d500f9', '#00e676', '#ff1744', '#651fff', '#ff9100', '#1de9b6'] },
    { name: '3. Dark Sunset Dusco', colors: ['#ff0055', '#ff5500', '#aa00ff', '#ff00aa', '#0055ff', '#ffaa00', '#9900ee'] },
    { name: '4. Deep Oceanic Dusco', colors: ['#00b4d8', '#0077b6', '#7209b7', '#4361ee', '#4cc9f0', '#3a0ca3', '#03045e'] },
    { name: '5. Toxic Midnight', colors: ['#76ff03', '#ccff00', '#ff007f', '#00e5ff', '#aa00ff', '#ff6d00', '#00ff66'] }
  ],
  'deep-dusco': [
    { name: '1. Stepped Greyscale Classic', colors: ['#ffffff', '#e4e4e7', '#a1a1aa', '#71717a', '#52525b', '#27272a', '#18181b'] },
    { name: '2. High-Contrast Noir', colors: ['#ffffff', '#000000', '#f4f4f5', '#18181b', '#d4d4d8', '#27272a', '#e4e4e7'] },
    { name: '3. Silver & Steel', colors: ['#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155'] },
    { name: '4. Charcoal Minimalist', colors: ['#fafafa', '#d4d4d8', '#a1a1aa', '#52525b', '#3f3f46', '#27272a', '#09090b'] },
    { name: '5. Warm Slate Greyscale', colors: ['#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#292524'] }
  ]
};
MODE_PALETTES['rainbow-sync'] = MODE_PALETTES.rainbow;
MODE_PALETTES['rainbow-async'] = MODE_PALETTES.rainbow;
MODE_PALETTES['rainbow-wave'] = MODE_PALETTES.rainbow;
MODE_PALETTES['rain-puddle'] = MODE_PALETTES.breathing;

function getModePaletteIdx(modeKey = landscapePalette) {
  if (typeof modePaletteIndex === 'object' && modePaletteIndex !== null) {
    return typeof modePaletteIndex[modeKey] === 'number' ? modePaletteIndex[modeKey] : 0;
  }
  return Number(modePaletteIndex) || 0;
}

function getModeCustomSwatches(modeKey = landscapePalette) {
  if (customPaletteColors && typeof customPaletteColors === 'object' && !Array.isArray(customPaletteColors)) {
    if (Array.isArray(customPaletteColors[modeKey]) && customPaletteColors[modeKey].length === 7) {
      return customPaletteColors[modeKey];
    }
  } else if (Array.isArray(customPaletteColors) && customPaletteColors.length === 7) {
    return customPaletteColors;
  }
  return MODE_PALETTES[modeKey] ? [...MODE_PALETTES[modeKey][0].colors.slice(0, 7)] : [...DEFAULT_CUSTOM_SWATCHES];
}

function getActivePaletteEntry(modeKey = landscapePalette) {
  const list = MODE_PALETTES[modeKey];
  if (!list) return null;
  const idx = getModePaletteIdx(modeKey);
  if (idx === 5) {
    return { name: 'Custom Palette', colors: getModeCustomSwatches(modeKey), rim: breathTargetColor, bg: breathTargetBgColor, glow: breathTargetColor };
  }
  return list[Math.max(0, Math.min(list.length - 1, idx))] || list[0];
}

function getActivePaletteColors(modeKey = landscapePalette) {
  const entry = getActivePaletteEntry(modeKey);
  return (entry && entry.colors && entry.colors.length) ? entry.colors : getModeCustomSwatches(modeKey);
}

function hexToRgbObj(hex) {
  if (!hex || typeof hex !== 'string') return { r: 0, g: 103, b: 192 };
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const num = parseInt(h, 16);
  if (isNaN(num)) return { r: 0, g: 103, b: 192 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function shiftColorShade(hex, style = 'lighter', step = 1) {
  if (!hex || !hex.startsWith('#')) return hex || defaultFrameColor;
  if (style === 'exact') return hex;
  const { r, g, b } = hexToRgbObj(hex);
  if (style === 'lighter') {
    const t = Math.min(0.78, 0.28 * step);
    return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
  }
  if (style === 'darker') {
    const t = Math.max(0.2, Math.pow(0.72, step));
    return rgbToHex(r * t, g * t, b * t);
  }
  if (style === 'floor-bg') {
    // Rich room floor tinted noticeably with the room's frame color
    return rgbToHex(12 + r * 0.26, 16 + g * 0.26, 26 + b * 0.26);
  }
  if (style === 'hue-shift') {
    // Rotate RGB channels distinctly per depth / branch step
    const angle = (step * 42 * Math.PI) / 180;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const nr = r * (0.213 + cosA * 0.787 - sinA * 0.213) + g * (0.715 - cosA * 0.715 - sinA * 0.715) + b * (0.072 - cosA * 0.072 + sinA * 0.928);
    const ng = r * (0.213 - cosA * 0.213 + sinA * 0.143) + g * (0.715 + cosA * 0.285 + sinA * 0.140) + b * (0.072 - cosA * 0.072 - sinA * 0.283);
    const nb = r * (0.213 - cosA * 0.213 - sinA * 0.787) + g * (0.715 - cosA * 0.715 + sinA * 0.715) + b * (0.072 + cosA * 0.928 + sinA * 0.072);
    return rgbToHex(nr, ng, nb);
  }
  return hex;
}

function hashPathIndex(str, mod) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % Math.max(1, mod);
}

function colorToRgba(color, alpha = 1.0) {
  if (!color) return `rgba(30, 41, 59, ${alpha})`;
  if (color.startsWith('#')) {
    const { r, g, b } = hexToRgbObj(color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

// Computes the exact perimeter intersection point of a rectangle centered at (cx, cy) of size (w, h)
// towards a target point (tx, ty), ensuring bridge lines never cut across room interiors!
function getRectBorderIntersection(cx, cy, w, h, tx, ty) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = (w || 400) / 2;
  const hh = (h || 300) / 2;
  const sx = dx !== 0 ? Math.abs(hw / dx) : Infinity;
  const sy = dy !== 0 ? Math.abs(hh / dy) : Infinity;
  const s = Math.min(sx, sy);
  return {
    x: Math.round(cx + dx * s),
    y: Math.round(cy + dy * s)
  };
}

function promptRoomColor(entry, type = 'frame') {
  let picker = document.getElementById('tempRoomColorPicker');
  if (!picker) {
    picker = document.createElement('input');
    picker.type = 'color';
    picker.id = 'tempRoomColorPicker';
    picker.style.position = 'fixed';
    picker.style.left = '-9999px';
    document.body.appendChild(picker);
  }
  const curVal = type === 'bg'
    ? (entry.roomBgColor || defaultBgColor)
    : (entry.roomColor || defaultFrameColor);
  picker.value = curVal && curVal.startsWith('#') ? curVal : (type === 'bg' ? '#1e293b' : '#0067c0');
  picker.oninput = picker.onchange = () => {
    if (type === 'bg') {
      entry.roomBgColor = picker.value;
      if (!lockBg && !entry.lockBg) entry.el.style.background = colorToRgba(entry.roomBgColor, roomBgOpacity / 100);
      if (landscapeLayout[cur]?.rooms) landscapeLayout[cur].rooms[entry.path] = { ...(landscapeLayout[cur].rooms[entry.path] || {}), roomBgColor: entry.roomBgColor };
    } else {
      entry.roomColor = picker.value;
      if (!lockFrame && !entry.lockFrame) entry.el.style.borderColor = entry.roomColor;
      if (landscapeLayout[cur]?.rooms) landscapeLayout[cur].rooms[entry.path] = { ...(landscapeLayout[cur].rooms[entry.path] || {}), roomColor: entry.roomColor };
    }
    persist();
  };
  picker.click();
}

function resetRoomColor(entry) {
  delete entry.roomColor;
  delete entry.roomBgColor;
  entry.lockFrame = false;
  entry.lockBg = false;
  entry.el.style.borderColor = defaultFrameColor;
  entry.el.style.background = colorToRgba(defaultBgColor, roomBgOpacity / 100);
  if (landscapeLayout[cur]?.rooms?.[entry.path]) {
    delete landscapeLayout[cur].rooms[entry.path].roomColor;
    delete landscapeLayout[cur].rooms[entry.path].roomBgColor;
    delete landscapeLayout[cur].rooms[entry.path].lockFrame;
    delete landscapeLayout[cur].rooms[entry.path].lockBg;
  }
  persist();
}
let filterText = '', showPreview = false, darkMode = false, showHidden = true, showExt = true, showChecks = false;
let newTabTarget = 'home'; // 'home' | 'userHome' | 'duplicate'
let colWidths = { date: 150, type: 110, size: 85 };
let expanded = new Set(); // paths currently dropped down (per tab)
const selected = new Map(); // path -> { item, cell }
const folderSizeCache = new Map(); // path -> bytes
let anchorPath = null;      // anchor for Shift+click range selection
let focusedPath = null;     // current keyboard focus row
let clip = null;            // { mode: 'copy'|'cut', paths: [] } synced with main process
let scripts = [];           // [{ name, path }]
let bookmarks = [];         // [{ name, path }]
let recentFolders = [];     // [path, ...]
let closedTabs = [];        // stack of recently closed tabs for Ctrl+Shift+T
let cachedPlaces = { places: [], drives: [], home: '', cachedPins: [] };
let undoStack = [];         // [{ type: 'rename'|'move', ops: [{ from, to }] }]
let landscapeLayout = {};   // { [dirPath]: { nodes: { [name]: {x,y} }, zones: [{id, title, x, y, w, h}] } }
let splitState = { active: false, dir: 'right', cur: HOME_URI, hist: [HOME_URI], hi: 0, mode: 'details', expanded: new Set() };

async function syncClip() {
  clip = await window.api.getClip();
  if (!clip) {
    const osFiles = await window.api.getOsClipFiles();
    if (osFiles && osFiles.length) clip = { mode: 'copy', paths: osFiles };
  }
}
async function storeClip(c) { clip = c; await window.api.setClip(c); }
window.addEventListener('focus', syncClip);

function applyColWidths() {
  document.documentElement.style.setProperty('--w-date', colWidths.date + 'px');
  document.documentElement.style.setProperty('--w-type', colWidths.type + 'px');
  document.documentElement.style.setProperty('--w-size', colWidths.size + 'px');
}
function applyTheme() {
  document.body.classList.toggle('dark', darkMode);
  $('themeBtn').textContent = darkMode ? '☀️' : '🌙';
  document.documentElement.style.setProperty('--room-glow-intensity', roomGlowIntensity / 100);
  document.documentElement.style.setProperty('--breath-target', breathTargetColor || '#ffffff');
}
function applyToggles() {
  $('hiddenBtn').classList.toggle('active', showHidden);
  $('extBtn').classList.toggle('active', showExt);
  $('checkBtn').classList.toggle('active', showChecks);
  document.body.classList.toggle('show-checks', showChecks);
}
function applyPreviewPane() {
  $('preview').classList.toggle('hidden', !showPreview);
  $('previewBtn').classList.toggle('active', showPreview);
  if (showPreview) updatePreviewPane();
}
function updateNavButtons() {
  $('back').disabled = hi <= 0;
  $('fwd').disabled = hi >= hist.length - 1;
  $('up').disabled = cur === HOME_URI;
}

const fmtSize = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(1) + ' GB';
const fmtDate = m => m ? new Date(m).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
const fileUrl = p => 'file:///' + p.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
const parent = p => {
  if (!p || p === HOME_URI || p.startsWith('peek://')) return HOME_URI;
  const isUnc = p.startsWith('\\\\');
  const q = p.replace(/[\\/]+$/, '');
  if (isUnc) {
    const raw = q.slice(2).split(/[\\/]/).filter(Boolean);
    if (raw.length <= 1) return HOME_URI;
    return '\\\\' + raw.slice(0, -1).join('\\');
  }
  const i = q.lastIndexOf('\\');
  return (i <= 2 && /^[A-Za-z]:/.test(q)) ? HOME_URI : (q.slice(0, i) || HOME_URI);
};
const typeOf = it => it.isDir ? 'File folder' : ((it.name.includes('.') ? it.name.split('.').pop() : '').toUpperCase() + ' file').trim();
const displayName = it => {
  if (it.isDir || showExt) return it.name;
  const dot = it.name.lastIndexOf('.');
  return dot > 0 ? it.name.slice(0, dot) : it.name;
};
const isGrid = () => ['small', 'medium', 'large', 'xl', 'tiles', 'list', 'lens'].includes(mode);
const baseName = p => {
  if (p === HOME_URI) return 'Home';
  if (p.startsWith('peek://gluon')) {
    const sub = p.replace('peek://gluon', '').replace(/^\/+/, '').toUpperCase();
    return sub ? `Gluon: ${sub}` : 'Semantic Gluons';
  }
  return p.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || p;
};

// ---- Selection + Status + Preview Pane (with direct rename textbox + video/audio/text preview) ----
const visibleRows = () => [...$('list').querySelectorAll('.row.item, .room-item, .room-file, .room-door, .dash-card')].filter(r => r._item && r.style.display !== 'none' && !r.closest('.collapsed'));
function updateStatus() {
  if (cur === HOME_URI) {
    const n = selected.size;
    if (n > 0) {
      $('status').textContent = `${n} item${n > 1 ? 's' : ''} selected  |  Home Dashboard`;
    } else {
      $('status').textContent = `Home Dashboard  |  ${scripts.length} script connections  |  ${bookmarks.length} bookmarks`;
    }
    if (showPreview) updatePreviewPane();
    return;
  }
  const n = selected.size;
  if (!n) {
    $('status').textContent = `${totalCount} items`;
  } else if (n === 1) {
    const it = [...selected.values()][0].item;
    const sz = it.isDir ? (folderSizeCache.has(it.path) ? `  (${fmtSize(folderSizeCache.get(it.path))})` : '') : `  (${fmtSize(it.size)})`;
    $('status').textContent = `${totalCount} items  |  1 item selected${sz}  —  ${it.path}`;
  } else {
    let bytes = 0;
    for (const { item } of selected.values()) bytes += item.isDir ? (folderSizeCache.get(item.path) || 0) : (item.size || 0);
    $('status').textContent = `${totalCount} items  |  ${n} items selected${bytes ? '  (' + fmtSize(bytes) + ')' : ''}`;
  }
  if (showPreview) updatePreviewPane();
}

let previewToken = 0;
async function updatePreviewPane() {
  const box = $('preview');
  const myToken = ++previewToken;
  if (!selected.size) {
    box.innerHTML = `<div class="pv-name-label">Current location</div><div style="font-weight:600;font-size:13px">${baseName(cur)}</div><div class="pv-meta">Path: ${cur}<br>Items: ${totalCount}<br><br>Select any file or folder to inspect or rename it directly here.</div>`;
    return;
  }
  if (selected.size > 1) {
    let bytes = 0;
    for (const { item } of selected.values()) bytes += item.isDir ? (folderSizeCache.get(item.path) || 0) : (item.size || 0);
    box.innerHTML = `<div style="font-weight:600;font-size:13px">${selected.size} items selected</div><div class="pv-name-label">Batch Rename all ${selected.size} items:</div><input class="pv-name-input" placeholder="Type base name & press Enter…"><div class="pv-meta">Total file size: ${fmtSize(bytes)} (${bytes.toLocaleString()} bytes)</div>`;
    const bInp = box.querySelector('.pv-name-input');
    bInp.addEventListener('keydown', async e => {
      e.stopPropagation();
      if (e.key === 'Enter' && bInp.value.trim()) {
        const r = await window.api.batchRename([...selected.keys()], bInp.value.trim());
        if (r.ops && r.ops.length) {
          undoStack.push({ type: 'rename', ops: r.ops });
          for (const op of r.ops) {
            const entry = selected.get(op.to);
            if (entry) applyItemRenameInPlace(entry.item, entry.cell, op.from);
          }
        }
        if (r.skipped && r.skipped.length) alert('Skipped:\n' + r.skipped.join('\n'));
        updateStatus();
      }
    });
    return;
  }
  const entry = [...selected.values()][0];
  const it = entry.item;
  box.innerHTML = `<div class="pv-media"></div><div class="pv-name-label">Rename (press Enter or click away):</div><input class="pv-name-input" spellcheck="false"><div class="pv-meta"></div><div class="pv-body"></div>`;
  const nameInp = box.querySelector('.pv-name-input');
  nameInp.value = it.name;
  let committing = false;
  const commitPreviewRename = async () => {
    if (committing) return;
    const nextName = nameInp.value.trim();
    if (!nextName || nextName === it.name) { nameInp.value = it.name; return; }
    committing = true;
    const r = await window.api.rename(it.path, nextName);
    committing = false;
    if (r.error) { alert(r.error); nameInp.value = it.name; return; }
    undoStack.push({ type: 'rename', ops: [{ from: r.newPath, to: r.oldPath }] });
    applyItemRenameInPlace(it, entry.cell, r.newPath);
    updateStatus();
  };
  nameInp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); nameInp.blur(); }
    else if (e.key === 'Escape') { nameInp.value = it.name; nameInp.blur(); }
  });
  nameInp.addEventListener('blur', commitPreviewRename);

  const mediaBox = box.querySelector('.pv-media');
  if (!it.isDir && IMG.test(it.name)) {
    const img = document.createElement('img'); img.className = 'pv-img';
    img.src = fileUrl(it.path);
    img.onload = () => {
      if (myToken !== previewToken) return;
      const d = box.querySelector('.pv-dims');
      if (d) d.textContent = `Dimensions: ${img.naturalWidth} × ${img.naturalHeight} px`;
    };
    mediaBox.appendChild(img);
  } else if (!it.isDir && VID.test(it.name)) {
    const v = document.createElement('video'); v.controls = true; v.src = fileUrl(it.path);
    mediaBox.appendChild(v);
  } else if (!it.isDir && AUD.test(it.name)) {
    const a = document.createElement('audio'); a.controls = true; a.src = fileUrl(it.path);
    mediaBox.appendChild(a);
  } else {
    const img = document.createElement('img'); img.className = 'pv-img';
    setIcon(img, it, 96, false);
    mediaBox.appendChild(img);
  }

  const meta = box.querySelector('.pv-meta');
  const dirSz = it.isDir && folderSizeCache.has(it.path) ? `Folder size: ${fmtSize(folderSizeCache.get(it.path))}<br>` : '';
  meta.innerHTML = `Type: ${typeOf(it)}<br>` +
    (it.isDir ? dirSz : `Size: ${fmtSize(it.size)} (${(it.size || 0).toLocaleString()} bytes)<br>`) +
    `<span class="pv-dims"></span>` +
    `Modified: ${fmtDate(it.mtime)}<br>` +
    (it.btime ? `Created: ${fmtDate(it.btime)}<br>` : '') +
    `Path: ${it.path}`;

  if (it.isDir && !folderSizeCache.has(it.path)) {
    const btn = document.createElement('button'); btn.className = 'dash-btn'; btn.textContent = 'Calculate folder size';
    btn.onclick = () => calcFolderSize(it, entry.cell);
    box.querySelector('.pv-body').appendChild(btn);
  } else if (!it.isDir && !IMG.test(it.name) && !VID.test(it.name) && !AUD.test(it.name) && it.size > 0 && it.size <= 5 * 1024 * 1024) {
    const res = await window.api.readPreview(it.path);
    if (myToken !== previewToken) return;
    if (res && typeof res.text === 'string') {
      const pvBody = box.querySelector('.pv-body');
      pvBody.innerHTML = '';

      const isTextDoc = /\.(md|txt|markdown|js|ts|py|json|html|css)$/i.test(it.name);
      // Fractal Polytrope Summarizer tab (Commented out per user request - preserved for later development)
      /*
      if (isTextDoc && typeof FractalSummarizer !== 'undefined' && autoSummarize) {
        const summary = FractalSummarizer.summarizeText(res.text, it.name);
        
        const toggleBar = document.createElement('div');
        toggleBar.className = 'pv-toggle-bar';
        toggleBar.innerHTML = `
          <button class="pv-toggle-btn active" data-tab="summary">🧬 Fractal Summary</button>
          <button class="pv-toggle-btn" data-tab="fulltext">📄 Full Text (${fmtSize(it.size)})</button>
        `;
        
        const summaryView = document.createElement('div');
        summaryView.className = 'pv-summary-view';
        summaryView.innerHTML = `
          <div class="pv-singularity-card">
            <div class="pv-singularity-label">🔒 Invariant Singularity (Core Grounded Truth)</div>
            <div class="pv-singularity-text">"${summary.level1Singularity}"</div>
          </div>
          <div class="pv-sec-title">7-Plane Cognitive Geodesic</div>
          <div class="pv-geodesic-list">
            ${Object.entries(summary.level2Geodesic).map(([plane, item]) => `
              <div class="pv-geodesic-item">
                <span class="pv-geodesic-badge ${plane}">${item.label ? item.label.badge : plane}</span>
                <span>"${item.sentence}"</span>
              </div>
            `).join('')}
          </div>
          ${summary.level3Spine && summary.level3Spine.length ? `
            <div class="pv-sec-title">Invariant Section Spine (${summary.level3Spine.length} sections)</div>
            <div class="pv-spine-list">
              ${summary.level3Spine.slice(0, 6).map(s => `
                <div class="pv-spine-item">
                  <div class="pv-spine-sec">§ ${s.section}</div>
                  <div>"${s.keyInvariant}"</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        `;

        const pre = document.createElement('pre');
        pre.className = 'pv-text';
        pre.style.display = 'none';
        pre.textContent = res.text;

        toggleBar.querySelectorAll('.pv-toggle-btn').forEach(btn => {
          btn.onclick = () => {
            toggleBar.querySelectorAll('.pv-toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
            const tab = btn.dataset.tab;
            summaryView.style.display = tab === 'summary' ? 'flex' : 'none';
            pre.style.display = tab === 'fulltext' ? 'block' : 'none';
          };
        });

        pvBody.append(toggleBar, summaryView, pre);
      } else {
      */
      const pre = document.createElement('pre'); pre.className = 'pv-text';
      pre.textContent = res.text;
      pvBody.appendChild(pre);
      // }
    }
  }
}

// ---- Semantic Gluon DNA Engine Cache & Lazy Loader ----
const gluonCache = new Map();
const GLUON_CACHE_MAX = 150;
let gluonLoadPromise = null;

function ensureGluonLoaded() {
  if (typeof GluonEngine !== 'undefined') return Promise.resolve(true);
  if (gluonLoadPromise) return gluonLoadPromise;
  gluonLoadPromise = new Promise(resolve => {
    const s1 = document.createElement('script');
    s1.src = 'gluon_dictionary.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'gluon_engine.js';
      s2.onload = () => resolve(typeof GluonEngine !== 'undefined');
      s2.onerror = () => resolve(false);
      document.head.appendChild(s2);
    };
    s1.onerror = () => resolve(false);
    document.head.appendChild(s1);
  });
  return gluonLoadPromise;
}

function getCachedGluonAnalysis(item, text) {
  const key = `${item.path}|${item.mtime}|${item.size}`;
  if (gluonCache.has(key)) {
    const val = gluonCache.get(key);
    gluonCache.delete(key);
    gluonCache.set(key, val);
    return val;
  }
  if (typeof GluonEngine === 'undefined') return null;
  const res = GluonEngine.analyzeDocument(text, item.name);
  if (res) {
    if (gluonCache.size >= GLUON_CACHE_MAX) {
      const oldest = gluonCache.keys().next().value;
      gluonCache.delete(oldest);
    }
    gluonCache.set(key, res);
  }
  return res;
}

async function renderGluonTelemetry(doc, it, container, myToken) {
  const tel = document.createElement('div');
  tel.className = 'pv-gluon-telemetry';

  const hadronLabel = doc.isHadronSinglet
    ? '⚪ White Singlet Baryon'
    : (doc.cr > 0.45 ? '🔴 Will-Polarized' : (doc.cb > 0.45 ? '🔵 Proof-Polarized' : '🟢 Action-Polarized'));

  tel.innerHTML = `
    <div class="pv-gluon-header">
      <a class="pv-gluon-badge ${doc.plane.toLowerCase()}" href="#" title="Click to view all ${doc.plane} files in Gluon Topic Space">${doc.planeInfo ? doc.planeInfo.badge : doc.plane}</a>
      <span class="pv-gluon-hadron ${doc.isHadronSinglet ? 'hadron-singlet' : ''}">${hadronLabel}</span>
      <span class="pv-gluon-veritas" title="Epistemic Rigor Score based on C1/C2 vocabulary, Hadron balance, and string continuity">Veritas: ${doc.veritasScore}</span>
    </div>
    <div class="pv-gauge-bar" title="SU(3) Color Gauge: ${(doc.cr*100).toFixed(1)}% Red (Will) | ${(doc.cg*100).toFixed(1)}% Green (Action) | ${(doc.cb*100).toFixed(1)}% Blue (Proof)">
      <div class="gauge-red" style="width:${(doc.cr*100).toFixed(1)}%"></div>
      <div class="gauge-green" style="width:${(doc.cg*100).toFixed(1)}%"></div>
      <div class="gauge-blue" style="width:${(doc.cb*100).toFixed(1)}%"></div>
    </div>
    <div class="pv-gluon-pubtest">${doc.planeInfo ? doc.planeInfo.pubTest : ''}</div>
    ${doc.snapsCount > 0 ? `
      <div class="pv-gluon-snap-warn" title="Confinement broken (r_eff >= 1.529) across adjacent sections">
        ⚠️ String Snapping: ${doc.snapsCount} non-sequitur leap${doc.snapsCount > 1 ? 's' : ''} (Tension: ${(doc.maxTension*100).toFixed(0)}%)
      </div>
    ` : ''}
    <div class="pv-gluon-resonance">
      <div class="pv-res-title">
        <span>🧬 Gluon Resonance (Related in Folder)</span>
      </div>
      <div class="pv-res-chips"><span style="color:var(--muted);font-size:10px">Calculating resonance…</span></div>
    </div>
  `;

  const planeLink = tel.querySelector('.pv-gluon-badge');
  if (planeLink) {
    planeLink.onclick = e => {
      e.preventDefault();
      go('peek://gluon/' + doc.plane.toLowerCase());
    };
  }

  container.appendChild(tel);

  // Asynchronously scan related files in the current view
  const chipsEl = tel.querySelector('.pv-res-chips');
  const rows = visibleRows().filter(r => r._item && !r._item.isDir && /\.(md|txt|json|js|py|html|css)$/i.test(r._item.name) && r._item.path !== it.path);

  if (!rows.length) {
    chipsEl.innerHTML = `<span style="color:var(--muted);font-size:10px">(no other text files in folder)</span>`;
    return;
  }

  const candidates = [];
  const maxScan = Math.min(rows.length, 12);
  for (let i = 0; i < maxScan; i++) {
    const candRow = rows[i];
    const candItem = candRow._item;
    let candDoc = null;
    const cacheKey = `${candItem.path}|${candItem.mtime}|${candItem.size}`;
    if (gluonCache.has(cacheKey)) {
      candDoc = gluonCache.get(cacheKey);
    } else if (candItem.size <= 2 * 1024 * 1024) {
      try {
        const cRes = await window.api.readPreview(candItem.path);
        if (cRes && cRes.text) candDoc = getCachedGluonAnalysis(candItem, cRes.text);
      } catch (_) {}
    }
    if (candDoc) candidates.push({ item: candItem, row: candRow, doc: candDoc });
  }

  if (myToken !== previewToken) return;

  const ranked = GluonEngine.rankRelated(doc, candidates);
  if (!ranked.length) {
    chipsEl.innerHTML = `<span style="color:var(--muted);font-size:10px">(no high-affinity neighbors)</span>`;
    return;
  }

  chipsEl.innerHTML = '';
  ranked.slice(0, 4).forEach(rel => {
    const chip = document.createElement('div');
    chip.className = 'pv-res-chip';
    const topConcept = (rel.resonance.sharedLemmas && rel.resonance.sharedLemmas.length) ? rel.resonance.sharedLemmas[0] : '';
    const lemmasText = (rel.resonance.sharedLemmas && rel.resonance.sharedLemmas.length)
      ? `\nShared Concepts: ${rel.resonance.sharedLemmas.join(', ')}`
      : '';
    const bondsText = (rel.resonance.bondedPairs && rel.resonance.bondedPairs.length)
      ? `\nCausal Bonds: ${rel.resonance.bondedPairs.join(' | ')}`
      : '';
    chip.title = `${rel.item.name}\nAffinity: ${rel.resonance.affinity}%\nBond: ${rel.resonance.bondType}${lemmasText}${bondsText}\nKernel Score: ${rel.resonance.kernelScore || 0}\nPlane: ${rel.doc.plane}`;
    chip.innerHTML = `
      <div style="display:flex;align-items:center;overflow:hidden;gap:4px">
        <span class="res-name">${rel.item.name}</span>
        ${topConcept ? `<span class="res-tag">${topConcept}</span>` : ''}
      </div>
      <span class="res-affinity">${rel.resonance.affinity}%</span>
    `;
    chip.onclick = () => {
      selectClick(rel.item, rel.row, null);
    };
    chipsEl.appendChild(chip);
  });
}

async function calcFolderSize(it, cell) {
  $('status').textContent = `Calculating size of "${it.name}"…`;
  const res = await window.api.folderSize(it.path);
  folderSizeCache.set(it.path, res.bytes);
  if (cell) {
    const szEl = cell.querySelector('.c-size');
    if (szEl) szEl.textContent = fmtSize(res.bytes);
  }
  updateStatus();
}

function clearSelection() {
  for (const { cell } of selected.values()) {
    cell.classList.remove('sel');
    const ck = cell.querySelector('.chk'); if (ck) ck.checked = false;
  }
  selected.clear();
  updateStatus();
}
function setRowSelected(it, cell, on) {
  const ck = cell.querySelector('.chk');
  if (on) { cell.classList.add('sel'); if (ck) ck.checked = true; selected.set(it.path, { item: it, cell }); }
  else { cell.classList.remove('sel'); if (ck) ck.checked = false; selected.delete(it.path); }
}

// Track click timestamp on selected item for native Explorer slow-second-click rename
let lastClickPath = null, lastClickTime = 0, slowRenameTimer = null;
function cancelPendingRename() { if (slowRenameTimer) { clearTimeout(slowRenameTimer); slowRenameTimer = null; } }

function selectClick(it, cell, e) {
  if (e && e.shiftKey && anchorPath) {
    const rows = visibleRows();
    const aIdx = rows.findIndex(r => r._item && r._item.path === anchorPath);
    const bIdx = rows.indexOf(cell);
    if (aIdx !== -1 && bIdx !== -1) {
      if (!e.ctrlKey) clearSelection();
      const [lo, hiIdx] = aIdx < bIdx ? [aIdx, bIdx] : [bIdx, aIdx];
      for (let i = lo; i <= hiIdx; i++) setRowSelected(rows[i]._item, rows[i], true);
      focusedPath = it.path;
      updateStatus();
      return;
    }
  }
  if (e && e.ctrlKey) {
    setRowSelected(it, cell, !selected.has(it.path));
    anchorPath = it.path; focusedPath = it.path;
  } else {
    clearSelection();
    setRowSelected(it, cell, true);
    anchorPath = it.path; focusedPath = it.path;
  }
  updateStatus();
}
function selectAll() {
  for (const r of visibleRows()) if (r._item) setRowSelected(r._item, r, true);
  updateStatus();
}
function invertSelection() {
  for (const r of visibleRows()) if (r._item) setRowSelected(r._item, r, !selected.has(r._item.path));
  updateStatus();
}

function sortItems(items) {
  const dir = sortAsc ? 1 : -1;
  return items.sort((a, b) => {
    if (a.isDir !== b.isDir) return b.isDir - a.isDir;
    let r;
    if (sortKey === 'mtime') r = a.mtime - b.mtime;
    else if (sortKey === 'size') r = (a.isDir ? (folderSizeCache.get(a.path) || 0) : a.size) - (b.isDir ? (folderSizeCache.get(b.path) || 0) : b.size);
    else if (sortKey === 'type') r = typeOf(a).localeCompare(typeOf(b));
    else r = 0;
    return (r || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })) * dir;
  });
}

function groupLabelFor(it) {
  if (groupKey === 'type') return typeOf(it);
  if (groupKey === 'name') {
    const ch = (it.name[0] || '#').toUpperCase();
    return /[A-Z]/.test(ch) ? ch : '0–9 & Symbols';
  }
  if (groupKey === 'size') {
    if (it.isDir) return 'Folders';
    if (it.size === 0) return 'Empty (0 B)';
    if (it.size < 1024 * 100) return 'Tiny (< 100 KB)';
    if (it.size < 1048576 * 5) return 'Medium (100 KB – 5 MB)';
    return 'Large (> 5 MB)';
  }
  if (groupKey === 'mtime') {
    const days = (Date.now() - (it.mtime || 0)) / 86400000;
    if (days < 1) return 'Today';
    if (days < 7) return 'Earlier this week';
    if (days < 30) return 'Earlier this month';
    return 'Older';
  }
  return '';
}

// Icon pixel size per view. <=24 uses the small shell icon, bigger uses real Windows thumbnails.
const PX = { details: 16, list: 16, small: 16, content: 32, tiles: 40, medium: 48, large: 96, xl: 190, lens: 64, landscape: 64 };
const iconCache = new Map();
const MAX_RENDERER_ICON_CACHE = 350;
async function setIcon(img, it, px = PX[mode], unique = false) {
  const key = px + '|' + (unique || px > 24 || it.isDir ? it.path : (it.name.includes('.') ? it.name.split('.').pop().toLowerCase() : it.path));
  if (!iconCache.has(key)) {
    if (iconCache.size >= MAX_RENDERER_ICON_CACHE) {
      const oldest = iconCache.keys().next().value;
      iconCache.delete(oldest);
    }
    iconCache.set(key, window.api.icon(it.path, it.isDir, px, unique));
  }
  const url = await iconCache.get(key);
  if (url) img.src = url;
}

function msg(text, depth) {
  const m = document.createElement('div'); m.className = 'msg'; m.style.paddingLeft = (28 + depth * 18) + 'px'; m.textContent = text; return m;
}

// ---- Live filter + hidden files helper ----
function applyFilter() {
  const q = filterText.trim().toLowerCase();
  for (const r of $('list').querySelectorAll('.row.item, .room-item, .room-file, .room-door')) {
    if (!r._item) continue;
    const hiddenBlocked = !showHidden && r._item.name.startsWith('.');
    const matchFilter = !q || r._item.name.toLowerCase().includes(q) || (r._item.isDir && expanded.has(r._item.path));
    r.style.display = (!hiddenBlocked && matchFilter) ? '' : 'none';
  }
  if (mode === 'landscape') {
    for (const room of $('list').querySelectorAll('.map-room')) {
      if (!q) {
        room.classList.remove('radar-ping');
      } else {
        const hasMatch = Array.from(room.querySelectorAll('.room-item')).some(it => it.style.display !== 'none');
        if (hasMatch) room.classList.add('radar-ping');
        else room.classList.remove('radar-ping');
      }
    }
    for (const proxy of $('list').querySelectorAll('.lens-proxy')) {
      if (!q) {
        proxy.classList.remove('radar-ping');
      } else {
        const pPath = proxy.dataset && proxy.dataset.path;
        const targetRoom = pPath && $('list').querySelector(`.map-room[data-path="${CSS.escape(pPath)}"]`);
        if (targetRoom && targetRoom.classList.contains('radar-ping')) proxy.classList.add('radar-ping');
        else proxy.classList.remove('radar-ping');
      }
    }
    if (typeof window._updateLandscapeRadar === 'function') {
      window._updateLandscapeRadar();
    }
  }
}

// ---- Drag & drop helper ----
const MIME_PATHS = 'application/x-peek-paths';
const MIME_TAB = 'application/x-peek-tab';
let activeDragPaths = []; // Fallback in-memory drag payload if OS drag or DOM dataTransfer strips custom MIME

function hasSupportedDrop(types) {
  if (activeDragPaths && activeDragPaths.length > 0) return true;
  if (!types) return false;
  return types.includes(MIME_PATHS) || types.includes('Files');
}

let dragGhostEl = null;
function setCustomDragGhost(e, paths, primaryName) {
  try {
    if (!dragGhostEl) {
      dragGhostEl = document.createElement('div');
      dragGhostEl.className = 'peek-drag-ghost';
      document.body.appendChild(dragGhostEl);
    }
    const count = paths.length;
    dragGhostEl.innerHTML = count > 1
      ? `<span class="dg-badge">${count}</span><span class="dg-text">Moving ${count} items (${primaryName}…)</span>`
      : `<span class="dg-ico">📦</span><span class="dg-text">Move "${primaryName}"</span>`;
    e.dataTransfer.setDragImage(dragGhostEl, 14, 14);
  } catch (_) {}
}

function beginItemDrag(e, it, rowEl) {
  cancelPendingRename();
  if (!selected.has(it.path)) selectClick(it, rowEl, null);
  const paths = [...selected.keys()];
  if (!paths.length) paths.push(it.path);
  activeDragPaths = paths;
  e.dataTransfer.setData(MIME_PATHS, JSON.stringify(paths));
  e.dataTransfer.setData('text/plain', paths.join('\r\n'));
  e.dataTransfer.effectAllowed = 'copyMove';
  setCustomDragGhost(e, paths, it.name);
  rowEl.classList.add('dragging-item');
  // Note: Only invoke Electron's native OS shell startDrag when holding Alt (to drag out to Desktop / external apps),
  // because calling webContents.startDrag unconditionally on Windows aborts in-app HTML5 dragover/drop events!
  if (e.altKey && window.api && window.api.startDrag) {
    window.api.startDrag(paths);
  }
}

window.addEventListener('dragend', () => {
  activeDragPaths = [];
  for (const el of document.querySelectorAll('.dragging-item, .drop-target')) {
    el.classList.remove('dragging-item', 'drop-target');
  }
});

// Auto-scroll #list or .map-room-body when dragging near top/bottom edges
document.addEventListener('dragover', e => {
  if (!hasSupportedDrop(e.dataTransfer?.types)) return;
  const scrollHost = e.target.closest?.('.map-room-body, #list, #spList, #nav');
  if (!scrollHost) return;
  const r = scrollHost.getBoundingClientRect();
  const edge = 38;
  if (e.clientY - r.top < edge && scrollHost.scrollTop > 0) {
    scrollHost.scrollTop -= Math.ceil((edge - (e.clientY - r.top)) * 0.45);
  } else if (r.bottom - e.clientY < edge) {
    scrollHost.scrollTop += Math.ceil((edge - (r.bottom - e.clientY)) * 0.45);
  }
});

function normPath(p) {
  return String(p || '').replace(/[\\/]+$/, '').toLowerCase();
}

function wireDropTarget(el, getTargetDir, onHoverExpand = null) {
  let hoverTimer = null;
  el.addEventListener('dragover', e => {
    if (!hasSupportedDrop(e.dataTransfer.types)) return;
    const dest = getTargetDir();
    if (!dest || dest === HOME_URI || dest.startsWith('peek://')) return;
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    if (!el.classList.contains('drop-target')) el.classList.add('drop-target');
    if (onHoverExpand && !hoverTimer) hoverTimer = setTimeout(() => { hoverTimer = null; onHoverExpand(); }, 550);
  });
  el.addEventListener('dragleave', e => {
    // Do NOT remove .drop-target or cancel hoverTimer when moving across child elements (.ico, .nm, .c-date, etc.) inside el!
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    el.classList.remove('drop-target');
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
  });
  el.addEventListener('drop', async e => {
    el.classList.remove('drop-target');
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    if (!hasSupportedDrop(e.dataTransfer.types)) return;
    const dest = getTargetDir();
    if (!dest || dest === HOME_URI || dest.startsWith('peek://')) return;
    e.preventDefault(); e.stopPropagation();
    let srcs = [];
    if (e.dataTransfer.types.includes(MIME_PATHS)) {
      try { srcs = JSON.parse(e.dataTransfer.getData(MIME_PATHS) || '[]'); } catch {}
    }
    if ((!srcs || !srcs.length) && activeDragPaths.length) {
      srcs = [...activeDragPaths];
    }
    // Also extract native OS files (from Windows Explorer / Desktop / external apps)
    if ((!srcs || !srcs.length) && e.dataTransfer.files && e.dataTransfer.files.length) {
      for (const f of e.dataTransfer.files) {
        let p = '';
        if (window.api && window.api.getPathForFile) {
          try { p = window.api.getPathForFile(f); } catch {}
        }
        if (!p && f.path) p = f.path;
        if (p) srcs.push(p);
      }
    }
    activeDragPaths = [];
    if (!srcs.length) return;
    const op = e.ctrlKey ? 'copy' : 'cut';
    const normDest = normPath(dest);
    // Filter out no-op drops (dropping a file into the folder it's already in, or dropping a folder onto itself)
    const validSrcs = srcs.filter(s => {
      const ns = normPath(s);
      if (!ns || ns === normDest) return false;
      if (op === 'cut' && normPath(parent(s)) === normDest) return false;
      return true;
    });
    if (!validSrcs.length) return;

    const r = await window.api.paste(op, validSrcs, dest);
    if (r.moved && r.moved.length) {
      undoStack.push({ type: 'move', ops: r.moved.map(m => ({ from: m.to, to: m.from.slice(0, m.from.lastIndexOf('\\')) })) });
      $('status').textContent = `✓ Moved ${r.moved.length} item${r.moved.length > 1 ? 's' : ''} → "${baseName(dest)}" (Ctrl+Z to undo)`;
    } else if (op === 'copy') {
      $('status').textContent = `✓ Copied ${validSrcs.length - (r.skipped?.length || 0)} item(s) → "${baseName(dest)}"`;
    }
    if (r.skipped && r.skipped.length) alert('Skipped (already exists or invalid):\n' + r.skipped.join('\n'));
    show();
    if (splitState.active) renderSplitPane();
  });
}

async function renderDir(dir, depth, container, parentCell = null) {
  const res = await window.api.list(dir);
  if (res.error) { container.appendChild(msg('(' + res.error + ')', depth)); return 0; }
  const items = sortItems(res.items);
  if (!items.length) { container.appendChild(msg('(empty)', depth)); return 0; }

  if (depth === 0 && groupKey !== 'none') {
    const groups = new Map();
    for (const it of items) {
      const g = groupLabelFor(it);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(it);
    }
    for (const [gName, gItems] of groups) {
      const gh = document.createElement('div'); gh.className = 'grp-head';
      gh.innerHTML = `<span class="grp-arrow">▾</span><span>${gName} (${gItems.length})</span>`;
      const gb = document.createElement('div'); gb.className = 'grp-body';
      gh.onclick = () => {
        const col = gb.classList.toggle('collapsed');
        gh.querySelector('.grp-arrow').textContent = col ? '▸' : '▾';
      };
      for (const it of gItems) gb.append(...makeItem(it, depth, parentCell));
      container.append(gh, gb);
    }
  } else {
    for (const it of items) container.append(...makeItem(it, depth, parentCell));
  }
  applyFilter();
  return items.length;
}

function makeItem(it, depth, parentCell = null) {
  const cell = document.createElement('div'); cell.className = 'row item';
  cell.dataset.isDir = it.isDir ? '1' : '0';
  cell.draggable = true;
  cell._item = it;
  cell._parentCell = parentCell;
  const kids = document.createElement('div'); kids.className = 'kids';
  cell._kids = kids;
  if (isGrid()) kids.style.marginLeft = '12px';
  const pad = isGrid() ? '' : `style="padding-left:${depth * 18}px"`;
  const szText = it.isDir ? (folderSizeCache.has(it.path) ? fmtSize(folderSizeCache.get(it.path)) : '') : fmtSize(it.size);

  cell.innerHTML = `<span class="c-name" ${pad}><input type="checkbox" class="chk"><span class="arrow ${it.isDir ? '' : 'empty'}">▸</span><img class="ico"><span class="nm"></span></span>` +
    `<span class="c-date">${fmtDate(it.mtime)}</span><span class="c-type">${typeOf(it)}</span><span class="c-size">${szText}</span>` +
    `<span class="sub">${typeOf(it)}${szText ? ' · ' + szText : ''}<br>${fmtDate(it.mtime)}</span>`;
  const nmEl = cell.querySelector('.nm');
  nmEl.textContent = displayName(it);
  cell.title = it.name;
  const ico = cell.querySelector('.ico');
  if (PX[mode] > 24) ico.classList.add('photo');
  setIcon(ico, it);

  const chk = cell.querySelector('.chk');
  chk.addEventListener('click', e => {
    e.stopPropagation();
    setRowSelected(it, cell, chk.checked);
    anchorPath = it.path; focusedPath = it.path;
    updateStatus();
  });

  if (selected.has(it.path)) { cell.classList.add('sel'); chk.checked = true; selected.set(it.path, { item: it, cell }); }

  // Hold-down on already-selected row triggers inline rename unless moved or dragged
  let holdTimer = null, holdStartX = 0, holdStartY = 0;
  cell.addEventListener('mousedown', e => {
    if (e.button !== 0 || e.target.closest('.arrow') || e.target.tagName === 'INPUT') return;
    clearTimeout(holdTimer);
    holdStartX = e.clientX; holdStartY = e.clientY;
    const wasSelected = selected.size === 1 && selected.has(it.path) && !e.ctrlKey && !e.shiftKey;
    if (holdRenameEnabled && wasSelected) {
      holdTimer = setTimeout(() => {
        holdTimer = null;
        startRename(it, cell);
      }, holdRenameDelay);
    }
  });
  const clearHold = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } };
  cell.addEventListener('mousemove', e => {
    if (holdTimer && Math.hypot(e.clientX - holdStartX, e.clientY - holdStartY) > 3) clearHold();
  });
  cell.addEventListener('mouseup', clearHold);
  cell.addEventListener('mouseleave', clearHold);
  cell.addEventListener('dragstart', clearHold);

  // Click + native Explorer slow-second-click on label to rename
  cell.addEventListener('click', e => {
    e.stopPropagation();
    const now = Date.now();
    const wasOnlySelected = selected.size === 1 && selected.has(it.path) && !e.ctrlKey && !e.shiftKey;
    const clickedLabel = e.target.classList && e.target.classList.contains('nm');
    selectClick(it, cell, e);
    if (wasOnlySelected && clickedLabel && lastClickPath === it.path && (now - lastClickTime) > 450 && (now - lastClickTime) < 1800) {
      cancelPendingRename();
      slowRenameTimer = setTimeout(() => { slowRenameTimer = null; startRename(it, cell); }, 260);
    }
    lastClickPath = it.path;
    lastClickTime = now;
  });

  cell.addEventListener('contextmenu', e => {
    e.preventDefault(); e.stopPropagation();
    cancelPendingRename(); clearHold();
    if (!selected.has(it.path)) selectClick(it, cell, null);
    showMenu(e.clientX, e.clientY, it);
  });
  cell.addEventListener('dblclick', () => {
    cancelPendingRename(); clearHold();
    it.isDir ? go(it.path) : window.api.open(it.path);
  });
  // Middle-click folder opens it in a new tab (Shift+Middle-click switches immediately; plain middle-click opens in background tab!)
  cell.addEventListener('auxclick', e => {
    if (e.button === 1 && it.isDir) {
      e.preventDefault(); e.stopPropagation();
      newTab(it.path, [], e.shiftKey);
    }
  });
  cell.addEventListener('dragstart', e => beginItemDrag(e, it, cell));

  if (it.isDir) {
    const a = cell.querySelector('.arrow');
    const open = async () => { a.textContent = '▾'; await renderDir(it.path, depth + 1, kids, cell); };
    cell._expand = async () => {
      if (expanded.has(it.path)) return;
      expanded.add(it.path); kids.classList.add('open'); await open(); persist();
    };
    cell._collapse = () => {
      if (!expanded.has(it.path)) return;
      expanded.delete(it.path); kids.innerHTML = ''; kids.classList.remove('open'); a.textContent = '▸'; persist();
    };
    a.addEventListener('click', async e => {
      e.stopPropagation();
      if (expanded.has(it.path)) cell._collapse();
      else await cell._expand();
    });
    wireDropTarget(cell, () => it.path, () => cell._expand());
    wireDropTarget(kids, () => it.path);
    if (expanded.has(it.path)) { kids.classList.add('open'); open(); }
  }
  return [cell, kids];
}

// ---- Home Dashboard (`peek://home`) ----
function renderHomeDashboard(container) {
  const wrap = document.createElement('div'); wrap.className = 'dash';

  const head = document.createElement('div'); head.className = 'dash-head';
  head.innerHTML = `<h2>🏠 Home Dashboard</h2><div style="display:flex;align-items:center;gap:8px"><span style="color:var(--muted)">New tab (+) opens:</span><select id="newTabPref"><option value="home">Home Dashboard</option><option value="userHome">User Home Folder</option><option value="duplicate">Duplicate Current Tab</option></select></div>`;
  const prefSel = head.querySelector('#newTabPref');
  prefSel.value = newTabTarget;
  prefSel.onchange = e => { newTabTarget = e.target.value; persist(); };
  wrap.appendChild(head);

  // 1. Drives with free space bars
  const driveSec = document.createElement('div'); driveSec.className = 'dash-sec';
  driveSec.innerHTML = `<h3>This PC — Drives</h3><div class="dash-grid"></div>`;
  const driveGrid = driveSec.querySelector('.dash-grid');
  for (const d of cachedPlaces.drives) {
    const used = d.total > 0 ? d.total - d.free : 0;
    const pct = d.total > 0 ? Math.round((used / d.total) * 100) : 0;
    const card = document.createElement('div'); card.className = 'dash-card';
    card._item = { path: d.path, name: `Local Disk (${d.name.replace('\\', '')})`, isDir: true, size: d.total };
    card.innerHTML = `<img class="ico"><div class="dc-info"><div class="dc-title">Local Disk (${d.name.replace('\\', '')})</div><div class="dc-sub">${d.total ? `${fmtSize(d.free)} free of ${fmtSize(d.total)}` : d.path}</div>${d.total ? `<div class="drive-bar"><i style="width:${pct}%"></i></div>` : ''}</div>`;
    setIcon(card.querySelector('img'), { path: d.path, name: d.name, isDir: true }, 32, true);
    if (selected.has(d.path)) card.classList.add('sel');
    card.onclick = e => { e.stopPropagation(); selectClick(card._item, card, e); };
    card.ondblclick = e => { e.stopPropagation(); go(d.path); };
    card.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); selectClick(card._item, card, null); showMenu(e.clientX, e.clientY, card._item); };
    card.addEventListener('auxclick', e => { if (e.button === 1) newTab(d.path, [], e.shiftKey); });
    wireDropTarget(card, () => d.path);
    driveGrid.appendChild(card);
  }
  wrap.appendChild(driveSec);

  // 2. Bookmarks (if any) + Quick Access Pins
  const pins = (cachedPlaces.cachedPins && cachedPlaces.cachedPins.length) ? cachedPlaces.cachedPins : cachedPlaces.places;
  const pinSec = document.createElement('div'); pinSec.className = 'dash-sec';
  pinSec.innerHTML = `<h3>Quick Access Pins (${pins.length})</h3><div class="dash-grid"></div>`;
  const pinGrid = pinSec.querySelector('.dash-grid');
  for (const p of pins) {
    const card = document.createElement('div'); card.className = 'dash-card';
    card._item = { path: p.path, name: p.name, isDir: true };
    card.innerHTML = `<img class="ico"><div class="dc-info"><div class="dc-title"></div><div class="dc-sub"></div></div>`;
    card.querySelector('.dc-title').textContent = p.name;
    card.querySelector('.dc-sub').textContent = p.path;
    card.title = p.path + ' (Click to select · Double-click to open · Middle-click for new tab)';
    setIcon(card.querySelector('img'), { path: p.path, name: p.name, isDir: true }, 32, true);
    if (selected.has(p.path)) card.classList.add('sel');
    card.onclick = e => { e.stopPropagation(); selectClick(card._item, card, e); };
    card.ondblclick = e => { e.stopPropagation(); go(p.path); };
    card.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); selectClick(card._item, card, null); showMenu(e.clientX, e.clientY, card._item); };
    card.addEventListener('auxclick', e => { if (e.button === 1) newTab(p.path, [], e.shiftKey); });
    wireDropTarget(card, () => p.path);
    pinGrid.appendChild(card);
  }
  wrap.appendChild(pinSec);

  // 3. Script Connections (also accepts drag-and-drop!)
  const scSec = document.createElement('div'); scSec.className = 'dash-sec';
  scSec.innerHTML = `<h3><span>⚡ Script Connections (${scripts.length}) — drag scripts here or onto the ⚡ Scripts button</span><button class="dash-btn" id="dashAddScript">+ Connect Script…</button></h3><div class="dash-grid"></div>`;
  scSec.querySelector('#dashAddScript').onclick = () => addScriptConnection();
  wireScriptDrop(scSec);
  const scGrid = scSec.querySelector('.dash-grid');
  if (!scripts.length) {
    const empty = document.createElement('div'); empty.style.color = 'var(--muted)';
    empty.textContent = 'No scripts connected yet. Drag any script onto the "⚡ Scripts" toolbar button (or here), click "+ Connect Script…", or right-click a script file.';
    scSec.appendChild(empty);
  } else {
    scripts.forEach((sc, idx) => {
      const card = document.createElement('div'); card.className = 'dash-card';
      card.innerHTML = `<span style="font-size:20px">⚡</span><div class="dc-info"><div class="dc-title"></div><div class="dc-sub"></div></div><button class="dc-del" title="Remove script shortcut">×</button>`;
      card.querySelector('.dc-title').textContent = sc.name;
      card.querySelector('.dc-sub').textContent = sc.path;
      card.title = `Click to run: ${sc.path}`;
      card.onclick = () => triggerScript(sc);
      card.querySelector('.dc-del').onclick = e => {
        e.stopPropagation();
        scripts.splice(idx, 1);
        persist(); show();
      };
      scGrid.appendChild(card);
    });
  }
  wrap.appendChild(scSec);

  // 4. Recent Folders
  if (recentFolders.length) {
    const recSec = document.createElement('div'); recSec.className = 'dash-sec';
    recSec.innerHTML = `<h3>Recent Folders</h3><div class="dash-grid"></div>`;
    const recGrid = recSec.querySelector('.dash-grid');
    for (const rp of recentFolders.slice(0, 12)) {
      const card = document.createElement('div'); card.className = 'dash-card';
      card._item = { path: rp, name: baseName(rp), isDir: true };
      card.innerHTML = `<img class="ico"><div class="dc-info"><div class="dc-title"></div><div class="dc-sub"></div></div>`;
      card.querySelector('.dc-title').textContent = baseName(rp);
      card.querySelector('.dc-sub').textContent = rp;
      card.title = rp + ' (Click to select · Double-click to open · Middle-click for new tab)';
      setIcon(card.querySelector('img'), { path: rp, name: baseName(rp), isDir: true }, 32, false);
      if (selected.has(rp)) card.classList.add('sel');
      card.onclick = e => { e.stopPropagation(); selectClick(card._item, card, e); };
      card.ondblclick = e => { e.stopPropagation(); go(rp); };
      card.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); selectClick(card._item, card, null); showMenu(e.clientX, e.clientY, card._item); };
      card.addEventListener('auxclick', e => { if (e.button === 1) newTab(rp, [], e.shiftKey); });
      recGrid.appendChild(card);
    }
    wrap.appendChild(recSec);
  }

  wrap.addEventListener('mousedown', e => {
    if (e.target.closest('.dash-card') || e.target.closest('button') || e.target.closest('select')) return;
    clearSelection();
  });

  container.appendChild(wrap);
}

// ---- Script Connections Runner + Drag-and-Drop onto ⚡ Scripts Button ----
async function addScriptConnection(fileObj = null) {
  const picked = fileObj || await window.api.pickScript();
  if (!picked) return;
  if (!scripts.some(s => s.path.toLowerCase() === picked.path.toLowerCase())) {
    scripts.push({ name: picked.name, path: picked.path });
    persist();
    if (cur === HOME_URI) show();
    $('status').textContent = `⚡ Connected script: ${picked.name} (${picked.path})`;
  } else {
    $('status').textContent = `⚡ Script already connected: ${picked.name}`;
  }
}
function wireScriptDrop(el) {
  el.addEventListener('dragover', e => {
    const hasInternal = e.dataTransfer.types.includes(MIME_PATHS);
    const hasFiles = e.dataTransfer.types.includes('Files');
    if (!hasInternal && !hasFiles) return;
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = 'link';
    el.classList.add('drop-target');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
  el.addEventListener('drop', async e => {
    el.classList.remove('drop-target');
    e.preventDefault(); e.stopPropagation();
    let paths = [];
    if (e.dataTransfer.types.includes(MIME_PATHS)) {
      paths = JSON.parse(e.dataTransfer.getData(MIME_PATHS) || '[]');
    } else if (e.dataTransfer.files && e.dataTransfer.files.length) {
      paths = [...e.dataTransfer.files].map(f => f.path).filter(Boolean);
    }
    if (!paths.length) return;
    let added = 0;
    for (const p of paths) {
      const nm = baseName(p).replace(/\.[^.]+$/, '') || baseName(p);
      if (!scripts.some(s => s.path.toLowerCase() === p.toLowerCase())) {
        scripts.push({ name: nm, path: p });
        added++;
      }
    }
    persist();
    if (cur === HOME_URI) show();
    $('status').textContent = added
      ? `⚡ Added ${added} script connection${added > 1 ? 's' : ''}!`
      : `⚡ Script already in Script Connections`;
    if (el === $('scriptsBtn')) openScriptsMenu();
  });
}
async function triggerScript(sc) {
  const targets = [...selected.keys()];
  $('status').textContent = `⚡ Running "${sc.name}"…`;
  const res = await window.api.runScript(sc.path, cur, targets);
  const out = [res.stdout, res.stderr].filter(Boolean).join('\n\n');
  if (out) alert(`⚡ ${sc.name} (exit ${res.code}):\n\n${out.slice(0, 3500)}`);
  show();
}
function openScriptsMenu() {
  const r = $('scriptsBtn').getBoundingClientRect();
  fillMenu([
    ...(scripts.length ? scripts.map(sc => ({
      label: `⚡  Run: ${sc.name}`,
      run: () => triggerScript(sc)
    })) : [{ label: '(no scripts connected yet — drag a script onto ⚡ Scripts)', disabled: true }]),
    '-',
    { label: '+ Connect a script (.ps1, .bat, .py, .js)…', run: () => addScriptConnection() },
    ...(scripts.length ? [{ label: 'Manage scripts on Home Dashboard', run: () => go(HOME_URI) }] : [])
  ]);
  placeMenu(r.left, r.bottom + 2);
}
$('scriptsBtn').onclick = e => {
  e.stopPropagation();
  openScriptsMenu();
};
wireScriptDrop($('scriptsBtn'));
wireDropTarget($('list'), () => cur);

function initTerminalDrawer() {
  const drawer = $('termDrawer');
  const btn = $('termBtn');
  if (!drawer || !btn) return;

  const logsEl = $('termDrawerBody');
  const inputEl = $('termDrawerInput');
  const promptEl = $('termDrawerPrompt');
  const shellSel = $('termDrawerShell');
  let currentShell = 'powershell';

  const toggleDrawer = (show) => {
    const isVisible = drawer.style.display !== 'none';
    const next = show !== undefined ? show : !isVisible;
    drawer.style.display = next ? 'flex' : 'none';
    btn.classList.toggle('active', next);
    if (next) inputEl.focus();
  };

  btn.onclick = e => {
    e.stopPropagation();
    const r = btn.getBoundingClientRect();
    fillMenu([
      { label: '📟 Toggle Terminal Drawer (In-App)', run: () => toggleDrawer() },
      { label: '🗺️ Spawn Terminal Island (Landscape)', run: () => {
        if (typeof window.__spawnTerminalIsland === 'function') {
          window.__spawnTerminalIsland(cur, baseName(cur));
        } else {
          openFolderInLandscape(cur).then(() => {
            if (typeof window.__spawnTerminalIsland === 'function') window.__spawnTerminalIsland(cur, baseName(cur));
          });
        }
      }},
      '-',
      { label: '🖥️ Open PowerShell (External Window)', run: () => window.api.openTerminal(cur, 'powershell') },
      { label: '⌨️ Open CMD (External Window)', run: () => window.api.openTerminal(cur, 'cmd') }
    ]);
    placeMenu(r.left, r.bottom + 2);
  };

  $('termDrawerClose').onclick = () => toggleDrawer(false);
  $('termDrawerClear').onclick = () => {
    logsEl.innerHTML = `<div class="term-line term-sys">Terminal cleared.</div>`;
  };
  $('termDrawerPopout').onclick = () => {
    window.api.openTerminal(cur, currentShell);
  };

  shellSel.onchange = () => {
    currentShell = shellSel.value;
    promptEl.textContent = currentShell === 'cmd' ? 'CMD>' : 'PS>';
    inputEl.focus();
  };

  const runDrawerCmd = async () => {
    const cmdText = inputEl.value.trim();
    if (!cmdText) return;
    inputEl.value = '';

    const inLine = document.createElement('div');
    inLine.className = 'term-line term-in';
    inLine.textContent = `${promptEl.textContent} ${cmdText}`;
    logsEl.appendChild(inLine);

    const res = await window.api.runTerminalCmd({ shell: currentShell, cmd: cmdText, cwd: cur });
    if (res.stdout) {
      const outLine = document.createElement('div');
      outLine.className = 'term-line term-out';
      outLine.textContent = res.stdout;
      logsEl.appendChild(outLine);
    }
    if (res.stderr) {
      const errLine = document.createElement('div');
      errLine.className = 'term-line term-err';
      errLine.textContent = res.stderr;
      logsEl.appendChild(errLine);
    }
    logsEl.scrollTop = logsEl.scrollHeight;
    inputEl.focus();
  };

  inputEl.onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runDrawerCmd();
    }
  };
}
initTerminalDrawer();

// ---- Rubber-band drag selection on empty space in #list ----
(() => {
  let startX = 0, startY = 0, dragging = false, basePaths = new Set();
  const listEl = $('list'), rub = $('rubber'), contentEl = $('content');
  listEl.addEventListener('mousedown', e => {
    if (mode === 'landscape' || mode === 'lens' || cur === HOME_URI || e.button !== 0 || e.target.closest('.row.item') || e.target.closest('.room-item') || e.target.closest('.arrow') || e.target.closest('.grp-head') || e.target.closest('.dash')) return;
    hideMenu();
    const cr = contentEl.getBoundingClientRect();
    startX = e.clientX - cr.left; startY = e.clientY - cr.top;
    dragging = false;
    basePaths = e.ctrlKey ? new Set(selected.keys()) : new Set();
    if (!e.ctrlKey && !e.shiftKey) clearSelection();

    const onMove = ev => {
      const curX = ev.clientX - cr.left, curY = ev.clientY - cr.top;
      if (!dragging && Math.hypot(curX - startX, curY - startY) < 4) return;
      dragging = true;
      const x1 = Math.min(startX, curX), y1 = Math.min(startY, curY);
      const x2 = Math.max(startX, curX), y2 = Math.max(startY, curY);
      rub.style.display = 'block';
      rub.style.left = x1 + 'px'; rub.style.top = y1 + 'px';
      rub.style.width = (x2 - x1) + 'px'; rub.style.height = (y2 - y1) + 'px';
      const rr = rub.getBoundingClientRect();
      for (const row of visibleRows()) {
        const br = row.getBoundingClientRect();
        const hit = !(br.right < rr.left || br.left > rr.right || br.bottom < rr.top || br.top > rr.bottom);
        setRowSelected(row._item, row, hit || basePaths.has(row._item.path));
      }
      updateStatus();
    };
    const onUp = () => {
      rub.style.display = 'none';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
})();

// ---- Breadcrumb address bar ----
let justStartedAddrEdit = false;
function updateAddrIcon() {
  const ico = $('addrIcon');
  if (!ico) return;
  if (cur === HOME_URI) ico.textContent = '🏠';
  else if (cur.startsWith('peek://gluon')) ico.textContent = '🧬';
  else if (/^[A-Za-z]:[\\/]*$/.test(cur)) ico.textContent = '💾';
  else if (cur.startsWith('\\\\')) ico.textContent = '🌐';
  else ico.textContent = '📁';
  ico.title = `${cur} · Click to edit or copy path`;
}

function startAddressEdit() {
  $('addrWrap').classList.add('editing');
  $('address').value = cur;
  $('address').placeholder = 'Enter folder path, UNC share, or peek://...';
  justStartedAddrEdit = true;
  requestAnimationFrame(() => {
    $('address').focus();
    $('address').select();
    setTimeout(() => { justStartedAddrEdit = false; }, 200);
  });
}
function stopAddressEdit() {
  $('addrWrap').classList.remove('editing');
  updateAddrIcon();
}
function renderCrumbs() {
  const bar = $('crumbs'); bar.innerHTML = '';
  const homeCrumb = document.createElement('span'); homeCrumb.className = 'crumb';
  homeCrumb.textContent = '🏠 Home';
  homeCrumb.onclick = e => { e.stopPropagation(); go(HOME_URI); };
  homeCrumb.addEventListener('auxclick', e => { if (e.button === 1) { e.stopPropagation(); newTab(HOME_URI, [], e.shiftKey); } });
  bar.appendChild(homeCrumb);

  if (cur === HOME_URI) return;
  if (cur.startsWith('peek://gluon')) {
    const firstSep = document.createElement('span'); firstSep.className = 'crumb-sep'; firstSep.textContent = '›';
    bar.appendChild(firstSep);
    const gBtn = document.createElement('span'); gBtn.className = 'crumb'; gBtn.textContent = '🧬 Gluon';
    gBtn.onclick = e => { e.stopPropagation(); go('peek://gluon'); };
    bar.appendChild(gBtn);
    const sub = cur.replace('peek://gluon', '').replace(/^\/+/, '').toUpperCase();
    if (sub) {
      const sep = document.createElement('span'); sep.className = 'crumb-sep'; sep.textContent = '›';
      const sBtn = document.createElement('span'); sBtn.className = 'crumb'; sBtn.textContent = sub;
      bar.append(sep, sBtn);
    }
    return;
  }
  const firstSep = document.createElement('span'); firstSep.className = 'crumb-sep'; firstSep.textContent = '›';
  bar.appendChild(firstSep);

  const isUnc = cur.startsWith('\\\\');
  const clean = cur.replace(/[\\/]+$/, '');
  const segs = [];
  if (isUnc) {
    const rawParts = clean.slice(2).split(/[\\/]/).filter(Boolean);
    if (rawParts.length) {
      let acc = '\\\\' + rawParts[0];
      segs.push({ name: '\\\\' + rawParts[0], path: acc });
      for (let i = 1; i < rawParts.length; i++) {
        acc += '\\' + rawParts[i];
        segs.push({ name: rawParts[i], path: acc });
      }
    }
  } else {
    const parts = clean.split(/[\\/]/).filter(Boolean);
    let acc = '';
    parts.forEach((part, idx) => {
      acc = idx === 0 ? part + '\\' : (acc.endsWith('\\') ? acc + part : acc + '\\' + part);
      segs.push({ name: part, path: acc });
    });
  }

  segs.forEach(({ name: part, path: segPath }) => {
    const btn = document.createElement('span'); btn.className = 'crumb';
    btn.textContent = part;
    btn.title = segPath + ' (Middle-click for new tab)';
    btn.onclick = e => { e.stopPropagation(); go(segPath); };
    btn.addEventListener('auxclick', e => { if (e.button === 1) { e.stopPropagation(); newTab(segPath, [], e.shiftKey); } });
    wireDropTarget(btn, () => segPath);
    bar.appendChild(btn);

    const sep = document.createElement('span'); sep.className = 'crumb-sep'; sep.textContent = '›';
    sep.title = 'Show folders inside ' + part;
    sep.onclick = async e => {
      e.stopPropagation();
      const r = sep.getBoundingClientRect();
      fillMenu([{ label: 'Loading folders…', disabled: true }]); placeMenu(r.left, r.bottom + 2);
      const res = await window.api.list(segPath);
      const dirs = sortItems((res.items || []).filter(i => i.isDir));
      fillMenu(dirs.length ? dirs.map(d => ({ label: '📁  ' + d.name, run: () => go(d.path) })) : [{ label: '(no subfolders)', disabled: true }]);
      placeMenu(r.left, r.bottom + 2);
    };
    bar.appendChild(sep);
  });
}

// Address Bar Interactions: instant mousedown activation, left icon click, history dropdown, and context menu
(() => {
  const addrWrapEl = $('addrWrap');
  if (addrWrapEl) {
    addrWrapEl.addEventListener('mousedown', e => {
      // Do not trigger if clicking on individual crumb buttons, dropdown chevrons, or the history button
      if (e.target.closest('.crumb') || e.target.closest('.crumb-sep') || e.target.closest('#addrHistBtn')) return;
      if (!addrWrapEl.classList.contains('editing')) {
        e.preventDefault();
        startAddressEdit();
      }
    });

    addrWrapEl.addEventListener('contextmenu', e => {
      if (e.target === $('address') && addrWrapEl.classList.contains('editing')) return;
      e.preventDefault();
      e.stopPropagation();
      fillMenu([
        { label: '📝  Edit address', run: () => startAddressEdit() },
        { label: '📋  Copy address', run: () => navigator.clipboard.writeText(cur) },
        { label: '📋  Copy address as text', run: () => navigator.clipboard.writeText(cur) },
        '-',
        { label: '⟳  Refresh (F5)', run: () => refreshKeep() }
      ]);
      placeMenu(e.clientX, e.clientY);
    });
  }

  const addrIconEl = $('addrIcon');
  if (addrIconEl) {
    addrIconEl.addEventListener('click', e => {
      e.stopPropagation();
      startAddressEdit();
    });
  }

  const addrHistBtn = $('addrHistBtn');
  if (addrHistBtn) {
    addrHistBtn.addEventListener('click', e => {
      e.stopPropagation();
      const r = addrHistBtn.getBoundingClientRect();
      const histItems = [];
      if (recentFolders && recentFolders.length) {
        histItems.push({ label: 'Recent Locations', disabled: true });
        for (const f of recentFolders.slice(0, 10)) {
          if (!f) continue;
          histItems.push({
            label: (f === HOME_URI ? '🏠 Home' : (f.startsWith('peek://gluon') ? '🧬 ' + baseName(f) : '📁 ' + f)),
            run: () => go(f)
          });
        }
        histItems.push('-');
      }
      histItems.push(
        { label: '🏠  Home Dashboard', run: () => go(HOME_URI) },
        { label: '🧬  Semantic Gluons', run: () => go('peek://gluon') },
        '-',
        { label: '📋  Copy current path', run: () => navigator.clipboard.writeText(cur) }
      );
      fillMenu(histItems);
      placeMenu(Math.max(10, r.right - 260), r.bottom + 2);
    });
  }

  $('crumbs').addEventListener('click', e => {
    if (e.target === $('crumbs')) startAddressEdit();
  });
})();

// ---- Landscape & Edge-Lens Mode: Multi-Folder Rooms/Islands Connected by Bridges + Two-Rectangle Edge Lens ----
async function renderLandscape(dir, container, onNavigate = go, startZoomedIn = false) {
  container.innerHTML = '';
  container.className = 'v-landscape';

  if (!landscapeLayout[dir]) landscapeLayout[dir] = { rooms: {}, fileSz: 44, globalView: 'tiles' };
  const layout = landscapeLayout[dir];
  if (!layout.rooms) layout.rooms = {};
  let globalView = layout.globalView || 'tiles';
  let indoorFileSz = layout.fileSz || 44;
  container.style.setProperty('--file-sz', indoorFileSz + 'px');

  const viewport = document.createElement('div'); viewport.className = 'landscape-viewport';
  container.appendChild(viewport);

  const world = document.createElement('div'); world.className = 'map-world';
  const svgNS = 'http://www.w3.org/2000/svg';
  const bridgeSvg = document.createElementNS(svgNS, 'svg');
  bridgeSvg.setAttribute('class', 'map-bridges');
  bridgeSvg.setAttribute('viewBox', '-10000 -10000 20000 20000');
  world.appendChild(bridgeSvg);

  const innerFrame = document.createElement('div'); innerFrame.className = 'lens-inner-frame';
  const marginLayer = document.createElement('div'); marginLayer.className = 'lens-margin-layer';
  const marqueeEl = document.createElement('div'); marqueeEl.className = 'landscape-marquee';
  const hud = document.createElement('div'); hud.className = 'map-hud';
  const radarWrap = document.createElement('div'); radarWrap.className = 'landscape-radar';
  radarWrap.innerHTML = `
    <div class="landscape-radar-head">
      <span>📡 TACTICAL RADAR</span>
      <span class="radar-count">0 rooms</span>
    </div>
    <canvas width="190" height="105" class="landscape-radar-canvas"></canvas>
  `;

  let camX = 0, camY = 0, camZoom = startZoomedIn ? 1.85 : 0.62;
  let edgeLensOn = true;
  let activeRoomPath = dir;

  hud.innerHTML = `
    <button data-act="world" title="Pull back to Multi-Folder World Map scale">🗺️ World</button>
    <button data-act="enter" title="Zoom/shrink into the active Room to inspect its indoor files">🔍 Enter Room</button>
    <button data-act="spawn-folder" title="Spawn any folder from disk as an Island in Landscape">➕ Spawn Folder</button>
    <button data-act="spawn-html" title="Render any HTML file inside Landscape as an interactive Viewer Island">🌐 Spawn HTML</button>
    <button data-act="reset" title="Re-pack all Rooms into a clean non-overlapping layout">⊞ Tidy Rooms</button>
    <button data-act="fitall" title="Auto-size all Rooms proportionally to their contents without overlapping">⤢ Auto-Size All</button>
    <label style="display:inline-flex;align-items:center;gap:4px;font-size:11px" title="Global view mode for all rooms in Landscape mode">
      Global View:
      <select data-hud="global-view" style="font-size:10px;padding:1px 4px;background:var(--input-bg);color:var(--fg);border:1px solid var(--input-bd);border-radius:3px;cursor:pointer">
        <option value="details" ${globalView === 'details' ? 'selected' : ''}>Details</option>
        <option value="tiles" ${globalView === 'tiles' ? 'selected' : ''}>Tiles</option>
        <option value="list" ${globalView === 'list' ? 'selected' : ''}>List</option>
        <option value="small" ${globalView === 'small' ? 'selected' : ''}>Small Icons</option>
        <option value="medium" ${globalView === 'medium' ? 'selected' : ''}>Medium Icons</option>
        <option value="large" ${globalView === 'large' ? 'selected' : ''}>Large Icons</option>
        <option value="xl" ${globalView === 'xl' ? 'selected' : ''}>Extra Large</option>
        <option value="content" ${globalView === 'content' ? 'selected' : ''}>Content</option>
      </select>
    </label>
    <button data-act="lens" class="${edgeLensOn ? 'active' : ''}" title="Toggle Two-Rectangle Edge Lens for far-away Rooms">🖼️ Edge Lens: ON</button>
    <button data-act="loupe" title="Toggle Magnifier Loupe (or Hold ${hotkeys.modLoupe || 'Ctrl+Shift'} · Scroll adjusts zoom)">🔎 Loupe</button>
    <span class="hud-coords" style="color:var(--muted);margin-left:2px">Scale: ${Math.round(camZoom * 100)}%</span>
  `;
  // Apply customized canvas background & atmosphere + 5+1 Mode Sub-Palette CSS Variables
  viewport.classList.remove('bg-disco', 'bg-dusco', 'bg-deep-dusco', 'bg-rainbow', 'bg-breathing');
  if (canvasReactMode) {
    if (landscapePalette === 'disco') viewport.classList.add('bg-disco');
    else if (landscapePalette === 'dusco') viewport.classList.add('bg-dusco');
    else if (landscapePalette === 'deep-dusco') viewport.classList.add('bg-deep-dusco');
    else if (landscapePalette === 'rainbow-sync' || landscapePalette === 'rainbow-async' || landscapePalette === 'rainbow-wave') viewport.classList.add('bg-rainbow');
    else if (landscapePalette === 'breathing' || landscapePalette === 'rain-puddle') viewport.classList.add('bg-breathing');
  }

  const activePalEntry = getActivePaletteEntry(landscapePalette);
  const activeColors = getActivePaletteColors(landscapePalette);
  const curPalIdx = getModePaletteIdx(landscapePalette);
  for (let i = 0; i < 7; i++) {
    const c = activeColors[i % activeColors.length] || defaultFrameColor;
    const floorHex = shiftColorShade(c, 'floor-bg');
    viewport.style.setProperty(`--c${i + 1}`, c);
    viewport.style.setProperty(`--bg${i + 1}`, colorToRgba(floorHex, roomBgOpacity / 100));
  }

  const effBreathRim = (curPalIdx < 5 && activePalEntry?.rim) ? activePalEntry.rim : (breathTargetColor || '#ffffff');
  const effBreathBg = (curPalIdx < 5 && activePalEntry?.bg) ? activePalEntry.bg : (breathTargetBgColor || '#334155');
  const effBreathGlow = (curPalIdx < 5 && activePalEntry?.glow) ? activePalEntry.glow : effBreathRim;

  viewport.style.setProperty('--breath-duration', `${breathingDuration || 6}s`);
  viewport.style.setProperty('--puddle-duration', `${puddleRippleDuration || 5}s`);
  viewport.style.setProperty('--breath-scale', `${breathScaleSize ?? 20}px`);
  viewport.style.setProperty('--breath-target', effBreathRim);
  viewport.style.setProperty('--breath-target-bg', colorToRgba(effBreathBg, roomBgOpacity / 100));
  viewport.style.setProperty('--breath-glow', colorToRgba(effBreathGlow, 0.8));
  viewport.style.setProperty('--breath-tile-bg', colorToRgba(effBreathRim, 0.2));
  viewport.style.setProperty('--room-glow-intensity', (roomGlowIntensity ?? 50) / 100);
  viewport.style.setProperty('--room-glow-range', `${roomGlowRange ?? 18}px`);
  viewport.style.setProperty('--active-room-border', activeRoomBorderColor);
  viewport.style.setProperty('--active-border-color', activeRoomBorderColor);
  viewport.style.setProperty('--active-room-glow', colorToRgba(activeRoomBorderColor, 0.45));
  document.documentElement.style.setProperty('--room-glow-intensity', (roomGlowIntensity ?? 50) / 100);
  document.documentElement.style.setProperty('--room-glow-range', `${roomGlowRange ?? 18}px`);
  document.documentElement.style.setProperty('--active-room-border', activeRoomBorderColor);

  if (landscapeBg === 'space') {
    viewport.style.background = 'radial-gradient(circle at center, #1e1b4b 0%, #030712 100%)';
  } else if (landscapeBg === 'plain') {
    viewport.style.background = 'var(--bg)';
  } else if (landscapeBg === 'custom-color' && landscapeBgColor) {
    viewport.style.background = landscapeBgColor;
  } else if (landscapeBg === 'custom-image' && landscapeBgImage) {
    viewport.style.background = `url('${landscapeBgImage.replace(/\\/g, '/')}') center/cover no-repeat`;
  } else {
    viewport.style.background = '';
  }

  const loupeEl = document.createElement('div');
  loupeEl.className = 'magnifier-loupe';
  loupeEl.id = 'landscapeLoupe';
  const loupeClone = document.createElement('div');
  loupeClone.className = 'loupe-world-clone';
  const loupeCross = document.createElement('div');
  loupeCross.className = 'loupe-crosshair';
  const loupeBadge = document.createElement('div');
  loupeBadge.className = 'loupe-badge';
  loupeBadge.textContent = '2.2×';
  loupeEl.append(loupeClone, loupeCross, loupeBadge);

  viewport.append(world, innerFrame, marginLayer, marqueeEl, hud, radarWrap, loupeEl);

  let loupeActive = false;
  let loupePinned = false;
  let loupeMag = 2.2;
  let lastLoupeMx = 400, lastLoupeMy = 260;
  const LOUPE_R = 105;

  function syncLoupeCloneDOM() {
    loupeClone.innerHTML = '';
    for (const child of world.children) {
      const cloned = child.cloneNode(true);
      if (child.classList && child.classList.contains('map-room')) {
        const srcBody = child.querySelector('.map-room-body');
        const dstBody = cloned.querySelector('.map-room-body');
        if (srcBody && dstBody) dstBody.scrollTop = srcBody.scrollTop;
      }
      loupeClone.appendChild(cloned);
    }
  }

  function updateLoupePosition() {
    if (!loupeActive) return;
    const rect = viewport.getBoundingClientRect();
    loupeEl.style.left = Math.round(lastLoupeMx - LOUPE_R) + 'px';
    loupeEl.style.top = Math.round(lastLoupeMy - LOUPE_R) + 'px';
    const wx = (lastLoupeMx - rect.width / 2 - camX) / camZoom;
    const wy = (lastLoupeMy - rect.height / 2 - camY) / camZoom;
    const effScale = +(camZoom * loupeMag).toFixed(3);
    const tx = Math.round(LOUPE_R - wx * effScale);
    const ty = Math.round(LOUPE_R - wy * effScale);
    loupeClone.style.transform = `translate(${tx}px, ${ty}px) scale(${effScale})`;
    loupeBadge.textContent = `${loupeMag.toFixed(1)}×`;
  }

  function setLoupeActive(activeState) {
    if (loupeActive === activeState) return;
    loupeActive = activeState;
    loupeEl.style.display = loupeActive ? 'block' : 'none';
    hud.querySelector('[data-act="loupe"]')?.classList.toggle('active', loupeActive);
    if (loupeActive) {
      syncLoupeCloneDOM();
      updateLoupePosition();
    } else {
      loupeClone.innerHTML = ''; // Immediately release cloned DOM nodes when Loupe closes
    }
  }

  if (window._onLoupeKeyDown) window.removeEventListener('keydown', window._onLoupeKeyDown);
  if (window._onLoupeKeyUp) window.removeEventListener('keyup', window._onLoupeKeyUp);
  window._onLoupeKeyDown = e => {
    if (!document.body.contains(viewport)) return;
    if (!loupeActive && matchesModifiers(e, 'modLoupe')) {
      setLoupeActive(true);
    }
  };
  window._onLoupeKeyUp = e => {
    if (loupePinned) return;
    if (loupeActive && !matchesModifiers(e, 'modLoupe')) {
      setLoupeActive(false);
    }
  };
  window.addEventListener('keydown', window._onLoupeKeyDown);
  window.addEventListener('keyup', window._onLoupeKeyUp);
  viewport.addEventListener('mousemove', e => {
    const rect = viewport.getBoundingClientRect();
    lastLoupeMx = e.clientX - rect.left;
    lastLoupeMy = e.clientY - rect.top;
    if (loupeActive) updateLoupePosition();
  });

  const roomMap = new Map(); // path -> { path, name, parentPath, x, y, w, h, ang, el, depth, subDirs, files }
  const htmlMap = new Map(); // path -> { path, name, x, y, w, h, el, isHtml: true }
  const fileViewerMap = new Map(); // path -> { path, name, x, y, w, h, el, isFileViewer: true }
  const browserMap = new Map();
  const terminalMap = new Map();
  const bridges = [];        // [{ fromPath, toPath }]
  const CORRIDOR_PAD = 34;   // Minimum gap between any two Room boxes so they NEVER overlap!

  function boxesOverlap(ax, ay, aw, ah, bx, by, bw, bh, pad = CORRIDOR_PAD) {
    return Math.abs(ax - bx) < (aw + bw) / 2 + pad && Math.abs(ay - by) < (ah + bh) / 2 + pad;
  }

  // Finds a guaranteed non-overlapping (x, y) position for a new Room of size (w, h)
  function findFreeRoomPos(prefX, prefY, w, h, parentX = 0, parentY = 0, prefAng = 0) {
    const all = [...roomMap.values(), ...htmlMap.values(), ...fileViewerMap.values(), ...browserMap.values(), ...terminalMap.values()];
    const fits = (cx, cy) => {
      for (const r of all) {
        if (boxesOverlap(cx, cy, w, h, r.x, r.y, r.w, r.h, CORRIDOR_PAD)) return false;
      }
      return true;
    };
    if (fits(prefX, prefY)) return { x: prefX, y: prefY, ang: prefAng };

    // Spiral outward from (parentX, parentY) starting near prefAng until a 100% collision-free slot is found
    for (let dist = 420; dist <= 4800; dist += 95) {
      const steps = Math.max(12, Math.floor((2 * Math.PI * dist) / 140));
      for (let s = 0; s < steps; s++) {
        // Alternate + / - angle offsets around prefAng so child rooms stay near their parent's direction
        const offset = (s % 2 === 0 ? 1 : -1) * Math.ceil(s / 2) * ((Math.PI * 2) / steps);
        const ang = prefAng + offset;
        const cx = Math.round(parentX + Math.cos(ang) * dist);
        const cy = Math.round(parentY + Math.sin(ang) * dist);
        if (fits(cx, cy)) return { x: cx, y: cy, ang };
      }
    }
    return { x: prefX + 500, y: prefY, ang: prefAng };
  }

  // Iterative AABB separation pass: pushes any overlapping rooms apart while keeping Root Room anchored at (0,0)
  function resolveRoomCollisions() {
    const list = [...roomMap.values(), ...htmlMap.values(), ...fileViewerMap.values(), ...browserMap.values(), ...terminalMap.values()];
    if (list.length <= 1) return;
    for (let iter = 0; iter < 35; iter++) {
      let movedAny = false;
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          const reqX = (a.w + b.w) / 2 + CORRIDOR_PAD;
          const reqY = (a.h + b.h) / 2 + CORRIDOR_PAD;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const ox = reqX - Math.abs(dx);
          const oy = reqY - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            movedAny = true;
            // Push along axis of least penetration
            if (ox < oy) {
              const push = (dx >= 0 ? 1 : -1) * Math.ceil(ox / 2 + 1);
              if (a.depth === 0) b.x += push * 2;
              else if (b.depth === 0) a.x -= push * 2;
              else { a.x -= push; b.x += push; }
            } else {
              const push = (dy >= 0 ? 1 : -1) * Math.ceil(oy / 2 + 1);
              if (a.depth === 0) b.y += push * 2;
              else if (b.depth === 0) a.y -= push * 2;
              else { a.y -= push; b.y += push; }
            }
          }
        }
      }
      if (!movedAny) break;
    }
    for (const r of list) {
      r.el.style.left = r.x + 'px';
      r.el.style.top = r.y + 'px';
      if (r.isHtml) {
        if (!layout.htmlRooms) layout.htmlRooms = {};
        layout.htmlRooms[r.path] = { ...(layout.htmlRooms[r.path] || {}), x: r.x, y: r.y, w: r.w, h: r.h };
      } else if (r.isFileViewer) {
        if (!layout.fileRooms) layout.fileRooms = {};
        layout.fileRooms[r.path] = { ...(layout.fileRooms[r.path] || {}), x: r.x, y: r.y, w: r.w, h: r.h };
      } else {
        layout.rooms[r.path] = { ...(layout.rooms[r.path] || {}), x: r.x, y: r.y, w: r.w, h: r.h };
      }
    }
  }

  function applyRoomSize(entry, w, h, resolve = true) {
    entry.w = Math.max(200, Math.min(2600, Math.round(w)));
    entry.h = Math.max(130, Math.min(1800, Math.round(h)));
    entry.el.style.setProperty('--room-w', entry.w + 'px');
    entry.el.style.setProperty('--room-h', entry.h + 'px');
    entry.el.classList.toggle('narrow-room', entry.w < 380);
    const dimEl = entry.el.querySelector('.rm-dims');
    if (dimEl) dimEl.textContent = `${entry.w}×${entry.h}`;
    layout.rooms[entry.path] = { ...(layout.rooms[entry.path] || {}), x: entry.x, y: entry.y, w: entry.w, h: entry.h, parentPath: entry.parentPath };
    if (resolve) {
      resolveRoomCollisions();
      drawBridges();
      updateCameraAndLens();
    }
  }

  function autoFitRoom(entry) {
    const saved = layout.rooms[entry.path];
    const effView = (saved && saved.view && saved.view !== 'inherit') ? saved.view : globalView;
    const total = entry.items ? entry.items.length : (entry.files.length + entry.subDirs.length);

    let fitW = 540, fitH = 380;
    if (effView === 'details') {
      fitW = 560;
      fitH = Math.max(200, Math.min(1400, 48 + total * 25 + 24));
    } else if (effView === 'list') {
      const cols = Math.max(1, Math.min(5, Math.ceil(total / 14)));
      fitW = Math.max(300, Math.min(1200, cols * 200 + 24));
      fitH = Math.max(200, Math.min(1200, 48 + Math.ceil(total / cols) * 24 + 24));
    } else if (effView === 'tiles') {
      const cols = total <= 4 ? 1 : (total <= 12 ? 2 : 3);
      fitW = cols === 1 ? 380 : (cols === 2 ? 560 : 780);
      fitH = Math.max(220, Math.min(1400, 48 + Math.ceil(total / cols) * 54 + 24));
    } else if (effView === 'medium') {
      const cols = Math.max(2, Math.min(6, Math.ceil(Math.sqrt(total * 1.5))));
      fitW = Math.max(340, Math.min(1200, cols * 96 + 24));
      fitH = Math.max(220, Math.min(1400, 48 + Math.ceil(total / cols) * 100 + 24));
    } else if (effView === 'large') {
      const cols = Math.max(2, Math.min(6, Math.ceil(Math.sqrt(total * 1.2))));
      fitW = Math.max(420, Math.min(1400, cols * 122 + 28));
      fitH = Math.max(260, Math.min(1600, 52 + Math.ceil(total / cols) * 136 + 28));
    } else if (effView === 'xl') {
      const cols = Math.max(2, Math.min(5, Math.ceil(Math.sqrt(total))));
      fitW = Math.max(480, Math.min(1600, cols * 156 + 32));
      fitH = Math.max(280, Math.min(1600, 56 + Math.ceil(total / cols) * 172 + 32));
    } else if (effView === 'small') {
      const cols = Math.max(2, Math.min(6, Math.ceil(Math.sqrt(total * 2))));
      fitW = Math.max(320, Math.min(1100, cols * 115 + 24));
      fitH = Math.max(200, Math.min(1200, 48 + Math.ceil(total / cols) * 26 + 24));
    } else if (effView === 'content') {
      fitW = 540;
      fitH = Math.max(220, Math.min(1400, 48 + total * 46 + 24));
    }
    applyRoomSize(entry, fitW, fitH, false);
  }

  function setRoomView(targetPath, viewVal) {
    const r = roomMap.get(targetPath);
    if (!r) return;
    if (!layout.rooms[targetPath]) layout.rooms[targetPath] = { x: r.x, y: r.y, w: r.w, h: r.h };
    if (viewVal === 'inherit') {
      delete layout.rooms[targetPath].view;
    } else {
      layout.rooms[targetPath].view = viewVal;
    }
    const eff = (layout.rooms[targetPath]?.view && layout.rooms[targetPath].view !== 'inherit') ? layout.rooms[targetPath].view : globalView;
    const bodyEl = r.el.querySelector('.map-room-body');
    if (bodyEl) bodyEl.className = 'map-room-body v-' + eff;
    const sel = r.el.querySelector('.rm-view-sel');
    if (sel) sel.value = viewVal;
    autoFitRoom(r);
    resolveRoomCollisions();
    drawBridges();
    updateCameraAndLens();
    persist();
  }

  function selectActiveRoom(roomPath) {
    activeRoomPath = roomPath;
    for (const r of roomMap.values()) r.el.classList.toggle('active-room', r.path === activeRoomPath);
    for (const h of htmlMap.values()) h.el.classList.toggle('active-room', h.path === activeRoomPath);
    for (const f of fileViewerMap.values()) f.el.classList.toggle('active-room', f.path === activeRoomPath);
    for (const b of browserMap.values()) b.el.classList.toggle('active-room', b.url === activeRoomPath);
  }

  function preferredRingPos(index, total, depth, parentX = 0, parentY = 0, parentAngle = 0) {
    if (depth === 1) {
      const ring = Math.floor(index / 8);
      const idxInRing = index % 8;
      const countInRing = Math.min(8, total - ring * 8);
      const ang = (idxInRing / Math.max(countInRing, 1)) * Math.PI * 2 - Math.PI / 2;
      const rx = 500 + ring * 440;
      const ry = 360 + ring * 320;
      return { x: Math.round(Math.cos(ang) * rx), y: Math.round(Math.sin(ang) * ry), ang };
    } else {
      const spread = ((index - (total - 1) / 2) * 0.52);
      const ang = parentAngle + spread;
      const dist = 440;
      return { x: Math.round(parentX + Math.cos(ang) * dist), y: Math.round(parentY + Math.sin(ang) * dist), ang };
    }
  }

  // Deterministically computes the color for a room or the folder tile that opens into that room
  function computeRoomAndChildColor(roomPath, parentEntry, siblingIndex = 0, depth = 0, savedRoom = null) {
    if (savedRoom && savedRoom.lockFrame && savedRoom.roomColor) {
      return savedRoom.roomColor;
    }
    const palArr = getActivePaletteColors(landscapePalette);
    const palIdx = getModePaletteIdx(landscapePalette);
    if (landscapePalette === 'default') {
      if (savedRoom && savedRoom.roomColor) return savedRoom.roomColor;
      return palIdx > 0 ? (palArr[0] || defaultFrameColor) : defaultFrameColor;
    }
    if (landscapePalette === 'inherit') {
      const rootBase = (savedRoom && depth === 0 && savedRoom.roomColor)
        ? savedRoom.roomColor
        : (palIdx > 0 ? (palArr[0] || defaultFrameColor) : defaultFrameColor);
      if (depth === 0 || !parentEntry) return rootBase;
      const base = parentEntry.roomColor || rootBase;
      const stepVal = inheritShiftMode === 'hue-shift' ? (1 + (siblingIndex % 4) * 0.45) : 1;
      return shiftColorShade(base, inheritShiftMode, stepVal);
    }
    if (landscapePalette === 'dna') {
      if (depth === 0 && !parentEntry) return palArr[0] || defaultFrameColor;
      // In DNA mode, each folder inside a room gets a branched color from the palette; opening that folder inherits its color!
      const hIdx = hashPathIndex(roomPath, palArr.length);
      return palArr[(hIdx + siblingIndex) % palArr.length];
    }
    if (landscapePalette === 'rainbow' || landscapePalette === 'rainbow-sync' || landscapePalette === 'rainbow-async' || landscapePalette === 'rainbow-wave' || landscapePalette === 'pastel' || landscapePalette === 'neon') {
      // Sequential order based on room load/sibling order
      const seqIdx = depth === 0 ? 0 : (siblingIndex >= 0 ? (depth + siblingIndex) : roomMap.size);
      return palArr[seqIdx % palArr.length];
    }
    if (landscapePalette === 'skittles' || landscapePalette === 'disco' || landscapePalette === 'dusco' || landscapePalette === 'deep-dusco' || landscapePalette === 'breathing' || landscapePalette === 'rain-puddle') {
      const hIdx = hashPathIndex(roomPath, palArr.length);
      return palArr[hIdx % palArr.length];
    }
    return defaultFrameColor;
  }

  async function spawnRoom(roomPath, name, parentPath, depth, prefPos) {
    if (roomMap.has(roomPath)) return roomMap.get(roomPath);
    const saved = layout.rooms[roomPath];
    const w = (saved && saved.w) ? saved.w : (depth === 0 ? 540 : 480);
    const h = (saved && saved.h) ? saved.h : (depth === 0 ? 400 : 360);
    const localView = (saved && saved.view) ? saved.view : 'inherit';
    const effView = localView !== 'inherit' ? localView : globalView;

    // Guarantee non-overlapping placement even if saved position collided!
    const rawX = saved && typeof saved.x === 'number' ? saved.x : prefPos.x;
    const rawY = saved && typeof saved.y === 'number' ? saved.y : prefPos.y;
    const parRm = parentPath ? roomMap.get(parentPath) : null;
    const freePos = depth === 0
      ? { x: 0, y: 0, ang: 0 }
      : findFreeRoomPos(rawX, rawY, w, h, parRm ? parRm.x : 0, parRm ? parRm.y : 0, prefPos.ang || 0);

    layout.rooms[roomPath] = { ...(saved || {}), x: freePos.x, y: freePos.y, w, h, parentPath };

    const rm = document.createElement('div');
    const isLocked = (lockFrame && lockBg) || (saved && (saved.lockFrame || saved.lockBg));
    const roomSeqIndex = roomMap.size;
    let roomClasses = 'map-room' + (depth === 0 ? ' root-room' : '') + (roomPath === activeRoomPath ? ' active-room' : '');
    if (w < 380) roomClasses += ' narrow-room';
    if (!isLocked) {
      if (landscapePalette === 'disco') {
        const discoCycle = (hashPathIndex(roomPath, 7) % 7) + 1;
        roomClasses += ` disco-c${discoCycle}`;
      } else if (landscapePalette === 'rainbow-sync' || landscapePalette === 'rainbow-wave') {
        roomClasses += ' rainbow-sync-room';
      } else if (landscapePalette === 'rainbow-async') {
        roomClasses += ' rainbow-async-room';
        rm.style.setProperty('--phase-delay', `-${((roomSeqIndex * 1.15) % (breathingDuration || 8)).toFixed(2)}s`);
      } else if (landscapePalette === 'dusco') {
        roomClasses += ' dusco-room';
        rm.style.setProperty('--phase-delay', `-${((roomSeqIndex * 0.85) % 3.4).toFixed(2)}s`);
      } else if (landscapePalette === 'deep-dusco') {
        roomClasses += ' deep-dusco-room';
        rm.style.setProperty('--phase-delay', `-${((roomSeqIndex * 0.6) % 2.4).toFixed(2)}s`);
      } else if (landscapePalette === 'breathing') {
        roomClasses += ' breathing-room' + (breathAffectTiles ? ' affect-tiles' : '');
      }
    }
    rm.className = roomClasses;
    rm.dataset.roomPath = roomPath;
    rm.style.left = freePos.x + 'px';
    rm.style.top = freePos.y + 'px';
    rm.style.setProperty('--room-w', w + 'px');
    rm.style.setProperty('--room-h', h + 'px');

    // Compute sibling index inside parent room if available
    let sibIdx = roomSeqIndex;
    if (parRm && Array.isArray(parRm.subDirs)) {
      const foundIdx = parRm.subDirs.findIndex(d => d.path === roomPath);
      if (foundIdx !== -1) sibIdx = foundIdx;
    }

    const roomColor = computeRoomAndChildColor(roomPath, parRm, sibIdx, depth, saved);
    let roomBg = defaultBgColor;
    if (saved && saved.roomBgColor && saved.lockBg) {
      roomBg = saved.roomBgColor;
    } else if (landscapePalette === 'default' && saved && saved.roomBgColor) {
      roomBg = saved.roomBgColor;
    } else if (landscapePalette !== 'default' || getModePaletteIdx('default') > 0) {
      // Room background changes color across ALL color modes!
      roomBg = shiftColorShade(roomColor, 'floor-bg');
    }

    const isKeyframeColorMode = !isLocked && ['disco', 'dusco', 'deep-dusco', 'rainbow-sync', 'rainbow-async', 'rainbow-wave'].includes(landscapePalette);
    rm.style.setProperty('--room-border-color', roomColor);
    rm.style.setProperty('--room-base-bg', colorToRgba(roomBg, roomBgOpacity / 100));
    if (lockFrame || (saved && saved.lockFrame)) {
      rm.style.borderColor = (saved && saved.roomColor) ? saved.roomColor : roomColor;
    } else if (!isKeyframeColorMode) {
      rm.style.borderColor = '';
    }
    if (lockBg || (saved && saved.lockBg)) {
      rm.style.backgroundColor = colorToRgba((saved && saved.roomBgColor) ? saved.roomBgColor : roomBg, roomBgOpacity / 100);
    } else if (!isKeyframeColorMode) {
      rm.style.backgroundColor = '';
    }

    rm.innerHTML = `
      <div class="map-room-head" title="Drag to move Room · Double-click header to center camera here">
        <span class="rm-title"><span>${depth === 0 ? '🏰' : '🏝️'}</span><span class="rm-name"></span></span>
        <span class="rm-dims">${w}×${h}</span>
        <div class="rm-actions">
          <select class="rm-view-sel" title="Local view mode for this room">
            <option value="inherit">👁 Auto (${globalView})</option>
            <option value="details" ${localView === 'details' ? 'selected' : ''}>Details</option>
            <option value="tiles" ${localView === 'tiles' ? 'selected' : ''}>Tiles</option>
            <option value="list" ${localView === 'list' ? 'selected' : ''}>List</option>
            <option value="small" ${localView === 'small' ? 'selected' : ''}>Small Icons</option>
            <option value="medium" ${localView === 'medium' ? 'selected' : ''}>Medium Icons</option>
            <option value="large" ${localView === 'large' ? 'selected' : ''}>Large Icons</option>
            <option value="xl" ${localView === 'xl' ? 'selected' : ''}>Extra Large</option>
            <option value="content" ${localView === 'content' ? 'selected' : ''}>Content</option>
          </select>
          <button data-rm="color" title="Customize this Room's border & background colors">🎨</button>
          <button data-rm="suball" title="Open or close all subfolder Rooms connected to this Room">📂 Bridges</button>
          <button data-rm="fit" title="Auto-fit Room width & height to its contents">⤢ Fit</button>
          <button data-rm="zoom" title="Zoom/shrink into this Room to inspect its files up close">🔍 Enter</button>
          ${depth > 0 ? `<button data-rm="root" title="Make this folder the main Root Room">🎯 Root</button><button data-rm="close" title="Close this Room">×</button>` : ''}
        </div>
      </div>
      <div class="map-room-body v-${effView}"><span style="color:var(--muted);font-size:10px">Loading room…</span></div>
      <div class="rz-r" title="Drag to resize Room width"></div>
      <div class="rz-b" title="Drag to resize Room height"></div>
      <div class="rz-br" title="Drag to resize Room width & height">◢</div>
    `;
    rm.querySelector('.rm-name').textContent = name;

    const entry = { path: roomPath, name, parentPath, x: freePos.x, y: freePos.y, w, h, ang: freePos.ang || 0, el: rm, depth, subDirs: [], files: [], items: [], roomColor, roomBgColor: roomBg, lockFrame: saved ? !!saved.lockFrame : false, lockBg: saved ? !!saved.lockBg : false };
    roomMap.set(roomPath, entry);
    if (parentPath) {
      if (!bridges.some(b => b.fromPath === parentPath && b.toPath === roomPath)) {
        bridges.push({ fromPath: parentPath, toPath: roomPath });
      }
    }
    layout.bridges = bridges.map(b => ({ fromPath: b.fromPath, toPath: b.toPath }));
    world.appendChild(rm);

    rm.addEventListener('mousedown', () => selectActiveRoom(roomPath));

    rm.querySelector('[data-rm="color"]').onclick = e => {
      e.stopPropagation();
      let popup = rm.querySelector('.rm-color-popup');
      if (popup) { popup.remove(); return; }
      popup = document.createElement('div');
      popup.className = 'rm-color-popup';
      popup.innerHTML = `
        <div style="font-weight:600;font-size:11px;color:var(--fg);display:flex;justify-content:space-between;align-items:center">
          <span>🎨 Room Colors</span>
          <span style="cursor:pointer;font-size:13px;padding:0 4px" class="popup-close">×</span>
        </div>
        <div class="rm-color-swatches">
          ${['#00f0ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f43f5e', '#0284c7', '#475569'].map(c => `
            <div class="rm-color-swatch" style="background:${c}" data-swatch="${c}"></div>
          `).join('')}
        </div>
        <div class="rm-color-row">
          <span>Frame:</span>
          <input type="color" class="rm-frame-picker" value="${entry.roomColor || defaultFrameColor}">
        </div>
        <div class="rm-color-row">
          <span>Background:</span>
          <input type="color" class="rm-bg-picker" value="${entry.roomBgColor || defaultBgColor}">
        </div>
        <div class="rm-color-row">
          <label style="cursor:pointer"><input type="checkbox" class="rm-lock-frame" ${entry.lockFrame ? 'checked' : ''}> Lock Frame</label>
          <label style="cursor:pointer"><input type="checkbox" class="rm-lock-bg" ${entry.lockBg ? 'checked' : ''}> Lock BG</label>
        </div>
        <div style="display:flex;gap:6px;margin-top:2px">
          <button class="dash-btn rm-color-reset" style="flex:1;padding:2px 6px;font-size:10.5px">Reset</button>
        </div>
      `;
      rm.appendChild(popup);
      popup.querySelector('.popup-close').onclick = ev => { ev.stopPropagation(); popup.remove(); };
      popup.querySelectorAll('.rm-color-swatch').forEach(sw => {
        sw.onclick = ev => {
          ev.stopPropagation();
          const c = sw.dataset.swatch;
          entry.roomColor = c;
          rm.style.borderColor = c;
          popup.querySelector('.rm-frame-picker').value = c;
          layout.rooms[roomPath] = { ...(layout.rooms[roomPath] || {}), roomColor: c };
          persist();
        };
      });
      popup.querySelector('.rm-frame-picker').oninput = ev => {
        entry.roomColor = ev.target.value;
        rm.style.borderColor = entry.roomColor;
        layout.rooms[roomPath] = { ...(layout.rooms[roomPath] || {}), roomColor: entry.roomColor };
        persist();
      };
      popup.querySelector('.rm-bg-picker').oninput = ev => {
        entry.roomBgColor = ev.target.value;
        rm.style.background = colorToRgba(entry.roomBgColor, roomBgOpacity / 100);
        layout.rooms[roomPath] = { ...(layout.rooms[roomPath] || {}), roomBgColor: entry.roomBgColor };
        persist();
      };
      popup.querySelector('.rm-lock-frame').onchange = ev => {
        entry.lockFrame = ev.target.checked;
        layout.rooms[roomPath] = { ...(layout.rooms[roomPath] || {}), lockFrame: entry.lockFrame };
        persist();
      };
      popup.querySelector('.rm-lock-bg').onchange = ev => {
        entry.lockBg = ev.target.checked;
        layout.rooms[roomPath] = { ...(layout.rooms[roomPath] || {}), lockBg: entry.lockBg };
        persist();
      };
      popup.querySelector('.rm-color-reset').onclick = ev => {
        ev.stopPropagation();
        delete entry.roomColor;
        delete entry.roomBgColor;
        entry.lockFrame = false;
        entry.lockBg = false;
        rm.style.borderColor = defaultFrameColor;
        rm.style.background = colorToRgba(defaultBgColor, roomBgOpacity / 100);
        if (layout.rooms[roomPath]) {
          delete layout.rooms[roomPath].roomColor;
          delete layout.rooms[roomPath].roomBgColor;
          delete layout.rooms[roomPath].lockFrame;
          delete layout.rooms[roomPath].lockBg;
        }
        persist();
        popup.remove();
      };
    };

    const panToRoom = (zoomIn = false) => {
      selectActiveRoom(roomPath);
      if (zoomIn) camZoom = 2.05;
      camX = -entry.x * camZoom;
      camY = -entry.y * camZoom;
      updateCameraAndLens();
    };
    rm.querySelector('[data-rm="zoom"]').onclick = e => { e.stopPropagation(); panToRoom(true); };
    rm.querySelector('[data-rm="suball"]').onclick = async e => {
      e.stopPropagation();
      const anyOpen = entry.subDirs.some(sd => roomMap.has(sd.path));
      if (anyOpen) {
        for (const sd of entry.subDirs) if (roomMap.has(sd.path)) closeRoomRecursive(sd.path);
      } else {
        for (let i = 0; i < entry.subDirs.length; i++) {
          const sd = entry.subDirs[i];
          const pref = preferredRingPos(i, entry.subDirs.length, depth + 1, entry.x, entry.y, entry.ang);
          await spawnRoom(sd.path, sd.name, roomPath, depth + 1, pref);
        }
        resolveRoomCollisions();
      }
      syncDoorwayBadges();
      drawBridges();
      updateCameraAndLens();
    };
    rm.querySelector('[data-rm="fit"]').onclick = e => {
      e.stopPropagation();
      autoFitRoom(entry);
      resolveRoomCollisions();
      drawBridges();
      updateCameraAndLens();
      selectActiveRoom(roomPath);
      persist();
    };
    const localSel = rm.querySelector('.rm-view-sel');
    localSel.onchange = e => {
      e.stopPropagation();
      setRoomView(roomPath, e.target.value);
    };
    rm.querySelector('.map-room-head').ondblclick = e => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
      e.stopPropagation();
      panToRoom(false);
    };
    if (depth > 0) {
      rm.querySelector('[data-rm="root"]').onclick = e => { e.stopPropagation(); onNavigate(roomPath); };
      rm.querySelector('[data-rm="close"]').onclick = e => {
        e.stopPropagation();
        closeRoomRecursive(roomPath);
        syncDoorwayBadges();
        drawBridges();
        updateCameraAndLens();
      };
    }

    // Dragging Room by header
    const head = rm.querySelector('.map-room-head');
    head.addEventListener('auxclick', e => {
      if (e.button === 1) {
        e.preventDefault(); e.stopPropagation();
        newTab(roomPath, [], e.shiftKey);
      }
    });
    const zoomBtn = rm.querySelector('[data-rm="zoom"]');
    if (zoomBtn) {
      zoomBtn.addEventListener('auxclick', e => {
        if (e.button === 1) {
          e.preventDefault(); e.stopPropagation();
          newTab(roomPath, [], e.shiftKey);
        }
      });
    }
    head.addEventListener('mousedown', e => {
      if (e.altKey) return; // Allow Alt+Click to pass through for universal global camera pan!
      if (e.button !== 0 || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
      e.stopPropagation();
      selectActiveRoom(roomPath);
      const sx = e.clientX, sy = e.clientY;
      const ox = entry.x, oy = entry.y;
      const onMove = ev => {
        entry.x = Math.round(ox + (ev.clientX - sx) / camZoom);
        entry.y = Math.round(oy + (ev.clientY - sy) / camZoom);
        rm.style.left = entry.x + 'px';
        rm.style.top = entry.y + 'px';
        layout.rooms[roomPath] = { ...(layout.rooms[roomPath] || {}), x: entry.x, y: entry.y, w: entry.w, h: entry.h };
        drawBridges();
        updateCameraAndLens();
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        persist();
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    // Drag-resizing Room Width & Height (.rz-r, .rz-b, .rz-br)
    const wireResize = (handleEl, doW, doH) => {
      handleEl.addEventListener('mousedown', e => {
        e.stopPropagation(); e.preventDefault();
        selectActiveRoom(roomPath);
        const sx = e.clientX, sy = e.clientY;
        const startW = entry.w, startH = entry.h;
        const onMove = ev => {
          const nw = doW ? startW + (ev.clientX - sx) / camZoom : entry.w;
          const nh = doH ? startH + (ev.clientY - sy) / camZoom : entry.h;
          applyRoomSize(entry, nw, nh, false);
          selectActiveRoom(roomPath);
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          resolveRoomCollisions();
          drawBridges();
          updateCameraAndLens();
          persist();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    };
    wireResize(rm.querySelector('.rz-r'), true, false);
    wireResize(rm.querySelector('.rz-b'), false, true);
    wireResize(rm.querySelector('.rz-br'), true, true);

    // Right-clicking empty floor space inside any Room opens Peek Explorer's folder menu for THAT Room!
    rm.addEventListener('contextmenu', async e => {
      if (e.target.closest('.room-item') || e.target.closest('.room-file') || e.target.closest('.room-door')) return;
      e.preventDefault(); e.stopPropagation();
      selectActiveRoom(roomPath);
      await syncClip();
      fillMenu([
        { label: `📂 Room: ${entry.name}`, disabled: true },
        { label: '🔍 Zoom into this Room', run: () => panToRoom(true) },
        { label: '⤢ Auto-fit Room box to contents', run: () => rm.querySelector('[data-rm="fit"]').click() },
        '-',
        { label: '👁 View: Details', run: () => setRoomView(roomPath, 'details') },
        { label: '👁 View: Tiles', run: () => setRoomView(roomPath, 'tiles') },
        { label: '👁 View: List', run: () => setRoomView(roomPath, 'list') },
        { label: '👁 View: Small Icons', run: () => setRoomView(roomPath, 'small') },
        { label: '👁 View: Medium Icons', run: () => setRoomView(roomPath, 'medium') },
        { label: '👁 View: Large Icons', run: () => setRoomView(roomPath, 'large') },
        { label: '👁 View: Inherit Global', run: () => setRoomView(roomPath, 'inherit') },
        '-',
        ...(depth > 0 ? [{ label: '🎯 Set as Root Room', run: () => onNavigate(roomPath) }] : []),
        { label: 'Open in new tab (Middle-click)', run: () => newTab(roomPath, [], true) },
        '-',
        { label: '🎨 Set Custom Room Color', run: () => promptRoomColor(entry) },
        { label: entry.lockFrame ? '🔓 Unlock Frame Color' : '🔒 Lock Frame Color', run: () => { entry.lockFrame = !entry.lockFrame; } },
        { label: entry.lockBg ? '🔓 Unlock Background Color' : '🔒 Lock Background Color', run: () => { entry.lockBg = !entry.lockBg; } },
        { label: '🔄 Reset to Theme Color', run: () => resetRoomColor(entry) },
        '-',
        { label: 'New folder in this room', run: async () => { const r = await window.api.newFolder(roomPath); if (!r.error && entry.populate) await entry.populate(); } },
        { label: 'New text document (.txt) here', run: async () => { const r = await window.api.newFile(roomPath, '.txt'); if (!r.error && entry.populate) await entry.populate(); } },
        { label: 'New markdown file (.md) here', run: async () => { const r = await window.api.newFile(roomPath, '.md'); if (!r.error && entry.populate) await entry.populate(); } },
        '-',
        { label: 'Paste into this room', disabled: !clip, run: () => doPaste(roomPath) },
        { label: 'Open PowerShell here', run: () => window.api.openTerminal(roomPath) },
        { label: '⭐ Bookmark this folder', run: () => { if (!bookmarks.some(b => b.path === roomPath)) { bookmarks.push({ name: entry.name, path: roomPath }); renderBookmarksNav(); persist(); } } },
        { label: 'Properties', run: () => window.api.props(roomPath) }
      ]);
      placeMenu(e.clientX, e.clientY);
    });

    wireDropTarget(rm, () => roomPath);

    // Populate Room contents: Unified Subfolders and Files
    entry.populate = async () => {
      const res = await window.api.list(roomPath);
      const all = sortItems(res.items || []).filter(it => showHidden || !it.name.startsWith('.'));
      entry.subDirs = all.filter(i => i.isDir);
      entry.files = all.filter(i => !i.isDir);
      entry.items = [...entry.subDirs, ...entry.files];

      const bodyEl = rm.querySelector('.map-room-body');
      bodyEl.innerHTML = '';

      if (!entry.items.length) {
        bodyEl.innerHTML = `<span style="color:var(--muted);font-size:10px;padding:4px">(empty room)</span>`;
      } else {
        const dHead = document.createElement('div');
        dHead.className = 'rm-details-head';
        dHead.innerHTML = `
          <span class="dh-name">Name</span>
          <span class="dh-date">Date modified</span>
          <span class="dh-type">Type</span>
          <span class="dh-size">Size</span>
        `;
        bodyEl.appendChild(dHead);

        const payloadBytes = entry.files.reduce((acc, f) => acc + (f.size || 0), 0);
      const dimsEl = rm.querySelector('.rm-dims');
      if (dimsEl) dimsEl.textContent = `${entry.w}×${entry.h} · ${fmtSize(payloadBytes)}`;

      let dirCounter = 0;
      const palArr = getActivePaletteColors(landscapePalette);
      entry.items.forEach((it, itemIdx) => {
          const row = document.createElement('div');
          const isBridged = it.isDir && roomMap.has(it.path);
          row.className = 'room-item ' + (it.isDir ? 'is-dir' : 'is-file') + (isBridged ? ' bridged' : '');
          row._item = it;
          row.draggable = true;
          if (it.isDir) {
            const dIdx = dirCounter++;
            row.dataset.subpath = it.path;
            row.dataset.dirIndex = String(dIdx);
            const childEntry = roomMap.get(it.path);
            const targetChildColor = (childEntry && childEntry.roomColor)
              ? childEntry.roomColor
              : computeRoomAndChildColor(it.path, entry, dIdx, entry.depth + 1, layout.rooms?.[it.path]);

            const unopenedBase = landscapePalette === 'default'
              ? (entry.roomColor || defaultFrameColor)
              : targetChildColor;
            const lighterUnopened = shiftColorShade(unopenedBase, 'lighter', 1);
            row.style.setProperty('--folder-ambient-bg', colorToRgba(lighterUnopened, 0.08));
            row.style.setProperty('--folder-ambient-bd', colorToRgba(lighterUnopened, 0.26));
            row.style.setProperty('--folder-ambient-hover', colorToRgba(unopenedBase, 0.16));
            row.style.setProperty('--folder-ambient-bd-hover', colorToRgba(unopenedBase, 0.48));

            const openedBase = useCustomSelectedFolder ? selectedFolderColor : targetChildColor;
            const darkerOpened = shiftColorShade(openedBase, 'darker', 1);
            row.style.setProperty('--child-folder-bg', colorToRgba(darkerOpened, 0.34));
            row.style.setProperty('--child-folder-bd', colorToRgba(openedBase, 0.82));
            row.style.setProperty('--child-folder-hover', colorToRgba(darkerOpened, 0.46));
            row.style.setProperty('--child-folder-glow', colorToRgba(openedBase, 0.55));
          } else if (landscapePalette === 'rainbow') {
            // In Static Rainbow mode, file tiles also receive sequential rainbow colors in load order
            const seqCol = palArr[(entry.depth + itemIdx) % palArr.length];
            row.style.background = colorToRgba(seqCol, 0.08);
            row.style.borderColor = colorToRgba(seqCol, 0.25);
          }

          row.innerHTML = `
            <input type="checkbox" class="chk">
            <img class="ico">
            <div class="c-name">
              <span class="nm"></span>
              <span class="c-tile-sub">${it.isDir ? 'File folder' : fmtSize(it.size)}</span>
            </div>
            ${it.isDir ? `<span class="rm-bridge-indicator ${isBridged ? 'bridged' : ''}" title="${isBridged ? 'Island room is open on map (Click to close)' : 'Click to open island room on map'}">${isBridged ? '🏝️' : '🌉'}</span>` : ''}
            <span class="c-date">${fmtDate(it.mtime)}</span>
            <span class="c-type">${typeOf(it)}</span>
            <span class="c-size">${it.isDir ? '--' : fmtSize(it.size)}</span>
          `;
          row.querySelector('.nm').textContent = displayName(it);
          row.title = `${it.name}${it.isDir ? ' (Folder)' : ' (' + fmtSize(it.size) + ')'}\n• Single-click: ${it.isDir ? 'Open Room Island' : 'Open file'}\n• Hold-click / F2: Rename`;
          setIcon(row.querySelector('img'), it, 32);

          const chk = row.querySelector('.chk');
          chk.onclick = ev => { ev.stopPropagation(); setRowSelected(it, row, chk.checked); updateStatus(); };
          if (selected.has(it.path)) { row.classList.add('sel'); chk.checked = true; selected.set(it.path, { item: it, cell: row }); }

          if (it.isDir) {
            const bridgeInd = row.querySelector('.rm-bridge-indicator');
            if (bridgeInd) {
              bridgeInd.onclick = async ev => {
                ev.stopPropagation();
                if (roomMap.has(it.path)) {
                  closeRoomRecursive(it.path);
                } else {
                  const sIdx = entry.subDirs.findIndex(d => d.path === it.path);
                  const pref = preferredRingPos(Math.max(0, sIdx), entry.subDirs.length, depth + 1, entry.x, entry.y, entry.ang);
                  await spawnRoom(it.path, it.name, roomPath, depth + 1, pref);
                  resolveRoomCollisions();
                }
                syncDoorwayBadges();
                drawBridges();
                updateCameraAndLens();
              };
              bridgeInd.addEventListener('auxclick', ev => {
                if (ev.button === 1) {
                  ev.preventDefault(); ev.stopPropagation();
                  newTab(it.path, [], ev.shiftKey);
                }
              });
            }
          }

          // Hold-down on already-selected item to inline rename unless moved or dragged
          let holdTimer = null, holdStartX = 0, holdStartY = 0;
          row.addEventListener('mousedown', e => {
            if (e.altKey) return; // Allow Alt+Click to pass through for universal global camera pan!
            if (e.button !== 0 || e.target.tagName === 'INPUT' || (e.target.classList && e.target.classList.contains('rm-bridge-indicator'))) return;
            clearTimeout(holdTimer);
            holdStartX = e.clientX; holdStartY = e.clientY;
            const wasSelected = selected.size === 1 && selected.has(it.path) && !e.ctrlKey && !e.shiftKey;
            if (holdRenameEnabled && wasSelected) {
              holdTimer = setTimeout(() => { holdTimer = null; startRename(it, row); }, holdRenameDelay);
            }
          });
          const clearHold = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } };
          row.addEventListener('mousemove', e => {
            if (holdTimer && Math.hypot(e.clientX - holdStartX, e.clientY - holdStartY) > 3) clearHold();
          });
          row.addEventListener('mouseup', clearHold);
          row.addEventListener('mouseleave', clearHold);
          row.addEventListener('dragstart', clearHold);

          // 1-Click Toggle: Click to Open if closed; Click to Close if open! (FOLDERS ONLY)
          row.onclick = async e => {
            if (e.target.tagName === 'INPUT') return; // checkbox toggles selection without navigating
            e.stopPropagation();
            const now = Date.now();
            const wasOnly = selected.size === 1 && selected.has(it.path) && !e.ctrlKey && !e.shiftKey;
            const clickedLbl = e.target.classList && e.target.classList.contains('c-name');
            cancelPendingRename();
            clearHold();
            selectClick(it, row, e);

            if (it.isDir) {
              if (roomMap.has(it.path)) {
                // 1-Click CLOSE: Room is already open, click immediately closes it!
                closeRoomRecursive(it.path);
                syncDoorwayBadges();
                drawBridges();
                updateCameraAndLens();
                selectActiveRoom(roomPath);
                persist();
              } else {
                // 1-Click OPEN: Room is closed, click opens it and flies camera to it!
                const sIdx = entry.subDirs.findIndex(d => d.path === it.path);
                const pref = preferredRingPos(Math.max(0, sIdx), entry.subDirs.length, depth + 1, entry.x, entry.y, entry.ang);
                const targetRm = await spawnRoom(it.path, it.name, roomPath, depth + 1, pref);
                resolveRoomCollisions();
                syncDoorwayBadges();
                drawBridges();
                selectActiveRoom(it.path);
                camX = -targetRm.x * camZoom;
                camY = -targetRm.y * camZoom;
                updateCameraAndLens();
                persist();
              }
            } else {
              // Files NEVER open on 1-click in Landscape mode. They select and preview.
              // Native Explorer slow-second-click on label triggers rename.
              if (wasOnly && clickedLbl && lastClickPath === it.path && (now - lastClickTime) > 450 && (now - lastClickTime) < 1800) {
                cancelPendingRename();
                slowRenameTimer = setTimeout(() => { slowRenameTimer = null; startRename(it, row); }, 260);
              }
              lastClickPath = it.path;
              lastClickTime = now;
            }
          };

          row.ondblclick = async e => {
            if (e.target.tagName === 'INPUT' || (e.target.classList && e.target.classList.contains('rm-bridge-indicator'))) return;
            e.stopPropagation();
            cancelPendingRename();
            clearHold();
            if (it.isDir) {
              let targetRm = roomMap.get(it.path);
              if (targetRm) {
                selectActiveRoom(it.path);
                camZoom = 2.05;
                camX = -targetRm.x * camZoom;
                camY = -targetRm.y * camZoom;
                updateCameraAndLens();
              }
            } else {
              if (e.shiftKey) {
                // Shift + Double Click opens native Windows application
                window.api.open(it.path);
              } else {
                // Standard Double Click in Landscape: opens within landscape canvas!
                await spawnFileViewerIsland(it.path, it.name, roomPath);
              }
            }
          };

          row.addEventListener('auxclick', e => {
            if (e.button === 1) {
              e.preventDefault(); e.stopPropagation();
              if (it.isDir) newTab(it.path, [], e.shiftKey);
              else if (/\.html?$/i.test(it.name)) newTab(it.path, [], e.shiftKey);
              else window.api.open(it.path);
            }
          });

          row.addEventListener('contextmenu', e => {
            e.preventDefault(); e.stopPropagation();
            cancelPendingRename(); clearHold();
            if (!selected.has(it.path)) selectClick(it, row, null);
            showMenu(e.clientX, e.clientY, it);
          });

          row.addEventListener('dragstart', e => beginItemDrag(e, it, row));

          if (it.isDir) wireDropTarget(row, () => it.path);

          bodyEl.appendChild(row);
        });
      }
    };
    await entry.populate();

    return entry;
  }

  function syncDoorwayBadges() {
    for (const r of roomMap.values()) {
      for (const d of r.el.querySelectorAll('.room-item.is-dir')) {
        const subPath = d.dataset.subpath;
        const dIdx = parseInt(d.dataset.dirIndex || '0', 10);
        const isBridged = roomMap.has(subPath);
        d.classList.toggle('bridged', isBridged);
        d.title = `${d._item ? d._item.name : 'Folder'} (${isBridged ? 'Room island is open on map · Click to close' : 'Click to open room island on map'})`;
        const ind = d.querySelector('.rm-bridge-indicator');
        if (ind) {
          ind.classList.toggle('bridged', isBridged);
          ind.textContent = isBridged ? '×' : '🏝️';
          ind.title = isBridged ? 'Island room is open on map (Click to close)' : 'Click to open island room on map';
        }
        const childEntry = roomMap.get(subPath);
        const targetChildColor = (childEntry && childEntry.roomColor)
          ? childEntry.roomColor
          : computeRoomAndChildColor(subPath, r, dIdx, r.depth + 1, layout.rooms?.[subPath]);
        const unopenedBase = landscapePalette === 'default'
          ? (r.roomColor || defaultFrameColor)
          : targetChildColor;
        const lighterUnopened = shiftColorShade(unopenedBase, 'lighter', 1);
        d.style.setProperty('--folder-ambient-bg', colorToRgba(lighterUnopened, 0.08));
        d.style.setProperty('--folder-ambient-bd', colorToRgba(lighterUnopened, 0.26));
        d.style.setProperty('--folder-ambient-hover', colorToRgba(unopenedBase, 0.16));
        d.style.setProperty('--folder-ambient-bd-hover', colorToRgba(unopenedBase, 0.48));

        const openedBase = useCustomSelectedFolder ? selectedFolderColor : targetChildColor;
        const darkerOpened = shiftColorShade(openedBase, 'darker', 1);
        d.style.setProperty('--child-folder-bg', colorToRgba(darkerOpened, 0.34));
        d.style.setProperty('--child-folder-bd', colorToRgba(openedBase, 0.82));
        d.style.setProperty('--child-folder-hover', colorToRgba(darkerOpened, 0.46));
        d.style.setProperty('--child-folder-glow', colorToRgba(openedBase, 0.55));
      }
    }
  }

  function closeRoomRecursive(targetPath) {
    for (const [bIdx, b] of [...bridges.entries()].reverse()) {
      if (b.fromPath === targetPath) closeRoomRecursive(b.toPath);
      if (b.toPath === targetPath || b.fromPath === targetPath) bridges.splice(bIdx, 1);
    }
    layout.bridges = bridges.map(b => ({ fromPath: b.fromPath, toPath: b.toPath }));
    const r = roomMap.get(targetPath);
    if (r) {
      r.el.remove();
      roomMap.delete(targetPath);
    }
    if (layout.rooms) delete layout.rooms[targetPath];
    if (activeRoomPath === targetPath) activeRoomPath = dir;
  }

  async function spawnFolderIsland(folderPath, folderName = null, prefPos = null) {
    if (roomMap.has(folderPath)) {
      const existing = roomMap.get(folderPath);
      selectActiveRoom(folderPath);
      camZoom = 1.85;
      camX = -existing.x * camZoom;
      camY = -existing.y * camZoom;
      updateCameraAndLens();
      return existing;
    }
    const name = folderName || baseName(folderPath);
    const actRm = roomMap.get(activeRoomPath) || roomMap.get(dir);
    const px = (prefPos && typeof prefPos.x === 'number') ? prefPos.x : (actRm ? actRm.x + 460 : 500);
    const py = (prefPos && typeof prefPos.y === 'number') ? prefPos.y : (actRm ? actRm.y : 0);
    const pref = findFreeRoomPos(px, py, 480, 360, actRm ? actRm.x : 0, actRm ? actRm.y : 0);
    const parPath = (actRm && folderPath.startsWith(actRm.path)) ? actRm.path : (folderPath.startsWith(dir) ? dir : null);
    const targetRm = await spawnRoom(folderPath, name, parPath, parPath ? 1 : 1, pref);
    resolveRoomCollisions();
    syncDoorwayBadges();
    drawBridges();
    selectActiveRoom(folderPath);
    camZoom = 1.85;
    camX = -targetRm.x * camZoom;
    camY = -targetRm.y * camZoom;
    updateCameraAndLens();
    persist();
    return targetRm;
  }

  async function spawnHtmlIsland(filePath, name = null, parentPath = null, prefPos = null) {
    if (htmlMap.has(filePath)) {
      const existing = htmlMap.get(filePath);
      selectActiveRoom(filePath);
      camZoom = 1.6;
      camX = -existing.x * camZoom;
      camY = -existing.y * camZoom;
      updateCameraAndLens();
      return existing;
    }
    if (!layout.htmlRooms) layout.htmlRooms = {};
    const saved = layout.htmlRooms[filePath];
    const w = (saved && saved.w) ? saved.w : 520;
    const h = (saved && saved.h) ? saved.h : 380;
    const fileName = name || baseName(filePath);

    const parRm = parentPath ? (roomMap.get(parentPath) || fileViewerMap.get(parentPath)) : (roomMap.get(activeRoomPath) || roomMap.get(dir));
    let freePos;
    if (saved && typeof saved.x === 'number') {
      freePos = { x: saved.x, y: saved.y };
    } else if (prefPos && typeof prefPos.x === 'number') {
      freePos = findFreeRoomPos(prefPos.x, prefPos.y, w, h, parRm ? parRm.x : 0, parRm ? parRm.y : 0);
    } else if (parRm) {
      const px = Math.round(parRm.x + (parRm.w + w) / 2 + 50);
      const py = Math.round(parRm.y);
      freePos = findFreeRoomPos(px, py, w, h, parRm.x, parRm.y, parRm.ang || 0);
    } else {
      freePos = findFreeRoomPos(450, 0, w, h);
    }

    layout.htmlRooms[filePath] = { x: freePos.x, y: freePos.y, w, h };

    const rm = document.createElement('div');
    rm.className = 'map-room html-room' + (filePath === activeRoomPath ? ' active-room' : '');
    rm.style.left = freePos.x + 'px';
    rm.style.top = freePos.y + 'px';
    rm.style.setProperty('--room-w', w + 'px');
    rm.style.setProperty('--room-h', h + 'px');

    rm.innerHTML = `
      <div class="map-room-head" title="Drag to move HTML Island · Double-click to zoom in">
        <span class="rm-title"><span>🌐</span><span class="rm-name"></span></span>
        <span class="rm-dims">${w}×${h}</span>
        <div class="rm-actions">
          <button data-html-act="reload" title="Reload HTML">🔄</button>
          <button data-html-act="tab" title="Open in New Tab">↗️ Tab</button>
          <button data-html-act="native" title="Open in Native Browser">🪟 Native</button>
          <button data-html-act="zoom" title="Zoom into HTML Viewer">🔍</button>
          <button data-html-act="close" title="Close HTML Viewer">×</button>
        </div>
      </div>
      <div class="map-html-body">
        <iframe class="html-island-frame" src="file:///${filePath.replace(/\\/g, '/')}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
      </div>
      <div class="rz-r" title="Drag to resize width"></div>
      <div class="rz-b" title="Drag to resize height"></div>
      <div class="rz-br" title="Drag to resize width & height">◢</div>
    `;
    rm.querySelector('.rm-name').textContent = fileName;

    const entry = { path: filePath, name: fileName, parentPath: parRm?.path || null, x: freePos.x, y: freePos.y, w, h, el: rm, isHtml: true };
    htmlMap.set(filePath, entry);
    if (entry.parentPath && !bridges.some(b => b.fromPath === entry.parentPath && b.toPath === filePath)) {
      bridges.push({ fromPath: entry.parentPath, toPath: filePath });
    }
    world.appendChild(rm);
    drawBridges();

    rm.addEventListener('mousedown', () => selectActiveRoom(filePath));

    const head = rm.querySelector('.map-room-head');
    head.addEventListener('mousedown', ev => {
      if (ev.target.tagName === 'BUTTON') return;
      ev.stopPropagation();
      selectActiveRoom(filePath);
      const startMx = ev.clientX, startMy = ev.clientY;
      const startRx = entry.x, startRy = entry.y;
      const onMove = mv => {
        const dx = (mv.clientX - startMx) / camZoom;
        const dy = (mv.clientY - startMy) / camZoom;
        entry.x = Math.round(startRx + dx);
        entry.y = Math.round(startRy + dy);
        rm.style.left = entry.x + 'px';
        rm.style.top = entry.y + 'px';
        layout.htmlRooms[filePath] = { ...(layout.htmlRooms[filePath] || {}), x: entry.x, y: entry.y, w: entry.w, h: entry.h };
        drawBridges();
        updateCameraAndLens();
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        persist();
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    head.ondblclick = ev => {
      if (ev.target.tagName === 'BUTTON') return;
      ev.stopPropagation();
      selectActiveRoom(filePath);
      camZoom = 1.6;
      camX = -entry.x * camZoom;
      camY = -entry.y * camZoom;
      updateCameraAndLens();
    };

    rm.querySelector('[data-html-act="reload"]').onclick = ev => {
      ev.stopPropagation();
      const frame = rm.querySelector('iframe');
      if (frame) frame.src = frame.src;
    };
    rm.querySelector('[data-html-act="tab"]').onclick = ev => {
      ev.stopPropagation();
      newTab(filePath, [], true);
    };
    rm.querySelector('[data-html-act="native"]').onclick = ev => {
      ev.stopPropagation();
      window.api.open(filePath);
    };
    rm.querySelector('[data-html-act="zoom"]').onclick = ev => {
      ev.stopPropagation();
      selectActiveRoom(filePath);
      camZoom = 1.6;
      camX = -entry.x * camZoom;
      camY = -entry.y * camZoom;
      updateCameraAndLens();
    };
    rm.querySelector('[data-html-act="close"]').onclick = ev => {
      ev.stopPropagation();
      delete layout.htmlRooms[filePath];
      htmlMap.delete(filePath);
      rm.remove();
      const bIdx = bridges.findIndex(b => b.toPath === filePath || b.fromPath === filePath);
      if (bIdx !== -1) bridges.splice(bIdx, 1);
      drawBridges();
      updateCameraAndLens();
      persist();
    };

    const wireResize = (handle, onDim) => {
      handle.addEventListener('mousedown', ev => {
        ev.stopPropagation(); ev.preventDefault();
        selectActiveRoom(filePath);
        const smx = ev.clientX, smy = ev.clientY;
        const sw = entry.w, sh = entry.h;
        const onMove = mv => {
          const dw = (mv.clientX - smx) / camZoom;
          const dh = (mv.clientY - smy) / camZoom;
          onDim(sw + dw, sh + dh);
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          persist();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    };

    const applyHtmlSize = (nw, nh) => {
      entry.w = Math.max(260, Math.min(1200, Math.round(nw)));
      entry.h = Math.max(180, Math.min(900, Math.round(nh)));
      rm.style.setProperty('--room-w', entry.w + 'px');
      rm.style.setProperty('--room-h', entry.h + 'px');
      const dims = rm.querySelector('.rm-dims');
      if (dims) dims.textContent = `${entry.w}×${entry.h}`;
      layout.htmlRooms[filePath] = { ...(layout.htmlRooms[filePath] || {}), x: entry.x, y: entry.y, w: entry.w, h: entry.h };
      updateCameraAndLens();
    };

    wireResize(rm.querySelector('.rz-r'), (nw) => applyHtmlSize(nw, entry.h));
    wireResize(rm.querySelector('.rz-b'), (_nw, nh) => applyHtmlSize(entry.w, nh));
    wireResize(rm.querySelector('.rz-br'), (nw, nh) => applyHtmlSize(nw, nh));

    updateCameraAndLens();
    persist();
    return entry;
  }

  async function spawnFileViewerIsland(filePath, name = null, parentPath = null, prefPos = null) {
    if (/\.html?$/i.test(filePath)) {
      return await spawnHtmlIsland(filePath, name, parentPath, prefPos);
    }
    if (fileViewerMap.has(filePath)) {
      const existing = fileViewerMap.get(filePath);
      selectActiveRoom(filePath);
      camZoom = 1.6;
      camX = -existing.x * camZoom;
      camY = -existing.y * camZoom;
      updateCameraAndLens();
      return existing;
    }
    if (!layout.fileRooms) layout.fileRooms = {};
    const saved = layout.fileRooms[filePath];
    const fileName = name || baseName(filePath);
    const isImage = IMG.test(fileName);
    const isVideo = VID.test(fileName);
    const isAudio = AUD.test(fileName);
    const isPdf = /\.pdf$/i.test(fileName);

    const w = (saved && saved.w) ? saved.w : (isImage ? 480 : (isAudio ? 400 : 540));
    const h = (saved && saved.h) ? saved.h : (isImage ? 440 : (isAudio ? 160 : 380));

    const parRm = parentPath ? (roomMap.get(parentPath) || fileViewerMap.get(parentPath)) : (roomMap.get(activeRoomPath) || roomMap.get(dir));
    let freePos;
    if (saved && typeof saved.x === 'number') {
      freePos = { x: saved.x, y: saved.y };
    } else if (prefPos && typeof prefPos.x === 'number') {
      freePos = findFreeRoomPos(prefPos.x, prefPos.y, w, h, parRm ? parRm.x : 0, parRm ? parRm.y : 0);
    } else if (parRm) {
      // Branch out directly adjacent to the parent room!
      const px = Math.round(parRm.x + (parRm.w + w) / 2 + 50);
      const py = Math.round(parRm.y);
      freePos = findFreeRoomPos(px, py, w, h, parRm.x, parRm.y, parRm.ang || 0);
    } else {
      freePos = findFreeRoomPos(450, 0, w, h);
    }

    layout.fileRooms[filePath] = { x: freePos.x, y: freePos.y, w, h };

    const rm = document.createElement('div');
    rm.className = 'map-room file-room' + (filePath === activeRoomPath ? ' active-room' : '');
    rm.style.left = freePos.x + 'px';
    rm.style.top = freePos.y + 'px';
    rm.style.setProperty('--room-w', w + 'px');
    rm.style.setProperty('--room-h', h + 'px');

    const typeIcon = isImage ? '🖼️' : (isVideo ? '🎬' : (isAudio ? '🎵' : (isPdf ? '📄' : '📝')));
    rm.innerHTML = `
      <div class="map-room-head" title="Drag to move Viewer Island · Double-click to zoom in">
        <span class="rm-title"><span>${typeIcon}</span><span class="rm-name"></span></span>
        <span class="rm-dims">${w}×${h}</span>
        <div class="rm-actions">
          <button data-file-act="native" title="Open in Native Windows Application (Shift+Double-Click)">🪟 Native</button>
          <button data-file-act="zoom" title="Zoom into Viewer Island">🔍</button>
          <button data-file-act="close" title="Close Viewer Island">×</button>
        </div>
      </div>
      <div class="map-file-body">
        <span style="color:var(--muted);font-size:11px;padding:8px">Loading file…</span>
      </div>
      <div class="rz-r" title="Drag to resize width"></div>
      <div class="rz-b" title="Drag to resize height"></div>
      <div class="rz-br" title="Drag to resize width & height">◢</div>
    `;
    rm.querySelector('.rm-name').textContent = fileName;

    const entry = { path: filePath, name: fileName, parentPath: parRm?.path || null, x: freePos.x, y: freePos.y, w, h, el: rm, isFileViewer: true };
    fileViewerMap.set(filePath, entry);
    if (entry.parentPath && !bridges.some(b => b.fromPath === entry.parentPath && b.toPath === filePath)) {
      bridges.push({ fromPath: entry.parentPath, toPath: filePath });
    }
    world.appendChild(rm);
    drawBridges();

    rm.addEventListener('mousedown', () => selectActiveRoom(filePath));

    const head = rm.querySelector('.map-room-head');
    head.addEventListener('mousedown', ev => {
      if (ev.target.tagName === 'BUTTON') return;
      ev.stopPropagation();
      selectActiveRoom(filePath);
      const startMx = ev.clientX, startMy = ev.clientY;
      const startRx = entry.x, startRy = entry.y;
      const onMove = mv => {
        const dx = (mv.clientX - startMx) / camZoom;
        const dy = (mv.clientY - startMy) / camZoom;
        entry.x = Math.round(startRx + dx);
        entry.y = Math.round(startRy + dy);
        rm.style.left = entry.x + 'px';
        rm.style.top = entry.y + 'px';
        layout.fileRooms[filePath] = { ...(layout.fileRooms[filePath] || {}), x: entry.x, y: entry.y, w: entry.w, h: entry.h };
        drawBridges();
        updateCameraAndLens();
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        persist();
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    head.ondblclick = ev => {
      if (ev.target.tagName === 'BUTTON') return;
      ev.stopPropagation();
      selectActiveRoom(filePath);
      camZoom = 1.95;
      camX = -entry.x * camZoom;
      camY = -entry.y * camZoom;
      updateCameraAndLens();
    };

    rm.querySelector('[data-file-act="native"]').onclick = ev => {
      ev.stopPropagation();
      window.api.open(filePath);
    };
    rm.querySelector('[data-file-act="zoom"]').onclick = ev => {
      ev.stopPropagation();
      selectActiveRoom(filePath);
      camZoom = 1.95;
      camX = -entry.x * camZoom;
      camY = -entry.y * camZoom;
      updateCameraAndLens();
    };
    rm.querySelector('[data-file-act="close"]').onclick = ev => {
      ev.stopPropagation();
      rm.remove();
      fileViewerMap.delete(filePath);
      if (layout.fileRooms) delete layout.fileRooms[filePath];
      const bIdx = bridges.findIndex(b => b.toPath === filePath || b.fromPath === filePath);
      if (bIdx !== -1) bridges.splice(bIdx, 1);
      drawBridges();
      updateCameraAndLens();
      persist();
    };

    const wireFileResize = (handleEl, doW, doH) => {
      handleEl.addEventListener('mousedown', ev => {
        ev.stopPropagation(); ev.preventDefault();
        selectActiveRoom(filePath);
        const sx = ev.clientX, sy = ev.clientY;
        const startW = entry.w, startH = entry.h;
        const onMove = mv => {
          if (doW) entry.w = Math.max(220, Math.min(2600, Math.round(startW + (mv.clientX - sx) / camZoom)));
          if (doH) entry.h = Math.max(140, Math.min(1800, Math.round(startH + (mv.clientY - sy) / camZoom)));
          rm.style.setProperty('--room-w', entry.w + 'px');
          rm.style.setProperty('--room-h', entry.h + 'px');
          rm.querySelector('.rm-dims').textContent = `${entry.w}×${entry.h}`;
          layout.fileRooms[filePath] = { ...(layout.fileRooms[filePath] || {}), x: entry.x, y: entry.y, w: entry.w, h: entry.h };
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          updateCameraAndLens();
          persist();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    };
    wireFileResize(rm.querySelector('.rz-r'), true, false);
    wireFileResize(rm.querySelector('.rz-b'), false, true);
    wireFileResize(rm.querySelector('.rz-br'), true, true);

    const bodyEl = rm.querySelector('.map-file-body');
    if (isImage) {
      bodyEl.innerHTML = `<img src="${fileUrl(filePath)}" alt="${fileName}" loading="lazy">`;
    } else if (isVideo) {
      bodyEl.innerHTML = `<video controls autoplay="false" src="${fileUrl(filePath)}" style="max-width:100%;max-height:100%"></video>`;
    } else if (isAudio) {
      bodyEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:14px;box-sizing:border-box"><audio controls src="${fileUrl(filePath)}" style="width:100%"></audio></div>`;
    } else if (isPdf) {
      bodyEl.innerHTML = `<iframe src="file:///${filePath.replace(/\\/g, '/')}" style="width:100%;height:100%;border:none"></iframe>`;
    } else {
      const preview = await window.api.readPreview(filePath);
      if (preview && typeof preview.text === 'string') {
        const pre = document.createElement('pre');
        pre.className = 'file-viewer-text';
        pre.textContent = preview.text;
        bodyEl.innerHTML = '';
        bodyEl.appendChild(pre);
      } else {
        bodyEl.innerHTML = `<div style="padding:16px;color:var(--muted);font-size:12px">Binary file<br><br><button class="dash-btn" style="padding:4px 10px" onclick="window.api.open('${filePath.replace(/\\/g, '\\\\')}')">Open in Native Windows App</button></div>`;
      }
    }

    selectActiveRoom(filePath);
    updateCameraAndLens();
    persist();
    return entry;
  }

  async function spawnTerminalIsland(targetDir = dir, name = 'Terminal', prefPos = null) {
    const termKey = 'terminal:' + targetDir;
    if (terminalMap.has(termKey)) {
      selectActiveRoom(termKey);
      return terminalMap.get(termKey);
    }
    const w = 520, h = 340;
    const parRm = roomMap.get(targetDir);
    const freePos = prefPos || findFreeRoomPos(
      parRm ? parRm.x + 380 : 450,
      parRm ? parRm.y - 150 : -250,
      w, h,
      parRm ? parRm.x : 0,
      parRm ? parRm.y : 0
    );

    const rm = document.createElement('div');
    rm.className = 'map-room terminal-room active-room';
    rm.dataset.roomPath = termKey;
    rm.style.left = freePos.x + 'px';
    rm.style.top = freePos.y + 'px';
    rm.style.setProperty('--room-w', w + 'px');
    rm.style.setProperty('--room-h', h + 'px');
    rm.style.setProperty('--room-border-color', '#38bdf8');

    let currentShell = 'powershell';
    rm.innerHTML = `
      <div class="map-room-head">
        <div class="rm-title">
          <span>📟</span>
          <span class="rm-name">Terminal — ${name}</span>
        </div>
        <div class="rm-actions">
          <select class="term-shell-sel" style="font-size:10px;height:18px">
            <option value="powershell">PowerShell</option>
            <option value="cmd">CMD</option>
          </select>
          <button data-rm="clear" title="Clear console output">🧹 Clear</button>
          <button data-rm="external" title="Launch external terminal window">↗️ External</button>
          <button data-rm="close" title="Close this Terminal Island">×</button>
        </div>
      </div>
      <div class="terminal-island-body">
        <div class="terminal-island-logs">
          <div class="term-line term-sys">Peek Explorer Terminal Island in ${targetDir}</div>
          <div class="term-line term-sys">Type any command below and hit Enter.</div>
        </div>
        <div class="terminal-island-input-row">
          <span class="term-prompt">PS></span>
          <input type="text" class="term-input" placeholder="e.g. dir, ls, git status" autocomplete="off" spellcheck="false">
        </div>
      </div>
      <div class="rz-r" title="Drag to resize width"></div>
      <div class="rz-b" title="Drag to resize height"></div>
      <div class="rz-br" title="Drag to resize">◢</div>
    `;

    const logsEl = rm.querySelector('.terminal-island-logs');
    const inputEl = rm.querySelector('.term-input');
    const promptEl = rm.querySelector('.term-prompt');
    const shellSel = rm.querySelector('.term-shell-sel');

    shellSel.onchange = () => {
      currentShell = shellSel.value;
      promptEl.textContent = currentShell === 'cmd' ? 'CMD>' : 'PS>';
      inputEl.focus();
    };

    rm.querySelector('[data-rm="clear"]').onclick = e => {
      e.stopPropagation();
      logsEl.innerHTML = `<div class="term-line term-sys">Terminal cleared.</div>`;
    };

    rm.querySelector('[data-rm="external"]').onclick = e => {
      e.stopPropagation();
      window.api.openTerminal(targetDir, currentShell);
    };

    rm.querySelector('[data-rm="close"]').onclick = e => {
      e.stopPropagation();
      rm.remove();
      terminalMap.delete(termKey);
      for (let i = bridges.length - 1; i >= 0; i--) {
        if (bridges[i].toPath === termKey || bridges[i].fromPath === termKey) bridges.splice(i, 1);
      }
      layout.bridges = bridges.map(b => ({ fromPath: b.fromPath, toPath: b.toPath }));
      drawBridges();
      updateCameraAndLens();
    };

    const runCmd = async () => {
      const cmdText = inputEl.value.trim();
      if (!cmdText) return;
      inputEl.value = '';

      const inLine = document.createElement('div');
      inLine.className = 'term-line term-in';
      inLine.textContent = `${promptEl.textContent} ${cmdText}`;
      logsEl.appendChild(inLine);

      const res = await window.api.runTerminalCmd({ shell: currentShell, cmd: cmdText, cwd: targetDir });
      if (res.stdout) {
        const outLine = document.createElement('div');
        outLine.className = 'term-line term-out';
        outLine.textContent = res.stdout;
        logsEl.appendChild(outLine);
      }
      if (res.stderr) {
        const errLine = document.createElement('div');
        errLine.className = 'term-line term-err';
        errLine.textContent = res.stderr;
        logsEl.appendChild(errLine);
      }
      logsEl.scrollTop = logsEl.scrollHeight;
      inputEl.focus();
    };

    inputEl.onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runCmd();
      }
    };

    const entry = { path: termKey, name: `Terminal — ${name}`, x: freePos.x, y: freePos.y, w, h, el: rm, isTerminal: true };
    terminalMap.set(termKey, entry);
    if (parRm) {
      bridges.push({ fromPath: targetDir, toPath: termKey });
      layout.bridges = bridges.map(b => ({ fromPath: b.fromPath, toPath: b.toPath }));
    }
    world.appendChild(rm);

    rm.addEventListener('mousedown', () => selectActiveRoom(termKey));
    selectActiveRoom(termKey);
    drawBridges();
    updateCameraAndLens();
    return entry;
  }


  function drawBridges() {
    bridgeSvg.innerHTML = '';
    for (const b of bridges) {
      const a = roomMap.get(b.fromPath) || htmlMap.get(b.fromPath) || fileViewerMap.get(b.fromPath) || browserMap.get(b.fromPath) || terminalMap.get(b.fromPath);
      const c = roomMap.get(b.toPath) || htmlMap.get(b.toPath) || fileViewerMap.get(b.toPath) || browserMap.get(b.toPath) || terminalMap.get(b.toPath);
      if (!a || !c) continue;

      // Originate bridge directly at the folder row's Y position in parent room a towards child room c
      let startX = a.x;
      let startY = a.y;
      if (a.el) {
        const folderRow = a.el.querySelector(`.room-item[data-subpath="${b.toPath}"]`);
        if (folderRow && folderRow.offsetParent) {
          const rowMidY = folderRow.offsetTop + folderRow.offsetHeight / 2;
          startY = Math.max(a.y - a.h / 2 + 16, Math.min(a.y + a.h / 2 - 16, (a.y - a.h / 2) + rowMidY));
        }
      }

      // Calculate perimeter border intersection points so bridge never cuts across room interior!
      const p1 = getRectBorderIntersection(startX, startY, a.w, a.h, c.x, c.y);
      const p2 = getRectBorderIntersection(c.x, c.y, c.w, c.h, p1.x, p1.y);

      const casing = document.createElementNS(svgNS, 'line');
      casing.setAttribute('class', 'bridge-casing');
      casing.setAttribute('x1', p1.x); casing.setAttribute('y1', p1.y);
      casing.setAttribute('x2', p2.x); casing.setAttribute('y2', p2.y);
      const plank = document.createElementNS(svgNS, 'line');
      plank.setAttribute('class', 'bridge-plank');
      plank.setAttribute('x1', p1.x); plank.setAttribute('y1', p1.y);
      plank.setAttribute('x2', p2.x); plank.setAttribute('y2', p2.y);
      if (c.isFileViewer || c.isHtml || c.isTerminal) {
        plank.style.stroke = '#38bdf8'; // Cyan bridge for active open file/html/terminal island
        plank.style.strokeDasharray = '6 4';
        plank.style.strokeWidth = '3px';
      } else if (c.roomColor) {
        plank.style.stroke = c.roomColor;
      } else if (c.depth > 1) {
        plank.style.stroke = '#10b981'; // Constructive depth descent
      }
      bridgeSvg.append(casing, plank);
    }
  }

  // Rain Puddle Field & Random Room Ripple Engine
  if (window._activePuddleTimer) {
    clearTimeout(window._activePuddleTimer);
    window._activePuddleTimer = null;
  }
  let activeRipplingRooms = 0;
  function scheduleNextRaindrop() {
    if (landscapePalette !== 'rain-puddle' || !document.body.contains(viewport)) return;
    const minMs = Math.max(200, (parseFloat(puddleIntervalMin) || 2) * 1000);
    const maxMs = Math.max(minMs + 200, (parseFloat(puddleIntervalMax) || 8) * 1000);
    const delayMs = Math.round(minMs + Math.random() * (maxMs - minMs));

    window._activePuddleTimer = setTimeout(() => {
      if (landscapePalette !== 'rain-puddle' || !document.body.contains(viewport)) return;
      const unlockedRooms = [...roomMap.values()].filter(r => !(lockFrame && lockBg) && !(r.lockFrame || r.lockBg) && !r.el.classList.contains('puddle-ripple-room'));
      const maxConc = Math.max(1, parseInt(puddleMaxConcurrent, 10) || 4);
      if (unlockedRooms.length > 0 && activeRipplingRooms < maxConc) {
        const targetRm = unlockedRooms[Math.floor(Math.random() * unlockedRooms.length)];
        const dropX = Math.round(targetRm.x + (Math.random() - 0.5) * 180);
        const dropY = Math.round(targetRm.y + (Math.random() - 0.5) * 140);
        const durSec = Math.max(1, parseFloat(puddleRippleDuration) || 5);

        // 1. Spawn visual raindrop ripple wave on the 2D field
        const ring = document.createElement('div');
        ring.className = 'field-raindrop-ripple';
        ring.style.left = dropX + 'px';
        ring.style.top = dropY + 'px';
        ring.style.setProperty('--puddle-duration', `${durSec}s`);
        world.appendChild(ring);
        setTimeout(() => ring.remove(), durSec * 1000 + 100);

        // 2. Any unlocked room touched by the raindrop wave ripples in response
        const hitRooms = unlockedRooms
          .map(r => ({ r, dist: Math.hypot(r.x - dropX, r.y - dropY) }))
          .filter(x => x.dist <= 440)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, Math.max(1, maxConc - activeRipplingRooms));

        for (const { r, dist } of hitRooms) {
          const waveLagMs = Math.round((dist / 440) * 600);
          activeRipplingRooms++;
          setTimeout(() => {
            if (!r.el || !document.body.contains(r.el)) { activeRipplingRooms = Math.max(0, activeRipplingRooms - 1); return; }
            r.el.style.setProperty('--puddle-duration', `${durSec}s`);
            r.el.classList.add('puddle-ripple-room');
            if (breathAffectTiles) r.el.classList.add('affect-tiles');
            setTimeout(() => {
              r.el.classList.remove('puddle-ripple-room', 'affect-tiles');
              activeRipplingRooms = Math.max(0, activeRipplingRooms - 1);
            }, durSec * 1000);
          }, waveLagMs);
        }
      }
      scheduleNextRaindrop();
    }, delayMs);
  }
  if (landscapePalette === 'rain-puddle') {
    scheduleNextRaindrop();
  }

  // Two-Rectangle Edge Lens (Image 2):
  // Off-screen Rooms project strictly OUTSIDE `.lens-inner-frame` (`inset: 64px`) in shrinking columns!
  function updateCameraAndLens() {
    const cr = viewport.getBoundingClientRect();
    const W = cr.width || 850, H = cr.height || 540;
    const cx = W / 2, cy = H / 2;
    world.style.transform = `translate(${Math.round(cx + camX)}px, ${Math.round(cy + camY)}px) scale(${camZoom})`;
    hud.querySelector('.hud-coords').textContent = `Scale: ${Math.round(camZoom * 100)}% · Rooms: ${roomMap.size}${htmlMap.size ? ' · HTML: ' + htmlMap.size : ''}${fileViewerMap.size ? ' · Files: ' + fileViewerMap.size : ''}`;

    const margin = 64;
    innerFrame.style.display = edgeLensOn ? 'block' : 'none';
    marginLayer.innerHTML = '';
    if (!edgeLensOn) return;

    const innerL = margin, innerR = W - margin, innerT = margin, innerB = H - margin;
    const offRight = [], offLeft = [], offTop = [], offBottom = [];

    for (const rm of [...roomMap.values(), ...htmlMap.values(), ...fileViewerMap.values(), ...terminalMap.values()]) {
      const sx = cx + camX + rm.x * camZoom;
      const sy = cy + camY + rm.y * camZoom;
      if (sx >= innerL && sx <= innerR && sy >= innerT && sy <= innerB) continue;

      const dx = sx < innerL ? innerL - sx : (sx > innerR ? sx - innerR : 0);
      const dy = sy < innerT ? innerT - sy : (sy > innerB ? sy - innerB : 0);
      const distOut = Math.hypot(dx, dy);
      const item = { rm, sx, sy, distOut };
      if (sx > innerR && dx >= dy) offRight.push(item);
      else if (sx < innerL && dx >= dy) offLeft.push(item);
      else if (sy < innerT) offTop.push(item);
      else offBottom.push(item);
    }

    const renderEdgeQueue = (arr, side) => {
      arr.sort((a, b) => a.distOut - b.distOut);
      const buckets = new Map();
      for (const it of arr) {
        const trackCoord = (side === 'right' || side === 'left')
          ? Math.max(innerT + 22, Math.min(innerB - 22, it.sy))
          : Math.max(innerL + 28, Math.min(innerR - 28, it.sx));
        const bucketKey = Math.round(trackCoord / 42);
        if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
        buckets.get(bucketKey).push(it);
      }

      for (const [bKey, group] of buckets) {
        const trackPos = bKey * 42;
        let stepOffset = 6; // Distance outward from the inner frame line (strictly in the outer margin!)
        group.slice(0, 4).forEach((entry, rank) => {
          const w = Math.max(9, Math.round(26 - rank * 5));
          const h = Math.max(9, Math.round(22 - rank * 4));
          const proxy = document.createElement('div');
          proxy.className = 'lens-proxy ' + (entry.rm.isHtml ? 'is-html' : 'is-room') + (w < 17 ? ' tiny' : '');
          proxy.style.setProperty('--px-w', w + 'px');
          proxy.style.setProperty('--px-h', h + 'px');

          const centerDist = stepOffset + (side === 'right' || side === 'left' ? w / 2 : h / 2);
          let px = trackPos, py = trackPos;
          if (side === 'right') { px = Math.min(W - w / 2 - 2, innerR + centerDist); py = trackPos; }
          else if (side === 'left') { px = Math.max(w / 2 + 2, innerL - centerDist); py = trackPos; }
          else if (side === 'top') { px = trackPos; py = Math.max(h / 2 + 2, innerT - centerDist); }
          else { px = trackPos; py = Math.min(H - h / 2 - 2, innerB + centerDist); }
          stepOffset += (side === 'right' || side === 'left' ? w : h) + 3;

          proxy.style.left = Math.round(px) + 'px';
          proxy.style.top = Math.round(py) + 'px';
          proxy.innerHTML = `<span class="lp-lbl">${entry.rm.name}</span>`;
          proxy.title = `${entry.rm.isHtml ? '🌐 HTML' : '🏝️ Room'}: ${entry.rm.name} (${Math.round(entry.distOut)}px beyond Inner Frame)\n• Click: Move camera here\n• Double-click: Zoom inside`;
          proxy.onclick = e => {
            e.stopPropagation();
            selectActiveRoom(entry.rm.path);
            camX = -entry.rm.x * camZoom;
            camY = -entry.rm.y * camZoom;
            updateCameraAndLens();
          };
          proxy.ondblclick = e => {
            e.stopPropagation();
            selectActiveRoom(entry.rm.path);
            camZoom = entry.rm.isHtml ? 1.6 : 2.05;
            camX = -entry.rm.x * camZoom;
            camY = -entry.rm.y * camZoom;
            updateCameraAndLens();
          };
          proxy.addEventListener('auxclick', e => {
            if (e.button === 1) {
              e.preventDefault(); e.stopPropagation();
              newTab(entry.rm.path, [], e.shiftKey);
            }
          });
          marginLayer.appendChild(proxy);
        });
      }
    };

    renderEdgeQueue(offRight, 'right');
    renderEdgeQueue(offLeft, 'left');
    renderEdgeQueue(offTop, 'top');
    renderEdgeQueue(offBottom, 'bottom');

    drawRadar();
  }

  function drawRadar() {
    const canvas = radarWrap.querySelector('.landscape-radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const rooms = [...roomMap.values()];
    const htmls = [...htmlMap.values()];
    const allIslands = [...rooms, ...htmls];
    const countEl = radarWrap.querySelector('.radar-count');
    if (countEl) countEl.textContent = `${rooms.length} room${rooms.length === 1 ? '' : 's'}${htmls.length ? ` · ${htmls.length} html` : ''}`;
    if (!allIslands.length) return;

    let minX = -1200, maxX = 1200, minY = -800, maxY = 800;
    for (const r of allIslands) {
      minX = Math.min(minX, r.x - r.w / 2 - 150);
      maxX = Math.max(maxX, r.x + r.w / 2 + 150);
      minY = Math.min(minY, r.y - r.h / 2 - 150);
      maxY = Math.max(maxY, r.y + r.h / 2 + 150);
    }
    const worldW = Math.max(1400, maxX - minX);
    const worldH = Math.max(900, maxY - minY);
    const scale = Math.min((cw - 16) / worldW, (ch - 16) / worldH);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const toRadarX = wx => cw / 2 + (wx - midX) * scale;
    const toRadarY = wy => ch / 2 + (wy - midY) * scale;

    // Draw bridges
    ctx.strokeStyle = darkMode ? 'rgba(88, 166, 255, 0.25)' : 'rgba(0, 120, 212, 0.35)';
    ctx.lineWidth = 1;
    for (const r of rooms) {
      if (r.parentPath && roomMap.has(r.parentPath)) {
        const pr = roomMap.get(r.parentPath);
        ctx.beginPath();
        ctx.moveTo(toRadarX(pr.x), toRadarY(pr.y));
        ctx.lineTo(toRadarX(r.x), toRadarY(r.y));
        ctx.stroke();
      }
    }

    // Draw room boxes
    for (const r of rooms) {
      const rx = toRadarX(r.x - r.w / 2);
      const ry = toRadarY(r.y - r.h / 2);
      const rw = Math.max(5, r.w * scale);
      const rh = Math.max(4, r.h * scale);
      const isRoot = r.path === dir;
      const isFilterHit = r.el.classList.contains('radar-ping');

      if (isFilterHit) {
        ctx.fillStyle = '#f0b445';
        ctx.strokeStyle = '#ffffff';
      } else if (isRoot) {
        ctx.fillStyle = '#0078d4';
        ctx.strokeStyle = '#58a6ff';
      } else {
        ctx.fillStyle = darkMode ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.16)';
        ctx.strokeStyle = darkMode ? 'rgba(88, 166, 255, 0.5)' : 'rgba(0, 120, 212, 0.5)';
      }
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
    }

    // Draw HTML Viewer islands on radar
    for (const h of htmls) {
      const hx = toRadarX(h.x - h.w / 2);
      const hy = toRadarY(h.y - h.h / 2);
      const hw = Math.max(5, h.w * scale);
      const hh = Math.max(4, h.h * scale);
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.fillRect(hx, hy, hw, hh);
      ctx.strokeRect(hx, hy, hw, hh);
    }

    // Draw camera frustum box
    const vr = viewport.getBoundingClientRect();
    const visLeft = (-camX - vr.width / 2) / camZoom;
    const visRight = (-camX + vr.width / 2) / camZoom;
    const visTop = (-camY - vr.height / 2) / camZoom;
    const visBottom = (-camY + vr.height / 2) / camZoom;

    const fx = toRadarX(visLeft);
    const fy = toRadarY(visTop);
    const fw = (visRight - visLeft) * scale;
    const fh = (visBottom - visTop) * scale;

    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fx, fy, fw, fh);
    ctx.fillStyle = 'rgba(0, 230, 118, 0.08)';
    ctx.fillRect(fx, fy, fw, fh);
  }
  window._updateLandscapeRadar = drawRadar;

  // Radar pointer click / drag to warp
  let radarDragging = false;
  const warpFromRadar = ev => {
    const canvas = radarWrap.querySelector('.landscape-radar-canvas');
    if (!canvas) return;
    const cr = canvas.getBoundingClientRect();
    const rx = ev.clientX - cr.left;
    const ry = ev.clientY - cr.top;

    const allIslands = [...roomMap.values(), ...htmlMap.values()];
    if (!allIslands.length) return;
    let minX = -1200, maxX = 1200, minY = -800, maxY = 800;
    for (const r of allIslands) {
      minX = Math.min(minX, r.x - r.w / 2 - 150);
      maxX = Math.max(maxX, r.x + r.w / 2 + 150);
      minY = Math.min(minY, r.y - r.h / 2 - 150);
      maxY = Math.max(maxY, r.y + r.h / 2 + 150);
    }
    const worldW = Math.max(1400, maxX - minX);
    const worldH = Math.max(900, maxY - minY);
    const scale = Math.min((canvas.width - 16) / worldW, (canvas.height - 16) / worldH);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const targetWx = midX + (rx - canvas.width / 2) / scale;
    const targetWy = midY + (ry - canvas.height / 2) / scale;

    camX = -targetWx * camZoom;
    camY = -targetWy * camZoom;
    updateCameraAndLens();
  };

  radarWrap.addEventListener('mousedown', e => {
    e.stopPropagation();
    radarDragging = true;
    warpFromRadar(e);
  });
  window.addEventListener('mousemove', e => {
    if (radarDragging) warpFromRadar(e);
  });
  window.addEventListener('mouseup', () => {
    radarDragging = false;
  });

  // Canvas Panning vs Shift-Marquee Selection
  let panStartX = 0, panStartY = 0, isPanning = false, isMarquee = false;
  let marqueeBasePaths = new Set();

  viewport.addEventListener('mousedown', e => {
    // Universal Camera Pan hotkey (default Alt + Click) or Middle Click ANYWHERE pans the global camera!
    const isAltPan = matchesModifiers(e, 'modCameraPan') && (e.button === 0 || e.button === 1);
    const isMiddlePan = e.button === 1;

    if (!isAltPan && !isMiddlePan) {
      if (e.target.closest('.map-room') || e.target.closest('.map-hud') || e.target.closest('.lens-proxy') || e.target.closest('.landscape-radar')) return;
      if (e.button !== 0) return;
    }

    panStartX = e.clientX;
    panStartY = e.clientY;
    isPanning = false;
    isMarquee = false;

    // Shift + Left Click = Marquee selection box
    if (e.button === 0 && e.shiftKey) {
      isMarquee = true;
      marqueeBasePaths = new Set(selected.keys());
      const cr = viewport.getBoundingClientRect();
      const mStartX = e.clientX - cr.left;
      const mStartY = e.clientY - cr.top;

      const onMarqueeMove = ev => {
        const curX = ev.clientX - cr.left, curY = ev.clientY - cr.top;
        const x1 = Math.min(mStartX, curX), y1 = Math.min(mStartY, curY);
        const x2 = Math.max(mStartX, curX), y2 = Math.max(mStartY, curY);
        marqueeEl.style.display = 'block';
        marqueeEl.style.left = x1 + 'px';
        marqueeEl.style.top = y1 + 'px';
        marqueeEl.style.width = (x2 - x1) + 'px';
        marqueeEl.style.height = (y2 - y1) + 'px';

        const mr = marqueeEl.getBoundingClientRect();
        for (const row of visibleRows()) {
          const br = row.getBoundingClientRect();
          const hit = !(br.right < mr.left || br.left > mr.right || br.bottom < mr.top || br.top > mr.bottom);
          setRowSelected(row._item, row, hit || marqueeBasePaths.has(row._item.path));
        }
        updateStatus();
      };

      const onMarqueeUp = () => {
        marqueeEl.style.display = 'none';
        window.removeEventListener('mousemove', onMarqueeMove);
        window.removeEventListener('mouseup', onMarqueeUp);
      };

      window.addEventListener('mousemove', onMarqueeMove);
      window.addEventListener('mouseup', onMarqueeUp);
      return;
    }

    // Normal Left Click / Middle Click = PURE CAMERA PANNING (Zero Item Selection Bleed!)
    const sx = e.clientX - camX, sy = e.clientY - camY;
    let panRaf = null;

    const onPanMove = ev => {
      if (!isPanning && Math.hypot(ev.clientX - panStartX, ev.clientY - panStartY) < 4) return;
      if (!isPanning) {
        isPanning = true;
        viewport.classList.add('panning');
      }
      camX = ev.clientX - sx;
      camY = ev.clientY - sy;
      if (!panRaf) {
        panRaf = requestAnimationFrame(() => {
          updateCameraAndLens();
          panRaf = null;
        });
      }
    };

    const onPanUp = () => {
      if (panRaf) { cancelAnimationFrame(panRaf); panRaf = null; }
      updateCameraAndLens();
      viewport.classList.remove('panning');
      window.removeEventListener('mousemove', onPanMove);
      window.removeEventListener('mouseup', onPanUp);

      // Clean single click on empty canvas (movement < 4px): clear selection
      if (!isPanning && e.button === 0 && !e.ctrlKey) {
        clearSelection();
        updateStatus();
      }
    };

    window.addEventListener('mousemove', onPanMove);
    window.addEventListener('mouseup', onPanUp);
  });

  // Overhauled Wheel Listener:
  // 1. Shift + Scroll: ALWAYS zooms the landscape camera in/out anywhere!
  // 2. Alt + Scroll: Resizes room file icons for the room under cursor!
  // 3. Normal Scroll: Scrolls room body, file viewers, and web browsers naturally without intercepting!
  viewport.addEventListener('wheel', e => {
    // When Magnifier Loupe is active, scrolling adjusts Loupe magnification factor (1.4x .. 4.5x)!
    if (loupeActive) {
      e.preventDefault(); e.stopPropagation();
      loupeMag = Math.max(1.4, Math.min(4.5, +(loupeMag + (e.deltaY < 0 ? 0.25 : -0.25)).toFixed(2)));
      updateLoupePosition();
      return;
    }

    const targetRoomEl = e.target.closest('.map-room');

    // Room Box Width & Height Scale (default Alt + Shift + Scroll)
    if (targetRoomEl && matchesModifiers(e, 'modRoomScale', true)) {
      e.preventDefault(); e.stopPropagation();
      const rPath = targetRoomEl.dataset.roomPath;
      const r = roomMap.get(rPath);
      if (r) {
        const factor = e.deltaY < 0 ? 1.1 : 0.91;
        r.w = Math.max(260, Math.min(2600, Math.round(r.w * factor)));
        r.h = Math.max(180, Math.min(1800, Math.round(r.h * factor)));
        r.el.style.setProperty('--room-w', r.w + 'px');
        r.el.style.setProperty('--room-h', r.h + 'px');
        const dims = r.el.querySelector('.rm-dims');
        if (dims) dims.textContent = `${r.w}×${r.h}`;
        layout.rooms[rPath] = { ...(layout.rooms[rPath] || {}), w: r.w, h: r.h };
        drawBridges();
      }
      return;
    }

    // Indoor Room Tile & Icon Zoom (default Alt + Scroll or Ctrl + Scroll)
    if (targetRoomEl && (matchesModifiers(e, 'modIndoorZoom', true) || (e.ctrlKey && !e.shiftKey && !e.altKey))) {
      e.preventDefault(); e.stopPropagation();
      const rPath = targetRoomEl.dataset.roomPath;
      const r = roomMap.get(rPath) || htmlMap.get(rPath) || fileViewerMap.get(rPath);
      if (r) {
        if (!r.indoorScale) r.indoorScale = 1.0;
        const factor = e.deltaY < 0 ? 1.14 : 0.88;
        r.indoorScale = Math.max(0.4, Math.min(3.5, +(r.indoorScale * factor).toFixed(2)));
        const bodyEl = r.el.querySelector('.map-room-body') || r.el.querySelector('.map-file-body') || r.el.querySelector('.map-html-body');
        if (bodyEl) {
          bodyEl.style.zoom = r.indoorScale;
          bodyEl.style.setProperty('--indoor-scale', r.indoorScale);
          r.el.classList.add('indoor-zoomed');
        }
        let badge = r.el.querySelector('.rm-zoom-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'rm-zoom-badge';
          r.el.appendChild(badge);
        }
        badge.textContent = `🔍 ${Math.round(r.indoorScale * 100)}%`;
        badge.style.opacity = '1';
        clearTimeout(badge._fadeTimer);
        badge._fadeTimer = setTimeout(() => { badge.style.opacity = '0'; }, 1000);
      }
      return;
    }

    if (matchesModifiers(e, 'modCameraZoom')) {
      e.preventDefault();
      const cr = viewport.getBoundingClientRect();
      const mx = (e.clientX - cr.left) - cr.width / 2;
      const my = (e.clientY - cr.top) - cr.height / 2;
      const oldZ = camZoom;
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      camZoom = Math.max(0.22, Math.min(3.2, +(camZoom * factor).toFixed(2)));
      camX = mx - (mx - camX) * (camZoom / oldZ);
      camY = my - (my - camY) * (camZoom / oldZ);
      updateCameraAndLens();
      return;
    }

    // Normal scroll over rooms or open file viewer bodies must scroll naturally
    if (e.target.closest('.map-room-body') || e.target.closest('.map-file-body') || e.target.closest('.file-viewer-text') || e.target.closest('.map-html-body') || e.target.closest('.map-browser-body')) {
      return;
    }

    // Over empty canvas: zoom camera
    e.preventDefault();
    const cr = viewport.getBoundingClientRect();
    const mx = (e.clientX - cr.left) - cr.width / 2;
    const my = (e.clientY - cr.top) - cr.height / 2;
    const oldZ = camZoom;
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    camZoom = Math.max(0.22, Math.min(3.2, +(camZoom * factor).toFixed(2)));
    camX = mx - (mx - camX) * (camZoom / oldZ);
    camY = my - (my - camY) * (camZoom / oldZ);
    updateCameraAndLens();
  }, { passive: false });

  // Canvas Drag & Drop onto empty landscape
  viewport.addEventListener('dragover', e => {
    if (!hasSupportedDrop(e.dataTransfer.types)) return;
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  });
  viewport.addEventListener('drop', async e => {
    if (e.target.closest('.map-room') || e.target.closest('.map-hud') || e.target.closest('.landscape-radar')) return;
    if (!hasSupportedDrop(e.dataTransfer.types)) return;
    e.preventDefault(); e.stopPropagation();
    const cr = viewport.getBoundingClientRect();
    const wx = Math.round((e.clientX - cr.left - cr.width / 2 - camX) / camZoom);
    const wy = Math.round((e.clientY - cr.top - cr.height / 2 - camY) / camZoom);

    let paths = [];
    const raw = e.dataTransfer.getData(MIME_PATHS);
    if (raw) {
      try { paths = JSON.parse(raw); } catch (_) {}
    }
    if (!paths.length && e.dataTransfer.files && e.dataTransfer.files.length) {
      for (const f of e.dataTransfer.files) {
        const p = window.api.getPathForFile(f);
        if (p) paths.push(p);
      }
    }
    if (!paths.length) return;

    const parentDirs = new Set(paths.map(p => parent(p)));
    const allFiles = paths.filter(p => !roomMap.has(p));

    if (paths.length > 0 && allFiles.length === paths.length && parentDirs.size === 1) {
      const parentDir = [...parentDirs][0];
      const res = await window.api.newFolder(parentDir);
      if (res && res.path) {
        // Correct order: mode ('cut'), source paths array, destination folder path
        await window.api.paste('cut', paths, res.path);
        if (roomMap.has(parentDir)) {
          const parRm = roomMap.get(parentDir);
          if (parRm && parRm.populate) await parRm.populate();
          syncDoorwayBadges();
        }
        const newRm = await spawnRoom(res.path, baseName(res.path), parentDir, (roomMap.get(parentDir)?.depth || 0) + 1, { x: wx, y: wy });
        if (newRm && newRm.populate) await newRm.populate();
        autoFitRoom(newRm);
        resolveRoomCollisions();
        syncDoorwayBadges();
        drawBridges();
        selectActiveRoom(res.path);
        updateCameraAndLens();
        persist();
        return;
      }
    }

    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      const offsetPos = { x: wx + i * 80, y: wy + i * 60 };
      if (/\.html?$/i.test(p)) {
        await spawnHtmlIsland(p, baseName(p), offsetPos);
      } else {
        await spawnFolderIsland(p, baseName(p));
      }
    }
  });

  // Canvas Right-Click Context Menu on empty background
  viewport.addEventListener('contextmenu', e => {
    if (e.target.closest('.map-room') || e.target.closest('.map-hud') || e.target.closest('.landscape-radar') || e.target.closest('.lens-proxy')) return;
    e.preventDefault(); e.stopPropagation();
    const cr = viewport.getBoundingClientRect();
    const clickWx = Math.round((e.clientX - cr.left - cr.width / 2 - camX) / camZoom);
    const clickWy = Math.round((e.clientY - cr.top - cr.height / 2 - camY) / camZoom);

    fillMenu([
      { label: '➕ Spawn Folder from Disk here...', run: async () => { const f = await window.api.pickFolder(); if (f) await spawnFolderIsland(f, baseName(f), { x: clickWx, y: clickWy }); } },
      { label: '📄 Spawn HTML Viewer here...', run: async () => { const h = await window.api.pickHtmlFile(); if (h) await spawnHtmlIsland(h, baseName(h), null, { x: clickWx, y: clickWy }); } },
      '-',
      { label: '⊞ Tidy / Auto-Arrange Rooms', run: () => hud.querySelector('[data-act="reset"]')?.click() },
      { label: '⤢ Auto-Size All Rooms', run: () => hud.querySelector('[data-act="fitall"]')?.click() },
      { label: '🗺️ Reset to World Scale', run: () => hud.querySelector('[data-act="world"]')?.click() },
      '-',
      { label: '📁 New Folder in Active Room', run: async () => {
        const tPath = activeRoomPath || dir;
        const r = await window.api.newFolder(tPath);
        if (!r.error) {
          const actRm = roomMap.get(tPath);
          if (actRm && actRm.populate) await actRm.populate();
        }
      }}
    ]);
    placeMenu(e.clientX, e.clientY);
  });

  // HUD Buttons & Sliders (W, H, File Size)
  hud.addEventListener('auxclick', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn || e.button !== 1) return;
    e.stopPropagation(); e.preventDefault();
    const act = btn.dataset.act;
    if (act === 'enter') {
      const target = roomMap.get(activeRoomPath) || roomMap.get(dir);
      if (target) newTab(target.path, [], e.shiftKey);
    } else if (act === 'world') {
      newTab(dir, [], e.shiftKey);
    }
  });
  hud.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    e.stopPropagation();
    const act = btn.dataset.act;
    if (act === 'world') {
      camZoom = 0.62; camX = 0; camY = 0; updateCameraAndLens();
    } else if (act === 'enter') {
      const target = roomMap.get(activeRoomPath) || roomMap.get(dir);
      if (target) {
        camZoom = 2.05;
        camX = -target.x * camZoom;
        camY = -target.y * camZoom;
        updateCameraAndLens();
      }
    } else if (act === 'spawn-folder') {
      const f = await window.api.pickFolder();
      if (f) await spawnFolderIsland(f);
    } else if (act === 'spawn-html') {
      const h = await window.api.pickHtmlFile();
      if (h) await spawnHtmlIsland(h);
    } else if (act === 'reset') {
      layout.rooms = {};
      persist();
      renderLandscape(dir, container, onNavigate, false);
    } else if (act === 'fitall') {
      for (const r of roomMap.values()) autoFitRoom(r);
      resolveRoomCollisions();
      drawBridges();
      updateCameraAndLens();
      persist();
    } else if (act === 'lens') {
      edgeLensOn = !edgeLensOn;
      btn.classList.toggle('active', edgeLensOn);
      btn.textContent = `🖼️ Edge Lens: ${edgeLensOn ? 'ON' : 'OFF'}`;
      updateCameraAndLens();
    } else if (act === 'loupe') {
      loupePinned = !loupePinned;
      setLoupeActive(loupePinned);
    }
  });

  const gViewSelect = hud.querySelector('select[data-hud="global-view"]');
  if (gViewSelect) {
    gViewSelect.onchange = e => {
      e.stopPropagation();
      globalView = e.target.value;
      layout.globalView = globalView;
      for (const r of roomMap.values()) {
        const localSel = r.el.querySelector('.rm-view-sel');
        if (localSel) {
          const inheritOpt = localSel.querySelector('option[value="inherit"]');
          if (inheritOpt) inheritOpt.textContent = `👁 Auto (${globalView})`;
        }
        const saved = layout.rooms[r.path];
        if (!saved || !saved.view || saved.view === 'inherit') {
          const bodyEl = r.el.querySelector('.map-room-body');
          if (bodyEl) bodyEl.className = 'map-room-body v-' + globalView;
        }
      }
      persist();
    };
  }

  hud.querySelectorAll('input[type="range"]').forEach(sl => {
    sl.addEventListener('input', e => {
      e.stopPropagation();
      const kind = sl.dataset.sl;
      const val = +sl.value;
      if (kind === 'f') {
        indoorFileSz = val;
        layout.fileSz = val;
        container.style.setProperty('--file-sz', val + 'px');
        persist();
      } else if (kind === 'w' || kind === 'h') {
        const targets = activeRoomPath === dir ? [...roomMap.values()] : [roomMap.get(activeRoomPath)].filter(Boolean);
        for (const r of targets) {
          applyRoomSize(r, kind === 'w' ? val : r.w, kind === 'h' ? val : r.h, false);
        }
        resolveRoomCollisions();
        drawBridges();
        updateCameraAndLens();
        persist();
      }
    });
  });

  // 1. Spawn the Root Room at (0, 0)
  const rootEntry = await spawnRoom(dir, baseName(dir), null, 0, { x: 0, y: 0, ang: 0 });
  // 2. Fast parallel sub-room spawning: restore previously open rooms, or spawn top 4 child rooms on fresh folders
  const savedPaths = new Set(Object.keys(layout.rooms || {}).filter(p => p !== dir));
  const subDirsToSpawn = savedPaths.size > 0
    ? rootEntry.subDirs.filter(sd => savedPaths.has(sd.path))
    : rootEntry.subDirs.slice(0, 4);

  if (subDirsToSpawn.length > 0) {
    await Promise.all(subDirsToSpawn.map((sd, i) => {
      const pref = preferredRingPos(i, subDirsToSpawn.length, 1, 0, 0, 0);
      return spawnRoom(sd.path, sd.name, dir, 1, pref);
    }));
  }

  // Restore any saved rooms outside root subDirs, sorted topologically by path depth so parent rooms ALWAYS spawn before child rooms!
  const sortedSavedPaths = [...savedPaths].sort((a, b) => a.split(/[\\/]/).length - b.split(/[\\/]/).length);
  for (const sp of sortedSavedPaths) {
    if (!roomMap.has(sp)) {
      const savedInfo = layout.rooms[sp];
      const name = baseName(sp);
      const parPath = savedInfo?.parentPath || (roomMap.has(parent(sp)) ? parent(sp) : null);
      const parRm = parPath ? roomMap.get(parPath) : null;
      const trueDepth = parRm ? (parRm.depth + 1) : 1;
      await spawnRoom(sp, name, parPath, trueDepth, { x: savedInfo?.x || 500, y: savedInfo?.y || 0 });
    }
  }

  // Restore saved HTML viewer islands
  if (layout.htmlRooms) {
    for (const [hp, hInfo] of Object.entries(layout.htmlRooms)) {
      await spawnHtmlIsland(hp, baseName(hp), { x: hInfo.x, y: hInfo.y });
    }
  }

  // Restore saved file viewer islands
  if (layout.fileRooms) {
    for (const [fp, fInfo] of Object.entries(layout.fileRooms)) {
      if (!fileViewerMap.has(fp)) {
        const parPath = fInfo.parentPath || (roomMap.has(parent(fp)) ? parent(fp) : null);
        await spawnFileViewerIsland(fp, baseName(fp), parPath, { x: fInfo.x, y: fInfo.y });
      }
    }
  }

  // Restore saved bridges on tab switch / reload
  if (Array.isArray(layout.bridges)) {
    for (const b of layout.bridges) {
      if (!bridges.some(x => x.fromPath === b.fromPath && x.toPath === b.toPath)) {
        bridges.push({ fromPath: b.fromPath, toPath: b.toPath });
      }
    }
  }
  for (const r of roomMap.values()) {
    if (r.parentPath && roomMap.has(r.parentPath)) {
      if (!bridges.some(b => b.fromPath === r.parentPath && b.toPath === r.path)) {
        bridges.push({ fromPath: r.parentPath, toPath: r.path });
      }
    }
  }

  window.__spawnFolderIsland = spawnFolderIsland;
  window.__spawnHtmlIsland = spawnHtmlIsland;
  window.__spawnFileViewerIsland = spawnFileViewerIsland;
  window.__spawnTerminalIsland = spawnTerminalIsland;
  window._landscapeState = {
    roomMap,
    layout,
    viewport,
    dir,
    getActiveRoomPath: () => activeRoomPath,
    syncDoorwayBadges,
    drawBridges
  };

  // 3. Run iterative AABB separation solver so zero rooms overlap even if saved positions collided!
  resolveRoomCollisions();
  syncDoorwayBadges();
  drawBridges();
  applyFilter();
  requestAnimationFrame(updateCameraAndLens);
  return rootEntry.subDirs.length + rootEntry.files.length;
}

async function openFolderInLandscape(folderPath, folderName = null) {
  if (mode !== 'landscape' && mode !== 'lens') {
    mode = 'landscape';
    await show();
  }
  if (typeof window.__spawnFolderIsland === 'function') {
    return await window.__spawnFolderIsland(folderPath, folderName);
  }
}

async function openHtmlInLandscape(filePath, title = null) {
  if (mode !== 'landscape' && mode !== 'lens') {
    mode = 'landscape';
    await show();
  }
  if (typeof window.__spawnHtmlIsland === 'function') {
    return await window.__spawnHtmlIsland(filePath, title);
  }
}

function renderHtmlTab(filePath, container) {
  container.innerHTML = '';
  container.className = 'v-html-tab';

  const toolbar = document.createElement('div');
  toolbar.className = 'html-tab-toolbar';
  toolbar.innerHTML = `
    <div class="html-tab-info">
      <span>🌐</span>
      <span class="html-tab-title"></span>
      <span class="html-tab-path"></span>
    </div>
    <div class="html-tab-actions">
      <button data-act="reload" title="Reload HTML">🔄 Reload</button>
      <button data-act="landscape" title="View in Landscape Map">🗺️ Landscape</button>
      <button data-act="native" title="Open in Native Browser (Windows)">🪟 Native Browser</button>
      <button data-act="reveal" title="Show in Containing Folder">📂 Show in Folder</button>
    </div>
  `;
  toolbar.querySelector('.html-tab-title').textContent = baseName(filePath);
  toolbar.querySelector('.html-tab-path').textContent = filePath;

  const frame = document.createElement('iframe');
  frame.className = 'html-tab-frame';
  frame.src = 'file:///' + filePath.replace(/\\/g, '/');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');

  toolbar.querySelector('[data-act="reload"]').onclick = () => { frame.src = frame.src; };
  toolbar.querySelector('[data-act="landscape"]').onclick = () => { openHtmlInLandscape(filePath, baseName(filePath)); };
  toolbar.querySelector('[data-act="native"]').onclick = () => { window.api.open(filePath); };
  toolbar.querySelector('[data-act="reveal"]').onclick = () => { window.api.showInFolder(filePath); };

  container.append(toolbar, frame);
}

async function renderGluonTopicSpace(targetUri, container) {
  container.innerHTML = '';
  await ensureGluonLoaded();
  const planeFilter = targetUri.replace('peek://gluon', '').replace(/^\/+/, '').toUpperCase();
  const targetPlane = (planeFilter && typeof GluonEngine !== 'undefined' && GluonEngine.PLANES[planeFilter]) ? planeFilter : null;

  const head = document.createElement('div');
  head.className = 'gluon-space-head';
  head.innerHTML = `
    <h2>🧬 Semantic Gluon Topic Space</h2>
    <p>Clustering documents across the <strong>7 Planes of Reality</strong> &amp; <strong>QCD SU(3) Color Gauge</strong>.</p>
    <div class="gluon-prism-bar">
      <div class="gluon-prism-pill ${!targetPlane ? 'active' : ''}" data-plane="">All Planes</div>
      <div class="gluon-prism-pill ${targetPlane === 'Q1' ? 'active' : ''}" data-plane="q1">👤 Q1 Who</div>
      <div class="gluon-prism-pill ${targetPlane === 'Q2' ? 'active' : ''}" data-plane="q2">✨ Q2 What</div>
      <div class="gluon-prism-pill ${targetPlane === 'Q3' ? 'active' : ''}" data-plane="q3">🌍 Q3 Where</div>
      <div class="gluon-prism-pill ${targetPlane === 'Q4' ? 'active' : ''}" data-plane="q4">🎵 Q4 Why</div>
      <div class="gluon-prism-pill ${targetPlane === 'Q5' ? 'active' : ''}" data-plane="q5">⚙️ Q5 How</div>
      <div class="gluon-prism-pill ${targetPlane === 'Q6' ? 'active' : ''}" data-plane="q6">⏳ Q6 Cause</div>
      <div class="gluon-prism-pill ${targetPlane === 'Q7' ? 'active' : ''}" data-plane="q7">💥 Q7 Effect</div>
    </div>
  `;
  container.appendChild(head);

  head.querySelectorAll('.gluon-prism-pill').forEach(pill => {
    pill.onclick = () => {
      const pl = pill.getAttribute('data-plane');
      go(pl ? 'peek://gluon/' + pl : 'peek://gluon');
    };
  });

  // Source folder to cluster: find recent real folder or user home
  let scanDir = recentFolders.find(f => f && f !== HOME_URI && !f.startsWith('peek://'));
  if (!scanDir && cachedPlaces && cachedPlaces.cachedPlaces && cachedPlaces.cachedPlaces.length) {
    scanDir = cachedPlaces.cachedPlaces[0].path;
  }
  if (!scanDir) {
    container.innerHTML += `<div style="padding:20px;color:var(--muted)">Navigate to a folder first to cluster files by Semantic Gluons.</div>`;
    return;
  }

  const listRes = await window.api.list(scanDir);
  if (!listRes || !listRes.items) return;

  const textFiles = listRes.items.filter(it => !it.isDir && /\.(md|txt|json|js|py|html|css)$/i.test(it.name));
  const grid = document.createElement('div');
  grid.className = 'gluon-topic-grid';

  let matchCount = 0;
  for (const it of textFiles) {
    let doc = null;
    const cacheKey = `${it.path}|${it.mtime}|${it.size}`;
    if (gluonCache.has(cacheKey)) {
      doc = gluonCache.get(cacheKey);
    } else if (it.size <= 2 * 1024 * 1024) {
      try {
        const prevRes = await window.api.readPreview(it.path);
        if (prevRes && prevRes.text) doc = getCachedGluonAnalysis(it, prevRes.text);
      } catch (_) {}
    }
    if (!doc) continue;
    if (targetPlane && doc.plane !== targetPlane) continue;

    matchCount++;
    const card = document.createElement('div');
    card.className = `gluon-card ${doc.plane.toLowerCase()}`;
    card.innerHTML = `
      <div class="gluon-card-head">
        <span class="pv-gluon-badge ${doc.plane.toLowerCase()}">${doc.planeInfo ? doc.planeInfo.badge : doc.plane}</span>
        <span style="font-weight:700;font-size:10px;color:#10b981;">Veritas ${doc.veritasScore}</span>
      </div>
      <div class="gluon-card-name" title="${it.name}">${it.name}</div>
      <div class="pv-gauge-bar" style="height:5px;margin:4px 0;">
        <div class="gauge-red" style="width:${(doc.cr*100).toFixed(1)}%"></div>
        <div class="gauge-green" style="width:${(doc.cg*100).toFixed(1)}%"></div>
        <div class="gauge-blue" style="width:${(doc.cb*100).toFixed(1)}%"></div>
      </div>
      <div class="gluon-card-meta">
        <span>${doc.isHadronSinglet ? '⚪ Singlet' : 'Polarized'}</span>
        <span>${fmtSize(it.size)}</span>
      </div>
    `;
    card.onclick = () => {
      go(scanDir);
      setTimeout(() => {
        const row = visibleRows().find(r => r._item && r._item.path === it.path);
        if (row) selectClick(it, row, null);
      }, 150);
    };
    grid.appendChild(card);
  }

  if (!matchCount) {
    grid.innerHTML = `<div style="color:var(--muted);padding:16px;">No documents found matching plane ${targetPlane || 'any'} in ${baseName(scanDir)}.</div>`;
  }
  container.appendChild(grid);
}

async function show() {
  $('address').value = cur;
  stopAddressEdit();
  renderCrumbs();
  updateAddrIcon();
  updateNavButtons();
  const list = $('list');
  const prevScroll = list.scrollTop;
  list.innerHTML = '';
  list.onmousemove = null;
  list.onmouseleave = null;
  if (cur === HOME_URI || cur.startsWith('peek://browser')) {
    if (cur.startsWith('peek://browser')) cur = HOME_URI;
    list.className = '';
    $('header').style.display = 'none';
    renderHomeDashboard(list);
    totalCount = 0;
    updateStatus();
    document.title = 'Home - Peek Explorer';
    return;
  }
  if (cur.startsWith('peek://gluon')) {
    list.className = '';
    $('header').style.display = 'none';
    await renderGluonTopicSpace(cur, list);
    totalCount = 0;
    updateStatus();
    document.title = 'Semantic Gluons - Peek Explorer';
    return;
  }
  if (/\.html?$/i.test(cur)) {
    list.className = 'v-html-tab';
    $('header').style.display = 'none';
    renderHtmlTab(cur, list);
    totalCount = 1;
    updateStatus();
    document.title = baseName(cur) + ' - Peek Explorer';
    return;
  }
  if (mode === 'landscape' || mode === 'lens') {
    $('header').style.display = 'none';
    totalCount = await renderLandscape(cur, list, go, mode === 'lens');
    updateStatus();
    document.title = cur + ' - Peek Explorer';
    return;
  }
  list.className = 'v-' + mode;
  $('header').style.display = mode === 'details' ? 'flex' : 'none';
  totalCount = await renderDir(cur, 0, list);
  list.scrollTop = prevScroll;
  const vis = new Set(visibleRows().map(r => r._item.path));
  for (const p of [...selected.keys()]) if (!vis.has(p)) selected.delete(p);
  updateStatus();
  document.title = cur + ' - Peek Explorer';
}

// ---- Tab Split Dropdown (Left / Right / Up / Down) & Split Pane Engine ----
let splitRatio = 50; // percentage for primary pane
function applySplitRatio() {
  const ws = $('workspace');
  if (ws) ws.style.setProperty('--split-ratio', splitRatio + '%');
}

function activateSplit(dir = 'right', targetPath = null) {
  splitState.active = true;
  splitState.dir = dir;
  if (targetPath) {
    splitState.cur = targetPath;
    splitState.hist = [targetPath];
    splitState.hi = 0;
  } else if (!splitState.cur) {
    splitState.cur = cur;
    splitState.hist = [cur];
    splitState.hi = 0;
  }
  const ws = $('workspace');
  ws.className = 'split-' + dir;
  const grip = $('splitGrip');
  if (grip) grip.classList.remove('hidden');
  $('splitPane').classList.remove('hidden');
  $('splitBtn').classList.add('active');
  applySplitRatio();
  renderSplitPane();
}
window.activateSplit = activateSplit;
function closeSplit() {
  splitState.active = false;
  $('workspace').className = '';
  const grip = $('splitGrip');
  if (grip) grip.classList.add('hidden');
  $('splitPane').classList.add('hidden');
  $('splitBtn').classList.remove('active');
}
window.closeSplit = closeSplit;
window.go = go;
try { Object.defineProperty(window, 'cur', { get: () => cur, configurable: true }); } catch (_) {}
function splitGo(p, push = true) {
  if (!p) p = HOME_URI;
  splitState.cur = p;
  if (push && splitState.hist[splitState.hi] !== p) {
    splitState.hist = splitState.hist.slice(0, splitState.hi + 1);
    splitState.hist.push(p);
    splitState.hi = splitState.hist.length - 1;
  }
  renderSplitPane();
}
async function renderSplitPane() {
  if (!splitState.active) return;
  $('spAddr').value = splitState.cur;
  $('spView').value = splitState.mode;
  const spList = $('spList');
  spList.innerHTML = '';
  spList.onmousemove = null;
  spList.onmouseleave = null;
  wireDropTarget(spList, () => splitState.cur);
  if (splitState.cur === HOME_URI) {
    spList.className = '';
    renderHomeDashboard(spList);
    return;
  }
  if (splitState.mode === 'landscape' || splitState.mode === 'lens') {
    await renderLandscape(splitState.cur, spList, p => splitGo(p, true), splitState.mode === 'lens');
    return;
  }
  spList.className = 'v-' + splitState.mode;
  const res = await window.api.list(splitState.cur);
  if (res.error) { spList.appendChild(msg('(' + res.error + ')', 0)); return; }
  const items = sortItems(res.items || []);
  for (const it of items) {
    const [cell, kids] = makeItem(it, 0, null);
    cell.ondblclick = e => { e.stopPropagation(); it.isDir ? splitGo(it.path, true) : window.api.open(it.path); };
    spList.append(cell, kids);
  }
}
function showSplitMenu(x, y, forPath = cur) {
  const otherTabs = tabs.map((t, idx) => ({ t, idx })).filter(o => o.idx !== active);
  fillMenu([
    { label: '◧  Split Left' + (splitState.active && splitState.dir === 'left' ? '  ✓' : ''), run: () => activateSplit('left', forPath) },
    { label: '◨  Split Right' + (splitState.active && splitState.dir === 'right' ? '  ✓' : ''), run: () => activateSplit('right', forPath) },
    { label: '⬒  Split Up' + (splitState.active && splitState.dir === 'up' ? '  ✓' : ''), run: () => activateSplit('up', forPath) },
    { label: '⬓  Split Down' + (splitState.active && splitState.dir === 'down' ? '  ✓' : ''), run: () => activateSplit('down', forPath) },
    ...(otherTabs.length ? [
      '-',
      ...otherTabs.slice(0, 6).map(o => ({
        label: `◫  Split Right with Tab: ${baseName(o.t.cur || HOME_URI)}`,
        run: () => activateSplit('right', o.t.cur || HOME_URI)
      }))
    ] : []),
    ...(splitState.active ? [
      '-',
      { label: '⇄  Swap Primary & Split Panes', run: () => { const tmp = cur; go(splitState.cur); splitGo(tmp); } },
      { label: '✕  Close Split Pane', run: closeSplit }
    ] : [])
  ]);
  placeMenu(x, y);
}

function go(p, push = true) {
  if (!p) p = HOME_URI;
  cur = p;
  if (folderViews[p]) {
    mode = folderViews[p];
    if ($('view')) $('view').value = mode;
    if (tabs[active]) tabs[active].mode = mode;
  }
  clearSelection(); anchorPath = null; focusedPath = null;
  if (p !== HOME_URI) {
    recentFolders = [p, ...recentFolders.filter(x => x.toLowerCase() !== p.toLowerCase())].slice(0, 20);
  }
  if (push) {
    if (hist[hi] !== p) { hist = hist.slice(0, hi + 1); hist.push(p); hi = hist.length - 1; }
  }
  show(); persist();
}

// ---------------- Tabs + Middle-Click Tab Bar + Reopen Closed Tabs ----------------
const params = new URLSearchParams(location.search);
const isPrimary = params.get('primary') === '1';
let tabs = [], active = 0;
function saveTab() { if (tabs[active]) tabs[active] = { ...tabs[active], cur, hist, hi, mode, expanded: [...expanded] }; }
function defaultNewTabPath() {
  if (newTabTarget === 'duplicate') return cur;
  if (newTabTarget === 'userHome') return cachedPlaces.home || HOME_URI;
  return HOME_URI;
}
function renderTabs() {
  const bar = $('tabs'); bar.innerHTML = '';
  tabs.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'tab' + (i === active ? ' active' : '') + (t.pinned ? ' pinned' : '');
    el.draggable = true;
    const p = i === active ? cur : t.cur;
    const label = document.createElement('span');
    label.textContent = (t.pinned ? '📌 ' : '') + (p === HOME_URI ? '🏠 Home' : (p.startsWith('peek://browser') ? '🌐 Browser' : (/\.html?$/i.test(p) ? '🌐 ' + baseName(p) : baseName(p))));
    label.title = p + ' (Middle-click to close · Click ▾ to Split Left/Right/Up/Down · Right-click for options)';
    el.appendChild(label);
    const spDd = document.createElement('span'); spDd.className = 'split-dd'; spDd.textContent = '▾'; spDd.title = 'Split Tab Left / Right / Up / Down';
    spDd.onclick = e => {
      e.stopPropagation();
      const r = spDd.getBoundingClientRect();
      showSplitMenu(r.left, r.bottom + 2, p);
    };
    el.appendChild(spDd);
    if (!t.pinned) {
      const x = document.createElement('span'); x.className = 'x'; x.textContent = '×'; x.title = 'Close tab (Ctrl+W)';
      x.onclick = e => { e.stopPropagation(); closeTab(i); };
      el.appendChild(x);
    }
    el.onclick = () => switchTab(i);
    el.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); e.stopPropagation(); closeTab(i); } });
    el.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      fillMenu([
        { label: 'New tab (Ctrl+T)', run: () => newTab() },
        { label: 'Duplicate tab', run: () => newTab(p, i === active ? [...expanded] : (t.expanded || []), true) },
        { label: t.pinned ? 'Unpin tab' : 'Pin tab', run: () => { t.pinned = !t.pinned; renderTabs(); persist(); } },
        { label: 'Reopen closed tab (Ctrl+Shift+T)', disabled: !closedTabs.length, run: reopenClosedTab },
        '-',
        { label: '◧  Split Tab Left', run: () => activateSplit('left', p) },
        { label: '◨  Split Tab Right', run: () => activateSplit('right', p) },
        { label: '⬒  Split Tab Up', run: () => activateSplit('up', p) },
        { label: '⬓  Split Tab Down', run: () => activateSplit('down', p) },
        ...(splitState.active ? [{ label: '✕  Close Split Pane', run: closeSplit }] : []),
        '-',
        { label: 'New tab opens: Home Dashboard' + (newTabTarget === 'home' ? '  ✓' : ''), run: () => { newTabTarget = 'home'; persist(); if (cur === HOME_URI) show(); } },
        { label: 'New tab opens: User Home Folder' + (newTabTarget === 'userHome' ? '  ✓' : ''), run: () => { newTabTarget = 'userHome'; persist(); if (cur === HOME_URI) show(); } },
        { label: 'New tab opens: Duplicate Current Tab' + (newTabTarget === 'duplicate' ? '  ✓' : ''), run: () => { newTabTarget = 'duplicate'; persist(); if (cur === HOME_URI) show(); } },
        '-',
        { label: 'Close other tabs', disabled: tabs.length <= 1, run: () => { saveTab(); tabs = [tabs[i]]; loadTab(0); persist(); } },
        { label: 'Close tabs to the right', disabled: i >= tabs.length - 1, run: () => { saveTab(); tabs = tabs.slice(0, i + 1); if (active > i) loadTab(i); else renderTabs(); persist(); } },
        { label: 'Close tab (Ctrl+W)', run: () => closeTab(i) }
      ]);
      placeMenu(e.clientX, e.clientY);
    });
    el.addEventListener('dragstart', e => { e.dataTransfer.setData(MIME_TAB, String(i)); e.dataTransfer.effectAllowed = 'move'; });
    el.addEventListener('dragover', e => {
      if (e.dataTransfer.types.includes(MIME_TAB)) {
        e.preventDefault(); el.classList.add('drop-target');
      } else if (hasSupportedDrop(e.dataTransfer.types) && p && p !== HOME_URI && !p.startsWith('peek://')) {
        e.preventDefault(); e.stopPropagation();
        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
        el.classList.add('drop-target');
      }
    });
    el.addEventListener('dragleave', e => {
      if (e.relatedTarget && el.contains(e.relatedTarget)) return;
      el.classList.remove('drop-target');
    });
    el.addEventListener('drop', async e => {
      el.classList.remove('drop-target');
      if (e.dataTransfer.types.includes(MIME_TAB)) {
        e.preventDefault();
        const from = +e.dataTransfer.getData(MIME_TAB);
        if (from === i || isNaN(from)) return;
        saveTab();
        const [moved] = tabs.splice(from, 1);
        tabs.splice(i, 0, moved);
        active = active === from ? i : (from < active && i >= active ? active - 1 : (from > active && i <= active ? active + 1 : active));
        renderTabs(); persist();
        return;
      }
      if (hasSupportedDrop(e.dataTransfer.types) && p && p !== HOME_URI && !p.startsWith('peek://')) {
        e.preventDefault(); e.stopPropagation();
        let srcs = [];
        if (e.dataTransfer.types.includes(MIME_PATHS)) {
          try { srcs = JSON.parse(e.dataTransfer.getData(MIME_PATHS) || '[]'); } catch {}
        }
        if ((!srcs || !srcs.length) && activeDragPaths.length) srcs = [...activeDragPaths];
        activeDragPaths = [];
        if (!srcs.length) return;
        const op = e.ctrlKey ? 'copy' : 'cut';
        const r = await window.api.paste(op, srcs, p);
        if (r.moved && r.moved.length) {
          undoStack.push({ type: 'move', ops: r.moved.map(m => ({ from: m.to, to: m.from.slice(0, m.from.lastIndexOf('\\')) })) });
          $('status').textContent = `✓ Moved ${r.moved.length} item${r.moved.length > 1 ? 's' : ''} → Tab "${baseName(p)}"`;
        }
        if (r.skipped && r.skipped.length) alert('Skipped:\n' + r.skipped.join('\n'));
        show();
      }
    });
    bar.appendChild(el);
  });
  const plus = document.createElement('div'); plus.className = 'tab plus'; plus.textContent = '+'; plus.title = 'New tab (Ctrl+T or Middle-click · Right-click a tab to change default)';
  plus.onclick = () => newTab();
  plus.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); e.stopPropagation(); newTab(cur, [...expanded], true); } });
  bar.appendChild(plus);
}
// Middle-clicking empty space on the tab bar or double-clicking it opens a new tab
$('tabs').addEventListener('auxclick', e => {
  if (e.button === 1 && e.target === $('tabs')) { e.preventDefault(); newTab(); }
});
$('tabs').addEventListener('dblclick', e => {
  if (e.target === $('tabs')) newTab();
});

function loadTab(i) {
  active = i; const t = tabs[i];
  cur = t.cur || HOME_URI; hist = t.hist && t.hist.length ? t.hist : [cur]; hi = typeof t.hi === 'number' ? t.hi : hist.length - 1;
  expanded = new Set(t.expanded || []);
  const effMode = t.mode || folderViews[cur] || defaultView || 'details';
  if (PX[effMode] || effMode === 'landscape' || effMode === 'lens') {
    mode = effMode;
    if ($('view')) $('view').value = mode;
  }
  clearSelection(); anchorPath = null; focusedPath = null;
  show(); renderTabs();
}
function switchTab(i) { if (i === active || !tabs[i]) return; saveTab(); loadTab(i); persist(); }
function newTab(p = null, initExpanded = [], switchTo = true) {
  saveTab();
  const target = p || defaultNewTabPath();
  tabs.push({ cur: target, hist: [target], hi: 0, mode: folderViews[target] || mode, expanded: initExpanded });
  if (switchTo) loadTab(tabs.length - 1);
  else renderTabs();
  persist();
}
function closeTab(i) {
  if (tabs[i] && tabs[i].pinned && tabs.length > 1) return; // pinned tabs protected until unpinned
  if (tabs.length === 1) { window.close(); return; }
  saveTab();
  closedTabs.push(tabs[i]);
  tabs.splice(i, 1);
  loadTab(Math.min(i < active ? active - 1 : active, tabs.length - 1)); persist();
}
function reopenClosedTab() {
  const last = closedTabs.pop();
  if (!last) return;
  saveTab();
  tabs.push(last);
  loadTab(tabs.length - 1);
  persist();
}
let persistTimer = null;
function persist() {
  renderTabs();
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    saveTab();
    const s = { view: mode, folderViews, landscapePalette, modePaletteIndex, customPaletteColors, inheritShiftMode, landscapeBg, landscapeBgColor, landscapeBgImage, canvasReactMode, accentColor, hotkeys, defaultFrameColor, defaultBgColor, roomBgOpacity, roomGlowIntensity, roomGlowRange, breathTargetColor, breathTargetBgColor, breathScaleSize, breathAffectTiles, puddleIntervalMin, puddleIntervalMax, puddleRippleDuration, puddleMaxConcurrent, activeRoomBorderColor, selectedFolderColor, useCustomSelectedFolder, browserAutoSleep, autoSummarize, breathingDuration, lockFrame, lockBg, holdRenameEnabled, holdRenameDelay, sortKey, sortAsc, groupKey, colWidths, showPreview, darkMode, showHidden, showExt, showChecks, newTabTarget, scripts, bookmarks, recentFolders, landscapeLayout, splitRatio };
    if (isPrimary) s.session = { tabs, active };
    window.api.saveSettings(s);
  }, 300);
}

// ---- Back / Forward / Up / Home + Middle-Click for New Tab + Mouse Back/Forward buttons + History menu ----
function goBack() { if (hi > 0) { hi--; go(hist[hi], false); } }
function goForward() { if (hi < hist.length - 1) { hi++; go(hist[hi], false); } }
$('back').onclick = goBack;
$('fwd').onclick = goForward;
$('up').onclick = () => go(parent(cur));
wireDropTarget($('up'), () => parent(cur));
$('homeBtn').onclick = () => go(HOME_URI);
$('refresh').onclick = show;

// Middle-click on Back / Forward / Up / Home opens that destination in a new tab!
$('back').addEventListener('auxclick', e => { if (e.button === 1 && hi > 0) newTab(hist[hi - 1], [], false); });
$('fwd').addEventListener('auxclick', e => { if (e.button === 1 && hi < hist.length - 1) newTab(hist[hi + 1], [], false); });
$('up').addEventListener('auxclick', e => { if (e.button === 1 && cur !== HOME_URI) newTab(parent(cur), [], false); });
$('homeBtn').addEventListener('auxclick', e => { if (e.button === 1) newTab(HOME_URI, [], true); });

function showHistoryMenu(e) {
  e.preventDefault(); e.stopPropagation();
  const r = e.currentTarget.getBoundingClientRect();
  fillMenu(hist.map((p, idx) => ({
    label: (idx === hi ? '●  ' : '    ') + (p === HOME_URI ? '🏠 Home Dashboard' : p),
    run: () => { hi = idx; go(hist[hi], false); }
  })));
  placeMenu(r.left, r.bottom + 2);
}
$('back').addEventListener('contextmenu', showHistoryMenu);
$('fwd').addEventListener('contextmenu', showHistoryMenu);

// Hardware Mouse Back (button 3) & Mouse Forward (button 4)
window.addEventListener('mouseup', e => {
  if (e.button === 3) { e.preventDefault(); goBack(); }
  else if (e.button === 4) { e.preventDefault(); goForward(); }
});

$('address').addEventListener('keydown', e => {
  if (e.key === 'Enter') { stopAddressEdit(); go($('address').value.trim() || HOME_URI); }
  else if (e.key === 'Escape') { stopAddressEdit(); }
});
$('address').addEventListener('blur', e => {
  if (e.relatedTarget && (e.relatedTarget.id === 'addrHistBtn' || e.relatedTarget.id === 'addrIcon')) return;
  stopAddressEdit();
});
$('address').addEventListener('mouseup', e => {
  if (justStartedAddrEdit) {
    e.preventDefault();
    $('address').select();
  }
});
$('search').addEventListener('input', e => { filterText = e.target.value; applyFilter(); });
$('search').addEventListener('keydown', e => { if (e.key === 'Escape') { $('search').value = ''; filterText = ''; applyFilter(); $('search').blur(); } });
$('view').onchange = e => { mode = e.target.value; folderViews[cur] = mode; if (tabs[active]) tabs[active].mode = mode; show(); persist(); };
$('splitBtn').onclick = e => {
  e.stopPropagation();
  const r = $('splitBtn').getBoundingClientRect();
  showSplitMenu(r.left, r.bottom + 2, cur);
};
$('spBack').onclick = () => { if (splitState.hi > 0) { splitState.hi--; splitGo(splitState.hist[splitState.hi], false); } };
$('spBack').addEventListener('auxclick', e => { if (e.button === 1 && splitState.hi > 0) { e.preventDefault(); newTab(splitState.hist[splitState.hi - 1], [], false); } });
$('spUp').onclick = () => splitGo(parent(splitState.cur), true);
$('spUp').addEventListener('auxclick', e => { if (e.button === 1 && splitState.cur !== HOME_URI) { e.preventDefault(); newTab(parent(splitState.cur), [], false); } });
$('spHome').onclick = () => splitGo(HOME_URI, true);
$('spHome').addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); newTab(HOME_URI, [], true); } });
$('spAddr').addEventListener('keydown', e => { if (e.key === 'Enter') splitGo($('spAddr').value.trim() || HOME_URI, true); });
$('spView').onchange = e => { splitState.mode = e.target.value; renderSplitPane(); };
$('spSwap').onclick = () => { const tmp = cur; go(splitState.cur); splitGo(tmp); };
$('spSwap').addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); newTab(splitState.cur, [], false); } });
$('spClose').onclick = closeSplit;
const splitGrip = $('splitGrip');
if (splitGrip) {
  splitGrip.addEventListener('mousedown', e => {
    e.preventDefault();
    splitGrip.classList.add('dragging');
    const ws = $('workspace');
    const isHoriz = splitState.dir === 'left' || splitState.dir === 'right';
    const rect = ws.getBoundingClientRect();
    const onMove = ev => {
      let pct;
      if (isHoriz) {
        pct = ((ev.clientX - rect.left) / rect.width) * 100;
        if (splitState.dir === 'left') pct = 100 - pct;
      } else {
        pct = ((ev.clientY - rect.top) / rect.height) * 100;
        if (splitState.dir === 'up') pct = 100 - pct;
      }
      splitRatio = Math.max(20, Math.min(80, Math.round(pct)));
      applySplitRatio();
    };
    const onUp = () => {
      splitGrip.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      persist();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}
$('group').onchange = e => { groupKey = e.target.value; show(); persist(); };
$('sort').onchange = e => { sortKey = e.target.value; show(); persist(); };
$('sortDir').onclick = () => { sortAsc = !sortAsc; $('sortDir').textContent = sortAsc ? '↑' : '↓'; show(); persist(); };
$('checkBtn').onclick = () => { showChecks = !showChecks; applyToggles(); persist(); };
$('extBtn').onclick = () => { showExt = !showExt; applyToggles(); show(); persist(); };
$('hiddenBtn').onclick = () => { showHidden = !showHidden; applyToggles(); applyFilter(); persist(); };
$('previewBtn').onclick = () => { showPreview = !showPreview; applyPreviewPane(); persist(); };
$('themeBtn').onclick = () => { darkMode = !darkMode; applyTheme(); persist(); };
const devToolsBtn = $('devToolsBtn');
if (devToolsBtn) devToolsBtn.onclick = () => window.api.openDevTools();

[['c-name', 'name'], ['c-date', 'mtime'], ['c-type', 'type'], ['c-size', 'size']].forEach(([c, k]) => {
  $('header').querySelector('.' + c).onclick = e => {
    if (e.target.classList.contains('col-resizer')) return;
    if (sortKey === k) sortAsc = !sortAsc; else { sortKey = k; sortAsc = true; }
    $('sort').value = k; $('sortDir').textContent = sortAsc ? '↑' : '↓'; show(); persist();
  };
});
// Column drag-resizers
document.querySelectorAll('.col-resizer').forEach(handle => {
  handle.addEventListener('mousedown', e => {
    e.stopPropagation(); e.preventDefault();
    const col = handle.dataset.col;
    const startX = e.clientX, startW = colWidths[col] || 110;
    const onMove = ev => {
      colWidths[col] = Math.max(55, Math.min(450, startW - (ev.clientX - startX)));
      applyColWidths();
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      persist();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
});
// Ctrl + Mouse Wheel view scaling
const VIEW_ORDER = ['details', 'list', 'small', 'content', 'tiles', 'medium', 'large', 'xl', 'lens', 'landscape'];
$('list').addEventListener('wheel', e => {
  if (!e.ctrlKey || cur === HOME_URI) return;
  e.preventDefault();
  const idx = VIEW_ORDER.indexOf(mode);
  const next = VIEW_ORDER[Math.max(0, Math.min(VIEW_ORDER.length - 1, idx + (e.deltaY < 0 ? 1 : -1)))];
  if (next !== mode) { mode = next; folderViews[cur] = mode; if (tabs[active]) tabs[active].mode = mode; $('view').value = mode; show(); persist(); }
}, { passive: false });

let bmHost = null;
function renderBookmarksNav() {
  if (!bmHost) return;
  bmHost.innerHTML = '';
  if (!bookmarks.length) return;
  const h = document.createElement('div'); h.className = 'h'; h.textContent = '⭐ Bookmarks'; bmHost.appendChild(h);
  bookmarks.forEach((b, idx) => {
    const n = document.createElement('div'); n.className = 'n';
    const i = document.createElement('img'); i.className = 'ico';
    n.append(i, document.createTextNode(b.name));
    setIcon(i, { path: b.path, name: b.name, isDir: true }, 16, true);
    n.onclick = () => go(b.path);
    n.addEventListener('auxclick', e => { if (e.button === 1) newTab(b.path, [], e.shiftKey); });
    n.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      fillMenu([
        { label: 'Open', run: () => go(b.path) },
        { label: 'Open in new tab', run: () => newTab(b.path, [], true) },
        { label: 'Remove bookmark', run: () => { bookmarks.splice(idx, 1); renderBookmarksNav(); persist(); } }
      ]);
      placeMenu(e.clientX, e.clientY);
    });
    wireDropTarget(n, () => b.path);
    bmHost.appendChild(n);
  });
}

(async () => {
  const settings = await window.api.getSettings();
  if (settings.folderViews && typeof settings.folderViews === 'object') { folderViews = { ...settings.folderViews }; }
  if (settings.landscapePalette) landscapePalette = settings.landscapePalette;
  if (settings.modePaletteIndex && typeof settings.modePaletteIndex === 'object' && !Array.isArray(settings.modePaletteIndex)) {
    modePaletteIndex = { ...modePaletteIndex, ...settings.modePaletteIndex };
  }
  if (settings.customPaletteColors && typeof settings.customPaletteColors === 'object' && !Array.isArray(settings.customPaletteColors)) {
    customPaletteColors = { ...customPaletteColors, ...settings.customPaletteColors };
  }
  if (settings.inheritShiftMode) inheritShiftMode = settings.inheritShiftMode;
  if (settings.landscapeBg) landscapeBg = settings.landscapeBg;
  if (settings.landscapeBgColor) landscapeBgColor = settings.landscapeBgColor;
  if (settings.landscapeBgImage) landscapeBgImage = settings.landscapeBgImage;
  if (typeof settings.canvasReactMode === 'boolean') canvasReactMode = settings.canvasReactMode;
  if (settings.accentColor) {
    accentColor = settings.accentColor;
    document.documentElement.style.setProperty('--accent', accentColor);
  }
  if (settings.hotkeys && typeof settings.hotkeys === 'object') {
    hotkeys = { ...DEFAULT_HOTKEYS, ...settings.hotkeys };
  }
  if (settings.defaultFrameColor) defaultFrameColor = settings.defaultFrameColor;
  if (settings.defaultBgColor) defaultBgColor = settings.defaultBgColor;
  if (typeof settings.roomBgOpacity === 'number') roomBgOpacity = settings.roomBgOpacity;
  if (typeof settings.roomGlowIntensity === 'number') {
    roomGlowIntensity = settings.roomGlowIntensity;
    document.documentElement.style.setProperty('--room-glow-intensity', roomGlowIntensity / 100);
  }
  if (typeof settings.roomGlowRange === 'number') {
    roomGlowRange = settings.roomGlowRange;
    document.documentElement.style.setProperty('--room-glow-range', `${roomGlowRange}px`);
  }
  if (settings.breathTargetColor) breathTargetColor = settings.breathTargetColor;
  if (settings.breathTargetBgColor) breathTargetBgColor = settings.breathTargetBgColor;
  if (typeof settings.breathScaleSize === 'number') breathScaleSize = settings.breathScaleSize;
  if (typeof settings.breathAffectTiles === 'boolean') breathAffectTiles = settings.breathAffectTiles;
  if (typeof settings.puddleIntervalMin === 'number') puddleIntervalMin = settings.puddleIntervalMin;
  if (typeof settings.puddleIntervalMax === 'number') puddleIntervalMax = settings.puddleIntervalMax;
  if (typeof settings.puddleRippleDuration === 'number') puddleRippleDuration = settings.puddleRippleDuration;
  if (typeof settings.puddleMaxConcurrent === 'number') puddleMaxConcurrent = settings.puddleMaxConcurrent;
  if (settings.activeRoomBorderColor) activeRoomBorderColor = settings.activeRoomBorderColor;
  if (settings.selectedFolderColor) selectedFolderColor = settings.selectedFolderColor;
  if (typeof settings.useCustomSelectedFolder === 'boolean') useCustomSelectedFolder = settings.useCustomSelectedFolder;
  if (typeof settings.browserAutoSleep === 'boolean') browserAutoSleep = settings.browserAutoSleep;
  if (typeof settings.autoSummarize === 'boolean') autoSummarize = settings.autoSummarize;
  if (typeof settings.breathingDuration === 'number') breathingDuration = settings.breathingDuration;
  if (typeof settings.lockFrame === 'boolean') lockFrame = settings.lockFrame;
  if (typeof settings.lockBg === 'boolean') lockBg = settings.lockBg;
  if (typeof settings.holdRenameEnabled === 'boolean') holdRenameEnabled = settings.holdRenameEnabled;
  if (typeof settings.holdRenameDelay === 'number') holdRenameDelay = settings.holdRenameDelay;
  if (settings.view && PX[settings.view]) { defaultView = settings.view; mode = settings.view; $('view').value = mode; }
  if (settings.groupKey) { groupKey = settings.groupKey; $('group').value = groupKey; }
  if (settings.sortKey) { sortKey = settings.sortKey; $('sort').value = sortKey; }
  if (typeof settings.sortAsc === 'boolean') { sortAsc = settings.sortAsc; $('sortDir').textContent = sortAsc ? '↑' : '↓'; }
  if (settings.colWidths) { colWidths = { ...colWidths, ...settings.colWidths }; applyColWidths(); }
  if (typeof settings.showPreview === 'boolean') { showPreview = settings.showPreview; applyPreviewPane(); }
  if (typeof settings.darkMode === 'boolean') { darkMode = settings.darkMode; applyTheme(); }
  if (typeof settings.showHidden === 'boolean') showHidden = settings.showHidden;
  if (typeof settings.showExt === 'boolean') showExt = settings.showExt;
  if (typeof settings.showChecks === 'boolean') showChecks = settings.showChecks;
  applyToggles();
  if (settings.newTabTarget) newTabTarget = settings.newTabTarget;
  if (Array.isArray(settings.scripts)) scripts = settings.scripts;
  if (Array.isArray(settings.bookmarks)) bookmarks = settings.bookmarks;
  if (Array.isArray(settings.recentFolders)) recentFolders = settings.recentFolders;
  if (settings.landscapeLayout && typeof settings.landscapeLayout === 'object') landscapeLayout = settings.landscapeLayout;
  if (settings.splitRatio) { splitRatio = settings.splitRatio; applySplitRatio(); }

  cachedPlaces = await window.api.places();
  await syncClip();
  const nav = $('nav');
  const homeItem = document.createElement('div'); homeItem.className = 'n';
  homeItem.innerHTML = `<span style="font-size:15px">🏠</span><span>Home Dashboard</span>`;
  homeItem.onclick = () => go(HOME_URI);
  homeItem.addEventListener('auxclick', e => { if (e.button === 1) newTab(HOME_URI, [], e.shiftKey); });
  nav.appendChild(homeItem);

  bmHost = document.createElement('div'); nav.appendChild(bmHost);
  renderBookmarksNav();

  const addNav = (title, arr, host) => {
    const h = document.createElement('div'); h.className = 'h'; h.textContent = title; host.appendChild(h);
    arr.forEach(p => {
      const n = document.createElement('div'); n.className = 'n';
      const i = document.createElement('img'); i.className = 'ico';
      n.append(i, document.createTextNode(p.name));
      n.title = p.path + ' (Middle-click for new tab)';
      setIcon(i, { path: p.path, name: p.name, isDir: true }, 16, true);
      n.onclick = () => go(p.path);
      n.addEventListener('auxclick', e => { if (e.button === 1) newTab(p.path, [], e.shiftKey); });
      wireDropTarget(n, () => p.path);
      host.appendChild(n);
    });
  };
  const qa = document.createElement('div'); nav.appendChild(qa);
  addNav('Quick access', (cachedPlaces.cachedPins && cachedPlaces.cachedPins.length) ? cachedPlaces.cachedPins : cachedPlaces.places, qa);
  const pc = document.createElement('div'); nav.appendChild(pc);
  addNav('This PC', cachedPlaces.drives, pc);

  const startPath = params.get('path');
  const sess = isPrimary && !startPath && settings.session && settings.session.tabs && settings.session.tabs.length ? settings.session : null;
  if (sess) { tabs = sess.tabs; loadTab(Math.min(sess.active || 0, tabs.length - 1)); }
  else { const p = startPath || HOME_URI; tabs = [{ cur: p, hist: [p], hi: 0, expanded: [] }]; loadTab(0); }

  const pins = await window.api.pins();
  if (pins.length) {
    cachedPlaces.cachedPins = pins;
    qa.innerHTML = '';
    addNav('Quick access', pins, qa);
    if (cur === HOME_URI) show();
  }
})();

// ---------------- Context menu, shortcuts, file actions, undo ----------------
const menuEl = document.createElement('div'); menuEl.id = 'ctx'; document.body.appendChild(menuEl);
const hideMenu = () => { menuEl.style.display = 'none'; };
document.addEventListener('click', hideMenu);
window.addEventListener('blur', hideMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideMenu(); });

function placeMenu(x, y) {
  menuEl.style.display = 'block';
  const r = menuEl.getBoundingClientRect();
  menuEl.style.left = Math.max(0, Math.min(x, innerWidth - r.width - 4)) + 'px';
  menuEl.style.top = Math.max(0, Math.min(y, innerHeight - r.height - 4)) + 'px';
}
function fillMenu(entries) {
  menuEl.innerHTML = '';
  for (const en of entries) {
    if (en === '-') { const s = document.createElement('div'); s.className = 'sep'; menuEl.appendChild(s); continue; }
    const d = document.createElement('div'); d.className = 'mi' + (en.disabled ? ' dis' : '');
    d.textContent = en.label;
    if (!en.disabled) d.onclick = e => { if (!en.keepOpen) { e.stopPropagation(); hideMenu(); } else e.stopPropagation(); en.run(); };
    menuEl.appendChild(d);
  }
}

const refreshKeep = () => show();
const pasteDir = it => (it && it.isDir && selected.size <= 1) ? it.path : cur;
async function doPaste(dest) {
  if (!dest || dest === HOME_URI) return;
  await syncClip();
  if (!clip) return;
  const r = await window.api.paste(clip.mode, clip.paths, dest);
  if (r.moved && r.moved.length) undoStack.push({ type: 'move', ops: r.moved.map(m => ({ from: m.to, to: m.from.slice(0, m.from.lastIndexOf('\\')) })) });
  if (clip.mode === 'cut') await storeClip(null);
  if (r.skipped.length) alert('Skipped (already exists or failed):\n' + r.skipped.join('\n'));
  refreshKeep();
}
// Surgical in-place DOM & state update after rename (never resets #list or scroll position!)
function applyItemRenameInPlace(it, cell, newPath) {
  const oldPath = it.path;
  const newName = baseName(newPath);
  it.path = newPath;
  it.name = newName;

  if (selected.has(oldPath)) {
    selected.delete(oldPath);
    selected.set(newPath, { item: it, cell });
  }
  if (anchorPath === oldPath) anchorPath = newPath;
  if (focusedPath === oldPath) focusedPath = newPath;
  if (lastClickPath === oldPath) lastClickPath = newPath;
  if (folderSizeCache.has(oldPath)) {
    folderSizeCache.set(newPath, folderSizeCache.get(oldPath));
    folderSizeCache.delete(oldPath);
  }
  if (it.isDir) {
    const nextExp = new Set();
    const prefix = oldPath + '\\';
    for (const p of expanded) {
      if (p === oldPath) nextExp.add(newPath);
      else if (p.startsWith(prefix)) nextExp.add(newPath + '\\' + p.slice(prefix.length));
      else nextExp.add(p);
    }
    expanded = nextExp;
    if (cell && cell._kids) {
      for (const childRow of cell._kids.querySelectorAll('.row.item')) {
        if (childRow._item && childRow._item.path.startsWith(prefix)) {
          const oldChild = childRow._item.path;
          const newChild = newPath + '\\' + oldChild.slice(prefix.length);
          childRow._item.path = newChild;
          if (selected.has(oldChild)) {
            selected.delete(oldChild);
            selected.set(newChild, { item: childRow._item, cell: childRow });
          }
        }
      }
    }
    persist();
  }

  if (cell) {
    cell.title = it.name;
    const rnInp = cell.querySelector('input.rn');
    if (rnInp) {
      const span = document.createElement('span');
      span.className = 'nm';
      span.textContent = displayName(it);
      rnInp.replaceWith(span);
    } else {
      const nm = cell.querySelector('.nm');
      if (nm) nm.textContent = displayName(it);
    }
    const tp = cell.querySelector('.c-type');
    if (tp) tp.textContent = typeOf(it);
    const szText = it.isDir ? (folderSizeCache.has(it.path) ? fmtSize(folderSizeCache.get(it.path)) : '') : fmtSize(it.size);
    const sub = cell.querySelector('.sub');
    if (sub) sub.innerHTML = `${typeOf(it)}${szText ? ' · ' + szText : ''}<br>${fmtDate(it.mtime)}`;
    const ico = cell.querySelector('.ico');
    if (ico) setIcon(ico, it);
  }
}

async function doUndo() {
  const last = undoStack.pop();
  if (!last) return;
  if (last.type === 'rename') {
    for (const op of last.ops) {
      const r = await window.api.rename(op.from, baseName(op.to));
      if (r && r.newPath) {
        const row = [...$('list').querySelectorAll('.row.item')].find(el => el._item && el._item.path === op.from);
        if (row) applyItemRenameInPlace(row._item, row, r.newPath);
      }
    }
    updateStatus();
    return;
  } else if (last.type === 'move') {
    for (const op of last.ops) await window.api.paste('cut', [op.from], op.to);
  }
  refreshKeep();
}
async function doDelete(paths) {
  if (!paths.length) return;
  const rows = visibleRows();
  const firstPath = paths[0];
  const idx = rows.findIndex(r => r._item && r._item.path === firstPath);
  const nextTarget = rows[idx + 1] || rows[idx - 1];
  const nextItemPath = nextTarget && nextTarget._item ? nextTarget._item.path : null;

  const r = await window.api.trash(paths);
  if (r.error) alert(r.error);
  if (r.ok) {
    clearSelection();
    await refreshKeep();
    if (nextItemPath) {
      const refreshedRows = visibleRows();
      const newRow = refreshedRows.find(r => r._item && r._item.path === nextItemPath) || refreshedRows[Math.min(idx, refreshedRows.length - 1)];
      if (newRow && newRow._item) focusRow(newRow, false);
    }
  }
}

async function doPermanentDelete(paths) {
  if (!paths.length) return;
  const rows = visibleRows();
  const firstPath = paths[0];
  const idx = rows.findIndex(r => r._item && r._item.path === firstPath);
  const nextTarget = rows[idx + 1] || rows[idx - 1];
  const nextItemPath = nextTarget && nextTarget._item ? nextTarget._item.path : null;

  const r = await window.api.deletePermanent(paths);
  if (r.error) alert(r.error);
  if (r.ok) {
    clearSelection();
    await refreshKeep();
    if (nextItemPath) {
      const refreshedRows = visibleRows();
      const newRow = refreshedRows.find(r => r._item && r._item.path === nextItemPath) || refreshedRows[Math.min(idx, refreshedRows.length - 1)];
      if (newRow && newRow._item) focusRow(newRow, false);
    }
  }
}
function startRename(it, cell) {
  const nm = cell.querySelector('.nm'); if (!nm) return;
  const inp = document.createElement('input'); inp.value = it.name; inp.className = 'rn';
  nm.replaceWith(inp); inp.focus();
  const dot = it.name.lastIndexOf('.'); inp.setSelectionRange(0, !it.isDir && dot > 0 ? dot : it.name.length);
  let done = false;
  const finish = async ok => {
    if (done) return; done = true;
    const nextName = inp.value.trim();
    if (ok && nextName && nextName !== it.name) {
      const r = await window.api.rename(it.path, nextName);
      if (r.error) {
        alert(r.error);
        applyItemRenameInPlace(it, cell, it.path);
      } else if (r.newPath) {
        undoStack.push({ type: 'rename', ops: [{ from: r.newPath, to: r.oldPath }] });
        applyItemRenameInPlace(it, cell, r.newPath);
      }
    } else {
      applyItemRenameInPlace(it, cell, it.path);
    }
    updateStatus();
  };
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
  inp.addEventListener('blur', () => finish(true));
  inp.addEventListener('click', e => e.stopPropagation());
  inp.addEventListener('dblclick', e => e.stopPropagation());
}
async function moreOptions(p, x, y) {
  fillMenu([{ label: 'Loading Windows options…', disabled: true }]); placeMenu(x, y);
  const verbs = await window.api.verbs(p);
  fillMenu(verbs.length ? verbs.map(v => ({ label: v.label, run: () => window.api.doVerb(p, v.index) })) : [{ label: '(no options available)', disabled: true }]);
  placeMenu(x, y);
}

async function showMenu(x, y, it) {
  await syncClip();
  const paths = selected.size ? [...selected.keys()] : [it.path];
  const multi = paths.length > 1;
  const firstEntry = selected.get(it.path) || [...selected.values()][0];
  const countTag = multi ? ` (${paths.length} items)` : '';
  const isScript = !multi && !it.isDir && SCRIPT_EXT.test(it.name);
  const isZip = !multi && !it.isDir && ZIP_EXT.test(it.name);

  const subDirsInCur = [...$('list').querySelectorAll('.row.item[data-is-dir="1"], .room-item.is-dir')]
    .map(el => el._item)
    .filter(d => d && d.isDir && !paths.includes(d.path));

  fillMenu([
    ...(!multi ? [
      { label: 'Open', run: () => it.isDir ? go(it.path) : (/\.html?$/i.test(it.name) ? newTab(it.path, [], true) : window.api.open(it.path)) },
      ...(it.isDir ? [
        { label: 'Open in new tab (Middle-click)', run: () => newTab(it.path, [], true) },
        { label: 'Open in background tab', run: () => newTab(it.path, [], false) },
        { label: 'Open in new window', run: () => window.api.newWindow(it.path) },
        { label: '🗺️ Spawn Room in Landscape', run: () => openFolderInLandscape(it.path, it.name) },
        { label: '⭐ Bookmark folder in sidebar', run: () => { if (!bookmarks.some(b => b.path === it.path)) { bookmarks.push({ name: it.name, path: it.path }); renderBookmarksNav(); persist(); } } },
        { label: 'Calculate folder size', run: () => calcFolderSize(it, firstEntry && firstEntry.cell) },
        { label: 'Open PowerShell here', run: () => window.api.openTerminal(it.path) }
      ] : []),
      ...((!it.isDir && /\.html?$/i.test(it.name)) ? [
        { label: '🌐 Render in Landscape', run: () => openHtmlInLandscape(it.path, it.name) },
        { label: 'Open in new tab (Render HTML)', run: () => newTab(it.path, [], true) },
        { label: 'Open in Native Browser (Windows)', run: () => window.api.open(it.path) }
      ] : []),
      ...(isScript ? [
        { label: '⚡ Run script now', run: () => triggerScript({ name: it.name, path: it.path }) },
        { label: '⚡ Add to Script Connections', run: () => addScriptConnection({ name: it.name.replace(/\.[^.]+$/, ''), path: it.path }) }
      ] : []),
      ...(isZip ? [
        { label: '📦 Extract zip to folder', run: async () => { $('status').textContent = 'Extracting…'; const r = await window.api.unzipItem(it.path); if (r.error) alert(r.error); show(); } }
      ] : []),
      { label: 'Show in Windows Explorer', run: () => window.api.showInFolder(it.path) },
      '-'
    ] : []),
    {
      label: `📂 Move to Folder${countTag}  ›`,
      keepOpen: true,
      run: () => {
        const moveTargets = [];
        const parDir = parent(cur);
        if (parDir && parDir !== HOME_URI && !parDir.startsWith('peek://')) {
          moveTargets.push({ label: `⬆️  Parent Folder (${baseName(parDir)})`, dest: parDir });
        }
        if (splitState.active && splitState.cur && splitState.cur !== HOME_URI && splitState.cur !== cur) {
          moveTargets.push({ label: `◫  Split Pane (${baseName(splitState.cur)})`, dest: splitState.cur });
        }
        for (const sd of subDirsInCur.slice(0, 14)) {
          moveTargets.push({ label: `📁  ${sd.name}`, dest: sd.path });
        }
        for (const bm of bookmarks.slice(0, 6)) {
          if (bm.path !== cur) moveTargets.push({ label: `⭐  ${bm.name}`, dest: bm.path });
        }
        const menuItems = moveTargets.map(mt => ({
          label: mt.label,
          run: async () => {
            const r = await window.api.paste('cut', paths, mt.dest);
            if (r.moved && r.moved.length) {
              undoStack.push({ type: 'move', ops: r.moved.map(m => ({ from: m.to, to: m.from.slice(0, m.from.lastIndexOf('\\')) })) });
              $('status').textContent = `✓ Moved ${r.moved.length} item${r.moved.length > 1 ? 's' : ''} → "${baseName(mt.dest)}" (Ctrl+Z to undo)`;
            }
            if (r.skipped && r.skipped.length) alert('Skipped:\n' + r.skipped.join('\n'));
            show();
            if (splitState.active) renderSplitPane();
          }
        }));
        if (moveTargets.length) menuItems.push('-');
        menuItems.push({
          label: '🔍  Choose another folder…',
          run: async () => {
            const picked = await window.api.pickFolder();
            if (!picked) return;
            const r = await window.api.paste('cut', paths, picked);
            if (r.moved && r.moved.length) {
              undoStack.push({ type: 'move', ops: r.moved.map(m => ({ from: m.to, to: m.from.slice(0, m.from.lastIndexOf('\\')) })) });
              $('status').textContent = `✓ Moved ${r.moved.length} item${r.moved.length > 1 ? 's' : ''} → "${baseName(picked)}" (Ctrl+Z to undo)`;
            }
            if (r.skipped && r.skipped.length) alert('Skipped:\n' + r.skipped.join('\n'));
            show();
            if (splitState.active) renderSplitPane();
          }
        });
        fillMenu(menuItems);
        placeMenu(parseInt(menuEl.style.left), parseInt(menuEl.style.top));
      }
    },
    '-',
    ...(scripts.length ? [
      {
        label: `⚡ Run Script Connection${countTag}  ›`,
        keepOpen: true,
        run: () => {
          fillMenu(scripts.map(sc => ({ label: `⚡  ${sc.name}`, run: () => triggerScript(sc) })));
          placeMenu(parseInt(menuEl.style.left), parseInt(menuEl.style.top));
        }
      },
      '-'
    ] : []),
    { label: 'Cut' + countTag, run: () => storeClip({ mode: 'cut', paths }) },
    { label: 'Copy' + countTag, run: () => storeClip({ mode: 'copy', paths }) },
    { label: 'Paste' + (!multi && it.isDir ? ' into this folder' : ''), disabled: !clip, run: () => doPaste(pasteDir(it)) },
    { label: (multi ? 'Copy as paths' : 'Copy as path') + countTag, run: () => window.api.copyPath(paths) },
    { label: '📦 Compress to .zip' + countTag, run: async () => { $('status').textContent = 'Compressing…'; const r = await window.api.zipItems(paths, cur); if (r.error) alert(r.error); show(); } },
    '-',
    ...(!multi && firstEntry ? [{ label: 'Rename (F2 or hold click)', run: () => startRename(firstEntry.item, firstEntry.cell) }] : [
      { label: `Batch Rename ${paths.length} items (open Preview Pane)`, run: () => { showPreview = true; applyPreviewPane(); } }
    ]),
    { label: 'Delete (Recycle Bin)' + countTag, run: () => doDelete(paths) },
    ...(!multi ? [
      '-',
      { label: 'Properties', run: () => window.api.props(it.path) },
      { label: 'Show more options  ›', keepOpen: true, run: () => moreOptions(it.path, parseInt(menuEl.style.left), parseInt(menuEl.style.top)) }
    ] : [])
  ]);
  placeMenu(x, y);
}

async function createAndRename(fn) {
  const r = await fn();
  if (r.error) { alert(r.error); return; }
  if (mode === 'landscape') {
    const actRm = (typeof roomMap !== 'undefined' && roomMap.get) ? (roomMap.get(activeRoomPath) || roomMap.get(dir)) : null;
    if (actRm && actRm.populate) await actRm.populate();
    return;
  }
  await refreshKeep();
  const row = visibleRows().find(el => el._item && el._item.path === r.path);
  if (row) { focusRow(row, false); startRename(row._item, row); }
}

// Right-click on empty space = folder menu
$('content').addEventListener('contextmenu', async e => {
  if (cur === HOME_URI) return;
  e.preventDefault();
  await syncClip();
  fillMenu([
    { label: 'New folder', run: () => createAndRename(() => window.api.newFolder(cur)) },
    { label: 'New text document (.txt)', run: () => createAndRename(() => window.api.newFile(cur, '.txt')) },
    { label: 'New markdown file (.md)', run: () => createAndRename(() => window.api.newFile(cur, '.md')) },
    '-',
    { label: '⭐ Bookmark this folder', run: () => { if (!bookmarks.some(b => b.path === cur)) { bookmarks.push({ name: baseName(cur), path: cur }); renderBookmarksNav(); persist(); } } },
    { label: '🖥️ Open PowerShell here (External)', run: () => window.api.openTerminal(cur, 'powershell') },
    { label: '⌨️ Open CMD here (External)', run: () => window.api.openTerminal(cur, 'cmd') },
    { label: '📟 Open Terminal Island in Landscape', run: () => {
      openFolderInLandscape(cur).then(() => {
        if (typeof window.__spawnTerminalIsland === 'function') window.__spawnTerminalIsland(cur, baseName(cur));
      });
    }},
    ...(scripts.length ? [{
      label: '⚡ Run Script Connection here  ›',
      keepOpen: true,
      run: () => {
        fillMenu(scripts.map(sc => ({ label: `⚡  ${sc.name}`, run: () => triggerScript(sc) })));
        placeMenu(parseInt(menuEl.style.left), parseInt(menuEl.style.top));
      }
    }] : []),
    '-',
    { label: 'Select all (Ctrl+A)', run: selectAll },
    { label: 'Invert selection', run: invertSelection },
    { label: 'Paste (Ctrl+V)', disabled: !clip, run: () => doPaste(cur) },
    { label: 'Undo last rename/move (Ctrl+Z)', disabled: !undoStack.length, run: doUndo },
    { label: 'Refresh (F5)', run: refreshKeep },
    '-',
    { label: 'Properties', run: () => window.api.props(cur) },
    { label: 'Show more options  ›', keepOpen: true, run: () => moreOptions(cur, parseInt(menuEl.style.left), parseInt(menuEl.style.top)) }
  ]);
  placeMenu(e.clientX, e.clientY);
});

// Explorer keyboard shortcuts + tree navigation + type-to-select
let typeBuf = '', typeTimer = null;
function focusRow(row, shift = false) {
  if (!row || !row._item) return;
  selectClick(row._item, row, { shiftKey: shift, ctrlKey: false });
  row.scrollIntoView({ block: 'nearest' });
}

function getGridStride() {
  const gridModes = ['medium', 'large', 'xl', 'tiles', 'small'];
  if (!gridModes.includes(mode)) return 1;
  const items = $('list').querySelectorAll('.row.item');
  if (items.length < 2) return 1;
  const firstTop = items[0].offsetTop;
  let cols = 0;
  for (let i = 0; i < items.length; i++) {
    if (Math.abs(items[i].offsetTop - firstTop) < 4) cols++;
    else break;
  }
  return Math.max(1, cols);
}

document.addEventListener('keydown', async e => {
  if (document.querySelector('.hotkey-bind-btn.recording')) return;
  if (matchesHotkey(e, 'reopenTab')) { e.preventDefault(); reopenClosedTab(); return; }
  if (matchesHotkey(e, 'newTab')) { e.preventDefault(); newTab(); return; }
  if (matchesHotkey(e, 'closeTab')) { e.preventDefault(); closeTab(active); return; }
  if (matchesHotkey(e, 'newFolder')) { e.preventDefault(); createAndRename(() => window.api.newFolder(cur)); return; }
  if (matchesHotkey(e, 'newWindow')) { e.preventDefault(); window.api.newWindow(cur); return; }
  if (matchesHotkey(e, 'toggleTerminal')) {
    e.preventDefault();
    const d = $('termDrawer');
    if (d) {
      const show = d.style.display === 'none';
      d.style.display = show ? 'flex' : 'none';
      $('termBtn')?.classList.toggle('active', show);
      if (show) $('termDrawerInput')?.focus();
    }
    return;
  }
  if (e.altKey && e.key === 'Enter') {
    e.preventDefault();
    const target = selected.size ? [...selected.keys()][0] : cur;
    if (target && target !== HOME_URI) window.api.props(target);
    return;
  }
  if (e.ctrlKey && e.key === 'Tab') { e.preventDefault(); switchTab((active + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length); return; }
  if (e.ctrlKey && /^[1-9]$/.test(e.key)) { e.preventDefault(); switchTab(Math.min(+e.key - 1, tabs.length - 1)); return; }
  if (matchesHotkey(e, 'focusAddress') || (e.altKey && e.key.toLowerCase() === 'd')) { e.preventDefault(); startAddressEdit(); return; }
  if (matchesHotkey(e, 'focusSearch')) { e.preventDefault(); $('search').focus(); $('search').select(); return; }
  if (matchesHotkey(e, 'togglePreview')) { e.preventDefault(); $('previewBtn').click(); return; }
  if (matchesHotkey(e, 'toggleSplit')) { e.preventDefault(); splitState.active ? closeSplit() : activateSplit('right', cur); return; }
  if (matchesHotkey(e, 'goHome')) { e.preventDefault(); go(HOME_URI); return; }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  const rows = visibleRows();
  const curIdx = rows.findIndex(r => r._item && r._item.path === (focusedPath || (selected.size ? [...selected.keys()][0] : null)));
  const curRow = curIdx !== -1 ? rows[curIdx] : null;
  const first = curRow ? { item: curRow._item, cell: curRow } : [...selected.values()][0];

  const isGridMode = ['medium', 'large', 'xl', 'tiles', 'small'].includes(mode);
  const stride = isGridMode ? getGridStride() : 1;

  if (matchesHotkey(e, 'rename') && selected.size > 1) { showPreview = true; applyPreviewPane(); }
  else if (matchesHotkey(e, 'rename') && first) startRename(first.item, first.cell);
  else if (matchesHotkey(e, 'refresh')) refreshKeep();
  else if (e.key === 'Delete' && selected.size) {
    e.preventDefault();
    if (e.shiftKey) doPermanentDelete([...selected.keys()]);
    else doDelete([...selected.keys()]);
  }
  else if (e.key === 'Enter' && first) {
    if (first.item.isDir) {
      go(first.item.path);
    } else {
      if (mode === 'landscape' && !e.shiftKey && typeof window.__spawnFileViewerIsland === 'function') {
        const parRoomEl = first.cell ? first.cell.closest('.map-room') : null;
        const parPath = parRoomEl ? parRoomEl.dataset.roomPath : null;
        window.__spawnFileViewerIsland(first.item.path, first.item.name, parPath);
      } else {
        window.api.open(first.item.path);
      }
    }
  }
  else if (e.key === 'Backspace' && !e.altKey) { e.preventDefault(); goBack(); }
  else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); go(parent(cur)); }
  else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
  else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
  else if (e.key === 'ArrowDown' && rows.length) {
    e.preventDefault();
    focusRow(rows[Math.min((curIdx === -1 ? 0 : curIdx) + stride, rows.length - 1)], e.shiftKey);
  } else if (e.key === 'ArrowUp' && rows.length) {
    e.preventDefault();
    focusRow(rows[Math.max((curIdx === -1 ? 0 : curIdx) - stride, 0)], e.shiftKey);
  } else if (e.key === 'Home' && rows.length) {
    e.preventDefault();
    focusRow(rows[0], e.shiftKey);
  } else if (e.key === 'End' && rows.length) {
    e.preventDefault();
    focusRow(rows[rows.length - 1], e.shiftKey);
  } else if (e.key === 'PageDown' && rows.length) {
    e.preventDefault();
    focusRow(rows[Math.min((curIdx === -1 ? 0 : curIdx) + 15, rows.length - 1)], e.shiftKey);
  } else if (e.key === 'PageUp' && rows.length) {
    e.preventDefault();
    focusRow(rows[Math.max((curIdx === -1 ? 0 : curIdx) - 15, 0)], e.shiftKey);
  } else if (e.key === 'ArrowRight' && rows.length) {
    e.preventDefault();
    if (isGridMode) {
      focusRow(rows[Math.min((curIdx === -1 ? 0 : curIdx) + 1, rows.length - 1)], e.shiftKey);
    } else if (curRow && curRow._item.isDir) {
      if (!expanded.has(curRow._item.path)) await curRow._expand();
      else {
        const firstChild = curRow._kids && curRow._kids.querySelector('.row.item');
        if (firstChild) focusRow(firstChild, false);
      }
    }
  } else if (e.key === 'ArrowLeft' && rows.length) {
    e.preventDefault();
    if (isGridMode) {
      focusRow(rows[Math.max((curIdx === -1 ? 0 : curIdx) - 1, 0)], e.shiftKey);
    } else if (curRow) {
      if (curRow._item.isDir && expanded.has(curRow._item.path)) curRow._collapse();
      else if (curRow._parentCell) focusRow(curRow._parentCell, false);
    }
  } else if (e.ctrlKey && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAll(); }
  else if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); }
  else if (e.ctrlKey && e.key.toLowerCase() === 'c' && selected.size) storeClip({ mode: 'copy', paths: [...selected.keys()] });
  else if (e.ctrlKey && e.key.toLowerCase() === 'x' && selected.size) storeClip({ mode: 'cut', paths: [...selected.keys()] });
  else if (e.ctrlKey && e.key.toLowerCase() === 'v') doPaste(pasteDir(first && first.item));
  else if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
    typeBuf += e.key.toLowerCase();
    clearTimeout(typeTimer);
    typeTimer = setTimeout(() => { typeBuf = ''; }, 700);
    const hit = rows.find(r => r._item && r._item.name.toLowerCase().startsWith(typeBuf));
    if (hit) focusRow(hit, false);
  }
});


  // ---- Settings Modal Wiring ----
  const settingsBackdrop = $('settingsBackdrop');
  const settingsBtn = $('settingsBtn');
  const settingsClose = $('settingsClose');
  const settingsSaveBtn = $('settingsSaveBtn');

  if (settingsBtn && settingsBackdrop) {
    function getLsRoomMap() {
      return window._landscapeState?.roomMap || null;
    }
    function getLsLayout() {
      return window._landscapeState?.layout || (landscapeLayout[cur] || null);
    }
    function refreshLandscapeLive() {
      if (mode === 'landscape') show();
    }

    function syncSpecificRoomControls(path) {
      const rmMap = getLsRoomMap();
      const r = path && rmMap ? rmMap.get(path) : null;
      if ($('setSpecificFrameColor')) $('setSpecificFrameColor').value = (r && r.roomColor && r.roomColor.startsWith('#')) ? r.roomColor : defaultFrameColor;
      if ($('setSpecificBgColor')) $('setSpecificBgColor').value = (r && r.roomBgColor && r.roomBgColor.startsWith('#')) ? r.roomBgColor : defaultBgColor;
      if ($('setSpecificLockFrame')) $('setSpecificLockFrame').checked = r ? !!r.lockFrame : false;
      if ($('setSpecificLockBg')) $('setSpecificLockBg').checked = r ? !!r.lockBg : false;
    }

    function syncHotkeyButtons() {
      settingsBackdrop.querySelectorAll('.hotkey-bind-btn').forEach(btn => {
        const hk = btn.dataset.hk;
        btn.classList.remove('recording');
        btn.textContent = hotkeys[hk] || DEFAULT_HOTKEYS[hk] || 'Unbound';
      });
    }

    function populateSubPaletteDropdown(m) {
      const sel = $('setModeSubPalette');
      if (!sel) return;
      const modePals = MODE_PALETTES[m];
      if (!modePals) {
        if ($('setModeSubPaletteRow')) $('setModeSubPaletteRow').style.display = 'none';
        if ($('setCustomPaletteSwatchesRow')) $('setCustomPaletteSwatchesRow').style.display = 'none';
        return;
      }
      if ($('setModeSubPaletteRow')) $('setModeSubPaletteRow').style.display = 'flex';
      sel.innerHTML = '';
      modePals.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = p.name;
        sel.appendChild(opt);
      });
      const custOpt = document.createElement('option');
      custOpt.value = '5';
      custOpt.textContent = '6. Custom Palette (7 Swatches)';
      sel.appendChild(custOpt);
      const curIdx = getModePaletteIdx(m);
      sel.value = String(curIdx);
      syncCustomSwatchInputs(m, curIdx);
    }

    function syncCustomSwatchInputs(m, palIdx) {
      const row = $('setCustomPaletteSwatchesRow');
      if (!row) return;
      row.style.display = Number(palIdx) === 5 ? 'flex' : 'none';
      const baseColors = getModeCustomSwatches(m);
      for (let i = 0; i < 7; i++) {
        const inp = $('setCustomSwatch' + i);
        if (inp) inp.value = baseColors[i] || '#3b82f6';
      }
    }

    function syncPaletteModeRows(palVal) {
      populateSubPaletteDropdown(palVal);
      if ($('setInheritShiftRow')) $('setInheritShiftRow').style.display = palVal === 'inherit' ? 'flex' : 'none';
      const isBreath = palVal === 'breathing';
      const isPuddle = palVal === 'rain-puddle';
      const isBreathOrPuddle = isBreath || isPuddle;
      const hasCyclePace = isBreath || palVal === 'rainbow-sync' || palVal === 'rainbow-async' || palVal === 'rainbow-wave';
      if ($('setBreathDurationRow')) $('setBreathDurationRow').style.display = hasCyclePace ? 'flex' : 'none';
      if ($('setBreathScaleRow')) $('setBreathScaleRow').style.display = isBreathOrPuddle ? 'flex' : 'none';
      if ($('setBreathTargetRow')) $('setBreathTargetRow').style.display = isBreathOrPuddle ? 'flex' : 'none';
      if ($('setBreathAffectTilesRow')) $('setBreathAffectTilesRow').style.display = isBreathOrPuddle ? 'flex' : 'none';
      if ($('setRainPuddleGroup')) $('setRainPuddleGroup').style.display = isPuddle ? 'flex' : 'none';
    }

    settingsBtn.onclick = () => {
      // Sync UI state
      if ($('setShowExt')) $('setShowExt').checked = showExt;
      if ($('setShowHidden')) $('setShowHidden').checked = showHidden;
      if ($('setShowChecks')) $('setShowChecks').checked = showChecks;
      if ($('setAccentColor')) $('setAccentColor').value = accentColor || '#0067c0';
      if ($('setLandscapeBg')) $('setLandscapeBg').value = landscapeBg;
      if ($('setCanvasColorPicker')) $('setCanvasColorPicker').value = landscapeBgColor;
      if ($('setCanvasImageUrl')) $('setCanvasImageUrl').value = landscapeBgImage;
      if ($('setCanvasReactMode')) $('setCanvasReactMode').checked = !!canvasReactMode;
      if ($('setRoomPalette')) $('setRoomPalette').value = landscapePalette;
      if ($('setInheritShiftMode')) $('setInheritShiftMode').value = inheritShiftMode || 'lighter';
      if ($('setAutoSleep')) $('setAutoSleep').checked = browserAutoSleep;
      if ($('setAutoSummarize')) $('setAutoSummarize').checked = autoSummarize;
      if ($('setDefaultFrameColor')) $('setDefaultFrameColor').value = defaultFrameColor;
      if ($('setDefaultBgColor')) $('setDefaultBgColor').value = defaultBgColor;
      if ($('setRoomBgOpacity')) $('setRoomBgOpacity').value = roomBgOpacity;
      if ($('setRoomBgOpacityVal')) $('setRoomBgOpacityVal').textContent = roomBgOpacity + '%';
      if ($('setRoomGlow')) $('setRoomGlow').value = roomGlowIntensity;
      if ($('setRoomGlowVal')) $('setRoomGlowVal').textContent = roomGlowIntensity + '%';
      if ($('setRoomGlowRange')) $('setRoomGlowRange').value = roomGlowRange;
      if ($('setRoomGlowRangeNum')) $('setRoomGlowRangeNum').value = roomGlowRange;
      if ($('setBreathTargetColor')) $('setBreathTargetColor').value = breathTargetColor || '#ffffff';
      if ($('setBreathTargetBgColor')) $('setBreathTargetBgColor').value = breathTargetBgColor || '#334155';
      if ($('setBreathScale')) $('setBreathScale').value = breathScaleSize;
      if ($('setBreathScaleNum')) $('setBreathScaleNum').value = breathScaleSize;
      if ($('setBreathAffectTiles')) $('setBreathAffectTiles').checked = breathAffectTiles;
      if ($('setPuddleMin')) $('setPuddleMin').value = puddleIntervalMin;
      if ($('setPuddleMax')) $('setPuddleMax').value = puddleIntervalMax;
      if ($('setPuddleDuration')) $('setPuddleDuration').value = Math.min(360, puddleRippleDuration);
      if ($('setPuddleDurationNum')) $('setPuddleDurationNum').value = puddleRippleDuration;
      if ($('setPuddleMaxConcurrent')) $('setPuddleMaxConcurrent').value = Math.min(50, puddleMaxConcurrent);
      if ($('setPuddleMaxConcurrentNum')) $('setPuddleMaxConcurrentNum').value = puddleMaxConcurrent;
      if ($('setActiveRoomColor')) $('setActiveRoomColor').value = activeRoomBorderColor;
      if ($('setUseCustomSelectedFolder')) $('setUseCustomSelectedFolder').checked = useCustomSelectedFolder;
      if ($('setSelectedFolderColor')) {
        $('setSelectedFolderColor').value = selectedFolderColor || '#0078d4';
        $('setSelectedFolderColor').disabled = false; // Always clickable!
      }
      if ($('setBreathDuration')) $('setBreathDuration').value = Math.min(360, breathingDuration);
      if ($('setBreathDurationNum')) $('setBreathDurationNum').value = breathingDuration;
      if ($('setLockFrame')) $('setLockFrame').checked = lockFrame;
      if ($('setLockBg')) $('setLockBg').checked = lockBg;
      if ($('setHoldRenameEnabled')) $('setHoldRenameEnabled').checked = holdRenameEnabled;
      if ($('setHoldRenameDelay')) $('setHoldRenameDelay').value = holdRenameDelay;
      if ($('setHoldRenameDelayVal')) $('setHoldRenameDelayVal').textContent = holdRenameDelay + 'ms';

      syncHotkeyButtons();

      // Specific Room Customizer Dropdown
      const roomSel = $('setSpecificRoomSelect');
      const rmMap = getLsRoomMap();
      if (roomSel) {
        roomSel.innerHTML = '<option value="">(Select or Click any Room)</option>';
        if (rmMap) {
          for (const rm of rmMap.values()) {
            const opt = document.createElement('option');
            opt.value = rm.path;
            opt.textContent = `${rm.depth === 0 ? '🏰 ' : '🏝️ '}${rm.name}`;
            roomSel.appendChild(opt);
          }
        }
        const actPath = window._landscapeState?.getActiveRoomPath?.() || '';
        const targetPath = (actPath && rmMap && rmMap.has(actPath)) ? actPath : '';
        roomSel.value = targetPath;
        syncSpecificRoomControls(targetPath);
      }

      const palVal = $('setRoomPalette')?.value || landscapePalette;
      syncPaletteModeRows(palVal);
      if ($('setHoldRenameDelayRow')) $('setHoldRenameDelayRow').style.display = holdRenameEnabled ? 'flex' : 'none';

      const bgVal = $('setLandscapeBg')?.value;
      if ($('setCustomColorRow')) $('setCustomColorRow').style.display = bgVal === 'custom-color' ? 'flex' : 'none';
      if ($('setCustomImageRow')) $('setCustomImageRow').style.display = bgVal === 'custom-image' ? 'flex' : 'none';

      settingsBackdrop.classList.remove('hidden');
    };

    if (settingsClose) settingsClose.onclick = () => settingsBackdrop.classList.add('hidden');
    settingsBackdrop.onclick = e => { if (e.target === settingsBackdrop) settingsBackdrop.classList.add('hidden'); };

    // Tabs
    settingsBackdrop.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.onclick = () => {
        settingsBackdrop.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        const tabName = btn.dataset.tab;
        settingsBackdrop.querySelectorAll('.settings-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tabName));
      };
    });

    // Interactive Hotkey Rebinding
    settingsBackdrop.querySelectorAll('.hotkey-bind-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        settingsBackdrop.querySelectorAll('.hotkey-bind-btn.recording').forEach(b => {
          if (b !== btn) {
            b.classList.remove('recording');
            b.textContent = hotkeys[b.dataset.hk] || DEFAULT_HOTKEYS[b.dataset.hk] || 'Unbound';
          }
        });
        const hk = btn.dataset.hk;
        const modOnly = btn.dataset.modOnly === 'true';
        btn.classList.add('recording');
        btn.textContent = modOnly ? 'Hold Modifiers… (Esc cancel)' : 'Press Shortcut… (Esc cancel)';

        let lastModCombo = '';
        const cleanup = () => {
          window.removeEventListener('keydown', onRecDown, true);
          window.removeEventListener('keyup', onRecUp, true);
          btn.classList.remove('recording');
        };
        const onRecDown = ev => {
          ev.preventDefault();
          ev.stopPropagation();
          if (ev.key === 'Escape') {
            cleanup();
            btn.textContent = hotkeys[hk] || DEFAULT_HOTKEYS[hk];
            return;
          }
          if (modOnly) {
            const mods = [];
            if (ev.ctrlKey || ev.key === 'Control') mods.push('Ctrl');
            if (ev.altKey || ev.key === 'Alt') mods.push('Alt');
            if (ev.shiftKey || ev.key === 'Shift') mods.push('Shift');
            if (mods.length) {
              lastModCombo = mods.join('+');
              btn.textContent = lastModCombo + ' (release to set)';
            }
          } else {
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(ev.key)) return;
            const combo = eventToCombo(ev);
            if (combo) {
              hotkeys[hk] = combo;
              cleanup();
              btn.textContent = combo;
              persist();
            }
          }
        };
        const onRecUp = ev => {
          if (!modOnly) return;
          ev.preventDefault();
          ev.stopPropagation();
          if (lastModCombo) {
            hotkeys[hk] = lastModCombo;
            cleanup();
            btn.textContent = lastModCombo;
            persist();
          }
        };
        window.addEventListener('keydown', onRecDown, true);
        window.addEventListener('keyup', onRecUp, true);
      };
    });

    $('resetAllHotkeysBtn')?.addEventListener('click', () => {
      hotkeys = { ...DEFAULT_HOTKEYS };
      syncHotkeyButtons();
      persist();
    });

    $('setAccentColor')?.addEventListener('input', e => {
      accentColor = e.target.value || '#0067c0';
      document.documentElement.style.setProperty('--accent', accentColor);
      persist();
    });

    $('setLandscapeBg')?.addEventListener('change', e => {
      const v = e.target.value;
      landscapeBg = v;
      if ($('setCustomColorRow')) $('setCustomColorRow').style.display = v === 'custom-color' ? 'flex' : 'none';
      if ($('setCustomImageRow')) $('setCustomImageRow').style.display = v === 'custom-image' ? 'flex' : 'none';
      refreshLandscapeLive();
      persist();
    });
    $('setCanvasColorPicker')?.addEventListener('input', e => {
      landscapeBgColor = e.target.value;
      refreshLandscapeLive();
    });
    $('setCanvasImageUrl')?.addEventListener('change', e => {
      landscapeBgImage = e.target.value;
      refreshLandscapeLive();
    });
    $('setCanvasReactMode')?.addEventListener('change', e => {
      canvasReactMode = !!e.target.checked;
      refreshLandscapeLive();
      persist();
    });

    $('setRoomPalette')?.addEventListener('change', e => {
      landscapePalette = e.target.value;
      syncPaletteModeRows(landscapePalette);
      refreshLandscapeLive();
      persist();
    });
    $('setInheritShiftMode')?.addEventListener('change', e => {
      inheritShiftMode = e.target.value || 'lighter';
      refreshLandscapeLive();
      persist();
    });
    $('setModeSubPalette')?.addEventListener('change', e => {
      const m = $('setRoomPalette')?.value || landscapePalette;
      const idx = parseInt(e.target.value) || 0;
      if (typeof modePaletteIndex !== 'object' || modePaletteIndex === null) modePaletteIndex = {};
      modePaletteIndex[m] = idx;
      syncCustomSwatchInputs(m, idx);
      refreshLandscapeLive();
      persist();
    });
    for (let i = 0; i < 7; i++) {
      $('setCustomSwatch' + i)?.addEventListener('input', () => {
        const m = $('setRoomPalette')?.value || landscapePalette;
        const arr = [];
        for (let k = 0; k < 7; k++) arr.push($('setCustomSwatch' + k)?.value || '#3b82f6');
        if (typeof customPaletteColors !== 'object' || customPaletteColors === null || Array.isArray(customPaletteColors)) customPaletteColors = {};
        customPaletteColors[m] = arr;
        refreshLandscapeLive();
      });
    }
    $('setDefaultFrameColor')?.addEventListener('input', e => {
      defaultFrameColor = e.target.value || '#0067c0';
      refreshLandscapeLive();
    });
    $('setDefaultBgColor')?.addEventListener('input', e => {
      defaultBgColor = e.target.value || '#1e293b';
      refreshLandscapeLive();
    });
    $('setBreathTargetColor')?.addEventListener('input', e => {
      breathTargetColor = e.target.value || '#ffffff';
      const vp = window._landscapeState?.viewport || document.querySelector('.landscape-viewport');
      if (vp) {
        vp.style.setProperty('--breath-target', breathTargetColor);
        vp.style.setProperty('--breath-glow', colorToRgba(breathTargetColor, 0.8));
      }
    });
    $('setBreathTargetBgColor')?.addEventListener('input', e => {
      breathTargetBgColor = e.target.value || '#334155';
      const vp = window._landscapeState?.viewport || document.querySelector('.landscape-viewport');
      if (vp) vp.style.setProperty('--breath-target-bg', colorToRgba(breathTargetBgColor, roomBgOpacity / 100));
    });
    $('setBreathAffectTiles')?.addEventListener('change', e => {
      breathAffectTiles = !!e.target.checked;
      refreshLandscapeLive();
      persist();
    });
    $('setActiveRoomColor')?.addEventListener('input', e => {
      activeRoomBorderColor = e.target.value || '#00f0ff';
      document.documentElement.style.setProperty('--active-room-border', activeRoomBorderColor);
      const vp = window._landscapeState?.viewport || document.querySelector('.landscape-viewport');
      if (vp) {
        vp.style.setProperty('--active-room-border', activeRoomBorderColor);
        vp.style.setProperty('--active-border-color', activeRoomBorderColor);
      }
    });
    $('setUseCustomSelectedFolder')?.addEventListener('change', e => {
      useCustomSelectedFolder = !!e.target.checked;
      window._landscapeState?.syncDoorwayBadges?.();
      persist();
    });
    $('setSelectedFolderColor')?.addEventListener('input', e => {
      selectedFolderColor = e.target.value || '#0078d4';
      useCustomSelectedFolder = true;
      if ($('setUseCustomSelectedFolder')) $('setUseCustomSelectedFolder').checked = true;
      window._landscapeState?.syncDoorwayBadges?.();
    });
    $('setRoomGlow')?.addEventListener('input', e => {
      const val = parseInt(e.target.value) || 0;
      roomGlowIntensity = val;
      if ($('setRoomGlowVal')) $('setRoomGlowVal').textContent = val + '%';
      document.documentElement.style.setProperty('--room-glow-intensity', val / 100);
      const vp = window._landscapeState?.viewport || document.querySelector('.landscape-viewport');
      if (vp) vp.style.setProperty('--room-glow-intensity', val / 100);
    });
    $('setRoomGlowRange')?.addEventListener('input', e => {
      const val = parseInt(e.target.value) || 0;
      roomGlowRange = val;
      if ($('setRoomGlowRangeNum')) $('setRoomGlowRangeNum').value = val;
      document.documentElement.style.setProperty('--room-glow-range', `${val}px`);
      const vp = window._landscapeState?.viewport || document.querySelector('.landscape-viewport');
      if (vp) vp.style.setProperty('--room-glow-range', `${val}px`);
    });
    $('setRoomGlowRangeNum')?.addEventListener('input', e => {
      const val = Math.max(0, parseInt(e.target.value) || 0);
      roomGlowRange = val;
      if ($('setRoomGlowRange')) $('setRoomGlowRange').value = Math.min(100, val);
      document.documentElement.style.setProperty('--room-glow-range', `${val}px`);
      const vp = window._landscapeState?.viewport || document.querySelector('.landscape-viewport');
      if (vp) vp.style.setProperty('--room-glow-range', `${val}px`);
    });
    $('setBreathScale')?.addEventListener('input', e => {
      const val = parseInt(e.target.value) || 0;
      breathScaleSize = val;
      if ($('setBreathScaleNum')) $('setBreathScaleNum').value = val;
      const vp = window._landscapeState?.viewport || document.querySelector('.landscape-viewport');
      if (vp) vp.style.setProperty('--breath-scale', `${val}px`);
    });
    $('setBreathScaleNum')?.addEventListener('input', e => {
      const val = Math.max(0, parseInt(e.target.value) || 0);
      breathScaleSize = val;
      if ($('setBreathScale')) $('setBreathScale').value = Math.min(80, val);
      const vp = window._landscapeState?.viewport || document.querySelector('.landscape-viewport');
      if (vp) vp.style.setProperty('--breath-scale', `${val}px`);
    });
    $('setBreathDuration')?.addEventListener('input', e => {
      const val = parseInt(e.target.value) || 6;
      breathingDuration = val;
      if ($('setBreathDurationNum')) $('setBreathDurationNum').value = val;
      const vp = window._landscapeState?.viewport || document.querySelector('.landscape-viewport');
      if (vp) vp.style.setProperty('--breath-duration', `${val}s`);
    });
    $('setBreathDurationNum')?.addEventListener('input', e => {
      const val = Math.max(1, parseInt(e.target.value) || 1);
      breathingDuration = val;
      if ($('setBreathDuration')) $('setBreathDuration').value = Math.min(360, val);
      const vp = window._landscapeState?.viewport || document.querySelector('.landscape-viewport');
      if (vp) vp.style.setProperty('--breath-duration', `${val}s`);
    });
    $('setPuddleDuration')?.addEventListener('input', e => {
      const val = parseFloat(e.target.value) || 5;
      puddleRippleDuration = val;
      if ($('setPuddleDurationNum')) $('setPuddleDurationNum').value = val;
    });
    $('setPuddleDurationNum')?.addEventListener('input', e => {
      const val = Math.max(0.5, parseFloat(e.target.value) || 5);
      puddleRippleDuration = val;
      if ($('setPuddleDuration')) $('setPuddleDuration').value = Math.min(360, val);
    });
    $('setPuddleMaxConcurrent')?.addEventListener('input', e => {
      const val = parseInt(e.target.value) || 4;
      puddleMaxConcurrent = val;
      if ($('setPuddleMaxConcurrentNum')) $('setPuddleMaxConcurrentNum').value = val;
    });
    $('setPuddleMaxConcurrentNum')?.addEventListener('input', e => {
      const val = Math.max(1, parseInt(e.target.value) || 4);
      puddleMaxConcurrent = val;
      if ($('setPuddleMaxConcurrent')) $('setPuddleMaxConcurrent').value = Math.min(50, val);
    });

    $('setRoomBgOpacity')?.addEventListener('input', e => {
      roomBgOpacity = parseInt(e.target.value);
      if (isNaN(roomBgOpacity)) roomBgOpacity = 100;
      if ($('setRoomBgOpacityVal')) $('setRoomBgOpacityVal').textContent = roomBgOpacity + '%';
      const rmMap = getLsRoomMap();
      if (rmMap) {
        for (const rm of rmMap.values()) {
          const bg = rm.roomBgColor || defaultBgColor;
          rm.el.style.setProperty('--room-base-bg', colorToRgba(bg, roomBgOpacity / 100));
          if (rm.lockBg || lockBg) rm.el.style.backgroundColor = colorToRgba(bg, roomBgOpacity / 100);
        }
      }
    });

    $('setSpecificRoomSelect')?.addEventListener('change', e => {
      syncSpecificRoomControls(e.target.value);
    });
    $('setSpecificFrameColor')?.addEventListener('input', e => {
      const path = $('setSpecificRoomSelect')?.value;
      const rmMap = getLsRoomMap();
      const lsLayout = getLsLayout();
      const r = path && rmMap ? rmMap.get(path) : null;
      if (r) {
        r.roomColor = e.target.value;
        r.el.style.setProperty('--room-border-color', r.roomColor);
        r.el.style.borderColor = r.roomColor;
        if (lsLayout?.rooms) lsLayout.rooms[path] = { ...(lsLayout.rooms[path] || {}), roomColor: r.roomColor };
        window._landscapeState?.syncDoorwayBadges?.();
        window._landscapeState?.drawBridges?.();
        persist();
      }
    });
    $('setSpecificBgColor')?.addEventListener('input', e => {
      const path = $('setSpecificRoomSelect')?.value;
      const rmMap = getLsRoomMap();
      const lsLayout = getLsLayout();
      const r = path && rmMap ? rmMap.get(path) : null;
      if (r) {
        r.roomBgColor = e.target.value;
        r.el.style.setProperty('--room-base-bg', colorToRgba(r.roomBgColor, roomBgOpacity / 100));
        r.el.style.backgroundColor = colorToRgba(r.roomBgColor, roomBgOpacity / 100);
        if (lsLayout?.rooms) lsLayout.rooms[path] = { ...(lsLayout.rooms[path] || {}), roomBgColor: r.roomBgColor };
        persist();
      }
    });
    $('setSpecificLockFrame')?.addEventListener('change', e => {
      const path = $('setSpecificRoomSelect')?.value;
      const rmMap = getLsRoomMap();
      const lsLayout = getLsLayout();
      const r = path && rmMap ? rmMap.get(path) : null;
      if (r) {
        r.lockFrame = e.target.checked;
        if (lsLayout?.rooms) lsLayout.rooms[path] = { ...(lsLayout.rooms[path] || {}), lockFrame: r.lockFrame };
        persist();
      }
    });
    $('setSpecificLockBg')?.addEventListener('change', e => {
      const path = $('setSpecificRoomSelect')?.value;
      const rmMap = getLsRoomMap();
      const lsLayout = getLsLayout();
      const r = path && rmMap ? rmMap.get(path) : null;
      if (r) {
        r.lockBg = e.target.checked;
        if (lsLayout?.rooms) lsLayout.rooms[path] = { ...(lsLayout.rooms[path] || {}), lockBg: r.lockBg };
        persist();
      }
    });
    $('setSpecificResetBtn')?.addEventListener('click', () => {
      const path = $('setSpecificRoomSelect')?.value;
      const rmMap = getLsRoomMap();
      const r = path && rmMap ? rmMap.get(path) : null;
      if (r) {
        resetRoomColor(r);
        syncSpecificRoomControls(path);
        refreshLandscapeLive();
      }
    });

    $('setHoldRenameEnabled')?.addEventListener('change', e => {
      if ($('setHoldRenameDelayRow')) $('setHoldRenameDelayRow').style.display = e.target.checked ? 'flex' : 'none';
    });
    $('setHoldRenameDelay')?.addEventListener('input', e => {
      if ($('setHoldRenameDelayVal')) $('setHoldRenameDelayVal').textContent = e.target.value + 'ms';
    });

    $('setThemeDark')?.addEventListener('click', () => { darkMode = true; applyTheme(); persist(); });
    $('setThemeLight')?.addEventListener('click', () => { darkMode = false; applyTheme(); persist(); });

    if (settingsSaveBtn) {
      settingsSaveBtn.onclick = () => {
        showExt = !!$('setShowExt')?.checked;
        showHidden = !!$('setShowHidden')?.checked;
        showChecks = !!$('setShowChecks')?.checked;
        if ($('setAccentColor')) {
          accentColor = $('setAccentColor').value || '#0067c0';
          document.documentElement.style.setProperty('--accent', accentColor);
        }
        landscapeBg = $('setLandscapeBg')?.value || 'grid';
        landscapeBgColor = $('setCanvasColorPicker')?.value || '#0f172a';
        landscapeBgImage = $('setCanvasImageUrl')?.value || '';
        canvasReactMode = !!$('setCanvasReactMode')?.checked;
        landscapePalette = $('setRoomPalette')?.value || 'default';
        inheritShiftMode = $('setInheritShiftMode')?.value || 'lighter';
        if ($('setModeSubPalette') && MODE_PALETTES[landscapePalette]) {
          if (typeof modePaletteIndex !== 'object' || modePaletteIndex === null) modePaletteIndex = {};
          modePaletteIndex[landscapePalette] = parseInt($('setModeSubPalette').value) || 0;
          if (modePaletteIndex[landscapePalette] === 5) {
            const arr = [];
            for (let k = 0; k < 7; k++) arr.push($('setCustomSwatch' + k)?.value || '#3b82f6');
            if (typeof customPaletteColors !== 'object' || customPaletteColors === null || Array.isArray(customPaletteColors)) customPaletteColors = {};
            customPaletteColors[landscapePalette] = arr;
          }
        }
        browserAutoSleep = !!$('setAutoSleep')?.checked;
        autoSummarize = !!$('setAutoSummarize')?.checked;
        defaultFrameColor = $('setDefaultFrameColor')?.value || '#0067c0';
        defaultBgColor = $('setDefaultBgColor')?.value || '#1e293b';
        const parsedOp = parseInt($('setRoomBgOpacity')?.value);
        roomBgOpacity = isNaN(parsedOp) ? 100 : parsedOp;
        const parsedGlow = parseInt($('setRoomGlow')?.value);
        roomGlowIntensity = isNaN(parsedGlow) ? 50 : parsedGlow;
        const parsedRange = parseInt($('setRoomGlowRangeNum')?.value ?? $('setRoomGlowRange')?.value);
        roomGlowRange = isNaN(parsedRange) ? 18 : parsedRange;
        document.documentElement.style.setProperty('--room-glow-intensity', roomGlowIntensity / 100);
        document.documentElement.style.setProperty('--room-glow-range', `${roomGlowRange}px`);
        breathTargetColor = $('setBreathTargetColor')?.value || '#ffffff';
        breathTargetBgColor = $('setBreathTargetBgColor')?.value || '#334155';
        const parsedScale = parseInt($('setBreathScaleNum')?.value ?? $('setBreathScale')?.value);
        breathScaleSize = isNaN(parsedScale) ? 20 : parsedScale;
        breathAffectTiles = !!$('setBreathAffectTiles')?.checked;
        puddleIntervalMin = Math.max(0.2, parseFloat($('setPuddleMin')?.value) || 2);
        puddleIntervalMax = Math.max(puddleIntervalMin, parseFloat($('setPuddleMax')?.value) || 8);
        puddleRippleDuration = Math.max(0.5, parseFloat($('setPuddleDurationNum')?.value ?? $('setPuddleDuration')?.value) || 5);
        puddleMaxConcurrent = Math.max(1, parseInt($('setPuddleMaxConcurrentNum')?.value ?? $('setPuddleMaxConcurrent')?.value) || 4);
        activeRoomBorderColor = $('setActiveRoomColor')?.value || '#00f0ff';
        document.documentElement.style.setProperty('--active-room-border', activeRoomBorderColor);
        useCustomSelectedFolder = !!$('setUseCustomSelectedFolder')?.checked;
        selectedFolderColor = $('setSelectedFolderColor')?.value || '#0078d4';
        breathingDuration = parseInt($('setBreathDurationNum')?.value) || parseInt($('setBreathDuration')?.value) || 6;
        lockFrame = !!$('setLockFrame')?.checked;
        lockBg = !!$('setLockBg')?.checked;
        holdRenameEnabled = !!$('setHoldRenameEnabled')?.checked;
        holdRenameDelay = parseInt($('setHoldRenameDelay')?.value) || 550;

        applyToggles();
        persist();
        settingsBackdrop.classList.add('hidden');
        if (mode === 'landscape') show();
      };
    }
  }

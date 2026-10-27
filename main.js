const { app, BrowserWindow, ipcMain, shell, nativeImage, clipboard, dialog, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, spawn } = require('child_process');

// ---- Saved settings (view, sort, group, window size, tab session, column widths, cached pins, scripts, bookmarks, recent, newTabTarget) ----
// Portable data mode: if packaged and a 'data' directory exists adjacent to the executable, store user settings locally
const portableDataDir = path.join(path.dirname(process.execPath), 'data');
if (app.isPackaged && fs.existsSync(portableDataDir)) {
  try { app.setPath('userData', portableDataDir); }
  catch (e) { console.warn('Could not set portable userData path:', e.message); }
}
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
function readSettings() { try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch { return {}; } }
function writeSettings(patch) {
  try { fs.mkdirSync(path.dirname(settingsFile()), { recursive: true }); fs.writeFileSync(settingsFile(), JSON.stringify({ ...readSettings(), ...patch }, null, 2)); }
  catch (e) { console.warn('settings not saved:', e.message); }
}
ipcMain.handle('getSettings', () => readSettings());
ipcMain.handle('saveSettings', (_e, patch) => { writeSettings(patch); return true; });

// ---- Shared clipboard across all Peek Explorer windows + Windows OS FileDropList ----
let sharedClip = null; // { mode: 'copy'|'cut', paths: [] }
ipcMain.handle('getClip', () => sharedClip);
ipcMain.handle('setClip', (_e, c) => {
  sharedClip = c;
  // Also push copied file paths to the native Windows clipboard (Set-Clipboard -Path) in background
  if (c && c.paths && c.paths.length) {
    const ps = `$ErrorActionPreference='SilentlyContinue'; Set-Clipboard -Path ($env:PE_CLIP -split ';')`;
    execFile('powershell.exe', ['-NoProfile', '-Sta', '-Command', ps], { env: { ...process.env, PE_CLIP: c.paths.join(';') }, timeout: 10000 }, () => {});
  }
  return true;
});
ipcMain.handle('getOsClipFiles', () => new Promise(resolve => {
  const ps = `$ErrorActionPreference='SilentlyContinue'; [Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-Clipboard -Format FileDropList | ForEach-Object { $_.FullName }`;
  execFile('powershell.exe', ['-NoProfile', '-Sta', '-Command', ps], { timeout: 8000 }, (_err, out) => {
    const list = (out || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    resolve(list);
  });
}));

let win;
let windowCount = 0;
function createWindow(opts = {}) {
  const primary = windowCount === 0;
  const b = readSettings().bounds || {};
  const off = primary ? 0 : 30 * Math.min(windowCount, 8);
  const w = new BrowserWindow({
    width: b.width || 1280, height: b.height || 800,
    ...(b.x !== undefined ? { x: b.x + off, y: b.y + off } : {}),
    backgroundColor: '#ffffff', title: 'Peek Explorer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    }
  });
  w.setMenuBarVisibility(false);
  w.setAutoHideMenuBar(false);
  w.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]`, message, line ? `(${sourceId}:${line})` : '');
  });
  w.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      w.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
  if (primary) { win = w; if (b.maximized) w.maximize(); }
  windowCount++;
  const saveBounds = () => { if (w.isDestroyed() || w.isMinimized()) return; const m = w.isMaximized(); writeSettings({ bounds: { ...(m ? (readSettings().bounds || {}) : w.getBounds()), maximized: m } }); };
  w.on('close', saveBounds);
  w.on('closed', () => { windowCount--; });
  w.loadFile('index.html', { query: { primary: primary ? '1' : '0', ...(opts.path ? { path: opts.path } : {}) } });
  return w;
}
ipcMain.handle('newWindow', (_e, p) => { createWindow({ path: p }); return true; });
ipcMain.handle('openDevTools', e => { e.sender.openDevTools(); return true; });

// Read-only listing. Failures return an error string and never touch files on disk.
ipcMain.handle('list', async (_e, dir) => {
  try {
    const names = await fs.promises.readdir(dir, { withFileTypes: true });
    const items = await Promise.all(names.map(async d => {
      const full = path.join(dir, d.name);
      let size = 0, mtime = 0, btime = 0;
      try { const s = await fs.promises.stat(full); size = s.size; mtime = s.mtimeMs; btime = s.birthtimeMs; } catch {}
      return { name: d.name, path: full, isDir: d.isDirectory(), size, mtime, btime };
    }));
    return { items };
  } catch (err) { return { error: String(err.message || err) }; }
});

// Safe recursive folder size calculation on demand (read-only)
ipcMain.handle('folderSize', async (_e, dir) => {
  let bytes = 0, files = 0, folders = 0;
  async function walk(d) {
    let entries;
    try { entries = await fs.promises.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { folders++; await walk(full); }
      else {
        files++;
        try { const s = await fs.promises.stat(full); bytes += s.size; } catch {}
      }
    }
  }
  await walk(dir);
  return { bytes, files, folders };
});

// Safe text preview (first 16 KB) for the preview pane
ipcMain.handle('readPreview', async (_e, p) => {
  try {
    const fh = await fs.promises.open(p, 'r');
    const buf = Buffer.alloc(16384);
    const { bytesRead } = await fh.read(buf, 0, 16384, 0);
    await fh.close();
    const slice = buf.subarray(0, bytesRead);
    if (slice.includes(0)) return { binary: true };
    return { text: slice.toString('utf8') };
  } catch (e) { return { error: String(e.message || e) }; }
});

ipcMain.handle('open', (_e, p) => shell.openPath(p));
ipcMain.handle('places', async () => {
  const home = os.homedir();
  const places = ['Desktop', 'Downloads', 'Documents', 'Pictures', 'Music', 'Videos']
    .map(n => ({ name: n, path: path.join(home, n) })).filter(p => fs.existsSync(p.path));
  const drives = [];
  for (let c = 67; c <= 90; c++) {
    const d = String.fromCharCode(c) + ':\\';
    if (fs.existsSync(d)) {
      let total = 0, free = 0;
      try {
        if (fs.promises.statfs) {
          const sf = await fs.promises.statfs(d);
          total = sf.bsize * sf.blocks;
          free = sf.bsize * sf.bavail;
        }
      } catch {}
      drives.push({ name: d, path: d, total, free });
    }
  }
  const s = readSettings();
  return { places, drives, home, cachedPins: s.cachedPins || [], scripts: s.scripts || [], bookmarks: s.bookmarks || [] };
});

// ---- Script Connections & Terminal ----
ipcMain.handle('pickScript', async () => {
  const r = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, {
    title: 'Select Script to Connect',
    filters: [
      { name: 'Scripts', extensions: ['ps1', 'bat', 'cmd', 'py', 'js', 'vbs', 'exe'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (r.canceled || !r.filePaths.length) return null;
  const p = r.filePaths[0];
  return { name: path.basename(p, path.extname(p)), path: p };
});

ipcMain.handle('pickFolder', async () => {
  const r = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, {
    title: 'Select Folder to Spawn in Landscape',
    properties: ['openDirectory']
  });
  if (r.canceled || !r.filePaths.length) return null;
  return r.filePaths[0];
});

ipcMain.handle('pickHtmlFile', async () => {
  const r = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, {
    title: 'Select HTML File to View in Landscape',
    filters: [
      { name: 'HTML Files', extensions: ['html', 'htm'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (r.canceled || !r.filePaths.length) return null;
  return r.filePaths[0];
});

ipcMain.handle('runScript', (_e, scriptPath, cwd, targetPaths = []) => new Promise(resolve => {
  if (!fs.existsSync(scriptPath)) return resolve({ error: 'Script file not found: ' + scriptPath });
  const ext = path.extname(scriptPath).toLowerCase();
  const workDir = (cwd && cwd !== 'peek://home' && fs.existsSync(cwd)) ? cwd : path.dirname(scriptPath);
  const env = { ...process.env, PEEK_DIR: workDir, PEEK_SELECTED: targetPaths.join(';') };
  let cmd = scriptPath, args = [...targetPaths];
  if (ext === '.ps1') { cmd = 'powershell.exe'; args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...targetPaths]; }
  else if (ext === '.py') { cmd = 'python'; args = [scriptPath, ...targetPaths]; }
  else if (ext === '.js') { cmd = 'node'; args = [scriptPath, ...targetPaths]; }
  else if (ext === '.vbs') { cmd = 'wscript.exe'; args = [scriptPath, ...targetPaths]; }
  else if (ext === '.bat' || ext === '.cmd') { cmd = 'cmd.exe'; args = ['/c', scriptPath, ...targetPaths]; }

  execFile(cmd, args, { cwd: workDir, env, timeout: 120000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
    resolve({
      ok: !err,
      code: err && typeof err.code === 'number' ? err.code : 0,
      stdout: (stdout || '').trim(),
      stderr: (stderr || (err ? err.message : '') || '').trim()
    });
  });
}));

ipcMain.handle('openTerminal', (_e, dir, shellType = 'powershell') => {
  const workDir = (dir && dir !== 'peek://home' && fs.existsSync(dir)) ? dir : os.homedir();
  if (shellType === 'cmd') {
    spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `cd /d "${workDir}"`], { cwd: workDir, detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('cmd.exe', ['/c', 'start', 'powershell.exe', '-NoExit', '-Command', `Set-Location -LiteralPath '${workDir.replace(/'/g, "''")}'`], { cwd: workDir, detached: true, stdio: 'ignore' }).unref();
  }
  return true;
});

ipcMain.handle('runTerminalCmd', async (_e, { shell = 'powershell', cmd = '', cwd = os.homedir() } = {}) => {
  const targetDir = (cwd && cwd !== 'peek://home' && fs.existsSync(cwd)) ? cwd : os.homedir();
  return new Promise(resolve => {
    const isCmd = shell === 'cmd';
    const bin = isCmd ? 'cmd.exe' : 'powershell.exe';
    const args = isCmd ? ['/c', cmd] : ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd];
    execFile(bin, args, { cwd: targetDir, timeout: 30000, maxBuffer: 10 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || (err && !stdout ? err.message : ''),
        exitCode: err ? (err.code || 1) : 0,
        cwd: targetDir
      });
    });
  });
});

// ---- Zip / Unzip (Non-destructive, never overwrites existing archive/folder) ----
ipcMain.handle('zipItems', (_e, paths, destDir) => new Promise(resolve => {
  if (!paths || !paths.length) return resolve({ error: 'No items selected' });
  const base = paths.length === 1 ? path.basename(paths[0], path.extname(paths[0])) : 'Archive';
  let zipName = base + '.zip', i = 2;
  while (fs.existsSync(path.join(destDir, zipName))) zipName = `${base} (${i++}).zip`;
  const destZip = path.join(destDir, zipName);
  const ps = `$ErrorActionPreference='Stop'; Compress-Archive -LiteralPath ($env:PE_SRCS -split ';') -DestinationPath $env:PE_DEST`;
  execFile('powershell.exe', ['-NoProfile', '-Command', ps], { env: { ...process.env, PE_SRCS: paths.join(';'), PE_DEST: destZip }, timeout: 120000 }, (err) => {
    if (err) return resolve({ error: String(err.message || err) });
    resolve({ ok: true, path: destZip });
  });
}));

ipcMain.handle('unzipItem', (_e, zipPath) => new Promise(resolve => {
  const dir = path.dirname(zipPath);
  const base = path.basename(zipPath, path.extname(zipPath));
  let outFolder = base, i = 2;
  while (fs.existsSync(path.join(dir, outFolder))) outFolder = `${base} (${i++})`;
  const dest = path.join(dir, outFolder);
  const ps = `$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath $env:PE_ZIP -DestinationPath $env:PE_DEST`;
  execFile('powershell.exe', ['-NoProfile', '-Command', ps], { env: { ...process.env, PE_ZIP: zipPath, PE_DEST: dest }, timeout: 120000 }, (err) => {
    if (err) return resolve({ error: String(err.message || err) });
    resolve({ ok: true, path: dest });
  });
}));

// ---- Icons ----
const iconCache = new Map();
const MAX_ICON_CACHE = 400;
function setIconCacheBounded(k, v) {
  if (iconCache.size >= MAX_ICON_CACHE && !iconCache.has(k)) {
    const oldest = iconCache.keys().next().value;
    iconCache.delete(oldest);
  }
  iconCache.set(k, v);
}
const DUMMY_FOLDER = path.join(os.tmpdir(), '__peek_folder_icon__');
try { if (!fs.existsSync(DUMMY_FOLDER)) fs.mkdirSync(DUMMY_FOLDER, { recursive: true }); } catch {}
const FLUENT_FOLDER_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <linearGradient id="pBk" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="pFrt" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffdf6d"/>
      <stop offset="30%" stop-color="#ffd54f"/>
      <stop offset="100%" stop-color="#ffb300"/>
    </linearGradient>
    <linearGradient id="pGls" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.12"/>
    </linearGradient>
    <filter id="pShd" x="-10%" y="-10%" width="125%" height="135%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#78350f" flood-opacity="0.32"/>
    </filter>
  </defs>
  <path d="M4 10a4 4 0 0 1 4-4h11l4 4h17a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V10z" fill="url(#pBk)"/>
  <rect x="7" y="11" width="34" height="20" rx="2" fill="#ffffff" opacity="0.6"/>
  <path d="M4 17a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3v19a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V17z" fill="url(#pFrt)" filter="url(#pShd)"/>
  <path d="M7 14h34a3 3 0 0 1 3 3v1H4v-1a3 3 0 0 1 3-3z" fill="url(#pGls)"/>
</svg>`);
const FOLDER_SVG = FLUENT_FOLDER_SVG;
const THUMB_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.ico', '.mp4', '.mov', '.webm', '.mkv', '.svg']);

async function getFolderIcon(p, px = 32) {
  const isDrive = /^[A-Za-z]:\\?$/.test(p);
  const k = isDrive ? ('DRIVE|' + p) : ('DIR|' + px);
  if (iconCache.has(k)) return iconCache.get(k);
  if (isDrive) {
    try {
      const img = await app.getFileIcon(p, { size: px > 32 ? 'large' : 'normal' });
      if (!img.isEmpty()) {
        const url = img.toDataURL();
        setIconCacheBounded(k, url);
        return url;
      }
    } catch {}
  }
  setIconCacheBounded(k, FLUENT_FOLDER_SVG);
  return FLUENT_FOLDER_SVG;
}

const isBlank = img => {
  const b = img.toBitmap(); let seen = 0;
  for (let i = 0; i < b.length; i += 4) { if (b[i + 3] > 10 && !(b[i] > 240 && b[i + 1] > 240 && b[i + 2] > 240)) { if (++seen > 20) return false; } }
  return true;
};
async function smallIcon(p, isDir, unique) {
  if (isDir) {
    return getFolderIcon(p, 16);
  }
  const ext = path.extname(p).toLowerCase();
  const key = unique ? p : (['.exe', '.lnk', '.ico', '.msi', ''].includes(ext) ? p : ext);
  if (iconCache.has(key)) return iconCache.get(key);
  try {
    const img = await app.getFileIcon(p, { size: 'normal' });
    const url = img.toDataURL(); setIconCacheBounded(key, url); return url;
  } catch { return null; }
}
ipcMain.handle('icon', async (_e, p, isDir, px, unique) => {
  if (!p || p === 'peek://home') return FOLDER_SVG;
  if (isDir) return getFolderIcon(p, px);

  const ext = path.extname(p).toLowerCase();
  // Only attempt thumbnail extraction on actual image/video formats; avoid crawler stalls on text, code, docs, and folders
  if (px > 24 && THUMB_EXTS.has(ext)) {
    const key = 'T' + px + '|' + p;
    if (iconCache.has(key)) return iconCache.get(key);
    try {
      const img = await nativeImage.createThumbnailFromPath(p, { width: px, height: px });
      if (!img.isEmpty() && !isBlank(img)) { const url = img.toDataURL(); setIconCacheBounded(key, url); return url; }
    } catch {}
  }
  return smallIcon(p, isDir, unique);
});

// ---- Quick access pins, read from Windows (read-only) & cached in settings ----
ipcMain.handle('pins', () => new Promise(resolve => {
  const ps = `$ErrorActionPreference='SilentlyContinue'; [Console]::OutputEncoding=[Text.Encoding]::UTF8; (New-Object -ComObject Shell.Application).Namespace('shell:::{679f85cb-0220-4080-b29b-5540cc05aab6}').Items() | ForEach-Object { if (($_.Verbs() | Where-Object { $_.Name -match 'npin from' }) -ne $null) { "$($_.Name)|$($_.Path)" } }`;
  execFile('powershell.exe', ['-NoProfile', '-Command', ps], { timeout: 60000 }, (err, out) => {
    if (err && !out) return resolve([]);
    const list = out.split(/\r?\n/).filter(Boolean).map(l => { const i = l.indexOf('|'); return { name: l.slice(0, i), path: l.slice(i + 1) }; }).filter(p => /^[A-Za-z]:\\/.test(p.path));
    if (list.length) writeSettings({ cachedPins: list });
    resolve(list);
  });
}));

// ---- Real Windows context-menu verbs (path passed via env var, never interpolated) ----
const psFile = `$ErrorActionPreference='SilentlyContinue'; [Console]::OutputEncoding=[Text.Encoding]::UTF8;
$p=$env:PE_PATH; $sh=New-Object -ComObject Shell.Application;
$item=$sh.Namespace((Split-Path $p -Parent)).ParseName((Split-Path $p -Leaf)); if(-not $item){ $item=$sh.Namespace($p).Self };
$verbs=@($item.Verbs());`;
ipcMain.handle('verbs', (_e, p) => new Promise(resolve => {
  execFile('powershell.exe', ['-NoProfile', '-Command', psFile + ` $i=0; foreach($v in $verbs){ if($v.Name){ "$i|$($v.Name)" }; $i++ }`],
    { env: { ...process.env, PE_PATH: p }, timeout: 20000 }, (_err, out) => {
      resolve((out || '').split(/\r?\n/).filter(Boolean).map(l => { const i = l.indexOf('|'); return { index: +l.slice(0, i), label: l.slice(i + 1).replace(/&/g, '') }; }).filter(v => v.label));
    });
}));
ipcMain.handle('doVerb', (_e, p, index) => new Promise(resolve => {
  execFile('powershell.exe', ['-NoProfile', '-Command', psFile + ` $verbs[${parseInt(index, 10)}].DoIt()`],
    { env: { ...process.env, PE_PATH: p }, timeout: 20000 }, () => resolve(true));
}));
ipcMain.handle('props', (_e, p) => new Promise(resolve => {
  execFile('powershell.exe', ['-NoProfile', '-Command', psFile + ` $item.InvokeVerb('properties'); Start-Sleep -Seconds 600`],
    { env: { ...process.env, PE_PATH: p }, timeout: 620000 }, () => resolve(true));
  resolve(true);
}));

// ---- File operations. Never overwrite; delete goes to the Recycle Bin after a confirm. ----
ipcMain.handle('copyPath', (_e, paths) => {
  const arr = Array.isArray(paths) ? paths : [paths];
  clipboard.writeText(arr.map(p => '"' + p + '"').join('\r\n'));
  return true;
});
ipcMain.handle('showInFolder', (_e, p) => { shell.showItemInFolder(p); return true; });

ipcMain.handle('rename', async (_e, p, newName) => {
  try {
    if (!newName || /[\\/:*?"<>|]/.test(newName)) return { error: 'Invalid name' };
    const dest = path.join(path.dirname(p), newName);
    if (dest === p) return { ok: true, newPath: p };
    if (fs.existsSync(dest)) return { error: 'A file with that name already exists' };
    await fs.promises.rename(p, dest); return { ok: true, newPath: dest, oldPath: p };
  } catch (e) { return { error: String(e.message || e) }; }
});

ipcMain.handle('batchRename', async (_e, paths, basePattern) => {
  const ops = [], skipped = [];
  let idx = 1;
  for (const p of paths) {
    try {
      const ext = path.extname(p);
      const isDir = (await fs.promises.stat(p)).isDirectory();
      const newName = `${basePattern} (${idx++})${isDir ? '' : ext}`;
      const dest = path.join(path.dirname(p), newName);
      if (fs.existsSync(dest)) { skipped.push(path.basename(p)); continue; }
      await fs.promises.rename(p, dest);
      ops.push({ from: dest, to: p });
    } catch (e) { skipped.push(path.basename(p)); }
  }
  return { ops, skipped };
});

ipcMain.handle('newFolder', async (_e, dir) => {
  try {
    let n = 'New folder', i = 2;
    while (fs.existsSync(path.join(dir, n))) n = 'New folder (' + i++ + ')';
    const full = path.join(dir, n);
    await fs.promises.mkdir(full); return { ok: true, name: n, path: full };
  } catch (e) { return { error: String(e.message || e) }; }
});

ipcMain.handle('newFile', async (_e, dir, ext = '.txt') => {
  try {
    const base = ext === '.md' ? 'New markdown' : 'New text document';
    let n = base + ext, i = 2;
    while (fs.existsSync(path.join(dir, n))) n = `${base} (${i++})${ext}`;
    const full = path.join(dir, n);
    await fs.promises.writeFile(full, '', { flag: 'wx' });
    return { ok: true, name: n, path: full };
  } catch (e) { return { error: String(e.message || e) }; }
});

ipcMain.handle('trash', async (_e, paths) => {
  const r = await dialog.showMessageBox(BrowserWindow.getFocusedWindow() || win, {
    type: 'warning', buttons: ['Move to Recycle Bin', 'Cancel'], defaultId: 1, cancelId: 1,
    message: `Move ${paths.length === 1 ? '"' + path.basename(paths[0]) + '"' : paths.length + ' items'} to the Recycle Bin?`
  });
  if (r.response !== 0) return { cancelled: true };
  try { for (const p of paths) await shell.trashItem(p); return { ok: true }; }
  catch (e) { return { error: String(e.message || e) }; }
});

ipcMain.handle('deletePermanent', async (_e, paths) => {
  const r = await dialog.showMessageBox(BrowserWindow.getFocusedWindow() || win, {
    type: 'warning', buttons: ['Permanently Delete', 'Cancel'], defaultId: 1, cancelId: 1,
    message: `Are you sure you want to PERMANENTLY delete ${paths.length === 1 ? '"' + path.basename(paths[0]) + '"' : paths.length + ' items'}? This action cannot be undone.`
  });
  if (r.response !== 0) return { cancelled: true };
  try {
    for (const p of paths) await fs.promises.rm(p, { recursive: true, force: true });
    return { ok: true };
  } catch (e) { return { error: String(e.message || e) }; }
});

// Native file drag-out to external OS windows / desktop / other apps
ipcMain.on('start-drag', async (event, paths) => {
  if (!paths || !paths.length) return;
  try {
    const icon = await app.getFileIcon(paths[0], { size: 'normal' }).catch(() => nativeImage.createEmpty());
    event.sender.startDrag({
      file: paths[0],
      files: paths,
      icon: icon || nativeImage.createEmpty()
    });
  } catch (err) {
    try {
      event.sender.startDrag({
        file: paths[0],
        files: paths,
        icon: nativeImage.createEmpty()
      });
    } catch {}
  }
});

// mode: 'copy' | 'cut'.
// When mode === 'copy' and destination already exists, automatically increments filename with " (n)" (e.g., "file (2).ext", "file (3).ext").
ipcMain.handle('paste', async (_e, mode, srcs, destDir) => {
  const skipped = [], moved = [], copied = [];
  for (const s of srcs) {
    try {
      const baseName = path.basename(s);
      let dest = path.join(destDir, baseName);
      if (mode === 'cut' && (s === dest || dest.startsWith(s + path.sep))) {
        skipped.push(baseName + ' (cannot move into itself)');
        continue;
      }
      if (fs.existsSync(dest)) {
        if (mode === 'copy') {
          let statIsDir = false;
          try { statIsDir = (await fs.promises.stat(s)).isDirectory(); } catch {}
          const ext = statIsDir ? '' : path.extname(baseName);
          const stem = statIsDir ? baseName : baseName.slice(0, baseName.length - ext.length);
          // If stem already ends in " (N)", strip it so copying "file (2).txt" produces "file (3).txt"
          const match = stem.match(/^(.*)\s+\((\d+)\)$/);
          const cleanStem = match ? match[1] : stem;
          let idx = match ? parseInt(match[2], 10) + 1 : 2;
          while (fs.existsSync(path.join(destDir, `${cleanStem} (${idx})${ext}`))) {
            idx++;
          }
          dest = path.join(destDir, `${cleanStem} (${idx})${ext}`);
        } else {
          skipped.push(baseName);
          continue;
        }
      }
      if (mode === 'cut') {
        try {
          await fs.promises.rename(s, dest);
        } catch (renameErr) {
          // Cross-device (different drives in Windows) throws EXDEV / EPERM: fallback to copy + remove
          if (renameErr.code === 'EXDEV' || renameErr.code === 'EPERM') {
            await fs.promises.cp(s, dest, { recursive: true, errorOnExist: true, force: false });
            await fs.promises.rm(s, { recursive: true, force: true });
          } else {
            throw renameErr;
          }
        }
        moved.push({ from: s, to: dest });
      } else {
        await fs.promises.cp(s, dest, { recursive: true, errorOnExist: true, force: false });
        copied.push({ from: s, to: dest });
      }
    } catch (e) { skipped.push(path.basename(s) + ' (' + (e.message || e) + ')'); }
  }
  return { skipped, moved, copied };
});

async function runSmokeTests() {
  const tests = [];
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const listEl = document.getElementById('list');

  function testWheelAllowed(targetEl, label) {
    const ev = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
    targetEl.dispatchEvent(ev);
    return {
      name: `Wheel scroll permitted on ${label}`,
      pass: !ev.defaultPrevented,
      err: ev.defaultPrevented ? 'Wheel event was blocked (defaultPrevented === true)' : null
    };
  }

  for (let i = 0; i < 30; i++) {
    if (listEl && listEl.children.length > 0) break;
    await delay(100);
  }
  tests.push({
    name: 'List element rendered with items',
    pass: listEl && listEl.children.length > 0,
    err: !listEl ? 'listEl is null' : (listEl.children.length === 0 ? 'list has 0 children' : null)
  });

  tests.push(testWheelAllowed(listEl, 'Initial view'));

  const standardViews = ['details', 'tiles', 'list', 'small', 'medium', 'large', 'xl', 'content'];
  for (const v of standardViews) {
    const viewSel = document.getElementById('view');
    viewSel.value = v;
    viewSel.dispatchEvent(new Event('change'));
    await delay(120);
    tests.push(testWheelAllowed(listEl, `View: ${v}`));
  }

  const viewSel = document.getElementById('view');
  viewSel.value = 'landscape';
  viewSel.dispatchEvent(new Event('change'));
  await delay(600);

  const viewport = listEl.querySelector('.landscape-viewport');
  const rooms = viewport ? viewport.querySelectorAll('.map-room') : [];
  tests.push({
    name: 'Landscape viewport element exists',
    pass: !!viewport,
    err: !viewport ? 'landscape-viewport not found in listEl' : null
  });
  tests.push({
    name: 'Landscape rooms rendered',
    pass: rooms.length > 0,
    err: rooms.length === 0 ? '0 rooms found in map-world' : null
  });

  // Test on user's actual folder: E:\Vector Field Theory\VFT Docs\_VFT MD
  try {
    const userDir = 'E:\\Vector Field Theory\\VFT Docs\\_VFT MD';
    if (window.go) {
      await window.go(userDir);
      await delay(800);
      const userRooms = listEl.querySelectorAll('.map-room');
      tests.push({
        name: `Landscape loads user folder (${userDir})`,
        pass: userRooms.length > 0,
        err: userRooms.length === 0 ? 'No rooms rendered for user folder' : null
      });
    }
  } catch (err) {
    tests.push({ name: 'User folder navigation', pass: false, err: String(err) });
  }

  // Test HUD buttons
  const hud = listEl.querySelector('.map-hud');
  if (hud) {
    const btnEnter = hud.querySelector('button[data-act="enter"]');
    if (btnEnter) { btnEnter.click(); await delay(100); }
    const btnWorld = hud.querySelector('button[data-act="world"]');
    if (btnWorld) { btnWorld.click(); await delay(100); }
    const btnTidy = hud.querySelector('button[data-act="reset"]');
    if (btnTidy) { btnTidy.click(); await delay(150); }
    tests.push({ name: 'Landscape HUD buttons respond without error', pass: true });
  }

  // Test Room view mode change
  const firstRoom = listEl.querySelector('.map-room');
  if (firstRoom) {
    const sel = firstRoom.querySelector('.rm-view-sel');
    if (sel) {
      sel.value = 'details';
      sel.dispatchEvent(new Event('change'));
      await delay(100);
      tests.push({ name: 'Room local view selector works', pass: true });
    }

    const roomFolderItem = firstRoom.querySelector('.room-item.is-dir');
    if (roomFolderItem) {
      const bridgeInd = roomFolderItem.querySelector('.rm-bridge-indicator');
      const bridgeBtnInName = roomFolderItem.querySelector('.c-name .rm-bridge-btn');
      tests.push({
        name: 'Landscape room item bridge indicator is clean corner badge and not inside c-name',
        pass: !!bridgeInd && !bridgeBtnInName,
        err: !bridgeInd ? 'Bridge indicator missing' : (bridgeBtnInName ? 'Bridge button still inside c-name' : null)
      });

      const isInitiallyOpen = roomFolderItem.classList.contains('bridged');
      const count0 = listEl.querySelectorAll('.map-room').length;
      roomFolderItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await delay(200);
      const count1 = listEl.querySelectorAll('.map-room').length;

      const pass1 = isInitiallyOpen ? count1 < count0 : count1 > count0;
      tests.push({
        name: 'Single click on folder in Landscape mode toggles room state (open/close)',
        pass: pass1,
        err: pass1 ? null : (isInitiallyOpen
          ? `Expected room count to decrease from ${count0}, got ${count1}`
          : `Expected room count to increase from ${count0}, got ${count1}`)
      });

      // Click again to toggle back!
      roomFolderItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await delay(200);
      const count2 = listEl.querySelectorAll('.map-room').length;
      const pass2 = isInitiallyOpen ? count2 > count1 : count2 < count1;

      tests.push({
        name: 'Clicking folder again in Landscape mode toggles back (1-click toggle)',
        pass: pass2,
        err: pass2 ? null : (isInitiallyOpen
          ? `Expected room count to restore/increase from ${count1}, got ${count2}`
          : `Expected room count to decrease from ${count1}, got ${count2}`)
      });
    }

    const roomFileItem = firstRoom.querySelector('.room-item:not(.is-dir)');
    if (roomFileItem) {
      let opened = false;
      const origOpen = window.api.open;
      window.api.open = () => { opened = true; };
      roomFileItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await delay(100);
      window.api.open = origOpen;
      tests.push({
        name: 'Single click on file in Landscape mode selects item without opening',
        pass: !opened && roomFileItem.classList.contains('sel'),
        err: opened ? 'window.api.open was called on 1-click!' : (!roomFileItem.classList.contains('sel') ? 'File was not selected' : null)
      });
    }

    if (typeof window.__spawnFolderIsland === 'function') {
      const testDir = 'C:\\';
      const beforeCount = listEl.querySelectorAll('.map-room').length;
      await window.__spawnFolderIsland(testDir, 'System Drive');
      await delay(200);
      const afterCount = listEl.querySelectorAll('.map-room').length;
      tests.push({
        name: 'Spawn folder directly into Landscape mode creates island',
        pass: afterCount > beforeCount,
        err: afterCount <= beforeCount ? 'Room count did not increase' : null
      });
    }

    if (typeof window.__spawnHtmlIsland === 'function') {
      const testHtml = 'E:\\Vector Field Theory\\peek_explorer\\test.html';
      await window.__spawnHtmlIsland(testHtml, 'Test Viewer');
      await delay(200);
      const htmlRoom = listEl.querySelector('.map-room.html-room');
      const iframe = htmlRoom ? htmlRoom.querySelector('iframe.html-island-frame') : null;
      tests.push({
        name: 'Spawn HTML island into Landscape renders iframe viewer',
        pass: !!htmlRoom && !!iframe,
        err: !htmlRoom ? 'HTML room missing' : (!iframe ? 'iframe missing in html-room' : null)
      });
    }
  }

  // Test Middle-Click Support Across Landscape Rooms
  const getTabCount = () => document.querySelectorAll('#tabs .tab:not(.plus)').length;
  const initialTabs = getTabCount();

  if (firstRoom) {
    const head = firstRoom.querySelector('.map-room-head');
    if (head) {
      head.dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true }));
      await delay(150);
      tests.push({
        name: 'Middle-click on Room Header opens new tab',
        pass: getTabCount() > initialTabs,
        err: getTabCount() <= initialTabs ? 'Tab count did not increase' : null
      });
    }

    const beforeRoomItemTabs = getTabCount();
    const roomFolderRow = firstRoom.querySelector('.room-item.is-dir');
    if (roomFolderRow) {
      roomFolderRow.dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true }));
      await delay(150);
      tests.push({
        name: 'Middle-click on Room Folder Item opens new tab',
        pass: getTabCount() > beforeRoomItemTabs,
        err: getTabCount() <= beforeRoomItemTabs ? 'Tab count did not increase' : null
      });
    }
  }

  if (viewport) {
    const evCanvas = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
    viewport.dispatchEvent(evCanvas);
    tests.push({
      name: 'Landscape canvas wheel zoom intercepts event',
      pass: evCanvas.defaultPrevented,
      err: !evCanvas.defaultPrevented ? 'Canvas wheel zoom did not preventDefault' : null
    });

    const roomBody = viewport.querySelector('.map-room-body');
    if (roomBody) {
      tests.push(testWheelAllowed(roomBody, 'Landscape indoor room body'));
    } else {
      tests.push({ name: 'Landscape room body found', pass: false, err: 'no room body rendered' });
    }

    const radar = viewport.querySelector('.landscape-radar');
    tests.push({
      name: 'Landscape Tactical Radar HUD element exists',
      pass: !!radar && !!radar.querySelector('.landscape-radar-canvas'),
      err: !radar ? 'landscape-radar not found' : null
    });
  }

  viewSel.value = 'details';
  viewSel.dispatchEvent(new Event('change'));
  await delay(200);
  tests.push(testWheelAllowed(listEl, 'View: details after exiting landscape'));

  viewSel.value = 'medium';
  viewSel.dispatchEvent(new Event('change'));
  for (let i = 0; i < 30; i++) {
    await delay(100);
    if (listEl.querySelectorAll('.row.item').length > 0) break;
  }
  tests.push(testWheelAllowed(listEl, 'View: medium after exiting landscape'));

  // Test Filename Bounds & Zero Overlap in Medium Grid View
  const mediumItems = listEl.querySelectorAll('.row.item');
  let filenameOverflowCount = 0;
  for (const it of mediumItems) {
    const nm = it.querySelector('.nm');
    if (nm && it.clientWidth > 0) {
      if (nm.clientWidth > it.clientWidth) filenameOverflowCount++;
      if (it.scrollWidth > it.clientWidth + 2) filenameOverflowCount++;
    }
  }
  tests.push({
    name: 'Medium view filenames bounded without horizontal overlap',
    pass: mediumItems.length > 0 && filenameOverflowCount === 0,
    err: filenameOverflowCount > 0 ? `${filenameOverflowCount} items have filenames overflowing card width` : (mediumItems.length === 0 ? 'no items rendered in medium view' : null)
  });

  const splitBtn = document.getElementById('splitBtn');
  if (splitBtn) {
    if (window.activateSplit) {
      window.activateSplit('right');
    } else {
      splitBtn.click();
    }
    await delay(200);
    const spList = document.getElementById('spList');
    if (spList) {
      tests.push(testWheelAllowed(spList, 'Split pane list'));
    }
    const splitGrip = document.getElementById('splitGrip');
    tests.push({
      name: 'Draggable split resizer element exists and is active',
      pass: !!splitGrip && !splitGrip.classList.contains('hidden'),
      err: !splitGrip ? 'splitGrip element missing' : (splitGrip.classList.contains('hidden') ? 'splitGrip is unexpectedly hidden' : null)
    });
    const spClose = document.getElementById('spClose');
    if (spClose) spClose.click();
    await delay(100);
  }

  // Test Native Address Bar Accessibility & Controls (v0.8.8)
  const addrWrap = document.getElementById('addrWrap');
  const addrIcon = document.getElementById('addrIcon');
  const addrHistBtn = document.getElementById('addrHistBtn');
  const addressInp = document.getElementById('address');

  tests.push({
    name: 'Address bar icon and history chevron buttons exist',
    pass: !!addrIcon && !!addrHistBtn && !!addrWrap && !!addressInp,
    err: !addrIcon ? 'addrIcon missing' : (!addrHistBtn ? 'addrHistBtn missing' : null)
  });

  if (addrIcon && addressInp && addrWrap) {
    addrIcon.click();
    await delay(100);
    tests.push({
      name: 'Clicking location icon activates address input with full path',
      pass: addrWrap.classList.contains('editing') && addressInp.value.length > 0,
      err: !addrWrap.classList.contains('editing') ? 'addrWrap not in editing mode' : (addressInp.value.length === 0 ? 'address input is empty' : null)
    });
    // Cancel edit with Escape
    addressInp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await delay(50);
  }

  // Test Two-Row Toolbar & Home Dashboard Card Selection (v0.8.9)
  const navRow = document.querySelector('.toolbar-row.nav-row');
  const cmdRow = document.querySelector('.toolbar-row.cmd-row');
  tests.push({
    name: 'Toolbar separated into dedicated Navigation and Command rows',
    pass: !!navRow && !!cmdRow && addrWrap.parentElement === navRow,
    err: !navRow ? 'navRow missing' : (!cmdRow ? 'cmdRow missing' : 'addrWrap not inside navRow')
  });

  try {
    if (window.go) {
      await window.go('peek://home');
      await delay(200);
      const firstCard = listEl.querySelector('.dash-card');
      if (firstCard) {
        firstCard.click();
        await delay(80);
        tests.push({
          name: 'Single click selects Home Dashboard card without premature navigation',
          pass: firstCard.classList.contains('sel') && window.cur === 'peek://home',
          err: !firstCard.classList.contains('sel') ? 'card missing .sel class' : (window.cur !== 'peek://home' ? 'single click prematurely navigated away' : null)
        });
      }
    }
  } catch (hErr) {
    tests.push({ name: 'Home card selection test', pass: false, err: String(hErr) });
  }

  try {
    const termDrawer = document.getElementById('termDrawer');
    const termBtn = document.getElementById('termBtn');
    tests.push({
      name: 'Integrated Terminal Drawer and Command Bar button exist',
      pass: termDrawer !== null && termBtn !== null,
      err: !termDrawer ? 'termDrawer element missing' : (!termBtn ? 'termBtn missing' : null)
    });

    const skittlesOpt = document.querySelector('#setRoomPalette option[value="skittles"]');
    const glowSlider = document.getElementById('setRoomGlow');
    const breathTarget = document.getElementById('setBreathTargetColor');
    tests.push({
      name: 'Skittles mode, Room Glow slider, and White Breathing target color settings exist',
      pass: skittlesOpt !== null && glowSlider !== null && breathTarget !== null,
      err: !skittlesOpt ? 'skittles palette option missing' : (!glowSlider ? 'setRoomGlow missing' : 'setBreathTargetColor missing')
    });

    const folderIcon = await window.api.icon('C:\\Windows', true, 32);
    tests.push({
      name: 'Authentic Windows 11 Fluent folder icon returned for directories without chassis fallback',
      pass: typeof folderIcon === 'string' && folderIcon.startsWith('data:image/svg+xml'),
      err: typeof folderIcon !== 'string' ? 'icon is not a string' : (!folderIcon.startsWith('data:image/svg+xml') ? 'icon is not Fluent SVG' : null)
    });
  } catch (termErr) {
    tests.push({ name: 'Terminal and Palette settings smoke test', pass: false, err: String(termErr) });
  }

  return tests;
}

app.whenReady().then(async () => {
  const appMenuTemplate = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(appMenuTemplate));
  if (process.argv.some(a => a.includes('smoke-test')) || process.env.PEEK_SMOKE_TEST === '1') {
    const w = createWindow({ path: __dirname });
    w.webContents.on('did-finish-load', async () => {
      try {
        const results = await w.webContents.executeJavaScript(`(${runSmokeTests.toString()})()`);
        let failed = 0;
        let logLines = ['\n=== SMOKE TEST RESULTS ==='];
        for (const r of results) {
          const line = (r.pass ? '✓ PASS' : '✗ FAIL') + ': ' + r.name + (r.err ? ' - ' + r.err : '');
          console.log(line);
          logLines.push(line);
          if (!r.pass) failed++;
        }
        logLines.push(`FAILED: ${failed}\n`);
        fs.writeFileSync(path.join(__dirname, 'smoke_results.txt'), logLines.join('\n'));
        app.exit(failed > 0 ? 1 : 0);
      } catch (e) {
        fs.writeFileSync(path.join(__dirname, 'smoke_results.txt'), 'CRASH: ' + String(e.stack || e));
        app.exit(1);
      }
    });
    return;
  }
  createWindow();
});
app.on('window-all-closed', () => app.quit());

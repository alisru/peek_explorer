/**
 * Peek Explorer — Portable Export Generator
 * Packages Peek Explorer into a completely standalone, portable Windows application.
 * No Node.js or installation required by the end-user.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const rootDir = __dirname;
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version || '0.8.4';
const distDir = path.join(rootDir, 'dist');
const portableDir = path.join(distDir, 'PeekExplorer-portable');
const zipFile = path.join(distDir, `PeekExplorer-v${version}-portable.zip`);

const electronDist = path.join(rootDir, 'node_modules', 'electron', 'dist');

console.log(`\n=================================================`);
console.log(`  Peek Explorer v${version} — Standalone Portable Export`);
console.log(`=================================================\n`);

if (!fs.existsSync(electronDist)) {
  console.error(`ERROR: Electron distribution not found at: ${electronDist}`);
  console.error(`Run 'npm install' first.`);
  process.exit(1);
}

// 1. Prepare dist directory
console.log(`[1/5] Preparing output directory: ${portableDir}`);
if (fs.existsSync(portableDir)) {
  fs.rmSync(portableDir, { recursive: true, force: true });
}
fs.mkdirSync(portableDir, { recursive: true });

// Helper for recursive copy
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 2. Copy Electron runtime binary
console.log(`[2/5] Copying Electron runtime binaries...`);
copyDirSync(electronDist, portableDir);

// Rename electron.exe -> PeekExplorer.exe
const origExe = path.join(portableDir, 'electron.exe');
const targetExe = path.join(portableDir, 'PeekExplorer.exe');
if (fs.existsSync(origExe)) {
  fs.renameSync(origExe, targetExe);
} else {
  console.error(`ERROR: electron.exe not found in ${portableDir}`);
  process.exit(1);
}

// 3. Assemble resources/app payload
console.log(`[3/5] Bundling application source into resources/app...`);
const resDir = path.join(portableDir, 'resources');
const defaultAsar = path.join(resDir, 'default_app.asar');
if (fs.existsSync(defaultAsar)) {
  fs.rmSync(defaultAsar, { force: true });
}

const appDir = path.join(resDir, 'app');
fs.mkdirSync(appDir, { recursive: true });

const filesToCopy = [
  'package.json',
  'main.js',
  'preload.js',
  'renderer.js',
  'gluon_engine.js',
  'index.html',
  'styles.css',
  'README.md',
  'CHANGELOG.md'
];

for (const file of filesToCopy) {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(appDir, file));
  }
}

const docsDir = path.join(rootDir, 'docs');
if (fs.existsSync(docsDir)) {
  copyDirSync(docsDir, path.join(appDir, 'docs'));
}

// 4. Create data folder for USB portability and instructions
const dataDir = path.join(portableDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, '.gitkeep'), '');

const readmeTxt = `Peek Explorer — Standalone Portable Edition
Version: ${version}

==================================================
HOW TO RUN:
==================================================
Simply double-click "PeekExplorer.exe" to launch.
- No installation required.
- No Node.js or npm required.
- Works on any 64-bit Windows PC.

==================================================
PORTABLE DATA:
==================================================
All your settings, window sizes, Quick access pins,
split view configurations, bookmarks, and recent paths
are stored locally in the "data" folder.

You can carry this entire folder on a USB stick or external
drive, and your settings will travel with you.

To use standard Windows %APPDATA% instead of local storage,
simply delete or rename the "data" folder.
`;
fs.writeFileSync(path.join(portableDir, 'README_PORTABLE.txt'), readmeTxt, 'utf8');

// Optional quick start batch
const launcherBat = `@echo off\nstart "" "%~dp0PeekExplorer.exe"\n`;
fs.writeFileSync(path.join(portableDir, 'Launch Peek Explorer.bat'), launcherBat, 'utf8');

console.log(`[4/5] Verifying portable binary with smoke test suite...`);
const testResult = spawnSync(targetExe, ['--smoke-test'], {
  encoding: 'utf8',
  timeout: 25000,
  windowsHide: true
});

if (testResult.status !== 0) {
  console.error(`ERROR: Portable binary smoke test failed with exit code ${testResult.status}`);
  console.error(testResult.stdout || '');
  console.error(testResult.stderr || '');
  process.exit(1);
} else {
  console.log(`✓ Smoke tests passed on packaged portable binary!`);
}

// 5. Create Zip Archive
console.log(`[5/5] Creating zip package: ${zipFile}...`);
if (fs.existsSync(zipFile)) {
  fs.rmSync(zipFile, { force: true });
}

try {
  // Use PowerShell Compress-Archive
  const psCmd = `Compress-Archive -Path '${portableDir}' -DestinationPath '${zipFile}' -Force`;
  execFileSync('powershell.exe', ['-NoProfile', '-Sta', '-Command', psCmd], { stdio: 'inherit', timeout: 90000 });
} catch (e) {
  console.warn(`Warning: Could not create zip archive: ${e.message}`);
}

const dirStat = (function getFolderSize(dir) {
  let bytes = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) bytes += getFolderSize(p);
    else bytes += fs.statSync(p).size;
  }
  return bytes;
})(portableDir);

const zipStat = fs.existsSync(zipFile) ? fs.statSync(zipFile).size : 0;

console.log(`\n=================================================`);
console.log(`  PORTABLE EXPORT SUCCESSFUL!`);
console.log(`=================================================`);
console.log(`- Portable Folder: ${portableDir} (${(dirStat / (1024 * 1024)).toFixed(1)} MB)`);
if (zipStat > 0) {
  console.log(`- Shareable Zip:   ${zipFile} (${(zipStat / (1024 * 1024)).toFixed(1)} MB)`);
}
console.log(`- Executable:      ${targetExe}`);
console.log(`=================================================\n`);

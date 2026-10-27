@echo off
rem Peek Explorer launcher (same as PeekExplorer.vbs but shows a console if something fails)
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo Electron not installed. Running npm install...
  call npm install
  if exist "node_modules\electron\install.js" node "node_modules\electron\install.js"
)
start "" "node_modules\electron\dist\electron.exe" .

const { contextBridge, ipcRenderer, webUtils } = require('electron');
const inv = (c) => (...a) => ipcRenderer.invoke(c, ...a);
contextBridge.exposeInMainWorld('api', {
  list: inv('list'), folderSize: inv('folderSize'), open: inv('open'), places: inv('places'), pins: inv('pins'),
  icon: inv('icon'), verbs: inv('verbs'), doVerb: inv('doVerb'), props: inv('props'),
  copyPath: inv('copyPath'), showInFolder: inv('showInFolder'), rename: inv('rename'), batchRename: inv('batchRename'),
  getSettings: inv('getSettings'), saveSettings: inv('saveSettings'), newWindow: inv('newWindow'), openDevTools: inv('openDevTools'),
  getClip: inv('getClip'), setClip: inv('setClip'), getOsClipFiles: inv('getOsClipFiles'), readPreview: inv('readPreview'), writeTextFile: inv('writeTextFile'), getResourceMetrics: inv('getResourceMetrics'),
  pickScript: inv('pickScript'), pickFolder: inv('pickFolder'), pickHtmlFile: inv('pickHtmlFile'), runScript: inv('runScript'), openTerminal: inv('openTerminal'), runTerminalCmd: inv('runTerminalCmd'),
  zipItems: inv('zipItems'), unzipItem: inv('unzipItem'),
  newFolder: inv('newFolder'), newFile: inv('newFile'), trash: inv('trash'), deletePermanent: inv('deletePermanent'), paste: inv('paste'),
  startDrag: (paths) => ipcRenderer.send('start-drag', paths),
  getPathForFile: (file) => {
    try { return webUtils.getPathForFile(file); } catch { return file.path || ''; }
  }
});

import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openAudioFile: () => ipcRenderer.invoke('dialog:openAudioFile'),
  analyzeAudio: (filePath: string) => ipcRenderer.invoke('audio:analyze', filePath),
  analyzeAudioBuffer: (fileName: string, buffer: ArrayBuffer) =>
    ipcRenderer.invoke('audio:analyzeBuffer', { fileName, buffer: new Uint8Array(buffer) }),
  cancelAnalysis: () => ipcRenderer.invoke('audio:cancelAnalysis'),
  saveProject: (project: any) => ipcRenderer.invoke('project:save', project),
  openProject: () => ipcRenderer.invoke('project:open'),
  exportData: (format: string, content: string, defaultName: string) =>
    ipcRenderer.invoke('data:export', { format, content, defaultName }),
  checkEngine: () => ipcRenderer.invoke('engine:check'),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  reloadApp: () => ipcRenderer.invoke('app:reload'),
  getPathForFile: (file: File) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
    } catch {
      // ignore
    }
    return (file as any).path || '';
  },
  onProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('audio:progress', handler);
    return () => {
      ipcRenderer.removeListener('audio:progress', handler);
    };
  },
});

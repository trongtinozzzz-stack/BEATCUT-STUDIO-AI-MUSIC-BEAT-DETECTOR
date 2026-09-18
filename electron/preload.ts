import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openAudioFile: () => ipcRenderer.invoke('dialog:openAudioFile'),
  analyzeAudio: (filePath: string) => ipcRenderer.invoke('audio:analyze', filePath),
  cancelAnalysis: () => ipcRenderer.invoke('audio:cancelAnalysis'),
  saveProject: (project: any) => ipcRenderer.invoke('project:save', project),
  openProject: () => ipcRenderer.invoke('project:open'),
  exportData: (format: string, content: string, defaultName: string) =>
    ipcRenderer.invoke('data:export', { format, content, defaultName }),
  checkEngine: () => ipcRenderer.invoke('engine:check'),
  onProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('audio:progress', handler);
    return () => {
      ipcRenderer.removeListener('audio:progress', handler);
    };
  },
});

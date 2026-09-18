import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn, ChildProcess } from 'node:child_process';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Giữ tham chiếu cửa sổ chính
let mainWindow: BrowserWindow | null = null;
let currentPythonProcess: ChildProcess | null = null;

// Xác định đường dẫn Python executable
function getPythonExecutable(): string {
  // 1. Kiểm tra Python trong thư mục resources khi đóng gói (Production)
  const prodPython = path.join(process.resourcesPath, 'python_runtime', 'python.exe');
  if (fs.existsSync(prodPython)) {
    return prodPython;
  }
  // 2. Kiểm tra Python trong thư mục chứa file .exe
  const exeDirPython = path.join(path.dirname(app.getPath('exe')), 'resources', 'python_runtime', 'python.exe');
  if (fs.existsSync(exeDirPython)) {
    return exeDirPython;
  }
  // 3. Kiểm tra Python runtime tích hợp cục bộ trong workspace
  const localPython = path.join(app.getAppPath(), 'python_runtime', 'python.exe');
  if (fs.existsSync(localPython)) {
    return localPython;
  }
  // 4. Kiểm tra nếu đang chạy ở development mode trong thư mục gốc
  const devLocalPython = path.resolve(__dirname, '..', 'python_runtime', 'python.exe');
  if (fs.existsSync(devLocalPython)) {
    return devLocalPython;
  }
  // 5. Fallback hệ thống
  return 'python';
}

function getScriptPath(): string {
  const prodScript = path.join(process.resourcesPath, 'python', 'beat_detector.py');
  if (fs.existsSync(prodScript)) {
    return prodScript;
  }
  const exeDirScript = path.join(path.dirname(app.getPath('exe')), 'resources', 'python', 'beat_detector.py');
  if (fs.existsSync(exeDirScript)) {
    return exeDirScript;
  }
  const devScript = path.resolve(__dirname, '..', 'python', 'beat_detector.py');
  if (fs.existsSync(devScript)) {
    return devScript;
  }
  return path.join(app.getAppPath(), 'python', 'beat_detector.py');
}

function createWindow() {
  // Tìm đường dẫn icon an toàn
  let iconPath = path.join(app.getAppPath(), 'build', 'icon.ico');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(process.resourcesPath, 'build', 'icon.ico');
  }
  if (!fs.existsSync(iconPath)) {
    iconPath = path.resolve(__dirname, '..', 'build', 'icon.ico');
  }

  // Tìm đường dẫn preload script an toàn
  const candidatePreloads = [
    path.join(__dirname, 'preload.cjs'),
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, 'preload.mjs'),
    path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
    path.join(app.getAppPath(), 'dist-electron', 'preload.js'),
    path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'preload.cjs'),
    path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'preload.js'),
  ];
  let preloadPath = candidatePreloads.find((p) => fs.existsSync(p)) || path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 650,
    backgroundColor: '#0c0d12',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    title: 'BEATCUT STUDIO — AI Music Beat Detector',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    autoHideMenuBar: true,
    show: true,
  });

  // Load URL
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const prodIndex = path.join(app.getAppPath(), 'dist', 'index.html');
    if (fs.existsSync(prodIndex)) {
      mainWindow.loadFile(prodIndex);
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load page:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (currentPythonProcess) {
      try {
        currentPythonProcess.kill();
      } catch {
        // ignore
      }
      currentPythonProcess = null;
    }
  });
}

// Đăng ký custom protocol 'local-audio' để stream file âm thanh an toàn
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-audio',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

app.whenReady().then(() => {
  // Handle local-audio protocol
  protocol.handle('local-audio', (request) => {
    try {
      // Decode pathname from URL local-audio://...
      const rawPath = request.url.replace(/^local-audio:\/\//, '');
      const filePath = decodeURIComponent(rawPath);
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }
      return net.fetch(`file:///${filePath.replace(/\\/g, '/')}`);
    } catch (err: any) {
      return new Response(`Error loading audio: ${err.message}`, { status: 500 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Mở file âm thanh
ipcMain.handle('dialog:openAudioFile', async () => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn file âm thanh',
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files (*.mp3, *.wav, *.m4a, *.flac, *.ogg)', extensions: ['mp3', 'wav', 'm4a', 'flac', 'ogg'] },
      { name: 'Tất cả file', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const fileUrl = `local-audio://${encodeURIComponent(filePath)}`;

  return {
    canceled: false,
    filePath,
    fileName,
    fileUrl,
    size: stats.size,
  };
});

// IPC Handler: Kiểm tra môi trường Audio Engine (Python & Librosa)
ipcMain.handle('engine:check', async () => {
  const pythonBin = getPythonExecutable();
  const scriptPath = getScriptPath();

  return new Promise((resolve) => {
    try {
      const proc = spawn(pythonBin, [scriptPath, '--check-env'], {
        windowsHide: true,
      });

      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          try {
            const lines = output.trim().split('\n');
            for (const line of lines) {
              const parsed = JSON.parse(line.trim());
              if (parsed.type === 'env_check') {
                return resolve(parsed.status);
              }
            }
          } catch {
            // fallback
          }
        }
        resolve({
          ready: false,
          error: 'Không thể kết nối Audio Engine Python',
        });
      });

      proc.on('error', () => {
        resolve({
          ready: false,
          error: 'Không tìm thấy Python executable',
        });
      });
    } catch (e: any) {
      resolve({
        ready: false,
        error: e.message,
      });
    }
  });
});

// Hàm phân tích file âm thanh nội bộ qua Python Librosa
async function analyzeAudioInternal(filePath: string): Promise<any> {
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      error: 'File âm thanh không tồn tại hoặc đã bị di chuyển.',
    };
  }

  // Hủy tiến trình cũ nếu còn chạy
  if (currentPythonProcess) {
    try {
      currentPythonProcess.kill();
    } catch {
      // ignore
    }
    currentPythonProcess = null;
  }

  const pythonBin = getPythonExecutable();
  const scriptPath = getScriptPath();

  return new Promise((resolve) => {
    try {
      const proc = spawn(pythonBin, [scriptPath, 'analyze', filePath], {
        windowsHide: true,
      });
      currentPythonProcess = proc;

      const rl = readline.createInterface({
        input: proc.stdout,
        crlfDelay: Infinity,
      });

      let finalResult: any = null;
      let errorMessage: string | null = null;
      let errorDetails: string | null = null;

      rl.on('line', (line) => {
        try {
          const msg = JSON.parse(line.trim());
          if (msg.type === 'progress') {
            mainWindow?.webContents.send('audio:progress', {
              percent: msg.percent,
              message: msg.message,
            });
          } else if (msg.type === 'result') {
            finalResult = msg.data;
          } else if (msg.type === 'error') {
            errorMessage = msg.error;
            errorDetails = msg.details;
          }
        } catch {
          // ignore non-json log line
        }
      });

      let stderrOutput = '';
      proc.stderr.on('data', (data) => {
        stderrOutput += data.toString();
      });

      proc.on('close', (code) => {
        currentPythonProcess = null;
        if (code === 0 && finalResult) {
          resolve({
            success: true,
            data: finalResult,
          });
        } else {
          resolve({
            success: false,
            error: errorMessage || 'Phân tích âm thanh không thành công.',
            details: errorDetails || stderrOutput,
          });
        }
      });

      proc.on('error', (err) => {
        currentPythonProcess = null;
        resolve({
          success: false,
          error: 'Không thể khởi chạy tiến trình Python.',
          details: err.message,
        });
      });
    } catch (err: any) {
      currentPythonProcess = null;
      resolve({
        success: false,
        error: 'Lỗi thực thi quy trình phân tích.',
        details: err.message,
      });
    }
  });
}

// IPC Handler: Phân tích Beat với Librosa theo đường dẫn
ipcMain.handle('audio:analyze', async (_event, filePath: string) => {
  return analyzeAudioInternal(filePath);
});

// IPC Handler: Phân tích file từ ArrayBuffer (dành cho Web Drop hoặc HTML input)
ipcMain.handle('audio:analyzeBuffer', async (_event, { fileName, buffer }: { fileName: string; buffer: Uint8Array }) => {
  try {
    const tempDir = app.getPath('temp');
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempPath = path.join(tempDir, `beatcut_${Date.now()}_${safeName}`);
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    return analyzeAudioInternal(tempPath);
  } catch (err: any) {
    return {
      success: false,
      error: `Lỗi ghi file tạm để phân tích: ${err.message}`,
    };
  }
});

// IPC Handler: Hủy phân tích
ipcMain.handle('audio:cancelAnalysis', async () => {
  if (currentPythonProcess) {
    try {
      currentPythonProcess.kill();
    } catch {
      // ignore
    }
    currentPythonProcess = null;
  }
  return { canceled: true };
});

// IPC Handler: Lưu Project (.beatcut)
ipcMain.handle('project:save', async (_event, projectData: any) => {
  if (!mainWindow) return { success: false, error: 'Không tìm thấy cửa sổ ứng dụng.' };
  const defaultName = `${projectData.projectName || 'My_Project'}.beatcut`;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Lưu Project BEATCUT STUDIO',
    defaultPath: defaultName,
    filters: [
      { name: 'BeatCut Project (*.beatcut)', extensions: ['beatcut'] },
      { name: 'JSON (*.json)', extensions: ['json'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Đã hủy thao tác lưu project.' };
  }

  try {
    fs.writeFileSync(result.filePath, JSON.stringify(projectData, null, 2), 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (err: any) {
    return { success: false, error: `Lỗi khi lưu file: ${err.message}` };
  }
});

// IPC Handler: Mở Project (.beatcut)
ipcMain.handle('project:open', async () => {
  if (!mainWindow) return { success: false, error: 'Không tìm thấy cửa sổ ứng dụng.' };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Mở Project BEATCUT STUDIO',
    properties: ['openFile'],
    filters: [
      { name: 'BeatCut Project (*.beatcut, *.json)', extensions: ['beatcut', 'json'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: 'Đã hủy chọn file.' };
  }

  const filePath = result.filePaths[0];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return { success: true, data, filePath };
  } catch (err: any) {
    return { success: false, error: `Không thể đọc dữ liệu project: ${err.message}` };
  }
});

// IPC Handler: Xuất dữ liệu (JSON, CSV, TXT)
ipcMain.handle('data:export', async (_event, { format, content, defaultName }: { format: string; content: string; defaultName: string }) => {
  if (!mainWindow) return { success: false, error: 'Không tìm thấy cửa sổ ứng dụng.' };

  const extMap: Record<string, string> = {
    json: 'json',
    csv: 'csv',
    txt: 'txt',
  };
  const ext = extMap[format] || 'txt';

  const result = await dialog.showSaveDialog(mainWindow, {
    title: `Xuất dữ liệu (${format.toUpperCase()})`,
    defaultPath: `${defaultName}.${ext}`,
    filters: [{ name: `${format.toUpperCase()} Files`, extensions: [ext] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Đã hủy thao tác xuất.' };
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (err: any) {
    return { success: false, error: `Lỗi khi ghi file: ${err.message}` };
  }
});

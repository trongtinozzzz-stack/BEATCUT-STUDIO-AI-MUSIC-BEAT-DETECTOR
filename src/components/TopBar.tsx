import { 
  Music, 
  FolderOpen, 
  Save, 
  Download, 
  Settings, 
  Upload, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Scissors,
  RotateCw
} from 'lucide-react';
import { EngineStatus, ProgressEvent } from '../types';

interface TopBarProps {
  onImportAudio: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onOpenSegments: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onRestartApp?: () => void;
  engineStatus: EngineStatus | null;
  isAnalyzing: boolean;
  progress: ProgressEvent | null;
  hasAudio: boolean;
  projectName: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  onImportAudio,
  onOpenProject,
  onSaveProject,
  onOpenSegments,
  onOpenExport,
  onOpenSettings,
  onRestartApp,
  engineStatus,
  isAnalyzing,
  progress,
  hasAudio,
  projectName,
}) => {
  const handleReload = () => {
    if (onRestartApp) {
      onRestartApp();
    } else if (window.electronAPI?.reloadApp) {
      window.electronAPI.reloadApp();
    } else {
      window.location.reload();
    }
  };

  return (
    <header className="h-14 bg-studio-card border-b border-studio-border px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-blue-600/10 border border-blue-500/30 rounded-lg">
          <div className="relative flex items-center justify-center w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-sm shadow-blue-500/30">
            <Music className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              BEATCUT<span className="text-cyan-400 font-normal ml-1 text-xs">STUDIO</span>
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-studio-border mx-1" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Dự án:</span>
          <span className="text-xs font-semibold text-slate-200 bg-studio-surface px-2.5 py-1 rounded border border-studio-border/60 max-w-[180px] truncate">
            {projectName || 'Chưa đặt tên'}
          </span>
        </div>
      </div>

      {/* Center Status / Progress Indicator */}
      <div className="flex items-center">
        {isAnalyzing ? (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full animate-pulse">
            <Activity className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-xs text-cyan-300 font-medium">
              {progress ? `${progress.message} (${progress.percent}%)` : 'Đang xử lý nhịp...'}
            </span>
          </div>
        ) : hasAudio ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-medium">Sẵn sàng dựng nhịp</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500">Chưa tải file âm thanh</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onImportAudio}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-medium transition shadow-sm shadow-blue-600/20"
          title="Nhập file âm thanh (MP3, WAV, FLAC, M4A)"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Thêm nhạc</span>
        </button>

        <button
          onClick={onOpenProject}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-studio-surface hover:bg-studio-hover text-slate-300 hover:text-white border border-studio-border rounded-lg text-xs font-medium transition"
          title="Mở dự án đã lưu (.beatcut)"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Mở</span>
        </button>

        <button
          onClick={onSaveProject}
          disabled={!hasAudio}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-studio-surface hover:bg-studio-hover disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white border border-studio-border rounded-lg text-xs font-medium transition"
          title="Lưu dự án hiện tại"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Lưu</span>
        </button>

        <button
          onClick={onOpenSegments}
          disabled={!hasAudio}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 disabled:pointer-events-none text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-lg text-xs font-medium transition shadow-sm"
          title="Xem dãy ngắt đoạn 0-10, 10-12s và danh sách giây từng chấm"
        >
          <Scissors className="w-3.5 h-3.5 text-amber-400" />
          <span>Dãy ngắt đoạn</span>
        </button>

        <button
          onClick={onOpenExport}
          disabled={!hasAudio}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-studio-surface hover:bg-studio-hover disabled:opacity-40 disabled:pointer-events-none text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium transition"
          title="Xuất dữ liệu timestamp (CapCut, Premiere, CSV, JSON)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Xuất dữ liệu</span>
        </button>

        <div className="h-4 w-px bg-studio-border mx-1" />

        {/* Nút Khởi động lại / Tải lại app */}
        <button
          onClick={handleReload}
          className="flex items-center gap-1 px-2.5 py-1.5 text-slate-300 hover:text-cyan-300 hover:bg-blue-600/20 border border-studio-border hover:border-cyan-500/40 rounded-lg text-xs font-medium transition"
          title="Tải lại ứng dụng / Cập nhật mã nguồn mới nhất"
        >
          <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tải lại app</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-studio-hover rounded-lg transition relative"
          title="Cài đặt hệ thống & Audio Engine"
        >
          <Settings className="w-4 h-4" />
          {engineStatus && !engineStatus.ready && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-studio-card" />
          )}
        </button>
      </div>
    </header>
  );
};

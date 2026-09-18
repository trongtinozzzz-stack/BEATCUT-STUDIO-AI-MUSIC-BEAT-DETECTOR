import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, Music, Sparkles, FileAudio } from 'lucide-react';

interface EmptyStateProps {
  onImportClick: () => void;
  onFileDrop: (file: File) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onImportClick,
  onFileDrop,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files[0]);
    }
  };

  const handleBoxClick = () => {
    if (window.electronAPI && typeof window.electronAPI.openAudioFile === 'function') {
      onImportClick();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      onImportClick();
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileDrop(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 select-none bg-studio-bg">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac"
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBoxClick}
        className={`w-full max-w-xl p-10 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center text-center cursor-pointer group ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-studio-border hover:border-blue-500/50 bg-studio-card/60 hover:bg-studio-surface/50'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition shadow-lg shadow-blue-500/10">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-base font-semibold text-slate-100 mb-1">
          Kéo thả file nhạc vào đây hoặc nhấp để chọn
        </h3>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Hỗ trợ các định dạng âm thanh phổ biến: MP3, WAV, FLAC, M4A, OGG.
          Hệ thống sẽ tự động tạo dạng sóng và hỗ trợ phân tích nhịp bằng AI Librosa.
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleBoxClick();
          }}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition flex items-center gap-2"
        >
          <Music className="w-4 h-4" />
          <span>Chọn file từ máy tính</span>
        </button>

        <div className="mt-8 flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <FileAudio className="w-3.5 h-3.5 text-slate-400" /> MP3 / WAV
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Tách Beat tự động
          </span>
          <span>•</span>
          <span>Không giới hạn độ dài</span>
        </div>
      </div>
    </div>
  );
};

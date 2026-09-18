import React, { useState } from 'react';
import { 
  X, 
  Settings2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Cpu, 
  ShieldCheck, 
  Terminal 
} from 'lucide-react';
import { EngineStatus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineStatus: EngineStatus | null;
  onRefreshEngine: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  engineStatus,
  onRefreshEngine,
}) => {
  const [isChecking, setIsChecking] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsChecking(true);
    try {
      await onRefreshEngine();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-card border border-studio-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-studio-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-cyan-400" />
            <h2 className="font-semibold text-sm text-slate-100">
              Cài đặt hệ thống & Audio Engine
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-studio-surface transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Engine Status Block */}
          <div className="bg-studio-surface rounded-xl p-4 border border-studio-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-200">Trạng thái Audio Engine (Librosa)</span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isChecking}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Kiểm tra lại</span>
              </button>
            </div>

            <div className="space-y-2 pt-1 divide-y divide-studio-border/40">
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Thư viện Librosa</span>
                <span className="flex items-center gap-1 font-mono text-slate-200">
                  {engineStatus?.librosa ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{String(engineStatus.librosa)}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-400">Chưa tìm thấy</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">NumPy</span>
                <span className="flex items-center gap-1 font-mono text-slate-200">
                  {engineStatus?.numpy ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{String(engineStatus.numpy)}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-400">Chưa tìm thấy</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">SciPy</span>
                <span className="flex items-center gap-1 font-mono text-slate-200">
                  {engineStatus?.scipy ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{String(engineStatus.scipy)}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-400">Chưa tìm thấy</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">SoundFile</span>
                <span className="flex items-center gap-1 font-mono text-slate-200">
                  {engineStatus?.soundfile ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{String(engineStatus.soundfile)}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-400">Chưa tìm thấy</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {engineStatus?.ready ? (
              <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Audio Engine đã sẵn sàng. Bạn có thể phân tích bất kỳ file MP3/WAV nào.</span>
              </div>
            ) : (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-[11px] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Audio Engine chưa nhận đủ thư viện. Vui lòng cài đặt từ python/requirements.txt.</span>
              </div>
            )}
          </div>

          {/* Performance notes */}
          <div className="space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
            <p className="font-semibold text-slate-300">Thông tin tối ưu hiệu năng:</p>
            <p>• Dạng sóng (Waveform) được render qua Canvas với dữ liệu nén 1.500 đỉnh, đảm bảo hoạt động cực mượt trên chip Core i3 thế hệ 4 và đồ họa tích hợp.</p>
            <p>• Thuật toán tách nhịp chạy trong tiến trình nền độc lập, không gây giật lag giao diện.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-studio-surface border-t border-studio-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-studio-hover hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

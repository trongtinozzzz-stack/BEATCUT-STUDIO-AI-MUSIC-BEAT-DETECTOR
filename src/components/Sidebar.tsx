import React from 'react';
import { 
  FileAudio, 
  Activity, 
  Bookmark, 
  FileText, 
  Settings2, 
  Sparkles, 
  Clock, 
  Gauge, 
  Sliders, 
  Layers 
} from 'lucide-react';
import { AudioMetadata, BeatMarker } from '../types';
import { formatTime, formatFileSize } from '../utils/time';

export type SidebarTab = 'audio' | 'detection' | 'markers' | 'export' | 'settings';

interface SidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  metadata: AudioMetadata | null;
  bpm: number;
  markersCount: number;
  isAnalyzing: boolean;
  onStartAnalysis: () => void;
  onCancelAnalysis: () => void;
  hasAudio: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  metadata,
  bpm,
  markersCount,
  isAnalyzing,
  onStartAnalysis,
  onCancelAnalysis,
  hasAudio,
}) => {
  const navItems: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'audio', label: 'Âm thanh', icon: <FileAudio className="w-4 h-4" /> },
    { id: 'detection', label: 'Tách nhịp AI', icon: <Activity className="w-4 h-4" /> },
    { id: 'markers', label: 'Markers', icon: <Bookmark className="w-4 h-4" /> },
    { id: 'export', label: 'Xuất file', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: 'Cài đặt', icon: <Settings2 className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-studio-card border-r border-studio-border flex flex-col justify-between shrink-0 select-none">
      {/* Top Navigation Bar */}
      <div>
        <div className="p-3 border-b border-studio-border">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">
            Công cụ làm việc
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                    active
                      ? 'bg-blue-600/15 text-cyan-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-studio-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={active ? 'text-cyan-400' : 'text-slate-500'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'markers' && markersCount > 0 && (
                    <span className="text-[10px] bg-studio-surface px-1.5 py-0.5 rounded-full border border-studio-border text-slate-300">
                      {markersCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Info Panel */}
        {metadata && (
          <div className="p-4 space-y-3 border-b border-studio-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Thông số tệp
              </span>
              <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                {metadata.format.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Thời lượng
                </span>
                <span className="font-mono text-slate-200">{formatTime(metadata.duration)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-slate-500" /> BPM ước tính
                </span>
                <span className="font-mono text-cyan-300 font-semibold">
                  {bpm > 0 ? `${bpm} BPM` : 'Chưa phân tích'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" /> Tổng điểm nhịp
                </span>
                <span className="font-mono text-amber-400 font-semibold">{markersCount}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>Dung lượng</span>
                <span className="font-mono text-slate-400">{formatFileSize(metadata.size)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Area: Analyze Beat Button */}
      <div className="p-4 border-t border-studio-border bg-studio-surface/40">
        {isAnalyzing ? (
          <button
            onClick={onCancelAnalysis}
            className="w-full py-2.5 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2"
          >
            <Activity className="w-4 h-4 animate-spin text-red-400" />
            <span>Hủy phân tích</span>
          </button>
        ) : (
          <button
            onClick={onStartAnalysis}
            disabled={!hasAudio}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 disabled:pointer-events-none text-white font-medium rounded-lg text-xs transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Phân tích nhịp AI</span>
          </button>
        )}
        <p className="text-[10px] text-slate-500 text-center mt-2 leading-tight">
          Thuật toán Librosa trích xuất Onset Envelope và tính BPM thực tế.
        </p>
      </div>
    </aside>
  );
};

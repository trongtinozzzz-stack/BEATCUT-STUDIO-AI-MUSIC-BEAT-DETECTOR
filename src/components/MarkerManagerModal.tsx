import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Play, 
  Tag, 
  Search, 
  Filter, 
  AlertCircle 
} from 'lucide-react';
import { BeatMarker, MarkerType } from '../types';
import { formatTime } from '../utils/time';

interface MarkerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  markers: BeatMarker[];
  selectedMarkerId: string | null;
  onSelectMarker: (id: string) => void;
  onDeleteMarker: (id: string) => void;
  onClearAllMarkers: () => void;
  onUpdateMarker: (id: string, updates: Partial<BeatMarker>) => void;
  onSeek: (time: number) => void;
}

export const MarkerManagerModal: React.FC<MarkerManagerModalProps> = ({
  isOpen,
  onClose,
  markers,
  selectedMarkerId,
  onSelectMarker,
  onDeleteMarker,
  onClearAllMarkers,
  onUpdateMarker,
  onSeek,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredMarkers = markers.filter((m) => {
    const matchesType = filterType === 'all' || m.type === filterType;
    const matchesSearch = !searchQuery || (m.label && m.label.toLowerCase().includes(searchQuery.toLowerCase())) || formatTime(m.time).includes(searchQuery);
    return matchesType && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-card border border-studio-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-studio-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-cyan-400" />
            <h2 className="font-semibold text-sm text-slate-100">
              Quản lý danh sách Marker ({markers.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-studio-surface transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3 bg-studio-surface/50 border-b border-studio-border flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm marker hoặc giây..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-studio-card border border-studio-border rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-studio-card border border-studio-border rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none"
              >
                <option value="all">Tất cả loại ({markers.length})</option>
                <option value="strong_beat">Nhịp mạnh</option>
                <option value="beat">Nhịp chuẩn</option>
                <option value="custom">Thủ công</option>
                <option value="transition">Chuyển đoạn</option>
              </select>
            </div>
          </div>

          {markers.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ markers không?')) {
                  onClearAllMarkers();
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>

        {/* Marker List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-studio-border/30">
          {filteredMarkers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <AlertCircle className="w-6 h-6 text-slate-600" />
              <span>Không tìm thấy marker nào phù hợp</span>
            </div>
          ) : (
            filteredMarkers.map((marker, idx) => {
              const isSelected = selectedMarkerId === marker.id;
              return (
                <div
                  key={marker.id}
                  className={`pt-2 first:pt-0 flex items-center justify-between gap-3 p-2 rounded-lg transition ${
                    isSelected ? 'bg-blue-600/15 border border-blue-500/30' : 'hover:bg-studio-surface/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-500 w-6 text-right">
                      #{idx + 1}
                    </span>

                    <button
                      onClick={() => {
                        onSelectMarker(marker.id);
                        onSeek(marker.time);
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 bg-studio-surface hover:bg-blue-600 hover:text-white rounded border border-studio-border text-xs font-mono text-cyan-300 transition"
                      title="Nhảy tới vị trí này"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{formatTime(marker.time)}</span>
                    </button>

                    {/* Marker Type Selector */}
                    <select
                      value={marker.type}
                      onChange={(e) => onUpdateMarker(marker.id, { type: e.target.value as MarkerType })}
                      className="bg-studio-card border border-studio-border rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="beat">Nhịp chuẩn</option>
                      <option value="strong_beat">Nhịp mạnh</option>
                      <option value="transition">Chuyển đoạn</option>
                      <option value="custom">Thủ công</option>
                    </select>

                    {/* Marker Label Input */}
                    <input
                      type="text"
                      placeholder="Ghi chú / Nhãn..."
                      value={marker.label || ''}
                      onChange={(e) => onUpdateMarker(marker.id, { label: e.target.value })}
                      className="bg-studio-card/80 border border-studio-border/60 rounded px-2 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 w-36"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-400">
                      Độ mạnh: {Math.round(marker.strength * 100)}%
                    </span>

                    <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.5 bg-studio-card rounded">
                      {marker.source === 'auto' ? 'AI' : 'Tay'}
                    </span>

                    <button
                      onClick={() => onDeleteMarker(marker.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                      title="Xóa marker này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
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

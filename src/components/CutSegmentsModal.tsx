import React, { useState, useMemo } from 'react';
import { 
  X, 
  Scissors, 
  Copy, 
  Check, 
  Play, 
  Download, 
  Filter, 
  ListOrdered, 
  Clock, 
  FileText, 
  Sparkles,
  Layers
} from 'lucide-react';
import { BeatMarker } from '../types';
import { formatTime } from '../utils/time';

interface CutSegmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  markers: BeatMarker[];
  totalDuration: number;
  onSeekAndPlay: (startTime: number) => void;
}

export interface CutSegment {
  index: number;
  startTime: number;
  endTime: number;
  duration: number;
  startLabel?: string;
  endLabel?: string;
  markerType: string;
}

export const CutSegmentsModal: React.FC<CutSegmentsModalProps> = ({
  isOpen,
  onClose,
  markers,
  totalDuration,
  onSeekAndPlay,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'segments' | 'seconds' | 'export'>('segments');
  const [filterMode, setFilterMode] = useState<'all' | 'yellow_only' | 'red_only'>('all');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Lọc markers theo chế độ chọn
  const filteredMarkers = useMemo(() => {
    if (filterMode === 'yellow_only') {
      // Chỉ chấm vàng (Nhịp chuẩn - beat)
      return markers.filter((m) => m.type === 'beat');
    }
    if (filterMode === 'red_only') {
      // Chỉ chấm đỏ (Nhịp mạnh / Bass đầu khuôn - strong_beat)
      return markers.filter((m) => m.type === 'strong_beat');
    }
    return markers;
  }, [markers, filterMode]);

  // 1. Tạo danh sách các khoảng ngắt đoạn (0 -> beat1, beat1 -> beat2, ... beatN -> hết bài)
  const segments: CutSegment[] = useMemo(() => {
    if (filteredMarkers.length === 0) {
      if (totalDuration > 0) {
        return [{
          index: 1,
          startTime: 0,
          endTime: totalDuration,
          duration: totalDuration,
          markerType: 'full',
        }];
      }
      return [];
    }

    const sortedMarkers = [...filteredMarkers].sort((a, b) => a.time - b.time);
    const result: CutSegment[] = [];

    // Điểm mốc đầu tiên: từ 0 đến marker[0] (nếu marker[0] > 0.05)
    let currentStart = 0;

    sortedMarkers.forEach((marker, idx) => {
      const segDuration = Math.max(0, marker.time - currentStart);
      if (segDuration > 0.05) {
        result.push({
          index: result.length + 1,
          startTime: Number(currentStart.toFixed(2)),
          endTime: Number(marker.time.toFixed(2)),
          duration: Number(segDuration.toFixed(2)),
          markerType: marker.type,
          endLabel: marker.label,
        });
      }
      currentStart = marker.time;
    });

    // Đoạn cuối cùng: từ marker cuối đến hết bài
    if (totalDuration > currentStart + 0.05) {
      result.push({
        index: result.length + 1,
        startTime: Number(currentStart.toFixed(2)),
        endTime: Number(totalDuration.toFixed(2)),
        duration: Number((totalDuration - currentStart).toFixed(2)),
        markerType: 'end',
      });
    }

    return result;
  }, [filteredMarkers, totalDuration]);

  // 2. Dãy số giây của từng chấm (VD: 10.25, 12.40, 14.50, ...)
  const secondsList = useMemo(() => {
    return filteredMarkers.map((m) => Number(m.time.toFixed(2)));
  }, [filteredMarkers]);

  // Chuỗi text dãy giây phân cách dấu phẩy
  const secondsCommaText = useMemo(() => {
    return secondsList.join(', ');
  }, [secondsList]);

  // Chuỗi text dãy giây dạng mảng JSON
  const secondsArrayText = useMemo(() => {
    return JSON.stringify(secondsList);
  }, [secondsList]);

  // Chuỗi text danh sách đoạn cắt dạng ngắn gọn: 0-10, 10-12, 12-14...
  const segmentsCompactText = useMemo(() => {
    return segments.map((s) => `${s.startTime}-${s.endTime}`).join(', ');
  }, [segments]);

  // Chuỗi text danh sách đoạn cắt dạng chi tiết
  const segmentsDetailedText = useMemo(() => {
    return segments
      .map(
        (s) =>
          `Đoạn ${s.index}: ${s.startTime}s -> ${s.endTime}s (Thời lượng: ${s.duration}s)`
      )
      .join('\n');
  }, [segments]);

  // Handler Copy to Clipboard
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
    }, 2000);
  };

  // Handler Tải file TXT
  const handleDownloadTxt = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-card border border-studio-border rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-studio-border flex items-center justify-between bg-studio-surface/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/20 text-cyan-400 rounded-lg border border-blue-500/30">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                <span>Dãy Ngắt Đoạn &amp; Mốc Giây Tách Nhịp</span>
                <span className="text-[10px] bg-blue-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                  {segments.length} đoạn cắt
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Tự động trích xuất các khoảng ngắt (0-10s, 10-12s...) và danh sách giây của từng chấm beat để dựng video
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-studio-surface transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Filter & Tabs */}
        <div className="p-3 bg-studio-surface/30 border-b border-studio-border flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Sub Tabs */}
          <div className="flex items-center gap-1 bg-studio-bg p-1 rounded-lg border border-studio-border">
            <button
              onClick={() => setActiveSubTab('segments')}
              className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                activeSubTab === 'segments'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Dãy ngắt đoạn ({segments.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('seconds')}
              className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                activeSubTab === 'seconds'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Dãy giây từng chấm ({secondsList.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('export')}
              className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                activeSubTab === 'export'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file</span>
            </button>
          </div>

          {/* Filter Mode Selection */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" />
              <span>Nguồn chấm:</span>
            </span>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="bg-studio-bg border border-studio-border rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="all">Tất cả các chấm ({markers.length})</option>
              <option value="yellow_only">🟡 Chỉ chấm vàng (Nhịp chuẩn)</option>
              <option value="red_only">🔴 Chỉ chấm đỏ (Nhịp mạnh / Bass)</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[60vh]">
          {/* TAB 1: DÃY NGẮT ĐOẠN (0-10, 10-12, 12-14...) */}
          {activeSubTab === 'segments' && (
            <div className="space-y-4">
              {/* Quick Copy Box */}
              <div className="bg-studio-bg border border-studio-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Dãy ngắt đoạn rút gọn (Chuỗi số 0-10, 10-12...)</span>
                  </span>
                  <button
                    onClick={() => handleCopy(segmentsCompactText, 'compact_segments')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 rounded-lg text-xs font-medium transition"
                  >
                    {copiedType === 'compact_segments' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép dãy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-studio-surface rounded-lg border border-studio-border/60 text-xs font-mono text-cyan-300 break-all select-all max-h-24 overflow-y-auto">
                  {segmentsCompactText || 'Chưa có đoạn cắt nào'}
                </div>
              </div>

              {/* Table of Segments */}
              <div className="border border-studio-border rounded-xl overflow-hidden bg-studio-bg">
                <div className="p-2.5 bg-studio-surface/80 border-b border-studio-border flex items-center justify-between text-xs font-semibold text-slate-300">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Danh sách chi tiết từng đoạn cắt ({segments.length} đoạn)</span>
                  </div>
                  <button
                    onClick={() => handleCopy(segmentsDetailedText, 'detailed_segments')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Sao chép toàn bộ danh sách</span>
                  </button>
                </div>

                <div className="divide-y divide-studio-border/50 max-h-80 overflow-y-auto">
                  {segments.map((seg) => (
                    <div
                      key={seg.index}
                      className="p-2.5 hover:bg-studio-surface/50 transition flex items-center justify-between text-xs group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-studio-surface flex items-center justify-center font-mono font-semibold text-slate-300 text-[11px] border border-studio-border">
                          #{seg.index}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-100">
                              {seg.startTime}s → {seg.endTime}s
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({formatTime(seg.startTime)} → {formatTime(seg.endTime)})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="text-cyan-400 font-medium">
                              Độ dài: {seg.duration}s
                            </span>
                            {seg.endLabel && (
                              <span className="text-[10px] bg-blue-900/40 text-blue-300 px-1.5 py-0.2 rounded border border-blue-700/40">
                                {seg.endLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSeekAndPlay(seg.startTime)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-studio-surface hover:bg-blue-600 hover:text-white border border-studio-border rounded-lg text-slate-300 text-[11px] font-medium transition"
                          title="Nghe thử từ đầu đoạn này"
                        >
                          <Play className="w-3 h-3" />
                          <span>Nghe thử</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DÃY GIÂY TỪNG CHẤM (TIMESTAMPS LIST) */}
          {activeSubTab === 'seconds' && (
            <div className="space-y-4">
              {/* Option A: Dạng chuỗi phân cách dấu phẩy */}
              <div className="bg-studio-bg border border-studio-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dãy giây (Phân cách bằng dấu phẩy)</span>
                  </span>
                  <button
                    onClick={() => handleCopy(secondsCommaText, 'comma_seconds')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 rounded-lg text-xs font-medium transition"
                  >
                    {copiedType === 'comma_seconds' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép chuỗi</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 bg-studio-surface rounded-lg border border-studio-border/60 text-xs font-mono text-emerald-300 break-all select-all max-h-32 overflow-y-auto leading-relaxed">
                  {secondsCommaText || 'Không có mốc giây nào'}
                </div>
              </div>

              {/* Option B: Dạng mảng JSON Array */}
              <div className="bg-studio-bg border border-studio-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Dãy giây dạng Mảng JSON: [10.25, 12.40, ...]</span>
                  </span>
                  <button
                    onClick={() => handleCopy(secondsArrayText, 'array_seconds')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium transition"
                  >
                    {copiedType === 'array_seconds' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép Mảng</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 bg-studio-surface rounded-lg border border-studio-border/60 text-xs font-mono text-purple-300 break-all select-all max-h-32 overflow-y-auto leading-relaxed">
                  {secondsArrayText || '[]'}
                </div>
              </div>

              {/* Danh sách từng giây trực quan */}
              <div className="bg-studio-bg border border-studio-border rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-300">
                  Danh sách thẻ giây trực quan ({secondsList.length} mốc):
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                  {secondsList.map((sec, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSeekAndPlay(sec)}
                      className="px-2 py-1 bg-studio-surface hover:bg-blue-600 hover:text-white border border-studio-border rounded text-[11px] font-mono text-slate-200 transition"
                      title={`Bấm để tua tới ${sec}s`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: XUẤT FILE */}
          {activeSubTab === 'export' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Xuất TXT Dãy ngắt đoạn */}
                <div className="bg-studio-bg border border-studio-border rounded-xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span>File TXT: Danh sách ngắt đoạn</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Lưu file text chứa từng đoạn cắt: 0-10s, 10-12s kèm độ dài để xem hoặc gửi editor.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleDownloadTxt(
                        `DANH SÁCH NGẮT ĐOẠN VIDEO (BEATCUT STUDIO)\nTổng số đoạn: ${segments.length}\n\n` +
                          segmentsDetailedText +
                          `\n\nDãy rút gọn:\n` +
                          segmentsCompactText,
                        `BeatCut_Segments_${Date.now()}.txt`
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file TXT Đoạn cắt</span>
                  </button>
                </div>

                {/* Xuất TXT Dãy giây */}
                <div className="bg-studio-bg border border-studio-border rounded-xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4 text-emerald-400" />
                      <span>File TXT / JSON: Dãy mốc giây</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Lưu file chứa mảng giây [10.25, 12.40, 14.50...] để import vào code hoặc tool tự động.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleDownloadTxt(
                        `DANH SÁCH MỐC GIÂY CHẤM BEAT (BEATCUT STUDIO)\nTổng số mốc: ${secondsList.length}\n\n` +
                          `Dãy phân cách phẩy:\n${secondsCommaText}\n\n` +
                          `Mảng JSON:\n${secondsArrayText}\n\n` +
                          `Từng giây:\n` +
                          secondsList.map((s, i) => `${i + 1}. ${s}s (${formatTime(s)})`).join('\n'),
                        `BeatCut_Timestamps_${Date.now()}.txt`
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file TXT Dãy giây</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-studio-surface/80 border-t border-studio-border flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            💡 Mẹo: Bấm vào nút <strong className="text-slate-200">Nghe thử</strong> hoặc các thẻ giây để nghe trực tiếp đoạn beat đó.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-studio-card hover:bg-slate-700 text-slate-200 rounded-lg border border-studio-border font-medium transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

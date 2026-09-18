import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Plus, 
  Trash2, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { BeatMarker } from '../types';
import { formatTime, formatTimeShort } from '../utils/time';

interface WaveformTimelineProps {
  waveform: number[]; // Downsampled peaks (0.0 to 1.0)
  duration: number;
  currentTime: number;
  markers: BeatMarker[];
  selectedMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  onSeek: (time: number) => void;
  onAddMarker: (time: number) => void;
  onDeleteMarker: (id: string) => void;
  beatDensity: number;
  onChangeDensity: (density: number) => void;
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = ({
  waveform,
  duration,
  currentTime,
  markers,
  selectedMarkerId,
  onSelectMarker,
  onSeek,
  onAddMarker,
  onDeleteMarker,
  beatDensity,
  onChangeDensity,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Zoom state: 1.0 to 10.0
  const [zoom, setZoom] = useState<number>(1.0);
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState<boolean>(false);
  const [hoveredMarker, setHoveredMarker] = useState<BeatMarker | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Keep playhead in view when playing
  useEffect(() => {
    if (!containerRef.current || duration <= 0) return;
    const containerWidth = containerRef.current.clientWidth;
    const totalWidth = containerWidth * zoom;
    const playheadPx = (currentTime / duration) * totalWidth;

    const currentScroll = containerRef.current.scrollLeft;
    if (playheadPx < currentScroll || playheadPx > currentScroll + containerWidth - 50) {
      containerRef.current.scrollLeft = Math.max(0, playheadPx - containerWidth / 3);
    }
  }, [currentTime, duration, zoom]);

  // Sync scrollLeft from DOM
  const handleScroll = () => {
    if (containerRef.current) {
      setScrollLeft(containerRef.current.scrollLeft);
    }
  };

  // Convert pixel position on timeline to audio timestamp
  const pxToTime = useCallback(
    (px: number): number => {
      if (!containerRef.current || duration <= 0) return 0;
      const totalWidth = containerRef.current.clientWidth * zoom;
      return Math.max(0, Math.min((px / totalWidth) * duration, duration));
    },
    [duration, zoom]
  );

  // Convert audio timestamp to pixel position on canvas
  const timeToPx = useCallback(
    (time: number): number => {
      if (!containerRef.current || duration <= 0) return 0;
      const totalWidth = containerRef.current.clientWidth * zoom;
      return (time / duration) * totalWidth;
    },
    [duration, zoom]
  );

  // Render Canvas (Time ruler, Waveform, Beat markers, Playhead)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth * zoom;
    const height = container.clientHeight;

    // Retina display support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // 1. Clear background
    ctx.fillStyle = '#10131d';
    ctx.fillRect(0, 0, width, height);

    const rulerHeight = 28;
    const waveformTop = rulerHeight + 10;
    const waveformBottom = height - 15;
    const waveformHeight = waveformBottom - waveformTop;
    const centerY = waveformTop + waveformHeight / 2;

    // 2. Draw Time Ruler at top
    ctx.fillStyle = '#141824';
    ctx.fillRect(0, 0, width, rulerHeight);
    ctx.strokeStyle = '#23293d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerHeight);
    ctx.lineTo(width, rulerHeight);
    ctx.stroke();

    // Time ticks (calculate interval based on zoom)
    if (duration > 0) {
      const pixelsPerSecond = width / duration;
      let tickInterval = 5; // seconds
      if (pixelsPerSecond > 50) tickInterval = 1;
      if (pixelsPerSecond > 150) tickInterval = 0.5;
      if (pixelsPerSecond > 300) tickInterval = 0.2;
      if (pixelsPerSecond < 15) tickInterval = 10;
      if (pixelsPerSecond < 5) tickInterval = 30;

      ctx.fillStyle = '#64748b';
      ctx.font = '10px Inter, monospace';
      ctx.textAlign = 'center';

      for (let t = 0; t <= duration; t += tickInterval) {
        const x = (t / duration) * width;
        const isMajor = t % (tickInterval * 2) === 0;

        ctx.strokeStyle = isMajor ? '#3b4259' : '#282e44';
        ctx.beginPath();
        ctx.moveTo(x, rulerHeight - (isMajor ? 10 : 6));
        ctx.lineTo(x, rulerHeight);
        ctx.stroke();

        if (isMajor) {
          ctx.fillText(formatTimeShort(t), x, rulerHeight - 12);
        }
      }
    }

    // 3. Draw Waveform
    if (waveform && waveform.length > 0) {
      // Waveform background subtle grid line
      ctx.strokeStyle = '#1e2436';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      const numPoints = waveform.length;
      const barWidth = Math.max(1.5, width / numPoints);

      // Gradient for waveform
      const gradient = ctx.createLinearGradient(0, waveformTop, 0, waveformBottom);
      gradient.addColorStop(0, '#38bdf8'); // sky blue
      gradient.addColorStop(0.5, '#3b82f6'); // blue
      gradient.addColorStop(1, '#1d4ed8'); // deep blue

      ctx.fillStyle = gradient;

      for (let i = 0; i < numPoints; i++) {
        const x = (i / numPoints) * width;
        const peak = waveform[i] || 0.05;
        const barH = Math.max(2, peak * (waveformHeight / 2) * 0.92);

        // Draw symmetrical vertical bar with rounded tips
        ctx.fillRect(x, centerY - barH, Math.max(1, barWidth - 1), barH * 2);
      }
    } else if (duration > 0) {
      // Placeholder baseline while waveform is computing
      ctx.strokeStyle = '#262f49';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
    }

    // 4. Draw Beat Markers
    if (duration > 0 && markers) {
      markers.forEach((marker) => {
        const x = (marker.time / duration) * width;
        const isSelected = selectedMarkerId === marker.id;

        // Choose color based on marker type
        let markerColor = '#eab308'; // standard beat: yellow
        let flagColor = '#facc15';
        if (marker.type === 'strong_beat') {
          markerColor = '#ef4444'; // strong beat: red
          flagColor = '#f87171';
        } else if (marker.type === 'custom') {
          markerColor = '#a855f7'; // custom/manual: purple
          flagColor = '#c084fc';
        } else if (marker.type === 'transition') {
          markerColor = '#06b6d4'; // transition: cyan
          flagColor = '#22d3ee';
        }

        // Vertical guide line
        ctx.strokeStyle = isSelected ? '#ffffff' : markerColor;
        ctx.lineWidth = isSelected ? 2 : 1.2;
        ctx.setLineDash(marker.source === 'manual' ? [4, 2] : []);
        ctx.beginPath();
        ctx.moveTo(x, rulerHeight);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Marker flag handle on ruler
        const flagWidth = isSelected ? 12 : 8;
        const flagHeight = isSelected ? 14 : 10;
        ctx.fillStyle = isSelected ? '#ffffff' : flagColor;
        ctx.beginPath();
        ctx.moveTo(x - flagWidth / 2, rulerHeight - flagHeight);
        ctx.lineTo(x + flagWidth / 2, rulerHeight - flagHeight);
        ctx.lineTo(x + flagWidth / 2, rulerHeight - 3);
        ctx.lineTo(x, rulerHeight);
        ctx.lineTo(x - flagWidth / 2, rulerHeight - 3);
        ctx.closePath();
        ctx.fill();

        // Glow ring if selected
        if (isSelected) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    // 5. Draw Playhead (White vertical line with glowing pill at ruler)
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;

      // Playhead vertical laser line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Playhead handle at top
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX + 6, rulerHeight - 4);
      ctx.lineTo(playheadX, rulerHeight);
      ctx.lineTo(playheadX - 6, rulerHeight - 4);
      ctx.closePath();
      ctx.fill();
    }
  }, [waveform, duration, currentTime, markers, selectedMarkerId, zoom]);

  // Click handler: click on canvas to seek or select marker
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const clickedTime = pxToTime(clickX);

    // Check if clicked near a marker (threshold: 7px)
    const thresholdPx = 8;
    let foundMarker: BeatMarker | null = null;
    for (const m of markers) {
      const mPx = timeToPx(m.time);
      if (Math.abs(mPx - clickX) <= thresholdPx) {
        foundMarker = m;
        break;
      }
    }

    if (foundMarker) {
      onSelectMarker(foundMarker.id);
      onSeek(foundMarker.time);
    } else {
      onSelectMarker(null);
      onSeek(clickedTime);
      setIsDraggingPlayhead(true);
    }
  };

  // Dragging playhead handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left + containerRef.current.scrollLeft;

    setMousePos({ x: e.clientX, y: e.clientY });

    // Check hover marker for tooltip
    const thresholdPx = 8;
    let foundMarker: BeatMarker | null = null;
    for (const m of markers) {
      const mPx = timeToPx(m.time);
      if (Math.abs(mPx - currentX) <= thresholdPx) {
        foundMarker = m;
        break;
      }
    }
    setHoveredMarker(foundMarker);

    if (isDraggingPlayhead) {
      const newTime = pxToTime(currentX);
      onSeek(newTime);
    }
  };

  const handleMouseUp = () => {
    if (isDraggingPlayhead) {
      setIsDraggingPlayhead(false);
    }
  };

  // Keyboard shortcut handler on timeline: 'M' to add marker, 'Delete' to remove
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key.toLowerCase() === 'm') {
      onAddMarker(currentTime);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedMarkerId) {
      onDeleteMarker(selectedMarkerId);
    }
  };

  // Beat Density description and label
  const densityTier = useMemo(() => {
    if (beatDensity <= 33) return { label: 'Thấp (Chỉ nhịp mạnh)', color: 'text-emerald-400' };
    if (beatDensity <= 66) return { label: 'Trung bình (Tiêu chuẩn)', color: 'text-blue-400' };
    return { label: 'Cao (Toàn bộ nhịp & phách)', color: 'text-amber-400' };
  }, [beatDensity]);

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-studio-bg overflow-hidden focus:outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onMouseUp={handleMouseUp}
    >
      {/* Control Header for Timeline & Beat Density */}
      <div className="h-12 bg-studio-surface border-b border-studio-border px-4 flex items-center justify-between shrink-0 select-none">
        {/* Beat Density Slider - Chức năng quan trọng nhất */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200">Mật độ tách nhịp:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Low</span>
            <input
              type="range"
              min="0"
              max="100"
              value={beatDensity}
              onChange={(e) => onChangeDensity(Number(e.target.value))}
              className="w-36 h-2 rounded-lg bg-studio-card density-track cursor-pointer"
              title="Kéo để lọc mật độ điểm nhịp theo độ mạnh"
            />
            <span className="text-[10px] uppercase font-bold text-slate-400">High</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${densityTier.color}`}>
              {densityTier.label}
            </span>
            <span className="text-xs font-mono bg-studio-card px-2 py-0.5 rounded border border-studio-border text-slate-300">
              {markers.length} nhịp
            </span>
          </div>
        </div>

        {/* Zoom & Add Marker Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddMarker(currentTime)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-medium transition"
            title="Thêm marker tại vị trí playhead (Phím M)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Marker (M)</span>
          </button>

          {selectedMarkerId && (
            <button
              onClick={() => onDeleteMarker(selectedMarkerId)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 rounded-lg text-xs font-medium transition"
              title="Xóa marker đã chọn (Phím Delete)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>
          )}

          <div className="h-4 w-px bg-studio-border mx-1" />

          <button
            onClick={() => setZoom((z) => Math.max(1.0, Number((z - 0.5).toFixed(1))))}
            disabled={zoom <= 1.0}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-studio-card disabled:opacity-30 rounded-lg transition"
            title="Thu nhỏ timeline"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono text-slate-400 min-w-[32px] text-center">
            {zoom}x
          </span>

          <button
            onClick={() => setZoom((z) => Math.min(8.0, Number((z + 0.5).toFixed(1))))}
            disabled={zoom >= 8.0}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-studio-card disabled:opacity-30 rounded-lg transition"
            title="Phóng to timeline"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoom(1.0)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-studio-card rounded-lg transition"
            title="Đặt lại mức zoom (1.0x)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Waveform Timeline Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseMove={handleMouseMove}
        className="flex-1 relative overflow-x-auto overflow-y-hidden cursor-crosshair select-none bg-studio-bg"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          className="block"
        />

        {/* Marker Hover Tooltip */}
        {hoveredMarker && mousePos && (
          <div
            className="fixed pointer-events-none z-50 bg-studio-card/95 backdrop-blur-md border border-studio-border text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl shadow-black/50 space-y-0.5 transform -translate-x-1/2 -translate-y-full"
            style={{ left: mousePos.x, top: mousePos.y - 12 }}
          >
            <div className="flex items-center gap-1.5 font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${
                  hoveredMarker.type === 'strong_beat'
                    ? 'bg-red-500'
                    : hoveredMarker.type === 'custom'
                    ? 'bg-purple-500'
                    : hoveredMarker.type === 'transition'
                    ? 'bg-cyan-500'
                    : 'bg-yellow-400'
                }`}
              />
              <span>
                {hoveredMarker.type === 'strong_beat'
                  ? 'Nhịp mạnh (Strong Beat)'
                  : hoveredMarker.type === 'custom'
                  ? 'Thủ công (Custom)'
                  : hoveredMarker.type === 'transition'
                  ? 'Chuyển đoạn (Transition)'
                  : 'Nhịp chuẩn (Beat)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              Thời gian: {formatTime(hoveredMarker.time)}
            </div>
            <div className="text-[10px] text-slate-400">
              Độ mạnh: {Math.round(hoveredMarker.strength * 100)}% | Nguồn:{' '}
              {hoveredMarker.source === 'auto' ? 'AI Librosa' : 'Người dùng'}
            </div>
          </div>
        )}
      </div>

      {/* Legend & Guide Bar */}
      <div className="h-7 bg-studio-card border-t border-studio-border px-4 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Nhịp mạnh
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Nhịp chuẩn
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Marker thủ công
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Phím cách: Phát/Dừng</span>
          <span>Phím M: Đánh dấu</span>
          <span>Phím Delete: Xóa marker</span>
        </div>
      </div>
    </div>
  );
};

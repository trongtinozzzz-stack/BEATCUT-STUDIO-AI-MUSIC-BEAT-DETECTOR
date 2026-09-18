import React from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Gauge 
} from 'lucide-react';
import { formatTime } from '../utils/time';

interface BottomPlayerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  onTogglePlay: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onSetVolume: (vol: number) => void;
  onToggleMute: () => void;
  onSetPlaybackRate: (rate: number) => void;
  onPrevMarker?: () => void;
  onNextMarker?: () => void;
  disabled?: boolean;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  onTogglePlay,
  onStop,
  onSeek,
  onSetVolume,
  onToggleMute,
  onSetPlaybackRate,
  onPrevMarker,
  onNextMarker,
  disabled = false,
}) => {
  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <footer className="h-16 bg-studio-card border-t border-studio-border px-6 flex items-center justify-between select-none z-20 shrink-0">
      {/* Left: Time display */}
      <div className="flex items-center gap-2 min-w-[170px]">
        <span className="font-mono text-sm font-semibold text-slate-100">
          {formatTime(currentTime)}
        </span>
        <span className="text-xs text-slate-500">/</span>
        <span className="font-mono text-xs text-slate-400">
          {formatTime(duration)}
        </span>
      </div>

      {/* Center: Main Playback Controls & Scrubber */}
      <div className="flex-1 max-w-2xl px-6 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3">
          {/* Previous Marker */}
          <button
            onClick={onPrevMarker}
            disabled={disabled}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-studio-surface disabled:opacity-30 rounded-lg transition"
            title="Nhảy về marker phía trước"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Stop */}
          <button
            onClick={onStop}
            disabled={disabled}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-studio-surface disabled:opacity-30 rounded-lg transition"
            title="Dừng lại và về đầu"
          >
            <Square className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={onTogglePlay}
            disabled={disabled}
            className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-30 text-white flex items-center justify-center transition shadow-md shadow-blue-600/30"
            title={isPlaying ? 'Tạm dừng (Phím Space)' : 'Phát nhạc (Phím Space)'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          {/* Next Marker */}
          <button
            onClick={onNextMarker}
            disabled={disabled}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-studio-surface disabled:opacity-30 rounded-lg transition"
            title="Nhảy tới marker tiếp theo"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Scrubber track */}
        <div className="w-full flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.01"
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            disabled={disabled || duration <= 0}
            className="w-full h-1.5 bg-studio-surface rounded-lg cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      {/* Right: Volume & Playback Rate */}
      <div className="flex items-center gap-4 min-w-[200px] justify-end">
        {/* Playback Rate Dropdown */}
        <div className="flex items-center gap-1 bg-studio-surface px-2 py-1 rounded-lg border border-studio-border">
          <Gauge className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={playbackRate}
            onChange={(e) => onSetPlaybackRate(Number(e.target.value))}
            disabled={disabled}
            className="bg-transparent text-xs text-slate-300 font-mono focus:outline-none cursor-pointer"
            title="Tốc độ phát nhạc"
          >
            {speeds.map((s) => (
              <option key={s} value={s} className="bg-studio-card text-slate-200">
                {s}x
              </option>
            ))}
          </select>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            disabled={disabled}
            className="text-slate-400 hover:text-slate-200 transition"
            title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onSetVolume(Number(e.target.value))}
            disabled={disabled}
            className="w-20 h-1.5 bg-studio-surface rounded-lg cursor-pointer accent-blue-500"
            title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>
      </div>
    </footer>
  );
};

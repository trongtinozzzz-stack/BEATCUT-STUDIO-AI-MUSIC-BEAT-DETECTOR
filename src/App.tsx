import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar, SidebarTab } from './components/Sidebar';
import { EmptyState } from './components/EmptyState';
import { WaveformTimeline } from './components/WaveformTimeline';
import { BottomPlayer } from './components/BottomPlayer';
import { MarkerManagerModal } from './components/MarkerManagerModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { 
  AudioMetadata, 
  BeatMarker, 
  ProjectData, 
  EngineStatus, 
  ProgressEvent, 
  MarkerType 
} from './types';

export const App: React.FC = () => {
  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<SidebarTab>('detection');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isMarkersOpen, setIsMarkersOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Audio & Project Data
  const [projectName, setProjectName] = useState<string>('Dự án Beat 1');
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [bpm, setBpm] = useState<number>(0);
  const [waveform, setWaveform] = useState<number[]>([]);

  // Beat Detection & Markers
  const [allDetectedBeats, setAllDetectedBeats] = useState<BeatMarker[]>([]);
  const [manualMarkers, setManualMarkers] = useState<BeatMarker[]>([]);
  const [beatDensity, setBeatDensity] = useState<number>(50); // 0 to 100
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Engine & Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Player Hook
  const player = useAudioPlayer();

  // Check Engine on Mount
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.checkEngine().then((status) => {
        setEngineStatus(status);
      });

      const unsubscribe = window.electronAPI.onProgress((p) => {
        setProgress(p);
      });
      return () => unsubscribe();
    }
  }, []);

  // Filtered Markers based on Beat Density (CHỨC NĂNG CỐT LÕI)
  const activeMarkers = useMemo(() => {
    // 1. Phân loại theo mật độ tách nhịp (Beat Density: 0 -> 100)
    // - Low (0 -> 33): Chỉ lấy các beat mạnh nhất (top percentile)
    // - Medium (34 -> 66): Lấy các beat tiêu chuẩn và cân bằng
    // - High (67 -> 100): Lấy toàn bộ các beat đã phát hiện được
    let filteredAuto: BeatMarker[] = [];

    if (allDetectedBeats.length > 0) {
      if (beatDensity >= 95) {
        // High max: hiển thị toàn bộ
        filteredAuto = allDetectedBeats;
      } else {
        // Ngưỡng lọc dựa trên strength: từ 0.8 (low) xuống 0.0 (high)
        const threshold = Math.max(0, (100 - beatDensity) / 100 * 0.85);
        filteredAuto = allDetectedBeats.filter((b) => {
          if (b.type === 'strong_beat') return true; // Luôn giữ nhịp mạnh
          return b.strength >= threshold;
        });

        // Nếu mật độ quá thấp khiến quá ít beat, đảm bảo giữ lại ít nhất các nhịp chính
        if (filteredAuto.length === 0) {
          filteredAuto = allDetectedBeats.slice(0, Math.max(1, Math.floor(allDetectedBeats.length * 0.2)));
        }
      }
    }

    // Kết hợp với các marker thủ công người dùng đã thêm
    const combined = [...filteredAuto, ...manualMarkers];
    combined.sort((a, b) => a.time - b.time);
    return combined;
  }, [allDetectedBeats, manualMarkers, beatDensity]);

  // Load Audio File Handler
  const handleLoadFile = useCallback(
    async (filePath: string, fileName: string, fileUrl: string, size?: number) => {
      const ext = fileName.split('.').pop()?.toLowerCase() || 'mp3';
      setMetadata({
        fileName,
        filePath,
        duration: 0,
        size: size || 0,
        format: ext,
      });
      setProjectName(fileName.replace(/\.[^/.]+$/, ''));
      setAudioUrl(fileUrl);
      player.loadAudio(fileUrl);
      setWaveform([]);
      setAllDetectedBeats([]);
      setManualMarkers([]);
      setBpm(0);
      setSelectedMarkerId(null);

      // Auto start beat detection when imported
      startAnalysis(filePath);
    },
    [player]
  );

  // Import Audio via Native Dialog or HTML5 File Picker
  const handleImportAudio = async () => {
    if (window.electronAPI && typeof window.electronAPI.openAudioFile === 'function') {
      try {
        const res = await window.electronAPI.openAudioFile();
        if (!res.canceled && res.filePath && res.fileName && res.fileUrl) {
          handleLoadFile(res.filePath, res.fileName, res.fileUrl, res.size);
          return;
        }
        if (res.canceled) return;
      } catch (err: any) {
        console.warn('Native open audio file dialog failed, falling back to input:', err);
      }
    }
    const el = document.getElementById('global-audio-input') as HTMLInputElement;
    if (el) {
      el.click();
    }
  };

  // Drag-and-drop file support
  const handleFileDrop = (file: File) => {
    let filePath = '';
    if (window.electronAPI?.getPathForFile) {
      try {
        filePath = window.electronAPI.getPathForFile(file);
      } catch {
        filePath = (file as any).path || '';
      }
    } else {
      filePath = (file as any).path || '';
    }

    if (filePath) {
      const fileUrl = `local-audio://${encodeURIComponent(filePath)}`;
      handleLoadFile(filePath, file.name, fileUrl, file.size);
    } else {
      // Browser fallback
      const objectUrl = URL.createObjectURL(file);
      handleLoadFile(file.name, file.name, objectUrl, file.size);
    }
  };

  // Start Real Beat Detection via Python Librosa
  const startAnalysis = async (pathOverride?: string) => {
    const targetPath = pathOverride || metadata?.filePath;
    if (!targetPath || !window.electronAPI) return;

    setIsAnalyzing(true);
    setProgress({ percent: 5, message: 'Khởi động AI Librosa Engine...' });
    setErrorMessage(null);

    try {
      const result = await window.electronAPI.analyzeAudio(targetPath);
      if (result.success && result.data) {
        setBpm(result.data.bpm);
        if (result.data.waveform && result.data.waveform.length > 0) {
          setWaveform(result.data.waveform);
        }

        // Cập nhật danh sách beat thực tế từ Librosa
        const beats: BeatMarker[] = (result.data.beats || []).map((b, index) => ({
          id: `beat-${index}-${b.time}`,
          time: b.time,
          strength: b.strength,
          type: b.type,
          source: 'auto',
        }));

        setAllDetectedBeats(beats);

        if (metadata) {
          setMetadata({
            ...metadata,
            duration: result.data.duration,
          });
        }
      } else {
        setErrorMessage(result.error || 'Phân tích nhịp thất bại. Vui lòng kiểm tra lại file âm thanh.');
      }
    } catch (err: any) {
      setErrorMessage(`Lỗi phân tích: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  };

  // Cancel Analysis
  const handleCancelAnalysis = async () => {
    if (window.electronAPI) {
      await window.electronAPI.cancelAnalysis();
      setIsAnalyzing(false);
      setProgress(null);
    }
  };

  // Add Manual Marker
  const handleAddMarker = (time: number) => {
    const newMarker: BeatMarker = {
      id: `manual-${Date.now()}`,
      time: Number(time.toFixed(3)),
      strength: 0.8,
      type: 'custom',
      source: 'manual',
      label: `Điểm cắt ${manualMarkers.length + 1}`,
    };
    setManualMarkers((prev) => [...prev, newMarker]);
    setSelectedMarkerId(newMarker.id);
  };

  // Delete Marker
  const handleDeleteMarker = (id: string) => {
    setManualMarkers((prev) => prev.filter((m) => m.id !== id));
    setAllDetectedBeats((prev) => prev.filter((m) => m.id !== id));
    if (selectedMarkerId === id) {
      setSelectedMarkerId(null);
    }
  };

  // Clear All Markers
  const handleClearAllMarkers = () => {
    setManualMarkers([]);
    setAllDetectedBeats([]);
    setSelectedMarkerId(null);
  };

  // Update Marker properties
  const handleUpdateMarker = (id: string, updates: Partial<BeatMarker>) => {
    setManualMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
    setAllDetectedBeats((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  // Navigation between markers (Next / Previous)
  const handlePrevMarker = () => {
    if (activeMarkers.length === 0) return;
    const current = player.currentTime;
    const prev = [...activeMarkers].reverse().find((m) => m.time < current - 0.15);
    if (prev) {
      player.seek(prev.time);
      setSelectedMarkerId(prev.id);
    } else {
      player.seek(0);
    }
  };

  const handleNextMarker = () => {
    if (activeMarkers.length === 0) return;
    const current = player.currentTime;
    const next = activeMarkers.find((m) => m.time > current + 0.15);
    if (next) {
      player.seek(next.time);
      setSelectedMarkerId(next.id);
    }
  };

  // Save Project Handler (.beatcut)
  const handleSaveProject = async () => {
    if (!metadata || !window.electronAPI) return;
    const projectData: ProjectData = {
      version: '1.0.0',
      projectName,
      audioFileName: metadata.fileName,
      audioFilePath: metadata.filePath,
      duration: metadata.duration || player.duration,
      bpm,
      beatDensity,
      markers: activeMarkers,
      waveform,
      updatedAt: new Date().toISOString(),
    };

    const res = await window.electronAPI.saveProject(projectData);
    if (res.success) {
      alert(`Đã lưu dự án thành công tại:\n${res.filePath}`);
    } else if (res.error && res.error !== 'Đã hủy thao tác lưu project.') {
      alert(`Lỗi lưu dự án: ${res.error}`);
    }
  };

  // Open Project Handler (.beatcut)
  const handleOpenProject = async () => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.openProject();
    if (res.success && res.data) {
      const p = res.data;
      setProjectName(p.projectName);
      setBpm(p.bpm || 0);
      setBeatDensity(p.beatDensity || 50);
      if (p.waveform) setWaveform(p.waveform);

      // Separate auto vs manual markers
      const autoList = (p.markers || []).filter((m) => m.source === 'auto');
      const manualList = (p.markers || []).filter((m) => m.source === 'manual');
      setAllDetectedBeats(autoList);
      setManualMarkers(manualList);

      if (p.audioFilePath) {
        const fileUrl = `local-audio://${encodeURIComponent(p.audioFilePath)}`;
        setMetadata({
          fileName: p.audioFileName,
          filePath: p.audioFilePath,
          duration: p.duration,
          size: 0,
          format: p.audioFileName.split('.').pop() || 'mp3',
        });
        setAudioUrl(fileUrl);
        player.loadAudio(fileUrl);
      }
    }
  };

  // Export File to Disk
  const handleExportFile = async (format: 'json' | 'csv' | 'txt', content: string): Promise<boolean> => {
    if (!window.electronAPI) return false;
    const defaultName = `${projectName || 'My_Beat'}_markers`;
    const res = await window.electronAPI.exportData(format, content, defaultName);
    if (res.success) {
      alert(`Đã xuất dữ liệu ${format.toUpperCase()} thành công tại:\n${res.filePath}`);
      return true;
    }
    return false;
  };

  // Global Keyboard Shortcuts (Space to play/pause, M to add marker)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        player.togglePlay();
      } else if (e.key.toLowerCase() === 'm' && metadata) {
        e.preventDefault();
        handleAddMarker(player.currentTime);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [player, metadata]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-bg text-slate-100 font-sans">
      {/* Top Navigation Bar */}
      <TopBar
        onImportAudio={handleImportAudio}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        engineStatus={engineStatus}
        isAnalyzing={isAnalyzing}
        progress={progress}
        hasAudio={Boolean(metadata)}
        projectName={projectName}
      />

      {/* Main Studio Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'markers') setIsMarkersOpen(true);
            if (tab === 'export') setIsExportOpen(true);
            if (tab === 'settings') setIsSettingsOpen(true);
          }}
          metadata={metadata}
          bpm={bpm}
          markersCount={activeMarkers.length}
          isAnalyzing={isAnalyzing}
          onStartAnalysis={() => startAnalysis()}
          onCancelAnalysis={handleCancelAnalysis}
          hasAudio={Boolean(metadata)}
        />

        {/* Center Workspace */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-studio-bg">
          {errorMessage && (
            <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between text-xs text-red-300">
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-white font-bold ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {!metadata ? (
            <EmptyState
              onImportClick={handleImportAudio}
              onFileDrop={handleFileDrop}
            />
          ) : (
            <WaveformTimeline
              waveform={waveform}
              duration={metadata.duration || player.duration || 1}
              currentTime={player.currentTime}
              markers={activeMarkers}
              selectedMarkerId={selectedMarkerId}
              onSelectMarker={setSelectedMarkerId}
              onSeek={player.seek}
              onAddMarker={handleAddMarker}
              onDeleteMarker={handleDeleteMarker}
              beatDensity={beatDensity}
              onChangeDensity={setBeatDensity}
            />
          )}
        </main>
      </div>

      {/* Bottom Transport / Player Bar */}
      <BottomPlayer
        isPlaying={player.isPlaying}
        currentTime={player.currentTime}
        duration={metadata?.duration || player.duration || 0}
        volume={player.volume}
        isMuted={player.isMuted}
        playbackRate={player.playbackRate}
        onTogglePlay={player.togglePlay}
        onStop={player.stop}
        onSeek={player.seek}
        onSetVolume={player.setVolume}
        onToggleMute={player.toggleMute}
        onSetPlaybackRate={player.setPlaybackRate}
        onPrevMarker={handlePrevMarker}
        onNextMarker={handleNextMarker}
        disabled={!metadata}
      />

      {/* Modals */}
      <MarkerManagerModal
        isOpen={isMarkersOpen}
        onClose={() => setIsMarkersOpen(false)}
        markers={activeMarkers}
        selectedMarkerId={selectedMarkerId}
        onSelectMarker={setSelectedMarkerId}
        onDeleteMarker={handleDeleteMarker}
        onClearAllMarkers={handleClearAllMarkers}
        onUpdateMarker={handleUpdateMarker}
        onSeek={player.seek}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={{
          version: '1.0.0',
          projectName,
          audioFileName: metadata?.fileName || '',
          audioFilePath: metadata?.filePath || '',
          duration: metadata?.duration || player.duration || 0,
          bpm,
          beatDensity,
          markers: activeMarkers,
          updatedAt: new Date().toISOString(),
        }}
        activeMarkers={activeMarkers}
        onExportFile={handleExportFile}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        engineStatus={engineStatus}
        onRefreshEngine={async () => {
          if (window.electronAPI) {
            const status = await window.electronAPI.checkEngine();
            setEngineStatus(status);
          }
        }}
      />

      <input
        type="file"
        id="global-audio-input"
        accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileDrop(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
};

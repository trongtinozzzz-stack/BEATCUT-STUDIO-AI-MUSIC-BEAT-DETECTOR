import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar, SidebarTab } from './components/Sidebar';
import { EmptyState } from './components/EmptyState';
import { WaveformTimeline } from './components/WaveformTimeline';
import { BottomPlayer } from './components/BottomPlayer';
import { MarkerManagerModal } from './components/MarkerManagerModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { CutSegmentsModal } from './components/CutSegmentsModal';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { 
  AudioMetadata, 
  BeatMarker, 
  ProjectData, 
  EngineStatus, 
  ProgressEvent, 
  MarkerType 
} from './types';
import { decodeAudioSource, extractWaveformPeaks, extractQuickBeats } from './utils/audioAnalyzer';

export const App: React.FC = () => {
  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<SidebarTab>('detection');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isMarkersOpen, setIsMarkersOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSegmentsOpen, setIsSegmentsOpen] = useState<boolean>(false);

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

  // Filtered Markers based on Beat Density (CHỨC NĂNG CỐT LÕI NHƯ CAPCUT)
  const activeMarkers = useMemo(() => {
    // Phân loại theo mật độ tách nhịp:
    // - Low (0 -> 33): Chỉ lấy các phách 1 đầu khuôn nhạc (Bar Downbeats - Vàng)
    // - Medium (34 -> 66): Lấy toàn bộ phách chính 1/4 nhịp (Quarter notes 1, 2, 3, 4 - Đỏ & Vàng)
    // - High (67 -> 100): Lấy thêm cả phách phụ 1/8 (Upbeats / Subdivisions - Cyan)
    let filteredAuto: BeatMarker[] = [];

    if (allDetectedBeats.length > 0) {
      if (beatDensity <= 33) {
        filteredAuto = allDetectedBeats.filter((b) => b.type === 'strong_beat');
      } else if (beatDensity <= 66) {
        filteredAuto = allDetectedBeats.filter((b) => b.type === 'strong_beat' || b.type === 'beat');
      } else {
        filteredAuto = allDetectedBeats;
      }

      if (filteredAuto.length === 0) {
        filteredAuto = allDetectedBeats.filter((b) => b.type === 'strong_beat' || b.type === 'beat');
      }
    }

    // Kết hợp với các marker thủ công người dùng đã thêm (custom - Tím)
    const combined = [...filteredAuto, ...manualMarkers];
    combined.sort((a, b) => a.time - b.time);
    return combined;
  }, [allDetectedBeats, manualMarkers, beatDensity]);

  // Load Audio File Handler
  const handleLoadFile = useCallback(
    async (filePath: string, fileName: string, fileUrl: string, size?: number, fileBlob?: Blob | File) => {
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
      setSelectedMarkerId(null);
      setErrorMessage(null);

      // 1. Giải mã và vẽ Waveform + Tính nhịp tức thời trong 50ms qua Web Audio API
      try {
        const sourceToDecode = fileBlob || fileUrl;
        const audioBuffer = await decodeAudioSource(sourceToDecode);
        const duration = audioBuffer.duration;
        const peaks = extractWaveformPeaks(audioBuffer, 1500);
        const quick = extractQuickBeats(audioBuffer);

        setWaveform(peaks);
        setBpm(quick.bpm);
        setAllDetectedBeats(quick.beats);
        setMetadata((prev) => (prev ? { ...prev, duration } : prev));
      } catch (decodeErr: any) {
        console.warn('Web Audio immediate decode warning:', decodeErr);
      }

      // 2. Kích hoạt phân tích AI Librosa Engine chuyên sâu
      startAnalysis(filePath, fileName, fileBlob);
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

    const objectUrl = URL.createObjectURL(file);
    const fileUrl = filePath && (filePath.includes(':\\') || filePath.startsWith('/'))
      ? `local-audio://${encodeURIComponent(filePath)}`
      : objectUrl;

    handleLoadFile(filePath || file.name, file.name, fileUrl, file.size, file);
  };

  // Start Real Beat Detection via Python Librosa
  const startAnalysis = async (pathOverride?: string, nameOverride?: string, blobOverride?: Blob | File) => {
    const targetPath = pathOverride || metadata?.filePath;
    const targetName = nameOverride || metadata?.fileName || 'audio.mp3';
    
    if (!window.electronAPI) return;

    setIsAnalyzing(true);
    setProgress({ percent: 10, message: 'Đang khởi chạy AI Librosa Engine...' });
    setErrorMessage(null);

    try {
      let result: any = null;

      // Ưu tiên 1: Phân tích trực tiếp từ đường dẫn tệp tuyệt đối nếu có
      if (targetPath && (targetPath.includes(':\\') || targetPath.startsWith('/'))) {
        result = await window.electronAPI.analyzeAudio(targetPath);
      } 
      // Ưu tiên 2: Nếu từ Web Blob/File, truyền buffer để lưu file tạm và phân tích
      else if (blobOverride && window.electronAPI.analyzeAudioBuffer) {
        const arrayBuf = await blobOverride.arrayBuffer();
        result = await window.electronAPI.analyzeAudioBuffer(targetName, arrayBuf);
      } else if (targetPath) {
        result = await window.electronAPI.analyzeAudio(targetPath);
      }

      if (result && result.success && result.data) {
        setBpm(result.data.bpm);
        if (result.data.waveform && result.data.waveform.length > 0) {
          setWaveform(result.data.waveform);
        }

        const beats: BeatMarker[] = (result.data.beats || []).map((b: any, index: number) => ({
          id: `beat-${index}-${b.time}`,
          time: b.time,
          strength: b.strength,
          type: b.type,
          source: 'auto',
        }));

        setAllDetectedBeats(beats);
        setMetadata((prev) => (prev ? { ...prev, duration: result.data.duration } : prev));
      }
    } catch (err: any) {
      console.warn('AI Librosa analysis note:', err);
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
        onOpenSegments={() => setIsSegmentsOpen(true)}
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
            if (tab === 'segments') setIsSegmentsOpen(true);
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
      <CutSegmentsModal
        isOpen={isSegmentsOpen}
        onClose={() => setIsSegmentsOpen(false)}
        markers={activeMarkers}
        totalDuration={metadata?.duration || player.duration || 0}
        onSeekAndPlay={(startTime) => {
          player.seek(startTime);
          player.play();
        }}
      />

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

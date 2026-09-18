export type MarkerType = 'beat' | 'strong_beat' | 'transition' | 'custom';
export type MarkerSource = 'auto' | 'manual';

export interface BeatMarker {
  id: string;
  time: number; // In seconds
  strength: number; // 0.0 - 1.0
  type: MarkerType;
  source: MarkerSource;
  label?: string;
}

export interface AnalysisResult {
  bpm: number;
  duration: number;
  sampleRate: number;
  totalBeats: number;
  beats: {
    time: number;
    strength: number;
    type: MarkerType;
    source: MarkerSource;
  }[];
  waveform: number[]; // Normalized peaks (0.0 - 1.0)
  audioFileName: string;
  filePath: string;
}

export interface AudioMetadata {
  fileName: string;
  filePath: string;
  duration: number;
  size: number;
  format: string;
}

export interface ProjectData {
  version: string;
  projectName: string;
  audioFileName: string;
  audioFilePath: string;
  duration: number;
  bpm: number;
  beatDensity: number;
  markers: BeatMarker[];
  waveform?: number[];
  updatedAt: string;
}

export interface ProgressEvent {
  percent: number;
  message: string;
}

export interface EngineStatus {
  python_version?: string;
  librosa?: string | boolean;
  numpy?: string | boolean;
  scipy?: string | boolean;
  soundfile?: string | boolean;
  ready: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      openAudioFile: () => Promise<{ canceled: boolean; filePath?: string; fileName?: string; fileUrl?: string; duration?: number; size?: number }>;
      analyzeAudio: (filePath: string) => Promise<{ success: boolean; data?: AnalysisResult; error?: string; details?: string }>;
      analyzeAudioBuffer?: (fileName: string, buffer: ArrayBuffer) => Promise<{ success: boolean; data?: AnalysisResult; error?: string; details?: string }>;
      cancelAnalysis: () => Promise<void>;
      saveProject: (project: ProjectData) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      openProject: () => Promise<{ success: boolean; data?: ProjectData; filePath?: string; error?: string }>;
      exportData: (format: 'json' | 'csv' | 'txt', content: string, defaultName: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      checkEngine: () => Promise<EngineStatus>;
      getPathForFile?: (file: File) => string;
      onProgress: (callback: (progress: ProgressEvent) => void) => () => void;
    };
  }
}

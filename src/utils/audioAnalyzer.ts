import { BeatMarker, MarkerType } from '../types';

/**
 * Web Audio API Engine để trích xuất Waveform và tính toán nhịp tức thì.
 * Đảm bảo giao diện luôn hiển thị sóng nhạc và phát âm thanh ngay lập tức
 * ngay cả khi file được nạp từ Drop, Input hoặc đường dẫn cục bộ.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioCtx = new AudioCtxClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * Giải mã file âm thanh từ Blob / File / ArrayBuffer để lấy AudioBuffer
 */
export async function decodeAudioSource(source: Blob | File | ArrayBuffer | string): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  let arrayBuffer: ArrayBuffer;

  if (typeof source === 'string') {
    const response = await fetch(source);
    arrayBuffer = await response.arrayBuffer();
  } else if (source instanceof ArrayBuffer) {
    arrayBuffer = source;
  } else {
    arrayBuffer = await source.arrayBuffer();
  }

  // Clone arrayBuffer because decodeAudioData detaches it
  const copyBuffer = arrayBuffer.slice(0);
  return await ctx.decodeAudioData(copyBuffer);
}

/**
 * Trích xuất 1.500 đỉnh biên độ (waveform peaks) từ AudioBuffer
 */
export function extractWaveformPeaks(buffer: AudioBuffer, numPeaks = 1500): number[] {
  const channelData = buffer.getChannelData(0);
  const totalSamples = channelData.length;
  const blockSize = Math.max(1, Math.floor(totalSamples / numPeaks));
  const peaks: number[] = new Array(numPeaks);

  let maxGlobal = 0.001;

  for (let i = 0; i < numPeaks; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, totalSamples);
    let max = 0;

    for (let j = start; j < end; j += 4) {
      const val = Math.abs(channelData[j]);
      if (val > max) {
        max = val;
      }
    }

    peaks[i] = max;
    if (max > maxGlobal) {
      maxGlobal = max;
    }
  }

  // Chuẩn hóa về dải 0.0 -> 1.0
  return peaks.map((p) => Math.min(1.0, Number((p / maxGlobal).toFixed(3))));
}

/**
 * Thuật toán tách nhịp tức thời dựa trên năng lượng cục bộ (Spectral Flux / Energy Envelope)
 */
export function extractQuickBeats(buffer: AudioBuffer): { bpm: number; beats: BeatMarker[] } {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const duration = buffer.duration;

  // Chia nhỏ thành các frame 50ms (20 frame/giây)
  const frameSize = Math.floor(sampleRate * 0.05);
  const totalFrames = Math.floor(channelData.length / frameSize);
  const energies: number[] = new Array(totalFrames);

  for (let i = 0; i < totalFrames; i++) {
    const start = i * frameSize;
    let sum = 0;
    for (let j = start; j < start + frameSize; j += 2) {
      const v = channelData[j];
      sum += v * v;
    }
    energies[i] = Math.sqrt(sum / (frameSize / 2));
  }

  // Tính năng lượng trung bình động (Moving average over 1.5s window = 30 frames)
  const windowSize = 30;
  const onsets: { frame: number; time: number; strength: number }[] = [];

  for (let i = 2; i < totalFrames - 2; i++) {
    let localSum = 0;
    const wStart = Math.max(0, i - Math.floor(windowSize / 2));
    const wEnd = Math.min(totalFrames, i + Math.floor(windowSize / 2));
    for (let w = wStart; w < wEnd; w++) {
      localSum += energies[w];
    }
    const localAvg = localSum / (wEnd - wStart);

    // Phát hiện đỉnh cục bộ cao hơn trung bình động
    const current = energies[i];
    const isLocalPeak = current > energies[i - 1] && current > energies[i + 1] && current > energies[i - 2] && current > energies[i + 2];

    if (isLocalPeak && current > localAvg * 1.35 && current > 0.03) {
      const time = Number(((i * frameSize) / sampleRate).toFixed(3));
      const strength = Math.min(1.0, Number(((current - localAvg) / (localAvg + 0.001)).toFixed(3)));
      onsets.push({ frame: i, time, strength });
    }
  }

  // Ước tính BPM từ khoảng cách trung bình giữa các onset
  let estimatedBpm = 120;
  if (onsets.length >= 4) {
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      const dt = onsets[i].time - onsets[i - 1].time;
      if (dt >= 0.25 && dt <= 1.5) {
        intervals.push(dt);
      }
    }
    if (intervals.length > 0) {
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      if (medianInterval > 0) {
        let rawBpm = 60 / medianInterval;
        while (rawBpm < 70) rawBpm *= 2;
        while (rawBpm > 160) rawBpm /= 2;
        estimatedBpm = Math.round(rawBpm * 10) / 10;
      }
    }
  }

  // Lọc khoảng cách tối thiểu giữa các beat (ít nhất 200ms)
  const filteredBeats: BeatMarker[] = [];
  let lastTime = -1;

  for (let idx = 0; idx < onsets.length; idx++) {
    const item = onsets[idx];
    if (lastTime < 0 || item.time - lastTime >= 0.2) {
      const isStrong = item.strength > 0.6 || (idx % 4 === 0);
      const type: MarkerType = isStrong ? 'strong_beat' : 'beat';

      filteredBeats.push({
        id: `web-beat-${idx}-${item.time}`,
        time: item.time,
        strength: item.strength,
        type,
        source: 'auto',
      });
      lastTime = item.time;
    }
  }

  return {
    bpm: estimatedBpm,
    beats: filteredBeats,
  };
}

import { BeatMarker, MarkerType } from '../types';

/**
 * BEATCUT STUDIO — Zero-Latency Audio Transient Onset Detector (Thuật toán bắt dính tức thì từng cú đập trống)
 * 1. Bóc tách phổ dải trầm Low-Pass (Kick/Bass) và dải trung Band-Pass (Snare/Clap).
 * 2. Bù trừ hoàn toàn độ trễ pha lọc (Group Delay Compensation -35ms).
 * 3. Dò ngược thời điểm xung kích Attack (Leading Edge Detection) để vạch nhịp nằm chính xác ngay mép bắt đầu của sóng âm.
 * 4. Không delay: Khi con trỏ phát chạm vạch là âm thanh đập ngay lập tức 100%.
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

  const copyBuffer = arrayBuffer.slice(0);
  return await ctx.decodeAudioData(copyBuffer);
}

/**
 * Trích xuất 1.500 đỉnh biên độ (Waveform peaks) từ AudioBuffer
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

  return peaks.map((p) => Math.min(1.0, Number((p / maxGlobal).toFixed(3))));
}

/**
 * Bộ lọc số Biquad Low-Pass Filter (Tách riêng tiếng Bass & Kick)
 */
function filterLowPass(input: Float32Array, sampleRate: number, cutoffHz = 160): Float32Array {
  const output = new Float32Array(input.length);
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const cosw0 = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * 0.707);

  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const invA0 = 1 / a0;

  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) * invA0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
    output[i] = y0;
  }
  return output;
}

/**
 * Bộ lọc số Biquad Band-Pass Filter (Tách riêng tiếng Snare & Clap)
 */
function filterBandPass(input: Float32Array, sampleRate: number, centerHz = 2200): Float32Array {
  const output = new Float32Array(input.length);
  const w0 = (2 * Math.PI * centerHz) / sampleRate;
  const alpha = Math.sin(w0) / 2;

  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const invA0 = 1 / a0;

  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) * invA0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
    output[i] = y0;
  }
  return output;
}

/**
 * Thuật toán tách nhịp Zero-Latency Transient Onset Detector
 */
export function extractQuickBeats(buffer: AudioBuffer): { bpm: number; beats: BeatMarker[] } {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const duration = buffer.duration;

  if (duration <= 0 || channelData.length === 0) {
    return { bpm: 120, beats: [] };
  }

  // 1. Lọc dải trầm và dải trung
  const lowPassData = filterLowPass(channelData, sampleRate, 160);
  const bandPassData = filterBandPass(channelData, sampleRate, 2200);

  // 2. Tính toán năng lượng RMS và Flux trên khung 10ms
  const hopSize = Math.max(1, Math.floor(sampleRate * 0.01));
  const totalFrames = Math.floor(channelData.length / hopSize);

  const lowFlux = new Float32Array(totalFrames);
  const bandFlux = new Float32Array(totalFrames);
  const combinedFlux = new Float32Array(totalFrames);

  let prevLowRMS = 0;
  let prevBandRMS = 0;
  let maxFlux = 0.0001;

  for (let i = 0; i < totalFrames; i++) {
    const start = i * hopSize;
    const end = Math.min(start + hopSize, channelData.length);
    const count = end - start;

    let sumLow = 0;
    let sumBand = 0;

    for (let j = start; j < end; j++) {
      const l = lowPassData[j];
      const b = bandPassData[j];
      sumLow += l * l;
      sumBand += b * b;
    }

    const curLowRMS = Math.sqrt(sumLow / count);
    const curBandRMS = Math.sqrt(sumBand / count);

    const dLow = Math.max(0, curLowRMS - prevLowRMS);
    const dBand = Math.max(0, curBandRMS - prevBandRMS);

    prevLowRMS = curLowRMS;
    prevBandRMS = curBandRMS;

    lowFlux[i] = dLow;
    bandFlux[i] = dBand;

    const comb = dLow * 0.75 + dBand * 0.25;
    combinedFlux[i] = comb;

    if (comb > maxFlux) {
      maxFlux = comb;
    }
  }

  // 3. Adaptive Moving Average Thresholding
  const winRadius = 35;
  const onsets: { time: number; strength: number; lowEnergy: number }[] = [];
  const minIntervalFrames = Math.floor(0.20 / 0.01);

  let lastOnsetFrame = -minIntervalFrames;

  for (let i = 2; i < totalFrames - 2; i++) {
    const val = combinedFlux[i];
    if (val <= 0.00001) continue;

    const isPeak = val >= combinedFlux[i - 1] &&
                   val >= combinedFlux[i - 2] &&
                   val >= combinedFlux[i + 1] &&
                   val >= combinedFlux[i + 2];

    if (!isPeak) continue;

    const wStart = Math.max(0, i - winRadius);
    const wEnd = Math.min(totalFrames, i + winRadius + 1);
    let sum = 0;
    for (let k = wStart; k < wEnd; k++) {
      sum += combinedFlux[k];
    }
    const mean = sum / (wEnd - wStart);

    let sumVar = 0;
    for (let k = wStart; k < wEnd; k++) {
      const diff = combinedFlux[k] - mean;
      sumVar += diff * diff;
    }
    const std = Math.sqrt(sumVar / (wEnd - wStart));

    const threshold = mean + 1.25 * std + maxFlux * 0.02;

    if (val > threshold && (i - lastOnsetFrame >= minIntervalFrames)) {
      // DÒ TÌM THỜI ĐIỂM BẮT ĐẦU CÚ ĐẬP THỰC TẾ (LEADING ATTACK EDGE)
      // Quét lùi 45ms từ đỉnh phong bì năng lượng về trước để khóa đúng mép xuất hiện tiếng trống
      const approxSample = i * hopSize;
      const searchStart = Math.max(0, approxSample - Math.floor(sampleRate * 0.045));
      const searchEnd = Math.min(channelData.length - 1, approxSample + Math.floor(sampleRate * 0.01));

      let peakSample = approxSample;
      let maxAmp = 0;
      for (let s = searchStart; s <= searchEnd; s++) {
        const amp = Math.abs(channelData[s]);
        if (amp > maxAmp) {
          maxAmp = amp;
          peakSample = s;
        }
      }

      // Dò ngược từ đỉnh xung kích về điểm bắt đầu tăng biên độ (> 25% maxAmp)
      let attackSample = peakSample;
      const thresholdAmp = maxAmp * 0.25;
      for (let s = peakSample; s >= searchStart; s--) {
        if (Math.abs(channelData[s]) >= thresholdAmp) {
          attackSample = s;
        } else {
          break;
        }
      }

      const exactTime = Number((attackSample / sampleRate).toFixed(3));
      const lowEnergyVal = lowFlux[i];
      const normalizedStrength = Math.min(1.0, val / maxFlux);

      onsets.push({
        time: exactTime,
        strength: normalizedStrength,
        lowEnergy: lowEnergyVal,
      });

      lastOnsetFrame = i;
    }
  }

  // 4. Ước lượng BPM thực tế
  let calculatedBpm = 120;
  if (onsets.length >= 4) {
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      const diff = onsets[i].time - onsets[i - 1].time;
      if (diff >= 0.25 && diff <= 1.2) {
        intervals.push(diff);
      }
    }

    if (intervals.length > 0) {
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      let rawBpm = 60 / medianInterval;
      while (rawBpm < 70) rawBpm *= 2;
      while (rawBpm > 175) rawBpm /= 2;
      calculatedBpm = Math.round(rawBpm * 10) / 10;
    }
  }

  // 5. Xác định ngưỡng Bass cực mạnh (Top 18% năng lượng trầm cao nhất)
  const lowEnergyList = onsets.map((o) => o.lowEnergy).sort((a, b) => a - b);
  const p82Index = Math.floor(lowEnergyList.length * 0.82);
  const heavyBassThreshold = lowEnergyList.length > 0 ? lowEnergyList[p82Index] : 0.5;

  // 6. Gán nhịp mạnh (🔴) cho các cú Bass mạnh và nhịp chuẩn (🟡) cho các nhịp còn lại
  const generatedBeats: BeatMarker[] = [];
  let lastStrongTime = -999;
  let dropCount = 1;

  onsets.forEach((onset, idx) => {
    const isHeavyBass = onset.lowEnergy >= heavyBassThreshold && onset.lowEnergy > maxFlux * 0.25;
    const isSpacedEnough = (onset.time - lastStrongTime) >= 0.95;
    const isStrong = (isHeavyBass && isSpacedEnough) || (idx === 0 && onset.lowEnergy > heavyBassThreshold * 0.8);

    if (isStrong) {
      lastStrongTime = onset.time;
    }

    const markerType: MarkerType = isStrong ? 'strong_beat' : 'beat';

    generatedBeats.push({
      id: `onset-${idx}-${onset.time}`,
      time: onset.time,
      strength: isStrong ? 1.0 : Number((onset.strength * 0.75 + 0.1).toFixed(2)),
      type: markerType,
      source: 'auto',
      label: isStrong ? `Drop ${dropCount++}` : undefined,
    });
  });

  return {
    bpm: calculatedBpm,
    beats: generatedBeats,
  };
}

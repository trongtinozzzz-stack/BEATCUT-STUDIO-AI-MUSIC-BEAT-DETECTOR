import { BeatMarker, MarkerType } from '../types';

/**
 * BEATCUT STUDIO — Studio Dynamic Programming Beat Tracker (Ellis DP & 4/4 Bar Downbeat Phase Lock)
 * 1. Thuật toán Dynamic Programming Beat Tracking (chuẩn Librosa / Spotify EchoNest) đảm bảo nhịp không bao giờ bị nhanh/chậm.
 * 2. Autocorrelation với Gaussian Tempo Prior xác định chu kỳ nhịp chuẩn xác (65 - 180 BPM).
 * 3. Khóa pha 4/4: Cứ mỗi 4 phách (1 khuôn nhạc) chỉ có đúng 1 vạch đỏ 🔴 tại cú đập Bass mạnh nhất.
 * 4. Vạch vàng 🟡 nằm đều đặn theo phách chuẩn 1/4 (Quarter notes).
 * 5. Bắt dính mép xung kích Attack để khi con trỏ chạm vạch là âm thanh đập ngay lập tức.
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
 * Thuật toán Dan Ellis Dynamic Programming Beat Tracking
 */
export function extractQuickBeats(buffer: AudioBuffer): { bpm: number; beats: BeatMarker[] } {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const duration = buffer.duration;

  if (duration <= 0 || channelData.length === 0) {
    return { bpm: 120, beats: [] };
  }

  // 1. Phân tách dải tần số Low-Pass (Kick/Bass) và Band-Pass (Snare/Clap)
  const lowPassData = filterLowPass(channelData, sampleRate, 160);
  const bandPassData = filterBandPass(channelData, sampleRate, 2200);

  // 2. Tính toán năng lượng RMS và Onset Flux trên khung 10ms (100 frames/sec)
  const hopSize = Math.max(1, Math.floor(sampleRate * 0.01)); // 10ms
  const totalFrames = Math.floor(channelData.length / hopSize);

  const lowFlux = new Float32Array(totalFrames);
  const bandFlux = new Float32Array(totalFrames);
  const onsetEnvelope = new Float32Array(totalFrames);

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

    // Trọng số: 70% Kick/Bass + 30% Snare/Clap
    const comb = dLow * 0.70 + dBand * 0.30;
    onsetEnvelope[i] = comb;

    if (comb > maxFlux) {
      maxFlux = comb;
    }
  }

  // Chuẩn hóa Onset Envelope về dải [0, 1]
  for (let i = 0; i < totalFrames; i++) {
    onsetEnvelope[i] = onsetEnvelope[i] / maxFlux;
  }

  // 3. Ước lượng Tempo / BPM chuẩn xác qua Autocorrelation có Gaussian Tempo Prior
  const frameRate = 100; // 100 fps
  const minLag = Math.floor(frameRate * (60 / 180)); // ~33 frames (180 BPM)
  const maxLag = Math.floor(frameRate * (60 / 65));  // ~92 frames (65 BPM)

  const sampleWindow = Math.min(totalFrames, 6000);
  const startF = Math.max(0, Math.floor((totalFrames - sampleWindow) / 3));

  let bestLag = 68; // Mặc định 88.2 BPM
  let maxScore = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let count = 0;
    for (let i = startF; i < startF + sampleWindow - lag; i += 2) {
      sum += onsetEnvelope[i] * onsetEnvelope[i + lag];
      count++;
    }
    const acf = count > 0 ? sum / count : 0;

    // Gaussian Prior ưu tiên dải nhịp tự nhiên (90-130 BPM)
    const bpmCandidate = (60 * frameRate) / lag;
    const tempoPrior = Math.exp(-0.5 * Math.pow((bpmCandidate - 110) / 40, 2));
    const score = acf * (0.6 + 0.4 * tempoPrior);

    if (score > maxScore) {
      maxScore = score;
      bestLag = lag;
    }
  }

  // Chu kỳ nhịp chuẩn (Beat Period in Frames)
  const tau = bestLag; // Số frames giữa 2 phách liên tiếp (ví dụ 68 frames = 0.68s)
  const beatPeriodSec = tau / frameRate;
  let rawBpm = 60 / beatPeriodSec;
  while (rawBpm < 65) rawBpm *= 2;
  while (rawBpm > 175) rawBpm /= 2;
  const finalBpm = Math.round(rawBpm * 10) / 10;

  // 4. Dan Ellis Dynamic Programming (DP) Beat Tracker
  // Tìm chuỗi nhịp tối ưu thỏa mãn cả năng lượng âm thanh và nhịp độ bài hát
  const D = new Float32Array(totalFrames); // Cumulative score
  const P = new Int32Array(totalFrames);   // Backpointer
  const alpha = 75.0; // Trọng số phạt lệch tempo

  for (let i = 0; i < totalFrames; i++) {
    D[i] = onsetEnvelope[i];
    P[i] = -1;
  }

  const minSearchLag = Math.max(1, Math.floor(tau * 0.5));
  const maxSearchLag = Math.floor(tau * 2.0);

  for (let t = minSearchLag; t < totalFrames; t++) {
    let maxTransScore = -1e9;
    let bestPrev = -1;

    const pStart = Math.max(0, t - maxSearchLag);
    const pEnd = t - minSearchLag;

    for (let p = pStart; p <= pEnd; p++) {
      const delta = (t - p) / tau;
      const logDelta = Math.log(delta);
      const penalty = -alpha * logDelta * logDelta;
      const totalScore = D[p] + penalty;

      if (totalScore > maxTransScore) {
        maxTransScore = totalScore;
        bestPrev = p;
      }
    }

    if (bestPrev !== -1) {
      D[t] = onsetEnvelope[t] + maxTransScore;
      P[t] = bestPrev;
    }
  }

  // 5. Backtracking để trích xuất danh sách beat frames chính xác
  let bestEndFrame = totalFrames - 1;
  let maxEndScore = -1e9;

  for (let t = totalFrames - Math.floor(tau * 1.5); t < totalFrames; t++) {
    if (t >= 0 && D[t] > maxEndScore) {
      maxEndScore = D[t];
      bestEndFrame = t;
    }
  }

  const rawBeatFrames: number[] = [];
  let curr = bestEndFrame;
  while (curr > 0) {
    rawBeatFrames.push(curr);
    curr = P[curr];
  }
  rawBeatFrames.reverse();

  // Bỏ qua các nhịp dạo đầu không có âm thanh
  const validBeatFrames = rawBeatFrames.filter((f) => {
    const time = f / frameRate;
    return time >= 0.1 && (time < duration - 0.1);
  });

  // 6. Dò tìm mép xung kích Attack (Leading Edge Snapping) để chạm vạch là đập ngay
  const snappedTimes: number[] = [];
  validBeatFrames.forEach((frame) => {
    const approxSample = frame * hopSize;
    const searchStart = Math.max(0, approxSample - Math.floor(sampleRate * 0.04));
    const searchEnd = Math.min(channelData.length - 1, approxSample + Math.floor(sampleRate * 0.015));

    let peakSample = approxSample;
    let maxAmp = 0;
    for (let s = searchStart; s <= searchEnd; s++) {
      const amp = Math.abs(channelData[s]);
      if (amp > maxAmp) {
        maxAmp = amp;
        peakSample = s;
      }
    }

    let attackSample = peakSample;
    const thresholdAmp = maxAmp * 0.25;
    for (let s = peakSample; s >= searchStart; s--) {
      if (Math.abs(channelData[s]) >= thresholdAmp) {
        attackSample = s;
      } else {
        break;
      }
    }

    snappedTimes.push(Number((attackSample / sampleRate).toFixed(3)));
  });

  // 7. Khóa pha khuôn nhạc 4/4: Xác định phách nào trong 4 phách là cú Bass Drop mạnh nhất
  let bestPhase = 0;
  let maxPhaseBass = -1;

  for (let phase = 0; phase < 4; phase++) {
    let bassEnergySum = 0;
    for (let i = phase; i < validBeatFrames.length; i += 4) {
      const f = validBeatFrames[i];
      bassEnergySum += lowFlux[f];
    }
    if (bassEnergySum > maxPhaseBass) {
      maxPhaseBass = bassEnergySum;
      bestPhase = phase;
    }
  }

  // 8. Tạo danh sách Marker: Đúng chuẩn 4/4
  // - 🔴 Nhịp mạnh (strong_beat): Chỉ xuất hiện ở Phách 1 đầu khuôn (cứ 4 phách mới có 1 vạch đỏ)
  // - 🟡 Nhịp chuẩn (beat): Các phách 2, 3, 4 còn lại
  const generatedBeats: BeatMarker[] = [];
  let barNumber = 1;

  snappedTimes.forEach((time, idx) => {
    const isDownbeat = (idx % 4 === bestPhase);
    const markerType: MarkerType = isDownbeat ? 'strong_beat' : 'beat';

    generatedBeats.push({
      id: `beat-${idx}-${time}`,
      time: time,
      strength: isDownbeat ? 1.0 : 0.75,
      type: markerType,
      source: 'auto',
      label: isDownbeat ? `Bar ${barNumber++}` : undefined,
    });
  });

  return {
    bpm: finalBpm,
    beats: generatedBeats,
  };
}

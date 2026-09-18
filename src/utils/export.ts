import { BeatMarker, ProjectData } from '../types';

export function generateJSONExport(project: ProjectData, activeMarkers: BeatMarker[]): string {
  const payload = {
    projectName: project.projectName || 'My Music',
    audioFileName: project.audioFileName || 'audio.mp3',
    duration: Number(project.duration.toFixed(2)),
    bpm: Number(project.bpm.toFixed(1)),
    totalMarkers: activeMarkers.length,
    markers: activeMarkers.map((m) => ({
      time: Number(m.time.toFixed(3)),
      type: m.type,
      source: m.source,
      strength: Number(m.strength.toFixed(3)),
      ...(m.label ? { label: m.label } : {}),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function generateCSVExport(activeMarkers: BeatMarker[]): string {
  const header = 'time,type,source,strength,label\n';
  const rows = activeMarkers
    .map((m) => `${m.time.toFixed(3)},${m.type},${m.source},${m.strength.toFixed(3)},"${m.label || ''}"`)
    .join('\n');
  return header + rows;
}

export function generateTXTExport(project: ProjectData, activeMarkers: BeatMarker[]): string {
  let txt = `# BEATCUT STUDIO — Timestamp Markers & Cut List\n`;
  txt += `# Dự án: ${project.projectName}\n`;
  txt += `# File: ${project.audioFileName} | Thời lượng: ${project.duration.toFixed(2)}s | BPM: ${project.bpm.toFixed(1)}\n`;
  txt += `# Tổng số điểm nhịp: ${activeMarkers.length}\n`;
  txt += `# ------------------------------------------------------------\n`;
  
  // 1. Dãy số giây của các điểm beat
  const seconds = activeMarkers.map((m) => Number(m.time.toFixed(2)));
  txt += `\n# 1. DÃY GIÂY CHẤM BEAT (TIMESTAMPS SEQUENCE):\n`;
  txt += `${seconds.join(', ')}\n\n`;

  // 2. Dãy ngắt đoạn cắt video (0-10, 10-12, 12-14...)
  txt += `# 2. DÃY NGẮT ĐOẠN RÚT GỌN (CUT INTERVALS):\n`;
  let prevTime = 0;
  const intervals: string[] = [];
  activeMarkers.forEach((m) => {
    intervals.push(`${prevTime.toFixed(2)}-${m.time.toFixed(2)}`);
    prevTime = m.time;
  });
  if (project.duration > prevTime) {
    intervals.push(`${prevTime.toFixed(2)}-${project.duration.toFixed(2)}`);
  }
  txt += `${intervals.join(', ')}\n\n`;

  // 3. Bảng chi tiết từng đoạn cắt
  txt += `# 3. CHI TIẾT TỪNG ĐOẠN CẮT:\n`;
  let segIdx = 1;
  let curStart = 0;
  activeMarkers.forEach((m) => {
    const dur = m.time - curStart;
    txt += `Đoạn ${segIdx}: ${curStart.toFixed(2)}s -> ${m.time.toFixed(2)}s\t(Độ dài: ${dur.toFixed(2)}s)\t[${m.type}]\n`;
    curStart = m.time;
    segIdx++;
  });
  if (project.duration > curStart) {
    const dur = project.duration - curStart;
    txt += `Đoạn ${segIdx}: ${curStart.toFixed(2)}s -> ${project.duration.toFixed(2)}s\t(Độ dài: ${dur.toFixed(2)}s)\t[end]\n`;
  }

  return txt;
}


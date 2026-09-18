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
  let txt = `# BEATCUT STUDIO — Timestamp Markers\n`;
  txt += `# Dự án: ${project.projectName}\n`;
  txt += `# File: ${project.audioFileName} | Thời lượng: ${project.duration.toFixed(2)}s | BPM: ${project.bpm.toFixed(1)}\n`;
  txt += `# Số lượng marker: ${activeMarkers.length}\n`;
  txt += `# ------------------------------------------------------------\n`;
  txt += `# Time (s)\tType\t\tStrength\tLabel\n`;

  activeMarkers.forEach((m) => {
    txt += `${m.time.toFixed(3)}\t\t${m.type.padEnd(12)}\t${m.strength.toFixed(2)}\t\t${m.label || '-'}\n`;
  });

  return txt;
}

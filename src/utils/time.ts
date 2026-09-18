/**
 * Chuyển đổi giây sang định dạng mm:ss.xx (ví dụ 02:45.30)
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 100);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}.${pad(millis)}`;
}

/**
 * Chuyển đổi giây sang định dạng ngắn mm:ss
 */
export function formatTimeShort(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Định dạng dung lượng byte sang KB/MB dễ đọc
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

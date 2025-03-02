/**
 * Formats a duration in seconds to a human-readable MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string in MM:SS format
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Formats a duration in seconds to a human-readable HH:MM:SS format for longer videos
 * @param seconds - Duration in seconds
 * @returns Formatted duration string in HH:MM:SS format if hours > 0, otherwise MM:SS
 */
export function formatLongDuration(seconds: number): string {
  if (isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 
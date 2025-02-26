/**
 * Formats a duration in seconds to a human-readable MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string in MM:SS format
 */
export function formatDuration(seconds: number): string {
  if (!seconds && seconds !== 0) return '0:00';
  
  // Ensure we're working with a whole number
  const totalSeconds = Math.floor(seconds);
  
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60);
  
  // Format with leading zeros for seconds
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Formats a duration in seconds to a more verbose human-readable format
 * For longer videos, includes hours if needed
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "1h 23m 45s" or "5m 30s")
 */
export function formatDurationVerbose(seconds: number): string {
  if (!seconds && seconds !== 0) return '0s';
  
  // Ensure we're working with a whole number
  const totalSeconds = Math.floor(seconds);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60);
  
  let result = '';
  
  if (hours > 0) {
    result += `${hours}h `;
  }
  
  if (minutes > 0 || hours > 0) {
    result += `${minutes}m `;
  }
  
  if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) {
    result += `${remainingSeconds}s`;
  }
  
  return result.trim();
} 
/**
 * Formats a number into a human-readable view count (e.g., "1.2K", "3.5M")
 * @param count - The number to format
 * @returns Formatted view count string
 */
export function formatViewCount(count: number): string {
  if (count === 0) {
    return 'No views';
  }
  
  if (count === 1) {
    return '1 view';
  }
  
  if (count < 1000) {
    return `${count} views`;
  }
  
  if (count < 1000000) {
    // Format as K (thousands)
    const formattedCount = (count / 1000).toFixed(1);
    // Remove decimal if it's .0
    const finalCount = formattedCount.endsWith('.0') 
      ? formattedCount.slice(0, -2) 
      : formattedCount;
    return `${finalCount}K views`;
  }
  
  // Format as M (millions)
  const formattedCount = (count / 1000000).toFixed(1);
  // Remove decimal if it's .0
  const finalCount = formattedCount.endsWith('.0') 
    ? formattedCount.slice(0, -2) 
    : formattedCount;
  return `${finalCount}M views`;
} 
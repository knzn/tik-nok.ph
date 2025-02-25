import { useEffect, useState, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { VideoService } from '../services/video.service';
import { VideoCard } from '../components/features/Video/VideoCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';


const VIDEOS_PER_PAGE = 5;
const MIN_SWIPE_DISTANCE = 50;

export function Home() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  // Query for videos with pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['videos'],
    queryFn: ({ pageParam = 1 }) => 
      VideoService.getVideos({ page: pageParam as number, limit: VIDEOS_PER_PAGE }),
    getNextPageParam: (lastPage) => 
      lastPage.nextPage ? lastPage.nextPage : undefined,
    initialPageParam: 1
  });
  // Flatten video data from all pages
  const videos = data?.pages.flatMap(page => page.data) || [];

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    touchStartY.current = 'touches' in e ? e.touches[0].clientY : (e as TouchEvent).touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touchEndY = 'changedTouches' in e 
      ? e.changedTouches[0].clientY 
      : (e as TouchEvent).changedTouches[0].clientY;
    const deltaY = touchStartY.current - touchEndY;

    if (Math.abs(deltaY) > MIN_SWIPE_DISTANCE) {
      if (deltaY > 0 && currentVideoIndex < videos.length - 1) {
        // Swipe up - next video
        setCurrentVideoIndex(prev => prev + 1);
      } else if (deltaY < 0 && currentVideoIndex > 0) {
        // Swipe down - previous video
        setCurrentVideoIndex(prev => prev - 1);
      }
    }
  }, [currentVideoIndex, videos.length]);

  // Set up touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use correct event types for DOM listeners
    container.addEventListener('touchstart', handleTouchStart as unknown as EventListener);
    container.addEventListener('touchend', handleTouchEnd as unknown as EventListener);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart as unknown as EventListener);
      container.removeEventListener('touchend', handleTouchEnd as unknown as EventListener);
    };
  }, [handleTouchStart, handleTouchEnd]);

  // Load more videos when approaching the end
  useEffect(() => {
    if (currentVideoIndex >= videos.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [currentVideoIndex, videos.length, hasNextPage, fetchNextPage, isFetchingNextPage]);

  // Render loading state
  if (status === 'pending') {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <LoadingSpinner />
      </div>
    );
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="text-center py-10 text-red-500">
        Failed to load videos. Please try again later.
      </div>
    );
  }

  // No videos available
  if (videos.length === 0) {
    return (
      <div className="text-center py-10">
        No videos available at this time.
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-[calc(100vh-4rem)] overflow-hidden touch-none"
    >
      <div 
        className="h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-${currentVideoIndex * 100}%)` }}
      >
        {videos.map((video, index) => (
          <div 
            key={video.id} 
            className="h-full snap-center"
          >
            <VideoCard 
              video={video} 
              isActive={currentVideoIndex === index}
            />
            {isFetchingNextPage && index === videos.length - 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
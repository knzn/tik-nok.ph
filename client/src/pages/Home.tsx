import { useEffect, useState, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { VideoService } from '../services/video.service';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatTimeAgo } from '../utils/formatTimeAgo';
import { formatViewCount } from '../utils/formatViewCount';
import { VideoCard } from '../components/features/Video/VideoCard';

const VIDEOS_PER_PAGE = 12;

export function Home() {
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

  // Load more videos when scrolling to the bottom
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isFetchingNextPage) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });

    if (node) {
      observerRef.current.observe(node);
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Render loading state
  if (status === 'pending') {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <LoadingSpinner size={32} />
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
    <div className="w-full px-2 sm:px-3 md:px-4 py-3 sm:py-4">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-3 sm:mb-4 px-1">Recommended Videos</h1>
      
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
        {videos.map((video) => {
          // Get video ID safely
          const videoId = video.id || video._id || '';
          
          return (
            <div key={videoId} className="w-full">
              <VideoCard video={video as any} />
            </div>
          );
        })}
      </div>
      
      {/* Loading indicator for infinite scroll */}
      {hasNextPage && (
        <div 
          ref={loadMoreRef} 
          className="flex justify-center items-center py-4"
        >
          {isFetchingNextPage ? (
            <LoadingSpinner size={20} />
          ) : (
            <div className="h-6" />
          )}
        </div>
      )}
    </div>
  );
}

export default Home;
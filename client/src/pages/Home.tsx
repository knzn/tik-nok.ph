import { useEffect, useState, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { VideoService } from '../services/video.service';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatTimeAgo } from '../utils/formatTimeAgo';
import { formatViewCount } from '../utils/formatViewCount';

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
    <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 px-2">Recommended Videos</h1>
      
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-2 gap-y-6 sm:gap-x-4 sm:gap-y-8 md:gap-6">
        {videos.map((video) => {
          // Get video ID safely
          const videoId = video.id || video._id || '';
          
          // Get username safely with fallback
          const username = video.userId?.username || 'Unknown User';
          // ProfilePicture might not exist in the type, so handle it safely
          const profilePicture = 'profilePicture' in video.userId 
            ? (video.userId as any).profilePicture 
            : undefined;
          const firstLetter = username.charAt(0).toUpperCase();
          
          // Format time ago from createdAt
          const timeAgo = formatTimeAgo(video.createdAt);
          
          // Format view count
          const viewCount = formatViewCount(video.views || 0);
          
          return (
            <div key={videoId} className="video-card flex flex-col">
              {/* Video Thumbnail */}
              <Link to={`/video/${videoId}`} className="relative aspect-video overflow-hidden rounded-lg group">
                <img 
                  src={video.thumbnailUrl || '/placeholder-thumbnail.jpg'} 
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                  </div>
                )}
              </Link>
              
              {/* Video Info */}
              <div className="flex mt-2 sm:mt-3 space-x-2 sm:space-x-3">
                {/* User Avatar */}
                <Link to={`/profile/${username}`} className="flex-shrink-0 mt-0.5">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 rounded-full">
                    <AvatarImage 
                      src={profilePicture} 
                      alt={username} 
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {firstLetter}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                
                {/* Title and Meta */}
                <div className="flex-1 min-w-0">
                  <Link to={`/video/${videoId}`} className="block">
                    <h3 className="text-sm sm:text-base font-medium line-clamp-2 hover:text-blue-600 leading-tight">
                      {video.title}
                    </h3>
                  </Link>
                  
                  <Link to={`/profile/${username}`} className="block mt-1 sm:mt-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700">
                    {username}
                  </Link>
                  
                  <div className="flex items-center text-xs sm:text-sm text-gray-500 mt-0.5">
                    <span>{viewCount}</span>
                    <span className="mx-1">•</span>
                    <span>{timeAgo}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Loading indicator for infinite scroll */}
      {hasNextPage && (
        <div 
          ref={loadMoreRef} 
          className="flex justify-center items-center py-8 sm:py-10"
        >
          {isFetchingNextPage ? (
            <LoadingSpinner size={24} />
          ) : (
            <div className="h-10" />
          )}
        </div>
      )}
    </div>
  );
}

export default Home;
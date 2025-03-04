import { useEffect, useState, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { VideoService } from '../services/video.service';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { VideoCard } from '../components/features/Video/VideoCard';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Link } from 'react-router-dom';

// Import from types if available or define locally
interface UserVideoGroup {
  user: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  videos: any[];
}

interface FollowingVideosResponse {
  data: UserVideoGroup[];
  nextPage?: number;
  total: number;
}

const VIDEOS_PER_PAGE = 12;

export function Following() {
  // Query for videos from followed users with pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['followingVideos'],
    queryFn: ({ pageParam = 1 }) => 
      VideoService.getFollowingVideos({ page: pageParam as number, limit: VIDEOS_PER_PAGE }),
    getNextPageParam: (lastPage) => 
      lastPage.nextPage ? lastPage.nextPage : undefined,
    initialPageParam: 1
  });

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
        Failed to load videos from users you follow. Please try again later.
      </div>
    );
  }

  // Flatten user data from all pages
  const userGroups = data?.pages.flatMap(page => page.data) || [];

  // No followed users or videos
  if (userGroups.length === 0) {
    return (
      <div className="w-full px-4 py-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Following</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          You're not following anyone yet, or the users you follow haven't posted any videos.
        </p>
        <Link 
          to="/" 
          className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
        >
          Discover videos
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-3 md:px-4 py-3 sm:py-4">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-3 sm:mb-4 px-1">Following</h1>
      
      <div className="space-y-8">
        {userGroups.map((userGroup: any) => (
          <div key={userGroup.user._id} className="space-y-3">
            {/* User header */}
            <div className="flex items-center px-1">
              <Link 
                to={`/profile/${userGroup.user.username}`}
                className="flex items-center hover:underline"
              >
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={userGroup.user.profilePicture} alt={userGroup.user.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userGroup.user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">@{userGroup.user.username}</span>
              </Link>
            </div>
            
            {/* Videos grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
              {userGroup.videos.map((video: any) => {
                // Get video ID safely
                const videoId = video.id || video._id || '';
                
                return (
                  <div key={videoId} className="w-full">
                    <VideoCard video={video} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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

export default Following; 
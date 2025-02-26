import { useParams } from 'react-router-dom'
import { VideoDetail } from '../../components/features/Video/VideoDetail'
import { useQuery } from '@tanstack/react-query'
import { VideoService } from '../../services/video.service'
import { VideoCard } from '../../components/features/Video/VideoCard'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ScrollArea } from "../../components/ui/scroll-area"
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'

// Define a more generic video type that works with both service and component
interface VideoBase {
  id?: string;
  _id?: string;
  title: string;
  thumbnailUrl?: string;
  userId: {
    _id?: string;
    username: string;
    profilePicture?: string;
  };
  views?: number;
  createdAt: string;
  updatedAt?: string;
  hlsUrl?: string;
  status?: 'processing' | 'ready' | 'public' | 'private';
  category?: string;
  tags?: string[];
}

export function VideoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [filteredVideos, setFilteredVideos] = useState<VideoBase[]>([])
  const [currentVideo, setCurrentVideo] = useState<VideoBase | null>(null)
  const [combinedVideos, setCombinedVideos] = useState<VideoBase[]>([])

  // Fetch current video to get its category and tags
  const { data: videoData } = useQuery({
    queryKey: ['video', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const response = await VideoService.getVideo(id);
        console.log('Current video data:', response);
        // Use as any to bypass the type checking temporarily
        setCurrentVideo(response as any);
        return response;
      } catch (error) {
        console.error('Error fetching current video:', error);
        return null;
      }
    },
    enabled: !!id,
  });

  // Fetch regular videos with React Query
  const { 
    data: regularVideosData, 
    isLoading: loadingRegularVideos,
  } = useQuery({
    queryKey: ['regularVideos'],
    queryFn: async () => {
      console.log('Fetching regular videos...');
      const response = await VideoService.getVideos({ limit: 10 });
      console.log('Regular videos response:', response);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch most viewed videos
  const { 
    data: viewedVideosData, 
    isLoading: loadingViewedVideos,
  } = useQuery({
    queryKey: ['topVideos', 'viewed'],
    queryFn: async () => {
      console.log('Fetching most viewed videos...');
      const response = await VideoService.getTopVideos('viewed');
      console.log('Most viewed videos response:', response);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch most liked videos
  const { 
    data: likedVideosData, 
    isLoading: loadingLikedVideos,
  } = useQuery({
    queryKey: ['topVideos', 'liked'],
    queryFn: async () => {
      console.log('Fetching most liked videos...');
      const response = await VideoService.getTopVideos('liked');
      console.log('Most liked videos response:', response);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Combine all videos and remove duplicates
  useEffect(() => {
    const regularVideos = regularVideosData?.data || [];
    const viewedVideos = viewedVideosData || [];
    const likedVideos = likedVideosData || [];
    
    // Combine all videos
    const allVideos = [...regularVideos, ...viewedVideos, ...likedVideos];
    
    // Remove duplicates by ID
    const uniqueVideos = allVideos.reduce((acc: VideoBase[], video) => {
      const videoId = video.id || video._id;
      if (!acc.some(v => (v.id || v._id) === videoId)) {
        acc.push(video);
      }
      return acc;
    }, []);
    
    setCombinedVideos(uniqueVideos);
  }, [regularVideosData, viewedVideosData, likedVideosData]);

  // Filter and sort suggested videos based on relevance to current video
  const filterAndSortVideos = useCallback(() => {
    if (combinedVideos.length > 0 && id) {
      // First, filter out the current video
      let filtered = combinedVideos.filter(video => {
        const videoId = video.id || video._id;
        return videoId !== id;
      });

      // If we have the current video data, prioritize videos with matching category or tags
      if (currentVideo) {
        const { category, tags } = currentVideo;
        
        // Sort function that prioritizes videos with matching category or tags
        filtered.sort((a, b) => {
          const aScore = getRelevanceScore(a, category, tags);
          const bScore = getRelevanceScore(b, category, tags);
          return bScore - aScore; // Higher score first
        });
      } else {
        // If we don't have current video data, add some randomness
        filtered.sort(() => Math.random() - 0.5);
      }

      // Limit to 15 videos for performance
      setFilteredVideos(filtered.slice(0, 15));
    }
  }, [combinedVideos, id, currentVideo]);

  // Calculate relevance score for sorting
  const getRelevanceScore = (video: VideoBase, category?: string, tags?: string[]) => {
    let score = 0;
    
    // Same category is a strong signal
    if (category && video.category === category) {
      score += 10;
    }
    
    // Matching tags
    if (tags && tags.length > 0 && video.tags && video.tags.length > 0) {
      const matchingTags = tags.filter(tag => video.tags?.includes(tag));
      score += matchingTags.length * 5;
    }
    
    // Prioritize videos with more views
    if (video.views) {
      score += Math.min(video.views / 1000, 5); // Cap at 5 points
    }
    
    // Add some randomness to avoid showing the same videos every time
    score += Math.random() * 2;
    
    return score;
  };

  // Update filtered videos when combined videos or current video changes
  useEffect(() => {
    filterAndSortVideos();
  }, [combinedVideos, currentVideo, filterAndSortVideos]);

  // Handle video click
  const handleVideoClick = (videoId: string) => {
    // Reset the current video when navigating
    setCurrentVideo(null);
    navigate(`/video/${videoId}`);
  };

  // Check if we're still loading any videos
  const isLoading = loadingRegularVideos || loadingViewedVideos || loadingLikedVideos;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row max-w-[2000px] mx-auto">
        {/* Main Content */}
        <div className="flex-grow lg:w-[65%] xl:w-[70%] px-3 py-3 lg:px-4 lg:py-4">
          <VideoDetail videoId={id!} />
        </div>

        {/* Suggested Videos Sidebar */}
        <div className="lg:w-[25%] xl:w-[20%] p-2 border-l border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold tracking-tight mb-2 px-1">Suggested Videos</h3>
          
          <ScrollArea className="h-[calc(100vh-100px)]">
            <div className="pr-1 space-y-1">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size={20} />
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="text-center py-2 text-muted-foreground">
                  No suggested videos available
                </div>
              ) : (
                filteredVideos.map((suggestedVideo) => {
                  // Ensure the video has a valid ID
                  const videoId = suggestedVideo.id || suggestedVideo._id || '';
                  
                  return (
                    <div key={videoId}>
                      <VideoCard 
                        video={suggestedVideo as any} 
                        onVideoClick={() => handleVideoClick(videoId)}
                        compact={true}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
} 
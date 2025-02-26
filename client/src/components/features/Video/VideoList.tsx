import { useQuery } from '@tanstack/react-query'
import { VideoService } from '../../../services/video.service'
import { VideoCard } from './VideoCard'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'

export function VideoList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      console.log('Fetching videos...');
      try {
        const response = await VideoService.getVideos();
        console.log('API Response:', response);
        return response;
      } catch (err) {
        console.error('Error fetching videos:', err);
        throw err;
      }
    },
  });

  console.log('VideoList render - data:', data, 'isLoading:', isLoading, 'error:', error);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner size={32} />
      </div>
    )
  }

  if (error) {
    console.error('Error in VideoList:', error);
    return (
      <ErrorMessage 
        title="Failed to load videos" 
        message={(error as Error).message || 'Unknown error'} 
      />
    )
  }

  // Check if data exists and has the expected structure
  const videos = data?.data || (Array.isArray(data) ? data : []);
  
  if (videos.length === 0) {
    console.log('No videos found condition triggered');
    return (
      <div className="text-center py-10 text-muted-foreground">
        No videos found. Please check if the API server is running at {import.meta.env.VITE_API_URL}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-2 gap-y-6 sm:gap-x-4 sm:gap-y-8 md:gap-6">
      {videos.map((video) => (
        <VideoCard key={video.id || video._id} video={video} />
      ))}
    </div>
  )
} 
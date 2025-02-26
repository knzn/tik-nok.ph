import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { ProfileSetupModal } from '../components/profile/ProfileSetupModal'
import { EditProfileModal } from '../components/profile/EditProfileModal'
import { UpdateProfilePictureModal } from '../components/profile/UpdateProfilePictureModal'
import { Camera, Grid, List, Video, Users, Heart, MessageSquare } from 'lucide-react'
import { api, followUser, unfollowUser, checkFollowStatus } from '../lib/api'
import { VideoService } from '../services/video.service'
import { useQuery } from '@tanstack/react-query'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Separator } from '../components/ui/separator'
import { ScrollArea } from '../components/ui/scroll-area'

// Add this helper function at the top of the file
const addCacheBuster = (url: string) => {
  if (!url) return url;
  return `${url}?v=${new Date().getTime()}`;
};

// Add this at the top of the file
const getImageUrl = (url: string | undefined) => {
  if (!url) return '';
  const timestamp = new Date().getTime();
  return `${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`;
};

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const [profileData, setProfileData] = useState<any>(null)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false)
  const [imageVersion, setImageVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  const isOwnProfile = user?.username === username

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        if (isOwnProfile) {
          // Fetch personal profile
          const response = await api.get('/users/profile')
          if (response.data) {
            await updateUser({
              ...user,
              ...response.data
            })
            setProfileData(response.data)
            setFollowersCount(response.data.followersCount)
            setFollowingCount(response.data.followingCount)
          }
        } else {
          // Fetch public profile
          try {
            const response = await api.get(`/users/profile/${username}`)
            setProfileData(response.data)
            setFollowersCount(response.data.followersCount)
            setFollowingCount(response.data.followingCount)
          } catch (error: any) {
            if (error.response?.status === 404) {
              // User not found, redirect to home page
              navigate('/')
            }
            console.error('Failed to fetch profile:', error)
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
        // If there's any other error for own profile, you might want to show an error state
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [username, isOwnProfile, navigate])

  // Show setup modal only on first visit when gamefarmName is not set
  useEffect(() => {
    if (!isLoading && isOwnProfile && user && !user.gamefarmName) {
      setShowSetupModal(true)
    }
  }, [user, isLoading, isOwnProfile])

  useEffect(() => {
    if (user?.profilePicture) {
      setImageVersion(prev => prev + 1)
    }
  }, [user?.profilePicture])

  useEffect(() => {
    const checkFollow = async () => {
      if (!isOwnProfile && user && (profileData?._id || profileData?.id)) {
        try {
          const userId = profileData._id || profileData.id;
          const status = await checkFollowStatus(userId);
          setIsFollowing(status);
        } catch (error) {
          console.error('Failed to check follow status:', error);
        }
      }
    };

    checkFollow();
  }, [isOwnProfile, user, profileData]);

  const handleFollow = async () => {
    try {
      const userId = profileData._id || profileData.id;
      await followUser(userId);
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    } catch (error) {
      console.error('Failed to follow:', error);
    }
  };

  const handleUnfollow = async () => {
    try {
      const userId = profileData._id || profileData.id;
      await unfollowUser(userId);
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
    } catch (error) {
      console.error('Failed to unfollow:', error);
    }
  };

  // Fetch user videos
  const { data: userVideos, isLoading: loadingVideos } = useQuery({
    queryKey: ['userVideos', profileData?._id || profileData?.id],
    queryFn: async () => {
      if (!profileData?._id && !profileData?.id) return [];
      
      // Use either _id or id, whichever is available
      const userId = profileData._id || profileData.id;
      console.log('Fetching videos for user ID:', userId);
      
      try {
        const videos = await VideoService.getUserVideos(userId);
        console.log('Fetched videos:', videos);
        
        // Ensure we're only returning videos that belong to this user
        // This is a safety check in case the server doesn't filter properly
        const filteredVideos = videos.filter(video => {
          // Handle different possible structures of userId
          if (typeof video.userId === 'string') {
            return video.userId === userId;
          } else if (video.userId && typeof video.userId === 'object') {
            // Check if userId is an object with _id property
            return video.userId._id === userId;
          }
          return false;
        });
        
        console.log('Filtered videos for user:', filteredVideos.length);
        return filteredVideos;
      } catch (error) {
        console.error('Error fetching user videos:', error);
        return [];
      }
    },
    enabled: !!(profileData?._id || profileData?.id),
  });

  const displayData = isOwnProfile ? user : profileData

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background">
                {displayData?.profilePicture ? (
                  <AvatarImage 
                    src={getImageUrl(displayData.profilePicture)} 
                    alt={displayData?.username} 
                    key={imageVersion}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '';
                    }}
                  />
                ) : (
                  <AvatarFallback className="text-4xl">
                    {displayData?.username?.charAt(0).toUpperCase() || '👤'}
                  </AvatarFallback>
                )}
              </Avatar>
              
              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full"
                  onClick={() => setShowProfilePictureModal(true)}
                >
                  edit
                </Button>
              )}
            </div>

            {isOwnProfile ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowEditModal(true)}
              >
                Edit Profile
              </Button>
            ) : (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                className="mt-4"
                onClick={isFollowing ? handleUnfollow : handleFollow}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold">{displayData?.gamefarmName || "Gamefarm"}</h1>
              <p className="text-muted-foreground">@{displayData?.username}</p>
              
              {/* Stats */}
              <div className="flex gap-6 mt-4">
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold">{followersCount}</span>
                  <span className="text-sm text-muted-foreground">Followers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold">{followingCount}</span>
                  <span className="text-sm text-muted-foreground">Following</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold">{userVideos?.length || 0}</span>
                  <span className="text-sm text-muted-foreground">Videos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Location</h3>
                <p>{displayData?.address || "Not specified"}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Contact</h3>
                <p>{displayData?.contactNumber || "Not specified"}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Facebook</h3>
                {displayData?.facebookProfile ? (
                  <a 
                    href={displayData.facebookProfile} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline"
                  >
                    Visit Facebook Profile
                  </a>
                ) : (
                  <p>Not specified</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Content */}
        <div className="w-full">
          <h2 className="text-xl font-semibold mb-4">
            {isOwnProfile ? "Your Videos" : `${displayData?.username}'s Videos`}
          </h2>
          
          {/* Videos Content */}
          <div className="space-y-4">
            {loadingVideos ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner size={32} />
              </div>
            ) : userVideos && userVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {userVideos.map((video) => {
                  // Ensure we have a valid ID for the video
                  const videoId = video.id || video._id;
                  return (
                    <Card 
                      key={videoId} 
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" 
                      onClick={() => navigate(`/video/${videoId}`)}
                    >
                      <div className="aspect-video relative">
                        {video.thumbnailUrl ? (
                          <img 
                            src={video.thumbnailUrl} 
                            alt={video.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Video className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-medium line-clamp-1">{video.title}</h3>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {video.views || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {video.likes || 0}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No videos found. {isOwnProfile ? "Upload your first video!" : "This user hasn't uploaded any videos yet."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals - Only render for own profile */}
      {isOwnProfile && (
        <>
          <ProfileSetupModal
            isOpen={showSetupModal}
            onClose={() => setShowSetupModal(false)}
          />
          <EditProfileModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
          />
          <UpdateProfilePictureModal
            isOpen={showProfilePictureModal}
            onClose={() => setShowProfilePictureModal(false)}
          />
        </>
      )}
    </div>
  )
} 
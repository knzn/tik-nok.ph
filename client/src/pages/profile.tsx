import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '../components/ui/button'
import { ProfileSetupModal } from '../components/profile/ProfileSetupModal'
import { EditProfileModal } from '../components/profile/EditProfileModal'
import { UpdateProfilePictureModal } from '../components/profile/UpdateProfilePictureModal'
import { Camera, Grid, List, Video, Users, Heart, MessageSquare, Lock, EyeOff, Eye } from 'lucide-react'
import { api, followUser, unfollowUser, checkFollowStatus } from '../lib/api'
import { VideoService } from '../services/video.service'
import { useQuery } from '@tanstack/react-query'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Separator } from '../components/ui/separator'
import { ScrollArea } from '../components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDuration } from '../utils/formatters'

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

// Helper function to compare IDs safely
const isSameId = (id1: string | undefined, id2: string | undefined): boolean => {
  if (!id1 || !id2) return false;
  return id1 === id2 || id1 === id2.toString();
};

// Helper function to get a consistent ID from an object that might have id or _id
const getConsistentId = (obj: any): string | undefined => {
  if (!obj) return undefined;
  return obj.id || obj._id;
};

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user, updateUser, isAuthenticated } = useAuthStore()
  const [profileData, setProfileData] = useState<any>(null)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false)
  const [imageVersion, setImageVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private' | 'unlisted'>('all')

  const isOwnProfile = user?.username === username

  // Log authentication status for debugging
  useEffect(() => {
    console.log('Profile page auth status:', {
      isAuthenticated,
      userId: user?.id,
      username: user?.username,
      profileUsername: username,
      isOwnProfile
    });
  }, [isAuthenticated, user, username, isOwnProfile]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        if (isOwnProfile) {
          // Fetch personal profile
          const response = await api.get('/users/profile')
          if (response.data) {
            // Log user data for debugging
            console.log('Own profile data:', {
              responseId: response.data._id || response.data.id,
              userId: user?.id,
              username: response.data.username
            });
            
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
            
            // Log profile data for debugging
            console.log('Other user profile data:', {
              responseId: response.data._id || response.data.id,
              username: response.data.username,
              currentUserId: user?.id
            });
            
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
  const { data: userVideos, isLoading: loadingVideos, refetch: refetchVideos } = useQuery({
    queryKey: ['userVideos', profileData?._id || profileData?.id, isOwnProfile],
    queryFn: async () => {
      if (!profileData?._id && !profileData?.id) return [];
      
      // Use either _id or id, whichever is available
      const userId = profileData._id || profileData.id;
      console.log('Fetching videos for user ID:', userId);
      
      try {
        // Get auth token from localStorage for debugging
        const token = localStorage.getItem('token')
        const userJson = localStorage.getItem('user')
        const currentUser = userJson ? JSON.parse(userJson) : null
        
        console.log('Auth check for video fetch:', {
          hasToken: !!token,
          currentUserId: currentUser?.id,
          profileUserId: userId,
          isOwnProfile
        });
        
        // Fetch all videos for this user
        const videos = await VideoService.getUserVideos(userId);
        console.log('Fetched videos:', videos);
        
        // No need to filter videos here - the server should handle this based on the includePrivate parameter
        // Just return all videos that were returned by the server
        
        console.log('Videos for user:', {
          total: videos.length,
          public: videos.filter(v => v.visibility === 'public' || !v.visibility).length,
          private: videos.filter(v => v.visibility === 'private').length,
          unlisted: videos.filter(v => v.visibility === 'unlisted').length
        });
        
        return videos;
      } catch (error) {
        console.error('Error fetching user videos:', error);
        return [];
      }
    },
    enabled: !!(profileData?._id || profileData?.id),
  });

  // Filter videos based on selected visibility
  const filteredVideos = useMemo(() => {
    if (!userVideos) return [];
    
    if (visibilityFilter === 'all') {
      return userVideos;
    }
    
    if (visibilityFilter === 'public') {
      return userVideos.filter(v => v.visibility === 'public' || !v.visibility);
    }
    
    return userVideos.filter(v => v.visibility === visibilityFilter);
  }, [userVideos, visibilityFilter]);

  // Refetch videos when isOwnProfile changes
  useEffect(() => {
    if (profileData) {
      refetchVideos();
    }
  }, [isOwnProfile, profileData, refetchVideos]);

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h2 className="text-xl font-semibold">
              {isOwnProfile ? "Your Videos" : `${displayData?.username}'s Videos`}
            </h2>
            
            {/* Show visibility filters for own profile */}
            {isOwnProfile && userVideos && userVideos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                <button
                  onClick={() => setVisibilityFilter('all')}
                  className={`flex items-center text-xs px-2 py-1 rounded transition-colors ${
                    visibilityFilter === 'all' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span>All ({userVideos.length})</span>
                </button>
                
                <button
                  onClick={() => setVisibilityFilter('public')}
                  className={`flex items-center text-xs px-2 py-1 rounded transition-colors ${
                    visibilityFilter === 'public' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  <span>{userVideos.filter(v => v.visibility === 'public' || !v.visibility).length} Public</span>
                </button>
                
                {userVideos.filter(v => v.visibility === 'private').length > 0 && (
                  <button
                    onClick={() => setVisibilityFilter('private')}
                    className={`flex items-center text-xs px-2 py-1 rounded transition-colors ${
                      visibilityFilter === 'private' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    <span>{userVideos.filter(v => v.visibility === 'private').length} Private</span>
                  </button>
                )}
                
                {userVideos.filter(v => v.visibility === 'unlisted').length > 0 && (
                  <button
                    onClick={() => setVisibilityFilter('unlisted')}
                    className={`flex items-center text-xs px-2 py-1 rounded transition-colors ${
                      visibilityFilter === 'unlisted' 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    <EyeOff className="h-3 w-3 mr-1" />
                    <span>{userVideos.filter(v => v.visibility === 'unlisted').length} Unlisted</span>
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Videos Content */}
          <div className="space-y-4">
            {loadingVideos ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner size={32} />
              </div>
            ) : filteredVideos && filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <AnimatePresence>
                  {filteredVideos.map((video) => {
                    // Ensure we have a valid ID for the video
                    const videoId = video.id || video._id;
                    
                    // Skip videos without an ID
                    if (!videoId) return null;
                    
                    // Determine if video is private or unlisted
                    const isPrivate = video.visibility === 'private';
                    const isUnlisted = video.visibility === 'unlisted';
                    const isPublic = video.visibility === 'public' || !video.visibility;
                    
                    return (
                      <motion.div
                        key={videoId}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card 
                          className={`overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
                            isPrivate ? 'border-red-300' : 
                            isUnlisted ? 'border-yellow-300' : 
                            'border-green-300'
                          }`}
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
                            
                            {/* Visibility indicators */}
                            <div className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-sm flex items-center shadow-sm" 
                              style={{
                                backgroundColor: isPrivate ? 'rgba(239, 68, 68, 0.9)' : 
                                                 isUnlisted ? 'rgba(234, 179, 8, 0.9)' : 
                                                 'rgba(34, 197, 94, 0.9)',
                                color: 'white'
                              }}>
                              {isPrivate && <Lock className="h-3 w-3 mr-1" />}
                              {isUnlisted && <EyeOff className="h-3 w-3 mr-1" />}
                              {isPublic && <Eye className="h-3 w-3 mr-1" />}
                              <span>{isPrivate ? 'Private' : isUnlisted ? 'Unlisted' : 'Public'}</span>
                            </div>
                          </div>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <h3 className="font-medium line-clamp-1 flex-1">{video.title}</h3>
                              
                              {/* Duration badge moved here */}
                              {video.duration && (
                                <div className="ml-2 flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-1.5 py-0.5 rounded">
                                  {formatDuration(video.duration)}
                                </div>
                              )}
                            </div>
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
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                {userVideos && userVideos.length > 0 
                  ? `No ${visibilityFilter !== 'all' ? visibilityFilter : ''} videos found.` 
                  : isOwnProfile 
                    ? "Upload your first video!" 
                    : "This user hasn't uploaded any videos yet."}
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
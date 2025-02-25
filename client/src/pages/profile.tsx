import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { ProfileSetupModal } from '../components/profile/ProfileSetupModal'
import { EditProfileModal } from '../components/profile/EditProfileModal'
import { UpdateProfilePictureModal } from '../components/profile/UpdateProfilePictureModal'
import { Camera } from 'lucide-react'
import { api, followUser, unfollowUser, checkFollowStatus } from '../lib/api'

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
      if (!isOwnProfile && user && profileData?._id) {
        try {
          const status = await checkFollowStatus(profileData._id)
          setIsFollowing(status)
        } catch (error) {
          console.error('Failed to check follow status:', error)
        }
      }
    }

    checkFollow()
  }, [isOwnProfile, user, profileData])

  const handleFollow = async () => {
    try {
      await followUser(profileData._id)
      setIsFollowing(true)
      setFollowersCount(prev => prev + 1)
    } catch (error) {
      console.error('Failed to follow:', error)
    }
  }

  const handleUnfollow = async () => {
    try {
      await unfollowUser(profileData._id)
      setIsFollowing(false)
      setFollowersCount(prev => prev - 1)
    } catch (error) {
      console.error('Failed to unfollow:', error)
    }
  }

  const displayData = isOwnProfile ? user : profileData

  return (
    <div className="min-h-screen bg-background">
      {/* Profile Info Section - Centered with max-width */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Centered Profile Picture with Update Button */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-48 h-48 rounded-full border-4 border-background bg-gray-200 overflow-hidden mb-4">
              {displayData?.profilePicture ? (
                <img
                  src={displayData.profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  key={imageVersion}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">👤</span>
                </div>
              )}
            </div>
            {isOwnProfile && (
              <Button
                variant="outline"
                size="icon"
                className="absolute bottom-6 right-0 rounded-full"
                onClick={() => setShowProfilePictureModal(true)}
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Edit Profile Button - Only show for own profile */}
          {isOwnProfile && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowEditModal(true)}
            >
              Edit Profile
            </Button>
          )}

          {!isOwnProfile && user && (
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="lg"
              onClick={isFollowing ? handleUnfollow : handleFollow}
              className="mt-4"
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </Button>
          )}
        </div>

        {/* Profile Details Card */}
        <div className="bg-card rounded-xl p-8 shadow-lg">
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold">{displayData?.gamefarmName || "Gamefarm"}</h1>
              <p className="text-lg text-muted-foreground mt-2">@{displayData?.username}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h2 className="text-xl font-semibold">Location</h2>
                <p className="text-muted-foreground mt-2">{displayData?.address || "Not specified"}</p>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Contact</h2>
                <p className="text-muted-foreground mt-2">{displayData?.contactNumber || "Not specified"}</p>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Facebook</h2>
                <p className="text-muted-foreground mt-2">
                  {displayData?.facebookProfile ? (
                    <a href={displayData.facebookProfile} target="_blank" rel="noopener noreferrer" 
                       className="text-primary hover:underline">
                      Visit Facebook Profile
                    </a>
                  ) : (
                    "Not specified"
                  )}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-12 pt-6 border-t">
              <div>
                <span className="text-2xl font-bold">{followersCount}</span>
                <span className="text-muted-foreground ml-2">followers</span>
              </div>
              <div>
                <span className="text-2xl font-bold">{followingCount}</span>
                <span className="text-muted-foreground ml-2">following</span>
              </div>
              <div>
                <span className="text-2xl font-bold">37K</span>
                <span className="text-muted-foreground ml-2">likes</span>
              </div>
            </div>
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
import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { Pencil, Trash2, ThumbsUp, ThumbsDown, MoreVertical, Users, Bell, MessageSquare, Flag } from 'lucide-react'
import { VideoService } from '../../../services/video.service'
import { VideoPlayer } from './VideoPlayer'
import { CommentSection } from '../Comment/CommentSection'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { useToast } from '../../../components/ui/use-toast'
import { useAuthStore } from '../../../stores/authStore'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog"
import type { Video } from '@video-app/shared/types/video.types'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { Separator } from "../../../components/ui/separator"
import { cn } from "../../../lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "../../../components/ui/avatar"
import { followUser, unfollowUser, checkFollowStatus } from '../../../lib/api'
import { formatTimeAgo } from '../../../utils/formatTimeAgo'
import {
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "../../../components/ui/dialog"
import { reportReasons } from "../../../services/video.service"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../../components/ui/select"

interface VideoDetailProps {
  videoId: string
}

export function VideoDetail({ videoId }: VideoDetailProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { toast } = useToast()
  
  // State
  const [showComments, setShowComments] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [hasViewed, setHasViewed] = useState(false)
  const videoStartTimeRef = useRef<number | null>(null)
  const [viewCount, setViewCount] = useState<number>(0)
  const [likeStatus, setLikeStatus] = useState<'like' | 'dislike' | null>(null)
  const [likesCount, setLikesCount] = useState(0)
  const [dislikesCount, setDislikesCount] = useState(0)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')

  // Query
  const { data: video, isLoading: isLoadingVideo, error } = useQuery<Video>({
    queryKey: ['video', videoId],
    queryFn: () => VideoService.getVideo(videoId)
  })

  // Check if user is owner - handle different ID formats
  const isOwner = user && video && (() => {
    // Get all possible formats of user ID
    const userId = user.id;
    
    // Get all possible formats of video owner ID
    const videoUserId = video.userId;
    
    // Log the IDs for debugging
    console.log('Checking video ownership:', {
      userId,
      videoUserId,
      videoUserIdType: typeof videoUserId,
      videoUserIdObj: videoUserId,
      videoUserIdString: typeof videoUserId === 'object' ? 
        (videoUserId._id?.toString() || videoUserId.id?.toString()) : 
        videoUserId?.toString()
    });
    
    // Try all possible combinations
    if (typeof videoUserId === 'string') {
      return userId === videoUserId;
    }
    
    if (typeof videoUserId === 'object') {
      return (
        userId === videoUserId._id ||
        userId === videoUserId.id ||
        userId === videoUserId._id?.toString() ||
        userId === videoUserId.id?.toString()
      );
    }
    
    return false;
  })();

  // Add effect to check follow status and get followers count
  useEffect(() => {
    const checkFollow = async () => {
      if (!isOwner && user && video?.userId?._id) {
        try {
          const status = await checkFollowStatus(video.userId._id)
          setIsFollowing(status)
          setFollowersCount(video.userId.followersCount || 0)
        } catch (error) {
          console.error('Failed to check follow status:', error)
        }
      }
    }

    checkFollow()
  }, [isOwner, user, video])

  // Update the useEffect to set initial followers count
  useEffect(() => {
    if (video?.userId?.followersCount) {
      setFollowersCount(video.userId.followersCount)
    }
  }, [video])

  // Update initial view count when video data loads
  useEffect(() => {
    if (video?.views) {
      setViewCount(video.views)
    }
  }, [video])

  // Add this effect to fetch initial counts
  useEffect(() => {
    if (video) {
      setLikesCount(video.likes || 0)
      setDislikesCount(video.dislikes || 0)
    }
  }, [video])

  // Handlers
  const handleEdit = () => {
    setEditTitle(video?.title || '')
    setEditDescription(video?.description || '')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditTitle('')
    setEditDescription('')
  }

  const handleSaveEdit = async () => {
    if (!video) return

    try {
      setIsLoading(true)
      const updatedVideo = await VideoService.updateVideo(videoId, {
        title: editTitle.trim(),
        description: editDescription.trim()
      })

      // Update cache
      queryClient.setQueryData(['video', videoId], updatedVideo)
      
      setIsEditing(false)
      toast({
        title: "Success",
        description: "Video updated successfully"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update video",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      await VideoService.deleteVideo(videoId)
      
      toast({
        title: "Success",
        description: "Video deleted successfully"
      })
      
      // Navigate back to home page
      navigate('/')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
  }

  // Update the handleFollow/handleUnfollow to update the count
  const handleFollow = async () => {
    if (!video?.userId?._id) return
    try {
      await followUser(video.userId._id)
      setIsFollowing(true)
      setFollowersCount(prev => prev + 1)
      toast({
        title: "Success",
        description: "Successfully followed user"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to follow user",
        variant: "destructive"
      })
    }
  }

  const handleUnfollow = async () => {
    if (!video?.userId?._id) return
    try {
      await unfollowUser(video.userId._id)
      setIsFollowing(false)
      setFollowersCount(prev => prev - 1)
      toast({
        title: "Success",
        description: "Successfully unfollowed user"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unfollow user",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    if (!video || hasViewed) return

    const handleVideoView = async () => {
      try {
        const updatedViews = await VideoService.addView(videoId)
        setViewCount(updatedViews)
        setHasViewed(true)
      } catch (error) {
        console.error('Failed to record view:', error)
      }
    }

    const checkViewDuration = (duration: number) => {
      if (!videoStartTimeRef.current) {
        videoStartTimeRef.current = Date.now()
        return
      }

      const viewDuration = (Date.now() - videoStartTimeRef.current) / 1000
      const requiredDuration = duration <= 10 ? duration * 0.5 : 5 // 50% for short videos, 5s for longer ones

      if (viewDuration >= requiredDuration) {
        handleVideoView()
      }
    }

    // Add event listeners to video element with proper function references
    const videoElement = document.querySelector('video')
    if (videoElement) {
      const duration = videoElement.duration
      const boundCheckViewDuration = () => checkViewDuration(duration)

      videoElement.addEventListener('timeupdate', boundCheckViewDuration)
      videoElement.addEventListener('ended', boundCheckViewDuration)

      return () => {
        videoElement.removeEventListener('timeupdate', boundCheckViewDuration)
        videoElement.removeEventListener('ended', boundCheckViewDuration)
      }
    }
  }, [video, hasViewed, videoId])

  // Add these handlers
  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please login to like videos",
        variant: "destructive"
      })
      return
    }

    try {
      const { likes, dislikes, status } = await VideoService.toggleLike(videoId, 'like')
      setLikeStatus(status)
      setLikesCount(likes)
      setDislikesCount(dislikes)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive"
      })
    }
  }

  const handleDislike = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please login to dislike videos",
        variant: "destructive"
      })
      return
    }

    try {
      const { likes, dislikes, status } = await VideoService.toggleLike(videoId, 'dislike')
      setLikeStatus(status)
      setLikesCount(likes)
      setDislikesCount(dislikes)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive"
      })
    }
  }

  const handleReport = async () => {
    if (!reportReason) {
      toast({
        title: "Error",
        description: "Please select a reason for reporting.",
        variant: "destructive"
      })
      return
    }

    try {
      await VideoService.reportVideo(videoId, reportReason, reportDetails)
      
      toast({
        title: "Success",
        description: "Video has been reported. Our moderators will review it.",
      })
      
      // Reset form and close dialog
      setShowReportDialog(false)
      setReportReason('')
      setReportDetails('')
    } catch (error) {
      console.error('Error reporting video:', error)
      toast({
        title: "Error",
        description: "Failed to report the video. Please try again later.",
        variant: "destructive"
      })
    }
  }

  if (isLoadingVideo) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error instanceof Error ? error.message : 'Failed to load video'} />
  }

  if (!video) {
    return <div>Video not found</div>
  }
  return (
    <div className="max-w-[1280px] mx-auto bg-white">
      {/* Video Player Container */}
      <div className="w-full">
        <div className="relative aspect-video">
          <VideoPlayer 
            src={video.hlsUrl}
            poster={video.thumbnailUrl}
            aspectRatio={video.aspectRatio || 16/9}
            autoPlay
          />
        </div>
      </div>

      {/* Content Container */}
      <div className="p-4 lg:p-6 bg-white">
        {/* Title Section */}
        {isEditing ? (
          <div className="space-y-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Video title"
              className="text-xl md:text-2xl font-bold"
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Video description"
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelEdit} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isLoading}>
                {isLoading ? <LoadingSpinner size={16} /> : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl md:text-2xl font-bold mb-2 text-gray-900">{video.title}</h1>
            
            {/* Channel and Actions Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={video.userId.profilePicture} />
                    <AvatarFallback>{video.userId.username[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      <Link 
                        to={`/profile/${video.userId.username}`} 
                        className="hover:underline"
                      >
                        {video.userId.username}
                      </Link>
                    </h3>
                    <p className="text-sm text-gray-600">
                      {followersCount.toLocaleString()} Followers
                    </p>
                  </div>
                </div>
                
                {!isOwner && user && (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    className="rounded-full hover:bg-gray-100"
                    onClick={isFollowing ? handleUnfollow : handleFollow}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-gray-100 rounded-full flex items-center">
                  <Button 
                    variant="outline" 
                    className={cn(
                      "rounded-l-full hover:bg-gray-200",
                      likeStatus === 'like' && "bg-blue-100 text-blue-600"
                    )}
                    onClick={handleLike}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    {likesCount.toLocaleString()}
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <Button 
                    variant="outline" 
                    className={cn(
                      "rounded-r-full hover:bg-gray-200",
                      likeStatus === 'dislike' && "bg-red-100 text-red-600"
                    )}
                    onClick={handleDislike}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  className="rounded-full hover:bg-gray-100"
                  onClick={() => setShowReportDialog(true)}
                >
                  <Flag className="mr-2 h-4 w-4" />
                  Report
                </Button>

                <Button 
                  variant="outline" 
                  className="rounded-full hover:bg-gray-100"
                  onClick={() => setShowComments(true)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Comments
                </Button>

                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="hover:bg-gray-100">
                        <MoreVertical className="h-5 w-5" />
                        Edit
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleEdit}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Video Info */}
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{viewCount.toLocaleString()} views</span>
                <span>•</span>
                <span>{formatTimeAgo(video.createdAt)}</span>
              </div>
              
              {/* Video Type and Tags - Enhanced Display */}
              <div className="mt-4 space-y-3">
                {/* Video Type */}
                <div className="flex items-start">
                  <div className="w-24 text-sm font-medium text-gray-700">Video Type:</div>
                  <div className="flex-1">
                    {video.videoType ? (
                      <span className="bg-primary/15 text-primary px-3 py-1 rounded-full text-sm font-medium inline-block">
                        {video.videoType}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-sm italic">Not specified</span>
                    )}
                  </div>
                </div>
                
                {/* Tags */}
                <div className="flex items-start">
                  <div className="w-24 text-sm font-medium text-gray-700">Tags:</div>
                  <div className="flex-1">
                    {video.tags && video.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {video.tags.map((tag, index) => (
                          <span 
                            key={index} 
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm italic">No tags</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Description */}
              {video.description && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">Description:</div>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {video.description}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Comment Section Dialog */}
        {showComments && (
          <CommentSection
            videoId={videoId}
            isOpen={showComments}
            onClose={() => setShowComments(false)}
          />
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Video</DialogTitle>
            <DialogDescription>
              Please select a reason for reporting this video. Our moderators will review your report.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="reason" className="text-sm font-medium">
                Reason:
              </label>
              <Select 
                value={reportReason} 
                onValueChange={setReportReason}
                placeholder="Select a reason"
              >
                {reportReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="details" className="text-sm font-medium">
                Additional details (optional):
              </label>
              <Textarea
                id="details"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide any additional details to help our moderators"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReport}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
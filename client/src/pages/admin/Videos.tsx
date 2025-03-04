import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  getAllVideos, 
  hideVideo, 
  approveVideo, 
  rejectVideo, 
  deleteVideo,
  Video 
} from '../../services/admin.service'
import { 
  Search, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Trash2,
  AlertTriangle,
  Filter
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const Videos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'hidden'>('all')
  const [rejectionReason, setRejectionReason] = useState('')
  const [videoToReject, setVideoToReject] = useState<string | null>(null)
  const [showRejectionModal, setShowRejectionModal] = useState(false)

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const data = await getAllVideos()
      setVideos(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching videos:', err)
      setError('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  const handleHideVideo = async (videoId: string) => {
    try {
      const updatedVideo = await hideVideo(videoId)
      setVideos(videos.map(video => 
        video._id === videoId ? updatedVideo : video
      ))
    } catch (err) {
      console.error('Error hiding video:', err)
      setError('Failed to hide video')
    }
  }

  const handleApproveVideo = async (videoId: string) => {
    try {
      const updatedVideo = await approveVideo(videoId)
      setVideos(videos.map(video => 
        video._id === videoId ? updatedVideo : video
      ))
    } catch (err) {
      console.error('Error approving video:', err)
      setError('Failed to approve video')
    }
  }

  const openRejectModal = (videoId: string) => {
    setVideoToReject(videoId)
    setRejectionReason('')
    setShowRejectionModal(true)
  }

  const handleRejectVideo = async () => {
    if (!videoToReject || !rejectionReason.trim()) return
    
    try {
      const updatedVideo = await rejectVideo(videoToReject, rejectionReason)
      setVideos(videos.map(video => 
        video._id === videoToReject ? updatedVideo : video
      ))
      setShowRejectionModal(false)
      setVideoToReject(null)
      setRejectionReason('')
    } catch (err) {
      console.error('Error rejecting video:', err)
      setError('Failed to reject video')
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to permanently delete this video? This action cannot be undone.')) {
      return
    }
    
    try {
      await deleteVideo(videoId)
      setVideos(videos.filter(video => video._id !== videoId))
    } catch (err) {
      console.error('Error deleting video:', err)
      setError('Failed to delete video')
    }
  }

  const filteredVideos = videos.filter(video => {
    // Apply search filter
    const searchMatch = 
      (typeof video.title === 'string' && video.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeof video.description === 'string' && video.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Apply status filter
    let statusMatch = true
    if (filter === 'pending') {
      statusMatch = video.moderationStatus === 'pending'
    } else if (filter === 'approved') {
      statusMatch = video.moderationStatus === 'approved'
    } else if (filter === 'rejected') {
      statusMatch = video.moderationStatus === 'rejected'
    } else if (filter === 'hidden') {
      statusMatch = video.isHidden
    }
    
    return searchMatch && statusMatch
  })

  const getModerationStatusBadge = (video: Video) => {
    if (video.moderationStatus === 'approved') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </span>
      )
    } else if (video.moderationStatus === 'rejected') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Pending
        </span>
      )
    }
  }

  const getVisibilityBadge = (video: Video) => {
    if (video.isHidden) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <EyeOff className="w-3 h-3 mr-1" />
          Hidden
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Eye className="w-3 h-3 mr-1" />
          Visible
        </span>
      )
    }
  }

  if (loading && videos.length === 0) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search videos..."
            className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">All Videos</option>
            <option value="pending">Pending Moderation</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Video
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVideos.map((video) => (
                <tr key={video._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-16 w-28">
                        {video.thumbnailUrl ? (
                          <img
                            className="h-16 w-28 object-cover rounded"
                            src={video.thumbnailUrl}
                            alt={typeof video.title === 'string' ? video.title : 'Video thumbnail'}
                          />
                        ) : (
                          <div className="h-16 w-28 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-500">No Thumbnail</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {video.title}
                        </div>
                        <div className="text-sm text-gray-500 line-clamp-2">
                          {video.description || 'No description'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          By: {typeof video.userId === 'object' ? video.userId.displayName : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-2">
                      {getModerationStatusBadge(video)}
                      {getVisibilityBadge(video)}
                      {video.moderationReason && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs">
                          <span className="font-medium">Reason:</span> {video.moderationReason}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {video.isHidden ? (
                        <button
                          onClick={() => handleApproveVideo(video._id)}
                          className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md transition-colors"
                          title="Approve and make visible"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleHideVideo(video._id)}
                          className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100 px-2 py-1 rounded-md transition-colors"
                          title="Hide video"
                        >
                          <EyeOff className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => openRejectModal(video._id)}
                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors"
                        title="Reject video"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteVideo(video._id)}
                        className="text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                        title="Delete video permanently"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVideos.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No videos found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Reject Video</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this video. This will be visible to the content creator.
            </p>
            <textarea
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={4}
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => setShowRejectionModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300"
                onClick={handleRejectVideo}
                disabled={!rejectionReason.trim()}
              >
                Reject Video
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Videos 
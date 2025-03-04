import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  getAllComments, 
  hideComment, 
  approveComment, 
  rejectComment, 
  deleteComment,
  Comment 
} from '../../services/admin.service'
import { 
  Search, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Trash2,
  AlertTriangle,
  Filter,
  MessageSquare
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const Comments: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'hidden'>('all')
  const [rejectionReason, setRejectionReason] = useState('')
  const [commentToReject, setCommentToReject] = useState<string | null>(null)
  const [showRejectionModal, setShowRejectionModal] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const data = await getAllComments()
      setComments(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching comments:', err)
      setError('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handleHideComment = async (commentId: string) => {
    try {
      const updatedComment = await hideComment(commentId)
      setComments(comments.map(comment => 
        comment._id === commentId ? updatedComment : comment
      ))
    } catch (err) {
      console.error('Error hiding comment:', err)
      setError('Failed to hide comment')
    }
  }

  const handleApproveComment = async (commentId: string) => {
    try {
      const updatedComment = await approveComment(commentId)
      setComments(comments.map(comment => 
        comment._id === commentId ? updatedComment : comment
      ))
    } catch (err) {
      console.error('Error approving comment:', err)
      setError('Failed to approve comment')
    }
  }

  const openRejectModal = (commentId: string) => {
    setCommentToReject(commentId)
    setRejectionReason('')
    setShowRejectionModal(true)
  }

  const handleRejectComment = async () => {
    if (!commentToReject || !rejectionReason.trim()) return
    
    try {
      const updatedComment = await rejectComment(commentToReject, rejectionReason)
      setComments(comments.map(comment => 
        comment._id === commentToReject ? updatedComment : comment
      ))
      setShowRejectionModal(false)
      setCommentToReject(null)
      setRejectionReason('')
    } catch (err) {
      console.error('Error rejecting comment:', err)
      setError('Failed to reject comment')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to permanently delete this comment? This action cannot be undone.')) {
      return
    }
    
    try {
      await deleteComment(commentId)
      setComments(comments.filter(comment => comment._id !== commentId))
    } catch (err) {
      console.error('Error deleting comment:', err)
      setError('Failed to delete comment')
    }
  }

  const filteredComments = comments.filter(comment => {
    // Apply search filter
    const searchMatch = 
      (comment.content?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (typeof comment.userId === 'object' && comment.userId && 
        ((comment.userId.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
         (comment.userId.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase())))
    
    // Apply status filter
    let statusMatch = true
    if (filter === 'pending') {
      statusMatch = comment.moderationStatus === 'pending'
    } else if (filter === 'approved') {
      statusMatch = comment.moderationStatus === 'approved'
    } else if (filter === 'rejected') {
      statusMatch = comment.moderationStatus === 'rejected'
    } else if (filter === 'hidden') {
      statusMatch = comment.isHidden
    }
    
    return searchMatch && statusMatch
  })

  const getModerationStatusBadge = (comment: Comment) => {
    if (comment.moderationStatus === 'approved') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </span>
      )
    } else if (comment.moderationStatus === 'rejected') {
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

  const getVisibilityBadge = (comment: Comment) => {
    if (comment.isHidden) {
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

  if (loading && comments.length === 0) {
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
            placeholder="Search comments..."
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
            <option value="all">All Comments</option>
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
                  Comment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Posted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredComments.map((comment) => (
                <tr key={comment._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10">
                        {typeof comment.userId === 'object' && comment.userId && comment.userId.profilePicture ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={comment.userId.profilePicture}
                            alt={comment.userId.displayName || 'User'}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <MessageSquare className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm text-gray-900 whitespace-pre-wrap">
                          {comment.content}
                        </div>
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <span className="font-medium">
                            {typeof comment.userId === 'object' && comment.userId
                              ? comment.userId.displayName || comment.userId.username || 'Unknown User'
                              : 'Unknown User'}
                          </span>
                          <span className="mx-1">•</span>
                          <span>
                            on video: {typeof comment.videoId === 'object' && comment.videoId
                              ? comment.videoId.title || 'Untitled Video' 
                              : 'Unknown Video'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-2">
                      {getModerationStatusBadge(comment)}
                      {getVisibilityBadge(comment)}
                      {comment.moderationReason && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs">
                          <span className="font-medium">Reason:</span> {comment.moderationReason}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'Unknown date'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {comment.isHidden ? (
                        <button
                          onClick={() => handleApproveComment(comment._id)}
                          className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md transition-colors"
                          title="Approve and make visible"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleHideComment(comment._id)}
                          className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100 px-2 py-1 rounded-md transition-colors"
                          title="Hide comment"
                        >
                          <EyeOff className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => openRejectModal(comment._id)}
                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors"
                        title="Reject comment"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className="text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                        title="Delete comment permanently"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredComments.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No comments found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Reject Comment</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this comment. This will be visible to the commenter.
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
                onClick={handleRejectComment}
                disabled={!rejectionReason.trim()}
              >
                Reject Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default Comments 
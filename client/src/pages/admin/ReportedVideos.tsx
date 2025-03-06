import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  getVideoReports, 
  reviewVideoReport, 
  hideVideo,
  permanentlyDeleteVideo,
  VideoReport 
} from '../../services/admin.service'
import { 
  Search, 
  EyeOff, 
  CheckCircle,
  Trash2,
  AlertTriangle,
  Filter,
  Flag,
  Shield
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '../../components/ui/use-toast'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { useAuthStore } from '../../stores/authStore'

const ReportedVideos: React.FC = () => {
  const [reports, setReports] = useState<VideoReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'dismissed'>('all')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showHideModal, setShowHideModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<VideoReport | null>(null)
  const [actionReason, setActionReason] = useState('')
  const { toast } = useToast()
  const { user } = useAuthStore()
  
  // Check if the authenticated user is an admin
  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const data = await getVideoReports()
      setReports(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError('Failed to load reported videos')
    } finally {
      setLoading(false)
    }
  }

  const handleHideVideo = async () => {
    if (!selectedReport) return
    
    try {
      // First mark report as reviewed
      await reviewVideoReport(selectedReport._id, 'hide', actionReason)
      
      // Then hide the video
      // Extract the videoId correctly based on the type and available properties
      let videoId: string | undefined;
      
      if (typeof selectedReport.videoId === 'string') {
        videoId = selectedReport.videoId;
      } else if (selectedReport.videoId && typeof selectedReport.videoId === 'object') {
        // Check for both _id and id properties
        videoId = selectedReport.videoId._id || selectedReport.videoId.id;
        
        // Log the object structure for debugging
        console.log('Video object structure:', selectedReport.videoId);
      }
      
      // Check if we have a valid videoId
      if (!videoId) {
        console.error('Invalid video ID:', selectedReport.videoId);
        toast({
          title: "Error",
          description: "Could not determine video ID for hiding",
          variant: "destructive"
        });
        return;
      }
      
      console.log('Hiding video with ID:', videoId);
      await hideVideo(videoId, actionReason);
      
      toast({
        title: "Success",
        description: "Video has been hidden and report marked as reviewed",
      })
      
      // Refresh reports
      fetchReports()
      
      // Close modal
      setShowHideModal(false)
      setSelectedReport(null)
      setActionReason('')
    } catch (err) {
      console.error('Error hiding video:', err)
      toast({
        title: "Error",
        description: "Failed to hide the video",
        variant: "destructive"
      })
    }
  }

  const handleDeleteVideo = async () => {
    if (!selectedReport) return
    
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only admins can permanently delete videos",
        variant: "destructive"
      })
      return
    }
    
    try {
      // First mark report as reviewed
      await reviewVideoReport(selectedReport._id, 'delete', actionReason)
      
      // Then delete the video permanently
      // Extract the videoId correctly based on the type and available properties
      let videoId: string | undefined;
      
      if (typeof selectedReport.videoId === 'string') {
        videoId = selectedReport.videoId;
      } else if (selectedReport.videoId && typeof selectedReport.videoId === 'object') {
        // Check for both _id and id properties
        videoId = selectedReport.videoId._id || selectedReport.videoId.id;
        
        // Log the object structure for debugging
        console.log('Video object structure:', selectedReport.videoId);
      }
      
      // Check if we have a valid videoId
      if (!videoId) {
        console.error('Invalid video ID:', selectedReport.videoId);
        toast({
          title: "Error",
          description: "Could not determine video ID for deletion",
          variant: "destructive"
        });
        return;
      }
      
      console.log('Deleting video with ID:', videoId);
      await permanentlyDeleteVideo(videoId);
      
      toast({
        title: "Success",
        description: "Video has been permanently deleted and report marked as reviewed",
      })
      
      // Refresh reports
      fetchReports()
      
      // Close modal
      setShowDeleteModal(false)
      setSelectedReport(null)
      setActionReason('')
    } catch (err) {
      console.error('Error deleting video:', err)
      toast({
        title: "Error",
        description: "Failed to delete the video",
        variant: "destructive"
      })
    }
  }

  const handleDismissReport = async (reportId: string) => {
    try {
      await reviewVideoReport(reportId, 'dismiss')
      
      toast({
        title: "Success",
        description: "Report has been dismissed",
      })
      
      // Refresh reports
      fetchReports()
    } catch (err) {
      console.error('Error dismissing report:', err)
      toast({
        title: "Error",
        description: "Failed to dismiss the report",
        variant: "destructive"
      })
    }
  }

  const openHideModal = (report: VideoReport) => {
    // Check if the video exists before attempting to hide it
    if (!report.videoId) {
      toast({
        title: "Cannot Hide",
        description: "This video has already been deleted",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedReport(report);
    setShowHideModal(true);
  }

  const openDeleteModal = (report: VideoReport) => {
    // Check if the video exists before attempting to delete it
    if (!report.videoId) {
      toast({
        title: "Cannot Delete",
        description: "This video has already been deleted",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedReport(report);
    setShowDeleteModal(true);
  }

  const getFilteredReports = () => {
    return reports
      .filter(report => {
        // Apply status filter
        if (filter !== 'all' && report.status !== filter) {
          return false
        }
        
        // Apply search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          
          // Handle video title safely
          let videoTitle = '';
          if (report.videoId && typeof report.videoId !== 'string') {
            videoTitle = report.videoId.title?.toLowerCase() || '';
          }
          
          // Handle reporter name safely
          let reporterName = '';
          if (report.reporterId && typeof report.reporterId !== 'string') {
            reporterName = report.reporterId.username?.toLowerCase() || '';
          }
          
          // Check reason even if video or reporter is undefined
          const reason = report.reason?.toLowerCase() || '';
          
          return videoTitle.includes(searchLower) || 
            reporterName.includes(searchLower) ||
            reason.includes(searchLower)
        }
        
        return true
      })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'reviewed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Reviewed</Badge>
      case 'dismissed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Dismissed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Reported Videos</h1>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchReports}
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search reports by video title, reporter, or reason..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select 
              value={filter} 
              onValueChange={(value: any) => setFilter(value)}
              placeholder="Filter"
              className="w-[180px]"
            >
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </Select>
          </div>

          {loading ? (
            <div className="text-center p-6">Loading reports...</div>
          ) : error ? (
            <div className="text-red-500 text-center p-6">
              <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
              {error}
            </div>
          ) : getFilteredReports().length === 0 ? (
            <div className="text-center p-6 text-gray-500">
              <Flag className="mx-auto h-8 w-8 mb-2" />
              No reported videos found
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {getFilteredReports().map((report) => {
                // First check if videoId exists at all
                const isVideoDeleted = !report.videoId;
                
                const videoTitle = isVideoDeleted
                  ? 'Deleted Video'
                  : typeof report.videoId === 'string'
                    ? 'Unknown Video' 
                    : report.videoId.title || 'Untitled Video';
                  
                const videoId = isVideoDeleted
                  ? null
                  : typeof report.videoId === 'string'
                    ? report.videoId
                    : report.videoId._id || report.videoId.id;
                  
                const reporter = typeof report.reporterId === 'string'
                  ? 'Unknown User'
                  : report.reporterId?.username || 'Unknown User';
                  
                const reportTime = formatDistanceToNow(new Date(report.createdAt), { addSuffix: true });
                
                return (
                  <Card key={report._id} className="overflow-hidden">
                    <CardHeader className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-semibold">
                            {videoId ? (
                              <Link to={`/video/${videoId}`} className="hover:underline">
                                {videoTitle}
                              </Link>
                            ) : (
                              <span className="text-gray-700">{videoTitle}</span>
                            )}
                          </CardTitle>
                          <div className="flex gap-2 mt-1 text-sm text-gray-500">
                            <span>Reported {reportTime}</span>
                            <span>by {reporter}</span>
                          </div>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 pt-0 px-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <div className="mb-2">
                            <span className="font-medium">Reason:</span> {report.reason}
                          </div>
                          {report.details && (
                            <div>
                              <span className="font-medium">Details:</span> {report.details}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-end gap-2">
                          {report.status === 'pending' && (
                            <>
                              {!isVideoDeleted ? (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => openHideModal(report)}
                                    className="flex items-center"
                                  >
                                    <EyeOff className="mr-1.5 h-4 w-4" />
                                    Hide Video
                                  </Button>
                                  {isAdmin && (
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => openDeleteModal(report)}
                                      className="flex items-center"
                                    >
                                      <Trash2 className="mr-1.5 h-4 w-4" />
                                      Delete Forever
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                  Video Already Deleted
                                </Badge>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDismissReport(report._id)}
                                className="flex items-center"
                              >
                                <CheckCircle className="mr-1.5 h-4 w-4" />
                                Dismiss
                              </Button>
                            </>
                          )}
                          {report.status !== 'pending' && (
                            <Badge 
                              variant="outline" 
                              className="bg-blue-100 text-blue-800 flex items-center"
                            >
                              <Shield className="mr-1.5 h-3 w-3" />
                              Action Taken
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hide Video Dialog */}
      <Dialog open={showHideModal} onOpenChange={setShowHideModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide Reported Video</DialogTitle>
            <DialogDescription>
              This will hide the video from public view. Moderators and admins will still be able to access it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="reason" className="text-sm font-medium">
                Reason for hiding (optional):
              </label>
              <Textarea
                id="reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Provide a reason for hiding this video"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHideModal(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleHideVideo}>
              Hide Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Video Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently Delete Video</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The video will be permanently removed from the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="deleteReason" className="text-sm font-medium">
                Reason for deletion (optional):
              </label>
              <Textarea
                id="deleteReason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Provide a reason for permanently deleting this video"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteVideo}>
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

export default ReportedVideos 
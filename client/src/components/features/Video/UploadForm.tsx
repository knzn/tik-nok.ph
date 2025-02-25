import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoService } from '../../../services/video.service'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { useToast } from '../../ui/use-toast'
import { useAuthStore } from '../../../stores/authStore'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const SUPPORTED_FORMATS = ['video/mp4', 'video/quicktime'] // MP4 and MOV
const MIN_DURATION = 3
const MAX_DURATION = 120 // Changed from 60 to 120 seconds

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { token } = useAuthStore()

  const validateVideo = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid format',
          description: 'Please upload MP4 or MOV files only'
        })
        resolve(false)
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Maximum file size is 500MB'
        })
        resolve(false)
        return
      }

      const video = document.createElement('video')
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        const duration = video.duration
        setDuration(duration)

        if (duration < MIN_DURATION || duration > MAX_DURATION) {
          toast({
            variant: 'destructive',
            title: 'Invalid duration',
            description: `Video must be between ${MIN_DURATION} and ${MAX_DURATION} seconds`
          })
          resolve(false)
          return
        }

        // Remove aspect ratio check to allow all video dimensions
        resolve(true)
      }

      video.onerror = () => {
        toast({
          variant: 'destructive',
          title: 'Invalid video',
          description: 'Could not load video. Please try another file.'
        })
        resolve(false)
      }

      video.src = URL.createObjectURL(file)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isValid = await validateVideo(file)
    if (isValid) {
      setFile(file)
    } else {
      e.target.value = ''
    }
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagArray = e.target.value.split(',').map(tag => tag.trim())
    setTags(tagArray)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !token) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('video', file)
      formData.append('title', title)
      formData.append('description', description)
      formData.append('duration', duration.toString())
      formData.append('category', category)
      formData.append('tags', JSON.stringify(tags))

      const response = await VideoService.uploadVideo(formData)
      
      // Show success toast
      toast({
        title: 'Video Uploaded Successfully',
        description: 'Your video is now processing. We\'ll notify you when it\'s ready.',
        duration: 5000,
      })

      // Store the video ID for tracking
      localStorage.setItem('processingVideos', JSON.stringify([
        ...JSON.parse(localStorage.getItem('processingVideos') || '[]'),
        {
          id: response.id,
          title: response.title,
          timestamp: new Date().toISOString()
        }
      ]))

      // Redirect to home page
      navigate('/')
    } catch (error: any) {
      console.error('Upload error:', error)
      if (error?.response?.status === 401) {
        navigate('/login')
      }
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error?.message || 'Failed to upload video. Please try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Video File
        </label>
        <Input
          type="file"
          accept="video/mp4,video/quicktime"
          onChange={handleFileChange}
          required
        />
        <p className="text-sm text-muted-foreground mt-1">
          MP4 or MOV, 3-120 seconds, max 500MB
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Title
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Enter video title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter video description"
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Category
        </label>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Enter video category"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Tags
        </label>
        <Input
          value={tags.join(', ')}
          onChange={handleTagsChange}
          placeholder="Enter tags separated by commas"
        />
      </div>

      <Button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Video'}
      </Button>
    </form>
  )
} 
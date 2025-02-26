import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoService } from '../../../services/video.service'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { useToast } from '../../ui/use-toast'
import { useAuthStore } from '../../../stores/authStore'
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group'
import { Label } from '../../ui/label'
import { InfoIcon } from 'lucide-react'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const SUPPORTED_FORMATS = ['video/mp4', 'video/quicktime'] // MP4 and MOV
const MIN_DURATION = 3
const MAX_DURATION = 120 // Changed from 60 to 120 seconds

// Video type options
const VIDEO_TYPES = ['Sparring', 'Fight']

// Suggested tags
const SUGGESTED_TAGS = ['Sweater', 'Grey', 'Boston', 'Kelso']

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [videoType, setVideoType] = useState<string>('Sparring')
  const [tags, setTags] = useState<string[]>([])
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
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

  const toggleTag = (tag: string) => {
    const newSelectedTags = new Set(selectedTags)
    if (newSelectedTags.has(tag)) {
      newSelectedTags.delete(tag)
    } else {
      newSelectedTags.add(tag)
    }
    setSelectedTags(newSelectedTags)
    setTags(Array.from(newSelectedTags))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !token) return

    // Validate required fields
    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title is required',
        description: 'Please enter a title for your video'
      })
      return
    }

    if (!description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Description is required',
        description: 'Please enter a description for your video'
      })
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('video', file)
      formData.append('title', title)
      formData.append('description', description)
      formData.append('duration', duration.toString())
      formData.append('videoType', videoType)
      formData.append('tags', JSON.stringify(tags))
      formData.append('visibility', visibility)

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
          Title <span className="text-red-500">*</span>
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
          Description <span className="text-red-500">*</span>
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Write what bloodline is the rooster you own in this video"
          rows={4}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Video Type <span className="text-red-500">*</span>
        </label>
        <div className="mb-1">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
            {VIDEO_TYPES.map((type) => (
              <div 
                key={type} 
                className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-100 transition-colors ${videoType === type ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white'}`}
                onClick={() => setVideoType(type)}
              >
                <div className="relative flex h-6 w-6 items-center justify-center">
                  <div className={`h-6 w-6 rounded-full border-2 ${videoType === type ? 'border-4 border-primary' : 'border-gray-300'}`}></div>
                  {videoType === type && (
                    <div className="absolute h-2 w-2 rounded-full bg-primary"></div>
                  )}
                </div>
                <Label className="text-base font-medium cursor-pointer">{type}</Label>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          This will be used for searches
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Tags (Optional)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {SUGGESTED_TAGS.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant={selectedTags.has(tag) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTag(tag)}
              className="rounded-full"
            >
              #{tag}
            </Button>
          ))}
        </div>
        <Input
          value={tags.join(', ')}
          onChange={handleTagsChange}
          placeholder="Enter custom tags separated by commas"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Visibility
        </label>
        <div className="space-y-3">
          {[
            { value: 'public', label: 'Public', description: 'Can be shown in home page and trending page' },
            { value: 'unlisted', label: 'Unlisted', description: 'Cannot be shown in Home, trending and Profile (for visitors), but link can be shared and viewed by public' },
            { value: 'private', label: 'Private', description: 'Only owner can view the video' }
          ].map((option) => (
            <div 
              key={option.value}
              className={`flex items-start space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-100 transition-colors ${visibility === option.value ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white'}`}
              onClick={() => setVisibility(option.value as 'public' | 'unlisted' | 'private')}
            >
              <div className="mt-1 relative flex h-6 w-6 items-center justify-center">
                <div className={`h-6 w-6 rounded-full border-2 ${visibility === option.value ? 'border-4 border-primary' : 'border-gray-300'}`}></div>
                {visibility === option.value && (
                  <div className="absolute h-2 w-2 rounded-full bg-primary"></div>
                )}
              </div>
              <div>
                <Label className="text-base font-medium cursor-pointer">{option.label}</Label>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Video'}
      </Button>
    </form>
  )
} 
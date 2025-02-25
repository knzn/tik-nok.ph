import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../ui/use-toast'
import { Camera, X } from 'lucide-react'
import { api } from '../../lib/api'

interface UpdateProfilePictureModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UpdateProfilePictureModal({ isOpen, onClose }: UpdateProfilePictureModalProps) {
  const { user, updateUser } = useAuthStore()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imageVersion, setImageVersion] = useState(0)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Create preview immediately
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
    setSelectedFile(file)
  }

  const clearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || isLoading) return

    const formData = new FormData()
    formData.append('profilePicture', selectedFile)

    try {
      setIsLoading(true)
      const response = await api.post('/users/profile/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (!response.data) {
        throw new Error('Failed to update profile picture')
      }

      // Update user with the new profile data from server
      await updateUser({
        ...user,
        ...response.data
      })

      toast({
        title: 'Success',
        description: 'Profile picture updated successfully',
      })
      
      clearSelection()
      onClose()

      // Force reload of the image
      setImageVersion(prev => prev + 1)
    } catch (error) {
      console.error('Failed to update profile picture:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile picture. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        clearSelection()
        onClose()
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-48 h-48 rounded-full border-4 border-background bg-gray-200 overflow-hidden relative">
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full"
                    onClick={clearSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors">
                  <Camera className="h-8 w-8 mb-2" />
                  <span className="text-sm">Click to upload</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                clearSelection()
                onClose()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? 'Uploading...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 
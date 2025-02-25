import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../ui/use-toast'
import { api } from '../../lib/api'
import { Loader2 } from 'lucide-react'

interface ProfileSetupModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileSetupModal({ isOpen, onClose }: ProfileSetupModalProps) {
  const { user, updateUser } = useAuthStore()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    gamefarmName: '',
    address: '',
    contactNumber: '',
    facebookProfile: ''
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        gamefarmName: user?.gamefarmName || '',
        address: user?.address || '',
        contactNumber: user?.contactNumber || '',
        facebookProfile: user?.facebookProfile || ''
      })
    }
  }, [isOpen, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    try {
      setIsLoading(true)
      const response = await api.patch('/users/profile', formData)

      if (!response.data) {
        throw new Error('Failed to update profile')
      }

      await updateUser({
        ...user,
        ...response.data
      })

      toast({
        title: 'Success',
        description: 'Profile setup completed successfully',
      })
      onClose()
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to setup profile. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gamefarmName">Gamefarm/Backyard Name *</Label>
            <Input
              id="gamefarmName"
              value={formData.gamefarmName}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                gamefarmName: e.target.value
              }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (Optional)</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                address: e.target.value
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number (Optional)</Label>
            <Input
              id="contactNumber"
              value={formData.contactNumber}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                contactNumber: e.target.value
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="facebookProfile">Facebook Profile (Optional)</Label>
            <Input
              id="facebookProfile"
              value={formData.facebookProfile}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                facebookProfile: e.target.value
              }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
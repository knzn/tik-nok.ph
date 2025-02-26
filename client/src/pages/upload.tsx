import { UploadForm } from '../components/features/Video/UploadForm'
import { useAuthStore } from '../stores/authStore'
import { Navigate } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { InfoIcon } from 'lucide-react'

export function UploadPage() {
  const { isAuthenticated } = useAuthStore()

  // Double-check authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto py-6 px-4 sm:py-8 sm:px-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Upload Video</h1>
      
      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <InfoIcon className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-700">New Features: Video Visibility & Required Fields</AlertTitle>
        <AlertDescription className="text-blue-600">
          <p className="mb-2">You can now control who can view your videos:</p>
          <ul className="list-disc pl-5 mb-2">
            <li><strong>Public:</strong> Visible to everyone, shown in home and trending pages</li>
            <li><strong>Unlisted:</strong> Only accessible via direct link, not shown in feeds</li>
            <li><strong>Private:</strong> Only visible to you</li>
          </ul>
          <p>Title, Description, and Video Type are now required fields.</p>
        </AlertDescription>
      </Alert>
      
      <UploadForm />
    </div>
  )
} 
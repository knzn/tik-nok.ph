import { UploadForm } from '../components/features/Video/UploadForm'
import { useAuthStore } from '../stores/authStore'
import { Navigate } from 'react-router-dom'

export function UploadPage() {
  const { isAuthenticated } = useAuthStore()

  // Double-check authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto py-6 px-4 sm:py-8 sm:px-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Upload Video</h1>
      <UploadForm />
    </div>
  )
} 
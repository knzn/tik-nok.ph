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
    <div className="w-full max-w-4xl mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>
      <UploadForm />
    </div>
  )
} 
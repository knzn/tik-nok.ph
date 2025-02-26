import { useAuthStore } from '../stores/authStore'
import { VideoList } from '../components/features/Video/VideoList'

export default function Home() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      {isAuthenticated && (
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 px-2">
          Welcome back, {user?.username}!
        </h1>
      )}
      <VideoList />
    </div>
  )
} 
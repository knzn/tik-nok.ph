import { useAuthStore } from '../stores/authStore'
import { VideoList } from '../components/features/Video/VideoList'

export default function Home() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <div className="w-full py-10 px-6">
      {isAuthenticated && (
        <h1 className="text-2xl font-bold mb-6">
          Welcome back, {user?.username}!
        </h1>
      )}
      <VideoList />
    </div>
  )
} 
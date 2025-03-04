import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const { user, token, isAuthenticated, isLoading, logout, setAuth, updateUser, checkAuth } = useAuthStore()
  
  // Calculate role-based permissions
  const isAdmin = user?.role === 'ADMIN'
  const isModerator = user?.role === 'MODERATOR' || user?.role === 'ADMIN'
  
  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    isAdmin,
    isModerator,
    logout,
    setAuth,
    updateUser,
    checkAuth
  }
} 
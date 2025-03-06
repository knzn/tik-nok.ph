import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: ('USER' | 'MODERATOR' | 'ADMIN')[]
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, isAuthenticated, isLoading } = useAuthStore()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Calculate role-based permissions
  const isAdmin = user?.role === 'ADMIN'
  const isModerator = user?.role === 'MODERATOR' || isAdmin

  // Check if user has the required role
  const hasRequiredRole = 
    (allowedRoles.includes('ADMIN') && isAdmin) ||
    (allowedRoles.includes('MODERATOR') && isModerator) ||
    (allowedRoles.includes('USER') && user.role === 'USER');

  if (!hasRequiredRole) {
    return <Navigate to="/" replace />
  }

  // Render children if authenticated and has the required role
  return <>{children}</>
} 
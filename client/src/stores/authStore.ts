import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'

interface User {
  id: string
  username: string
  email: string
  profilePicture?: string
  coverPhoto?: string
  gamefarmName?: string
  address?: string
  contactNumber?: string
  facebookProfile?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (token: string, user: User) => void
  updateUser: (userData: Partial<User>) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

// Initialize from localStorage to ensure consistency
const getInitialState = () => {
  try {
    const token = localStorage.getItem('token')
    const userJson = localStorage.getItem('user')
    const user = userJson ? JSON.parse(userJson) : null
    
    console.log('Auth store initialization:', {
      hasToken: !!token,
      hasUser: !!user,
      userId: user?.id
    })
    
    return {
      token,
      user,
      isAuthenticated: !!(token && user),
      isLoading: false
    }
  } catch (error) {
    console.error('Error initializing auth state from localStorage:', error)
    return {
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false
    }
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...getInitialState(),
      setAuth: (token, user) => {
        console.log('Setting auth:', { userId: user.id, hasToken: !!token })
        set({ user, token, isAuthenticated: true })
        // Also set in localStorage for API interceptor
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      updateUser: async (userData) => {
        try {
          set((state) => ({
            user: state.user ? { ...state.user, ...userData } : null,
            isAuthenticated: !!state.user
          }))
          
          // Update localStorage to keep in sync
          const updatedUser = useAuthStore.getState().user
          if (updatedUser) {
            localStorage.setItem('user', JSON.stringify(updatedUser))
          }
        } catch (error) {
          console.error('Failed to update user:', error)
          throw error
        }
      },
      logout: () => {
        console.log('Logging out')
        set({ user: null, token: null, isAuthenticated: false })
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      },
      checkAuth: async () => {
        try {
          set({ isLoading: true })
          const response = await api.get('/auth/me')
          
          const token = localStorage.getItem('token')
          console.log('Auth check successful:', {
            userId: response.data.id,
            hasToken: !!token
          })
          
          set({ 
            user: response.data,
            token: token, // Ensure token is in sync
            isAuthenticated: true,
            isLoading: false
          })
          
          // Update localStorage to ensure consistency
          localStorage.setItem('user', JSON.stringify(response.data))
        } catch (error) {
          console.error('Auth check failed:', error)
          set({ 
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          })
          
          // Clear localStorage on auth check failure
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
) 
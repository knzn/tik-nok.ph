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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      setAuth: (token, user) => {
        set({ user, token, isAuthenticated: true })
        // Also set in localStorage for API interceptor
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },
      updateUser: async (userData) => {
        try {
          set((state) => ({
            user: { ...state.user, ...userData },
            isAuthenticated: true
          }))
          // Force a state update
          set((state) => ({ ...state }))
        } catch (error) {
          console.error('Failed to update user:', error)
          throw error
        }
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      },
      checkAuth: async () => {
        try {
          set({ isLoading: true })
          const response = await api.get('/auth/me')
          set({ 
            user: response.data,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({ 
            user: null,
            isAuthenticated: false,
            isLoading: false
          })
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
) 
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
})

// Add auth token to requests with improved debugging
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  
  // Debug token information
  const debugInfo = {
    url: config.url,
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    tokenStart: token ? token.substring(0, 10) + '...' : 'no token'
  }
  
  // Only log for video-related requests to avoid console spam
  if (config.url?.includes('/videos/')) {
    console.log('API Request Debug:', debugInfo)
  }
  
  if (token) {
    // Ensure token is properly formatted with Bearer prefix
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`
    config.headers.Authorization = formattedToken
    
    // Log token format for debugging
    if (config.url?.includes('/videos/')) {
      console.log('Token format check:', {
        originalLength: token.length,
        formattedLength: formattedToken.length,
        hasBearer: token.startsWith('Bearer '),
        formattedStart: formattedToken.substring(0, 15) + '...'
      })
    }
  }
  return config
})

// Handle auth errors with improved debugging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Debug response errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('Auth Error Debug:', {
        status: error.response.status,
        url: error.config.url,
        message: error.response.data?.message || error.message,
        hasToken: !!localStorage.getItem('token'),
        headers: {
          authorization: error.config.headers?.Authorization ? 
            `${error.config.headers.Authorization.substring(0, 15)}...` : 
            'none'
        }
      })
      
      // Only clear auth on 401 (Unauthorized), not on 403 (Forbidden)
      if (error.response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Add this new method to your API service
export const getPublicProfile = async (username: string) => {
  const response = await api.get(`/users/profile/${username}`)
  return response.data
}

// Add these new methods
export const followUser = async (userId: string) => {
  const response = await api.post(`/users/follow/${userId}`)
  return response.data
}

export const unfollowUser = async (userId: string) => {
  const response = await api.delete(`/users/follow/${userId}`)
  return response.data
}

export const checkFollowStatus = async (userId: string) => {
  const response = await api.get(`/users/follow/check/${userId}`)
  return response.data.isFollowing
}
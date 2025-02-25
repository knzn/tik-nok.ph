import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
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
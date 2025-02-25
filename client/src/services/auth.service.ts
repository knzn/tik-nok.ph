import { api } from '../lib/api'
import type { RegisterInput } from '../types/auth.types'

export class AuthService {
  static async register(data: Omit<RegisterInput, 'confirmPassword'>) {
    const response = await api.post('/auth/register', data)
    return response.data
  }

  static async login(data: { email: string; password: string }) {
    const response = await api.post('/auth/login', data)
    return response.data
  }

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  }

  async me(): Promise<any> {
    const response = await api.get<{ data: any }>('/auth/me')
    return response.data.data
  }
} 
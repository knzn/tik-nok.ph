import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegisterSchema, type RegisterInput } from '../../types/auth.types'
import { AuthService } from '../../services/auth.service'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Alert } from '../ui/alert'
import { useToast } from '../ui/use-toast'

export function RegisterForm() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  })

  const onSubmit = async (data: RegisterInput) => {
    try {
      setLoading(true)
      const { confirmPassword, ...registerData } = data
      console.log('Sending register data:', registerData)
      const response = await AuthService.register(registerData)
      toast({
        title: "Success!",
        description: "Registration successful. Please log in.",
      })
      navigate('/login')
    } catch (error: any) {
      console.error('Register error:', error)
      // Extract the error message from the response if available
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed'
      const errorCode = error.response?.data?.code || ''
      
      let description = errorMessage
      if (errorCode === 'EMAIL_EXISTS') {
        description = 'This email is already registered'
      } else if (errorCode === 'USERNAME_EXISTS') {
        description = 'This username is already taken'
      }
      
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input
          {...register('username')}
          placeholder="Username"
          autoComplete="username"
        />
        {errors.username && (
          <p className="text-sm text-destructive mt-1">{errors.username.message}</p>
        )}
      </div>

      <div>
        <Input
          {...register('email')}
          type="email"
          placeholder="Email"
          autoComplete="email"
        />
        {errors.email && (
          <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Input
          {...register('password')}
          type="password"
          placeholder="Password"
          autoComplete="new-password"
        />
        {errors.password && (
          <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          Password must contain at least one uppercase letter, one lowercase letter, and one number
        </p>
      </div>

      <div>
        <Input
          {...register('confirmPassword')}
          type="password"
          placeholder="Confirm Password"
          autoComplete="new-password"
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating Account...' : 'Create Account'}
      </Button>

      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{' '}
        <Button variant="link" className="p-0" onClick={() => navigate('/login')}>
          Log in
        </Button>
      </p>
    </form>
  )
} 
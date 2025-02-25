import { LoginForm } from '@/components/auth/LoginForm'

export function LoginPage() {
  return (
    <div className="w-full max-w-lg mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
      <LoginForm />
    </div>
  )
} 
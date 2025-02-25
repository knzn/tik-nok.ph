import { RegisterForm } from '../components/auth/RegisterForm'

export function RegisterPage() {
  return (
    <div className="w-full max-w-lg mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Create an Account</h1>
      <RegisterForm />
    </div>
  )
} 
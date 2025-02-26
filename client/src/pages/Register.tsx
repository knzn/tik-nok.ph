import { RegisterForm } from '../components/auth/RegisterForm'

export function RegisterPage() {
  return (
    <div className="w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto py-6 px-4 sm:py-10 sm:px-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">Create an Account</h1>
      <RegisterForm />
    </div>
  )
} 
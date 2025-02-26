import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button } from '../../ui/button'

interface PrivateVideoMessageProps {
  message: string
  redirectIn?: number
  redirectTo?: string
}

export function PrivateVideoMessage({ 
  message = 'This video is private', 
  redirectIn = 5,
  redirectTo = '/'
}: PrivateVideoMessageProps) {
  const navigate = useNavigate()
  
  useEffect(() => {
    if (redirectIn > 0) {
      const timer = setTimeout(() => {
        navigate(redirectTo)
      }, redirectIn * 1000)
      
      return () => clearTimeout(timer)
    }
  }, [navigate, redirectIn, redirectTo])
  
  return (
    <div className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-red-500" />
        </div>
        
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        
        {redirectIn > 0 && (
          <p className="text-sm text-gray-500 mb-4">
            Redirecting to home page in {redirectIn} seconds...
          </p>
        )}
        
        <Button 
          onClick={() => navigate(redirectTo)}
          className="w-full"
        >
          Return to Home
        </Button>
      </div>
    </div>
  )
} 
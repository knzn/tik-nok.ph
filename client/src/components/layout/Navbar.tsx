import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/button'
import { 
  Upload, 
  LogOut, 
  User as UserIcon 
} from 'lucide-react'

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    // Optionally redirect to home page
    window.location.href = '/'
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-50">
      <div className="container flex h-full items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 text-transparent bg-clip-text">
            TikNok
          </span>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <Button asChild variant="ghost">
                <Link to="/upload" className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </Link>
              </Button>

              <Button asChild variant="ghost">
                <Link to={`/profile/${user?.username}`} className="flex items-center space-x-2">
                  <UserIcon className="w-4 h-4" />
                  <span>{user?.username}</span>
                </Link>
              </Button>

              <Button 
                type="button"
                variant="outline" 
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
} 
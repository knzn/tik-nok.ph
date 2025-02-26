import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/button'
import { 
  Upload, 
  LogOut, 
  User as UserIcon,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    // Optionally redirect to home page
    window.location.href = '/'
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b z-50">
      <div className="container h-full px-3 sm:px-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 text-transparent bg-clip-text">
            TikNok
          </span>
        </Link>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden flex items-center justify-center"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        {/* Desktop Navigation Items */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/upload" className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </Link>
              </Button>

              <Button asChild variant="ghost" size="sm">
                <Link to={`/profile/${user?.username}`} className="flex items-center space-x-2">
                  <UserIcon className="w-4 h-4" />
                  <span>{user?.username}</span>
                </Link>
              </Button>

              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-background border-b shadow-lg md:hidden z-50">
            <div className="flex flex-col p-4 space-y-3">
              {isAuthenticated ? (
                <>
                  <Button asChild variant="ghost" size="sm" className="justify-start">
                    <Link to="/upload" className="flex items-center space-x-2">
                      <Upload className="w-4 h-4" />
                      <span>Upload</span>
                    </Link>
                  </Button>

                  <Button asChild variant="ghost" size="sm" className="justify-start">
                    <Link to={`/profile/${user?.username}`} className="flex items-center space-x-2">
                      <UserIcon className="w-4 h-4" />
                      <span>{user?.username}</span>
                    </Link>
                  </Button>

                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center space-x-2 justify-start"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="justify-start">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild size="sm" className="justify-start">
                    <Link to="/register">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
} 
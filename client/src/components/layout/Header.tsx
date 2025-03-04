import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Upload, Home, User, Shield } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { DropdownMenuItem } from '../../components/ui/dropdown-menu'

export function Header() {
  const { user, logout, isAdmin, isModerator } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">VideoApp</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link to="/" className="flex items-center space-x-2">
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <Link to="/upload" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </Link>
            {(isAdmin || isModerator) && (
              <Link to="/admin" className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}
          </nav>
        </div>
        <div className="flex-1" />
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2"
                asChild
              >
                <Link to="/profile">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
              </Button>
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  logout();
                  // Force reload the page to clear any cached state
                  window.location.href = '/login';
                }}
                className="text-red-500 cursor-pointer"
              >
                Logout
              </DropdownMenuItem>
              {/* Temporary button to force token refresh */}
              <DropdownMenuItem 
                onClick={() => {
                  logout();
                  // Add a query parameter to indicate this was a forced refresh
                  window.location.href = '/login?refresh=true';
                }}
                className="text-blue-500 cursor-pointer"
              >
                Refresh Token
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <Link to="/login">Login</Link>
              </Button>
              <Button
                size="sm"
                asChild
              >
                <Link to="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
} 
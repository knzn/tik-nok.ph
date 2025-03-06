import React, { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  MessageSquare, 
  Settings,
  ChevronRight,
  Flag
} from 'lucide-react'

interface AdminLayoutProps {
  children: ReactNode
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation()
  const currentPath = location.pathname

  const navItems = [
    { 
      path: '/admin', 
      label: 'Dashboard', 
      icon: <LayoutDashboard className="h-5 w-5" /> 
    },
    { 
      path: '/admin/users', 
      label: 'Users', 
      icon: <Users className="h-5 w-5" /> 
    },
    { 
      path: '/admin/videos', 
      label: 'Videos', 
      icon: <Video className="h-5 w-5" /> 
    },
    {
      path: '/admin/reported-videos',
      label: 'Reported Videos',
      icon: <Flag className="h-5 w-5" />
    },
    { 
      path: '/admin/comments', 
      label: 'Comments', 
      icon: <MessageSquare className="h-5 w-5" /> 
    },
    { 
      path: '/admin/settings', 
      label: 'Settings', 
      icon: <Settings className="h-5 w-5" /> 
    }
  ]

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center p-2 rounded-md hover:bg-gray-100 ${
                    (currentPath === item.path || 
                     (item.path !== '/admin' && currentPath.startsWith(item.path))) 
                      ? 'bg-gray-100 text-blue-600 font-medium' 
                      : 'text-gray-700'
                  }`}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                  {(currentPath === item.path || 
                    (item.path !== '/admin' && currentPath.startsWith(item.path))) && (
                    <ChevronRight className="ml-auto h-4 w-4" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden">
        <header className="bg-white shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                {navItems.find(
                  item => currentPath === item.path || 
                  (item.path !== '/admin' && currentPath.startsWith(item.path))
                )?.label || 'Admin'}
              </h2>
              <Link 
                to="/" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Back to Site
              </Link>
            </div>
          </div>
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout 
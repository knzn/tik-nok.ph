import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const showSidebar = location.pathname === '/'
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-16 flex w-full">
        {showSidebar && <Sidebar />}
        <main className={`flex-1 min-h-[calc(100vh-4rem)] ${showSidebar ? 'ml-80' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
} 
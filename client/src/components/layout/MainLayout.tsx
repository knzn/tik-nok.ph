import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { Sidebar } from './Sidebar'
import { VideoProcessingTracker } from '../features/Video/VideoProcessingTracker'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '../ui/button'

interface MainLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
}

export function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(prev => !prev)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-16">
        <div className="flex w-full h-full relative">
          {/* Mobile sidebar toggle button */}
          {showSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="fixed bottom-4 left-4 z-50 md:hidden rounded-full shadow-md bg-background"
              onClick={toggleMobileSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Mobile sidebar */}
          {showSidebar && (
            <div 
              className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200 ${
                isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={toggleMobileSidebar}
            >
              <div 
                className={`fixed left-0 top-0 h-full w-64 bg-background border-r shadow-lg z-50 transition-transform duration-300 ${
                  isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                onClick={e => e.stopPropagation()}
              >
                <div className="pt-16">
                  <Sidebar className="w-full" />
                </div>
              </div>
            </div>
          )}

          {/* Desktop sidebar */}
          {showSidebar && (
            <Sidebar className="hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)]" />
          )}
          
          <main className={`flex-1 w-full ${showSidebar ? 'md:ml-64' : ''}`}>
            {children}
          </main>
        </div>
      </div>
      <Footer />
      <VideoProcessingTracker />
    </div>
  )
}
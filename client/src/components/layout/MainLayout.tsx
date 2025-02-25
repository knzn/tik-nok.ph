import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { Sidebar } from './Sidebar'
import { VideoProcessingTracker } from '../features/Video/VideoProcessingTracker'

interface MainLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
}

export function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-16">
        <div className="flex w-full h-full">
          {showSidebar && (
            <Sidebar className="hidden md:block" />
          )}
          <main className={`flex-1 flex items-center justify-center ${showSidebar ? 'md:ml-80' : ''}`}>
            {children}
          </main>
        </div>
      </div>
      <Footer />
      <VideoProcessingTracker />
    </div>
  )
}
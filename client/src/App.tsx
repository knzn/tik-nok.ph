import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from './components/ui/toaster'
import { MainLayout } from './components/layout/MainLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { queryClient } from './lib/react-query'

// Page imports
import Home from './pages/index'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { UploadPage } from './pages/upload'
import { ProfilePage } from './pages/profile'
import { VideoPage } from './pages/video/[id]'
import { NotFoundPage } from './pages/404'
import { ShortsPage } from './pages/shorts/[id]'
import Trending from './pages/Trending'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Routes */}
            <Route 
              path="/upload" 
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/video/:id" element={<VideoPage />} />
            <Route path="/shorts/:id" element={<ShortsPage />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster />
        </MainLayout>
      </Router>
    </QueryClientProvider>
  )
}

export default App

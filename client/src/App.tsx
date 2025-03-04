import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from './components/ui/toaster'
import { MainLayout } from './components/layout/MainLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { RoleProtectedRoute } from './components/auth/RoleProtectedRoute'
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

// Admin page imports
import AdminIndex from './pages/admin'
import AdminUsers from './pages/admin/Users'
import AdminVideos from './pages/admin/Videos'
import AdminComments from './pages/admin/Comments'

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
            
            {/* Admin Routes - Only accessible by admins */}
            <Route 
              path="/admin" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminIndex />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminUsers />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Admin and Moderator Routes */}
            <Route 
              path="/admin/videos" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'MODERATOR']}>
                  <AdminVideos />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/admin/comments" 
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'MODERATOR']}>
                  <AdminComments />
                </RoleProtectedRoute>
              } 
            />
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster />
        </MainLayout>
      </Router>
    </QueryClientProvider>
  )
}

export default App

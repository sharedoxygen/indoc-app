import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'

import { useAppDispatch, useAppSelector } from './hooks/redux'
import { checkAuth } from './store/slices/authSlice'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UploadPage from './pages/UploadPage'
import DocumentViewer from './pages/DocumentViewer'
import AuditTrailPage from './pages/AuditTrailPage'
import RoleManagementPage from './pages/RoleManagementPage'
import SettingsPage from './pages/SettingsPage'
import DashboardPage from './pages/DashboardPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ProcessingQueuePage from './pages/ProcessingQueuePage'

// Components
import PrivateRoute from './components/PrivateRoute'
import LoadingScreen from './components/LoadingScreen'

function App() {
  const dispatch = useAppDispatch()
  const { isLoading, isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    dispatch(checkAuth())
  }, [dispatch])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />
          } />
        </Route>

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/document/:id" element={<DocumentViewer />} />
            <Route path="/audit" element={<AuditTrailPage />} />
            <Route path="/users" element={<RoleManagementPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/processing-queue" element={<ProcessingQueuePage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Box>
  )
}

export default App
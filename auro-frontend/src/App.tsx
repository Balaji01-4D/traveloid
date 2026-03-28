import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RegisterAdminPage from './pages/RegisterAdminPage'
import DashboardPage from './pages/DashboardPage'
import MembersPage from './pages/MembersPage'
import InviteMemberPage from './pages/InviteMemberPage'
import PlacesPage from './pages/PlacesPage'
import AddPlacePage from './pages/AddPlacePage'
import AuthLayout from './layouts/AuthLayout'
import { Toaster } from '@/components/ui/sonner'
import RequireAuth from '@/components/RequireAuth'
import RequireRole from '@/components/RequireRole'

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/register/admin" element={<RegisterAdminPage />} />
          </Route>

          {/* Dashboard Routes wrapper */}
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />}>
              <Route path="places" element={<PlacesPage />} />
              <Route path="places/new" element={<AddPlacePage />} />

              <Route element={<RequireRole allowedRoles={['admin']} />}>
                <Route path="members">
                  <Route index element={<MembersPage />} />
                  <Route path="invite" element={<InviteMemberPage />} />
                </Route>

                <Route path="settings" element={<div className="p-4">Settings view</div>} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-center" richColors />
    </>
  )
}

export default App

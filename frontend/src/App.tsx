import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import UsersPage from './pages/UsersPage';
import IngredientsPage from './pages/IngredientsPage';

function LoginPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Login Page</h1>
      <p>Login functionality will be implemented in a future issue</p>
    </div>
  );
}

function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to the Pizza Admin Dashboard</p>
    </div>
  );
}

function EventsPage() {
  return (
    <div>
      <h1>Events Management</h1>
      <p>Events management will be implemented in Issue #10</p>
    </div>
  );
}

function App() {
  return (
    <Theme>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout>
                    <DashboardPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout>
                    <UsersPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ingredients"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout>
                    <IngredientsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout>
                    <EventsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </Theme>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import UsersPage from './pages/UsersPage';
import IngredientsPage from './pages/IngredientsPage';
import DashboardPage from './pages/DashboardPage';
import EventsPage from './pages/EventsPage';

function App() {
  return (
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
  );
}export default App;

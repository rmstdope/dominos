import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import UsersPage from './pages/UsersPage';
import IngredientsPage from './pages/IngredientsPage';
import DashboardPage from './pages/DashboardPage';
import EventsPage from './pages/EventsPage';
import EventIngredientsPage from './pages/EventIngredientsPage';
import EventsLandingPage from './pages/EventsLandingPage';
import PizzaOrderPage from './pages/PizzaOrderPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
            <Route path="/" element={<EventsLandingPage />} />
            <Route path="/events/:id/order" element={<PizzaOrderPage />} />
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
            <Route
              path="/admin/event-ingredients"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout>
                    <EventIngredientsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

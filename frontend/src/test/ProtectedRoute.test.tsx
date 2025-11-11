import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

// Mock components for testing
function ProtectedContent() {
  return <div>Protected Content</div>;
}

function LoginPage() {
  return <div>Login Page</div>;
}

describe('ProtectedRoute', () => {
  it('should redirect to login when user is not authenticated', async () => {
    // Mock fetch to return no user
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
      } as Response)
    );

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should redirect to login
    await screen.findByText('Login Page');
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should show protected content when user is authenticated', async () => {
    // Mock fetch to return authenticated user
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: 1, username: 'admin', email: 'admin@test.com', isAdmin: true },
          }),
      } as Response)
    );

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should show protected content
    await screen.findByText('Protected Content');
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('should redirect non-admin users when requireAdmin is true', async () => {
    // Mock fetch to return non-admin user
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: 1, username: 'user', email: 'user@test.com', isAdmin: false },
          }),
      } as Response)
    );

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Home Page</div>} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should redirect to home (or unauthorized page)
    await screen.findByText('Home Page');
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should show loading state while checking auth', () => {
    // Mock fetch to simulate slow response
    window.fetch = vi.fn(
      () =>
        new Promise(() => {
          /* never resolves */
        })
    );

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should show loading state (or nothing)
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});

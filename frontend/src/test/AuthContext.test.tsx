import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Test component to access auth context
function TestComponent() {
  const { user, isLoading, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="user">{user ? user.username : 'null'}</div>
      <div data-testid="is-admin">{user?.isAdmin ? 'true' : 'false'}</div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <button onClick={() => login('testuser', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear any stored auth state
    document.cookie = '';
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should provide initial null user state', async () => {
      // Mock fetch to prevent actual API call
      window.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
        } as Response)
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    it('should expose login function', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('should expose logout function', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });
  });

  describe('useAuth', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});

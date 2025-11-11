import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import LoginPage from '../pages/LoginPage';

describe('LoginPage', () => {
  beforeEach(() => {
    // Mock auth check to return no user initially
    window.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: false,
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;
  });

  it('should render login form with username and password fields', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for auth check to complete
    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in|login/i })).toBeInTheDocument();
  });

  it('should show validation error when submitting empty username', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /sign in|login/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error when submitting empty password', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    await user.type(usernameInput, 'testuser');

    const submitButton = screen.getByRole('button', { name: /sign in|login/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should display loading state during authentication', async () => {
    const user = userEvent.setup();

    window.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: false,
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/auth/login')) {
        // Simulate slow login
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  user: { id: 1, username: 'testuser', email: 'test@test.com', isAdmin: true },
                }),
            } as Response);
          }, 100);
        });
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in|login/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/signing in|loading/i)).toBeInTheDocument();
    });
  });

  it('should call login function with correct credentials', async () => {
    const user = userEvent.setup();
    let loginCalled = false;
    let loginCredentials = { username: '', password: '' };

    window.fetch = vi.fn((url, options) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: false,
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/auth/login')) {
        loginCalled = true;
        const body = JSON.parse(options?.body as string);
        loginCredentials = body;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: 1, username: 'testuser', email: 'test@test.com', isAdmin: true },
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in|login/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(loginCalled).toBe(true);
    });

    expect(loginCredentials.username).toBe('testuser');
    expect(loginCredentials.password).toBe('password123');
  });

  it('should redirect to /admin on successful login', async () => {
    const user = userEvent.setup();

    window.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: false,
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: 1, username: 'testuser', email: 'test@test.com', isAdmin: true },
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<div>Admin Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in|login/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Should redirect to admin dashboard
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  it('should show error message for invalid credentials (401)', async () => {
    const user = userEvent.setup();

    window.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: false,
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in|login/i });

    await user.type(usernameInput, 'wronguser');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
    });
  });

  it('should show error message for server errors (500)', async () => {
    const user = userEvent.setup();

    window.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: false,
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in|login/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error.*try again|server error|something went wrong/i)).toBeInTheDocument();
    });
  });

  it('should clear error message when user starts typing', async () => {
    const user = userEvent.setup();

    window.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: false,
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in|login/i });

    await user.type(usernameInput, 'wronguser');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    // Error should appear
    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
    });

    // Start typing in username field
    await user.type(usernameInput, 'a');

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/invalid username or password/i)).not.toBeInTheDocument();
    });
  });
});

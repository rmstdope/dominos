import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UserNavBar } from '../components/UserNavBar';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('UserNavBar', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
    window.fetch = vi.fn();
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      window.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                user: { id: 1, username: 'testuser', email: 'test@test.com', isAdmin: false },
              }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
        } as Response);
      }) as typeof window.fetch;
    });

    it('should render username when authenticated', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <ThemeProvider>
              <UserNavBar />
            </ThemeProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });
    });

    it('should render logout button when authenticated', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <ThemeProvider>
              <UserNavBar />
            </ThemeProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
      });
    });

    it('should call logout and redirect on logout click', async () => {
      const user = userEvent.setup();

      // Mock logout endpoint
      window.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                user: { id: 1, username: 'testuser', email: 'test@test.com', isAdmin: false },
              }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/auth/logout')) {
          return Promise.resolve({
            ok: true,
          } as Response);
        }
        return Promise.resolve({
          ok: false,
        } as Response);
      }) as typeof window.fetch;

      render(
        <MemoryRouter>
          <AuthProvider>
            <ThemeProvider>
              <UserNavBar />
            </ThemeProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
      });

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
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

    it('should render login link when not authenticated', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <ThemeProvider>
              <UserNavBar />
            </ThemeProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
      });
    });

    it('should not render logout when not authenticated', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <ThemeProvider>
              <UserNavBar />
            </ThemeProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('navigation links', () => {
    beforeEach(() => {
      window.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                user: { id: 1, username: 'testuser', email: 'test@test.com', isAdmin: false },
              }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
        } as Response);
      }) as typeof window.fetch;
    });

    it('should render navigation links', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <ThemeProvider>
              <UserNavBar />
            </ThemeProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /events/i })).toBeInTheDocument();
      });
    });

    it('should highlight current/active page', async () => {
      render(
        <MemoryRouter initialEntries={['/events']}>
          <AuthProvider>
            <ThemeProvider>
              <UserNavBar />
            </ThemeProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        const eventsLink = screen.getByRole('link', { name: /events/i });
        expect(eventsLink.className).toContain('font-semibold');
      });
    });
  });

  describe('theme toggle', () => {
    beforeEach(() => {
      window.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                user: { id: 1, username: 'testuser', email: 'test@test.com', isAdmin: false },
              }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
        } as Response);
      }) as typeof window.fetch;
    });

    it('should toggle theme when theme button clicked', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <AuthProvider>
            <ThemeProvider>
              <UserNavBar />
            </ThemeProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
      });

      const themeButton = screen.getByRole('button', { name: /toggle theme/i });
      await user.click(themeButton);

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('should display correct icon for current theme', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <ThemeProvider>
              <UserNavBar />
            </ThemeProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        const themeButton = screen.getByRole('button', { name: /toggle theme/i });
        expect(themeButton).toBeInTheDocument();
      });

      // Light mode should show Moon icon (for switching to dark)
      const themeButton = screen.getByRole('button', { name: /toggle theme/i });
      expect(themeButton.querySelector('svg')).toBeInTheDocument();
    });
  });
});

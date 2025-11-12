import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import UsersPage from '../pages/UsersPage';

const mockUsers = [
  { id: 1, username: 'admin', email: 'admin@test.com', isAdmin: true },
  { id: 2, username: 'user1', email: 'user1@test.com', isAdmin: false },
  { id: 3, username: 'user2', email: 'user2@test.com', isAdmin: false },
];

describe('UsersPage', () => {
  beforeEach(() => {
    // Mock auth check
    window.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: 1, username: 'admin', email: 'admin@test.com', isAdmin: true },
            }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: mockUsers }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;
  });

  it('should display loading state initially', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <UsersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display list of users', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <UsersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    // Check all users are displayed
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText('user1@test.com')).toBeInTheDocument();
    expect(screen.getByText('user2@test.com')).toBeInTheDocument();
  });

  it('should display admin badges for admin users', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <UsersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    // Should show admin badge for admin user
    const adminBadges = screen.getAllByText(/admin/i);
    // At least 2: username "admin" and admin badge
    expect(adminBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('should display error message when fetch fails', async () => {
    window.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: 1, username: 'admin', email: 'admin@test.com', isAdmin: true },
            }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: false,
          statusText: 'Internal Server Error',
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <UsersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
    });
  });

  it('should have toggle buttons for each user', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <UsersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    // Should have toggle buttons (one per user)
    const toggleButtons = screen.getAllByRole('switch');
    expect(toggleButtons).toHaveLength(3);
  });

  it('should toggle admin status when switch is clicked', async () => {
    const user = userEvent.setup();
    let updateCalled = false;

    window.fetch = vi.fn((url, options) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: 1, username: 'admin', email: 'admin@test.com', isAdmin: true },
            }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/users/2') && options?.method === 'PATCH') {
        updateCalled = true;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { ...mockUsers[1], isAdmin: true } }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: mockUsers }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <UsersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole('switch');
    // Click the second user's toggle (user1)
    await user.click(toggleButtons[1]);

    await waitFor(() => {
      expect(updateCalled).toBe(true);
    });
  });

  it('should show error when toggle fails', async () => {
    const user = userEvent.setup();

    window.fetch = vi.fn((url, options) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: 1, username: 'admin', email: 'admin@test.com', isAdmin: true },
            }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/users/2') && options?.method === 'PATCH') {
        return Promise.resolve({
          ok: false,
          statusText: 'Forbidden',
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: mockUsers }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <UsersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole('switch');
    await user.click(toggleButtons[1]);

    await waitFor(() => {
      expect(screen.getByText(/failed to update user/i)).toBeInTheDocument();
    });
  });
});

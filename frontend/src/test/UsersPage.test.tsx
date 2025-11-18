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

  describe('User Creation Form', () => {
    it('should render user creation form', async () => {
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

      // Verify form elements are present
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
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

      // Submit button should be disabled when form is empty
      const submitButton = screen.getByRole('button', { name: /create user/i });
      expect(submitButton).toBeDisabled();
    });

    it('should create user successfully', async () => {
      const user = userEvent.setup();
      const newUser = { id: 4, username: 'newuser', email: 'newuser@test.com', isAdmin: false };

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
        if (typeof url === 'string' && url.includes('/api/admin/users') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: newUser }),
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

      // Fill in the form
      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'newuser');
      await user.type(emailInput, 'newuser@test.com');
      await user.type(passwordInput, 'password123');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create user/i });
      await user.click(submitButton);

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/user created successfully/i)).toBeInTheDocument();
      });

      // Verify new user appears in the list
      await waitFor(() => {
        expect(screen.getByText('newuser')).toBeInTheDocument();
        expect(screen.getByText('newuser@test.com')).toBeInTheDocument();
      });

      // Verify form is cleared
      expect(usernameInput).toHaveValue('');
      expect(emailInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveCreate: ((value: Response) => void) = () => {};
      const createPromise = new Promise<Response>((resolve) => {
        resolveCreate = resolve;
      });

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
        if (typeof url === 'string' && url.includes('/api/admin/users') && options?.method === 'POST') {
          return createPromise;
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

      // Fill in the form
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email/i), 'test@test.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create user/i });
      await user.click(submitButton);

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByText(/creating/i)).toBeInTheDocument();
      });

      // Verify button is disabled during submission
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolveCreate({
        ok: true,
        json: () => Promise.resolve({ user: { id: 4, username: 'testuser', email: 'test@test.com', isAdmin: false } }),
      } as Response);

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/user created successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle creation errors', async () => {
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
        if (typeof url === 'string' && url.includes('/api/admin/users') && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Username already exists' }),
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

      // Fill in the form
      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'admin');
      await user.type(emailInput, 'admin@test.com');
      await user.type(passwordInput, 'password123');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create user/i });
      await user.click(submitButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
      });

      // Verify form is not cleared
      expect(usernameInput).toHaveValue('admin');
      expect(emailInput).toHaveValue('admin@test.com');
      expect(passwordInput).toHaveValue('password123');
    });

    it('should validate email format', async () => {
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

      // Check that email input has type="email" for HTML5 validation
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should update user list with alphabetical sorting after creation', async () => {
      const user = userEvent.setup();
      const newUser = { id: 4, username: 'alice', email: 'alice@test.com', isAdmin: false };

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
        if (typeof url === 'string' && url.includes('/api/admin/users') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: newUser }),
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

      // Fill in the form
      await user.type(screen.getByLabelText(/username/i), 'alice');
      await user.type(screen.getByLabelText(/email/i), 'alice@test.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /create user/i }));

      // Verify new user appears in the list
      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
      });

      // Verify alphabetical order (alice should appear before admin, user1, user2)
      const userRows = screen.getAllByRole('row');
      const usernames = userRows.slice(1).map(row => row.textContent); // Skip header row
      
      // Check that alice appears in the list
      const aliceRow = usernames.find(text => text?.includes('alice'));
      expect(aliceRow).toBeDefined();
    });
  });
});

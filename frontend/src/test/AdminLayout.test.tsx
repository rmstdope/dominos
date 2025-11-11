import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { AdminLayout } from '../components/AdminLayout';
import userEvent from '@testing-library/user-event';

// Mock the useAuth hook for testing
const mockUser = {
  id: 1,
  username: 'admin',
  email: 'admin@test.com',
  isAdmin: true,
};

describe('AdminLayout', () => {
  beforeEach(() => {
    // Mock fetch to return admin user
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      } as Response)
    ) as typeof window.fetch;
  });

  it('should render navigation menu', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminLayout>
            <div>Content</div>
          </AdminLayout>
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for auth to load
    await screen.findByText('Content');

    // Check for navigation items
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should display navigation links', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminLayout>
            <div>Content</div>
          </AdminLayout>
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('Content');

    // Check for main admin navigation links
    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ingredients/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /events/i })).toBeInTheDocument();
  });

  it('should display user information', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminLayout>
            <div>Content</div>
          </AdminLayout>
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('Content');

    // Should show logged in username
    expect(screen.getByText(mockUser.username)).toBeInTheDocument();
  });

  it('should have logout button', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminLayout>
            <div>Content</div>
          </AdminLayout>
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('Content');

    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('should call logout when logout button is clicked', async () => {
    const user = userEvent.setup();
    
    // Mock logout endpoint
    const logoutMock = vi.fn(() =>
      Promise.resolve({ ok: true } as Response)
    );
    
    window.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/logout')) {
        return logoutMock();
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminLayout>
            <div>Content</div>
          </AdminLayout>
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('Content');

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);

    expect(logoutMock).toHaveBeenCalled();
  });

  it('should render children content', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminLayout>
            <div>Test Content</div>
          </AdminLayout>
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('Test Content');
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should display breadcrumb navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AuthProvider>
          <AdminLayout>
            <div>Content</div>
          </AdminLayout>
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('Content');

    // Should show breadcrumb path - use getAllByText since text appears in nav too
    const adminTexts = screen.getAllByText('Admin');
    const usersTexts = screen.getAllByText('Users');
    
    // At least one should be from breadcrumb
    expect(adminTexts.length).toBeGreaterThan(0);
    expect(usersTexts.length).toBeGreaterThan(0);
    expect(screen.getByText('/')).toBeInTheDocument();
  });
});

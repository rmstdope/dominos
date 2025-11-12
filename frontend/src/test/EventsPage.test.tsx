import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import EventsPage from '../pages/EventsPage';
import { AuthProvider } from '../contexts/AuthContext';

const mockEvents = [
  { id: 1, name: 'Pizza Friday', date: '2025-11-15', location: 'Office' },
  { id: 2, name: 'Pizza Monday', date: '2025-11-18', location: 'Remote' },
  { id: 3, name: 'Holiday Pizza Party', date: '2025-12-20', location: 'Conference Room' },
];

describe('EventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', async () => {
    window.fetch = vi.fn(() => new Promise(() => {})) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <EventsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/events management/i)).toBeInTheDocument();
    // Should show loading indicator
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display events after loading', async () => {
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
      if (typeof url === 'string' && url.includes('/api/admin/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ events: mockEvents }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <EventsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pizza Friday')).toBeInTheDocument();
    });

    expect(screen.getByText('Pizza Monday')).toBeInTheDocument();
    expect(screen.getByText('Holiday Pizza Party')).toBeInTheDocument();
    expect(screen.getByText('Office')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('Conference Room')).toBeInTheDocument();
  });

  it('should show error if fetch fails', async () => {
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
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <EventsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load events/i)).toBeInTheDocument();
    });
  });

  it('should have form for adding new event', async () => {
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
      if (typeof url === 'string' && url.includes('/api/admin/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ events: mockEvents }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <EventsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pizza Friday')).toBeInTheDocument();
    });

    // Should have input for event name
    expect(screen.getByLabelText(/event name/i)).toBeInTheDocument();
    // Should have input for event date
    expect(screen.getByLabelText(/event date/i)).toBeInTheDocument();
    // Should have input for location
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    // Should have add button
    expect(screen.getByRole('button', { name: /add event/i })).toBeInTheDocument();
  });

  it('should add new event when form is submitted', async () => {
    const user = userEvent.setup();
    let addCalled = false;

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
      if (typeof url === 'string' && url.includes('/api/admin/events') && options?.method === 'POST') {
        addCalled = true;
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ 
            id: 4, 
            name: 'New Pizza Event', 
            date: '2025-12-01', 
            location: 'Test Location' 
          }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ events: mockEvents }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <EventsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pizza Friday')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/event name/i);
    const dateInput = screen.getByLabelText(/event date/i);
    const locationInput = screen.getByLabelText(/location/i);
    const addButton = screen.getByRole('button', { name: /add event/i });

    await user.type(nameInput, 'New Pizza Event');
    await user.type(dateInput, '2025-12-01');
    await user.type(locationInput, 'Test Location');
    await user.click(addButton);

    await waitFor(() => {
      expect(addCalled).toBe(true);
    });
  });

  it('should delete event when delete button is clicked', async () => {
    const user = userEvent.setup();
    let deleteCalled = false;

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
      if (typeof url === 'string' && url.includes('/api/admin/events/2') && options?.method === 'DELETE') {
        deleteCalled = true;
        return Promise.resolve({
          ok: true,
          status: 204,
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ events: mockEvents }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <AuthProvider>
          <EventsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pizza Monday')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    // Click the delete button for the second event (Pizza Monday, id: 2)
    await user.click(deleteButtons[1]);

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });

  it('should show error when delete fails', async () => {
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
      if (typeof url === 'string' && url.includes('/api/admin/events/2') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: false,
          status: 500,
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ events: mockEvents }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <AuthProvider>
          <EventsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pizza Monday')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[1]);

    await waitFor(() => {
      expect(screen.getByText(/failed to delete event/i)).toBeInTheDocument();
    });
  });
});

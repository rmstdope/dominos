import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import EventsLandingPage from '../pages/EventsLandingPage';
import { AuthProvider } from '../contexts/AuthContext';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('EventsLandingPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch events from API on mount', async () => {
    const mockFetch = vi.fn((url) => {
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
        ok: true,
        json: () => Promise.resolve({ 
          events: [
            {
              id: 1,
              name: 'Friday Pizza Party',
              date: '2025-11-15T00:00:00.000Z',
              location: 'Main Office',
            },
          ],
        }),
      } as Response);
    });
    window.fetch = mockFetch as typeof window.fetch;

    render(
      <AuthProvider>
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/events');
    });
  });

  it('should show loading state while fetching events', () => {
    window.fetch = vi.fn(() => new Promise(() => {})) as typeof window.fetch; // Never resolves

    render(
      <AuthProvider>
        <MemoryRouter>
        <EventsLandingPage />
      </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Loading events...')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /pizza events/i })).toBeInTheDocument();
  });

  it('should show error state when fetch fails', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response)
    );
    window.fetch = mockFetch;

    render(
      <AuthProvider>
        <MemoryRouter>
        <EventsLandingPage />
      </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load events/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no events exist', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ events: [] }),
      } as Response)
    );
    window.fetch = mockFetch;

    render(
      <AuthProvider>
        <MemoryRouter>
        <EventsLandingPage />
      </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/no events scheduled/i)).toBeInTheDocument();
    });
  });

  it('should display events when fetch succeeds', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          events: [
            {
              id: 1,
              name: 'Friday Pizza Party',
              date: '2025-11-15T00:00:00.000Z',
              location: 'Main Office, Conference Room A',
            },
            {
              id: 2,
              name: 'Sprint Planning Pizza',
              date: '2025-11-20T00:00:00.000Z',
              location: 'Remote (Zoom)',
            },
          ],
        }),
      } as Response)
    );
    window.fetch = mockFetch;

    render(
      <AuthProvider>
        <MemoryRouter>
        <EventsLandingPage />
      </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Friday Pizza Party')).toBeInTheDocument();
    });

    expect(screen.getByText('Friday Pizza Party')).toBeInTheDocument();
    expect(screen.getByText('Sprint Planning Pizza')).toBeInTheDocument();
    expect(screen.getByText('Main Office, Conference Room A')).toBeInTheDocument();
    expect(screen.getByText('Remote (Zoom)')).toBeInTheDocument();
  });

  it('should handle network errors gracefully', async () => {
    const mockFetch = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    );
    window.fetch = mockFetch;

    render(
      <AuthProvider>
        <MemoryRouter>
        <EventsLandingPage />
      </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  describe('Upcoming Events Section', () => {
    it('should display "Upcoming Events" section header', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [
              {
                id: 1,
                name: 'Future Event',
                date: '2025-12-01T00:00:00.000Z',
                location: 'Office A',
              },
            ],
          }),
        } as Response)
      );
      window.fetch = mockFetch;

      render(
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
      });
    });

    it('should display only upcoming events (date >= today)', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [
              {
                id: 1,
                name: 'Past Event',
                date: '2025-11-01T00:00:00.000Z',
                location: 'Office A',
              },
              {
                id: 2,
                name: 'Future Event',
                date: '2025-12-01T00:00:00.000Z',
                location: 'Office B',
              },
              {
                id: 3,
                name: 'Today Event',
                date: new Date().toISOString(),
                location: 'Office C',
              },
            ],
          }),
        } as Response)
      );
      window.fetch = mockFetch;

      render(
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Future Event')).toBeInTheDocument();
      });

      // Should show upcoming events
      expect(screen.getByText('Future Event')).toBeInTheDocument();
      expect(screen.getByText('Today Event')).toBeInTheDocument();

      // Should NOT show past events in upcoming section
      const upcomingSection = screen.getByText('Upcoming Events').closest('div');
      expect(upcomingSection).not.toHaveTextContent('Past Event');
    });

    it('should show message when no upcoming events exist', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [
              {
                id: 1,
                name: 'Past Event',
                date: '2025-11-01T00:00:00.000Z',
                location: 'Office A',
              },
            ],
          }),
        } as Response)
      );
      window.fetch = mockFetch;

      render(
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/no upcoming events/i)).toBeInTheDocument();
      });
    });

    it('should make upcoming events appear clickable', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [
              {
                id: 1,
                name: 'Future Event',
                date: '2025-12-01T00:00:00.000Z',
                location: 'Office A',
              },
            ],
          }),
        } as Response)
      );
      window.fetch = mockFetch;

      render(
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Future Event')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Future Event').closest('div[class*="cursor-pointer"]');
      expect(eventCard).toBeInTheDocument();
    });
  });

  describe('Past Events Section', () => {
    it('should display "Past Events" section header when past events exist', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [
              {
                id: 1,
                name: 'Past Event',
                date: '2025-11-01T00:00:00.000Z',
                location: 'Office A',
              },
            ],
          }),
        } as Response)
      );
      window.fetch = mockFetch;

      render(
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Past Events')).toBeInTheDocument();
      });
    });

    it('should display past events in reverse chronological order (most recent first)', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [
              {
                id: 1,
                name: 'Oldest Event',
                date: '2025-10-01T00:00:00.000Z',
                location: 'Office A',
              },
              {
                id: 2,
                name: 'Middle Event',
                date: '2025-10-15T00:00:00.000Z',
                location: 'Office B',
              },
              {
                id: 3,
                name: 'Most Recent Event',
                date: '2025-11-01T00:00:00.000Z',
                location: 'Office C',
              },
            ],
          }),
        } as Response)
      );
      window.fetch = mockFetch;

      render(
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Most Recent Event')).toBeInTheDocument();
      });

      // Get all event names in the order they appear
      const allEventNames = screen.getAllByText(/Event/).map(el => el.textContent);
      
      // Filter to get only the past event names (excluding "Past Events" header and "Upcoming Events" header)
      const pastEventNames = allEventNames.filter(name => 
        name !== 'Past Events' && 
        name !== 'Upcoming Events' &&
        (name === 'Oldest Event' || name === 'Middle Event' || name === 'Most Recent Event')
      );

      // Should be in reverse chronological order: Most Recent (Nov 1), Middle (Oct 15), Oldest (Oct 1)
      expect(pastEventNames[0]).toBe('Most Recent Event');
      expect(pastEventNames[1]).toBe('Middle Event');
      expect(pastEventNames[2]).toBe('Oldest Event');
    });

    it('should make past events non-clickable (read-only)', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [
              {
                id: 1,
                name: 'Past Event',
                date: '2025-11-01T00:00:00.000Z',
                location: 'Office A',
              },
            ],
          }),
        } as Response)
      );
      window.fetch = mockFetch;

      render(
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Past Event')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Past Event').closest('div[class*="cursor-pointer"]');
      expect(eventCard).toBeNull();
    });

    it('should display past events with muted/read-only styling', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [
              {
                id: 1,
                name: 'Past Event',
                date: '2025-11-01T00:00:00.000Z',
                location: 'Office A',
              },
            ],
          }),
        } as Response)
      );
      window.fetch = mockFetch;

      render(
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Past Event')).toBeInTheDocument();
      });

      const pastSection = screen.getByText('Past Events').parentElement;
      const eventCard = pastSection?.querySelector('[class*="opacity"]');
      expect(eventCard).toBeInTheDocument();
    });

    it('should not display past events section when no past events exist', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [
              {
                id: 1,
                name: 'Future Event',
                date: '2025-12-01T00:00:00.000Z',
                location: 'Office A',
              },
            ],
          }),
        } as Response)
      );
      window.fetch = mockFetch;

      render(
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Future Event')).toBeInTheDocument();
      });

      expect(screen.queryByText('Past Events')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to pizza order page when clicking on an upcoming event', async () => {
      const mockNavigate = vi.fn();
      vi.mocked(useNavigate).mockReturnValue(mockNavigate);

      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [
              {
                id: 123,
                name: 'Future Event',
                date: '2025-12-01T00:00:00.000Z',
                location: 'Office A',
              },
            ],
          }),
        } as Response)
      );
      window.fetch = mockFetch;

      const user = userEvent.setup();

      render(
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Future Event')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Future Event').closest('div[class*="cursor-pointer"]');
      expect(eventCard).toBeInTheDocument();

      await user.click(eventCard!);

      expect(mockNavigate).toHaveBeenCalledWith('/events/123/order');
    });

    it('should not navigate when clicking on a past event', async () => {
      const mockNavigate = vi.fn();
      vi.mocked(useNavigate).mockReturnValue(mockNavigate);

      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: [
              {
                id: 456,
                name: 'Past Event',
                date: '2025-11-01T00:00:00.000Z',
                location: 'Office A',
              },
            ],
          }),
        } as Response)
      );
      window.fetch = mockFetch;

      const user = userEvent.setup();

      render(
        <AuthProvider>
        <MemoryRouter>
          <EventsLandingPage />
        </MemoryRouter>
      </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Past Event')).toBeInTheDocument();
      });

      const eventCard = screen.getByText('Past Event').closest('div');
      await user.click(eventCard!);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});

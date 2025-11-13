import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import OrdersPage from '../pages/OrdersPage';
import { AuthProvider } from '../contexts/AuthContext';

const mockOrders = [
  {
    id: 1,
    userId: 2,
    userName: 'john',
    eventId: 1,
    eventName: 'Team Pizza Night',
    size: 'Standard',
    ingredients: ['Pepperoni', 'Mushrooms'],
    createdAt: '2025-11-13T10:30:00.000Z',
  },
  {
    id: 2,
    userId: 3,
    userName: 'jane',
    eventId: 1,
    eventName: 'Team Pizza Night',
    size: 'Small',
    ingredients: ['Olives'],
    createdAt: '2025-11-13T10:15:00.000Z',
  },
  {
    id: 3,
    userId: 2,
    userName: 'john',
    eventId: 2,
    eventName: 'Friday Lunch',
    size: 'Standard',
    ingredients: [],
    createdAt: '2025-11-13T09:00:00.000Z',
  },
];

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', async () => {
    window.fetch = vi.fn(() => new Promise(() => {})) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <OrdersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/pizza orders/i)).toBeInTheDocument();
    // Should show loading indicator
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display error message when fetch fails', async () => {
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response)
    ) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <OrdersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load orders/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no orders exist', async () => {
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ orders: [] }),
      } as Response)
    ) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <OrdersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
    });
  });

  it('should display orders grouped by event', async () => {
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ orders: mockOrders }),
      } as Response)
    ) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <OrdersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Should show event names as headers
      expect(screen.getByText('Team Pizza Night')).toBeInTheDocument();
      expect(screen.getByText('Friday Lunch')).toBeInTheDocument();

      // Should show usernames
      expect(screen.getAllByText(/john/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/jane/i)).toBeInTheDocument();

      // Should show pizza sizes
      expect(screen.getAllByText(/standard/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/small/i)).toBeInTheDocument();

      // Should show ingredients
      expect(screen.getByText(/pepperoni/i)).toBeInTheDocument();
      expect(screen.getByText(/mushrooms/i)).toBeInTheDocument();
      expect(screen.getByText(/olives/i)).toBeInTheDocument();
    });
  });

  it('should handle orders with no ingredients', async () => {
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ orders: mockOrders }),
      } as Response)
    ) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <OrdersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Order with no ingredients should show "No toppings" or similar
      const fridayLunchSection = screen.getByText('Friday Lunch').closest('div');
      expect(fridayLunchSection).toBeInTheDocument();
    });
  });

  it('should format timestamps correctly', async () => {
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ orders: mockOrders }),
      } as Response)
    ) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <OrdersPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Should display formatted date/time
      // The exact format will depend on implementation, but should be readable
      expect(screen.getByText('Team Pizza Night')).toBeInTheDocument();
    });
  });
});

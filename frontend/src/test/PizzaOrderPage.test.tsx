import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import PizzaOrderPage from '../pages/PizzaOrderPage';

describe('PizzaOrderPage', () => {
  it('should render the PizzaOrderPage when navigating to /events/:id/order', () => {
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 123,
          name: 'Friday Pizza Party',
          date: '2025-11-15T00:00:00.000Z',
          location: 'Main Office',
        }),
      } as Response)
    );

    render(
      <MemoryRouter initialEntries={["/events/123/order"]}>
        <Routes>
          <Route path="/events/:id/order" element={<PizzaOrderPage />} />
        </Routes>
      </MemoryRouter>
    );
    
    // The page should show a heading unique to PizzaOrderPage
    expect(screen.getByRole('heading', { name: /order your pizza/i })).toBeInTheDocument();
  });

  it('should fetch and display event details', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 123,
          name: 'Friday Pizza Party',
          date: '2025-11-15T00:00:00.000Z',
          location: 'Main Office, Conference Room A',
        }),
      } as Response)
    );
    window.fetch = mockFetch;

    render(
      <MemoryRouter initialEntries={["/events/123/order"]}>
        <Routes>
          <Route path="/events/:id/order" element={<PizzaOrderPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/events/123');
    });

    expect(await screen.findByText('Friday Pizza Party')).toBeInTheDocument();
    expect(screen.getByText('Main Office, Conference Room A')).toBeInTheDocument();
    expect(screen.getByText(/Saturday, November 15, 2025/i)).toBeInTheDocument();
  });

  it('should show loading state while fetching event', () => {
    window.fetch = vi.fn(() => new Promise(() => {})) as typeof window.fetch; // Never resolves

    render(
      <MemoryRouter initialEntries={["/events/123/order"]}>
        <Routes>
          <Route path="/events/:id/order" element={<PizzaOrderPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show error state when event fetch fails', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
      } as Response)
    );
    window.fetch = mockFetch;

    render(
      <MemoryRouter initialEntries={["/events/123/order"]}>
        <Routes>
          <Route path="/events/:id/order" element={<PizzaOrderPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/event not found/i)).toBeInTheDocument();
    });
  });
});

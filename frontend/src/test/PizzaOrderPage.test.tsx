import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import PizzaOrderPage from '../pages/PizzaOrderPage';

describe('PizzaOrderPage', () => {
  it('should render the PizzaOrderPage when navigating to /events/:id/order', async () => {
    window.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 123,
          name: 'Friday Pizza Party',
          date: '2025-11-15T00:00:00.000Z',
          location: 'Main Office',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ingredients: [],
        }),
      } as Response);

    render(
      <MemoryRouter initialEntries={["/events/123/order"]}>
        <Routes>
          <Route path="/events/:id/order" element={<PizzaOrderPage />} />
        </Routes>
      </MemoryRouter>
    );
    
    // The page should show a heading unique to PizzaOrderPage
    expect(await screen.findByRole('heading', { name: /order your pizza/i })).toBeInTheDocument();
  });

  it('should fetch and display event details', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 123,
          name: 'Friday Pizza Party',
          date: '2025-11-15T00:00:00.000Z',
          location: 'Main Office, Conference Room A',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ingredients: [],
        }),
      } as Response);
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
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ingredients: [],
        }),
      } as Response);
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

  describe('Ingredient Selection', () => {
    it('should fetch and display available ingredients', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 123,
            name: 'Friday Pizza Party',
            date: '2025-11-15T00:00:00.000Z',
            location: 'Main Office',
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ingredients: [
              { id: 1, name: 'Pepperoni' },
              { id: 2, name: 'Mushrooms' },
              { id: 3, name: 'Olives' },
            ],
          }),
        } as Response);
      window.fetch = mockFetch;

      render(
        <MemoryRouter initialEntries={["/events/123/order"]}>
          <Routes>
            <Route path="/events/:id/order" element={<PizzaOrderPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/events/123/ingredients');
      });

      expect(await screen.findByText('Pepperoni')).toBeInTheDocument();
      expect(screen.getByText('Mushrooms')).toBeInTheDocument();
      expect(screen.getByText('Olives')).toBeInTheDocument();
    });

    it('should allow selecting and deselecting ingredients', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 123,
            name: 'Friday Pizza Party',
            date: '2025-11-15T00:00:00.000Z',
            location: 'Main Office',
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ingredients: [
              { id: 1, name: 'Pepperoni' },
              { id: 2, name: 'Mushrooms' },
            ],
          }),
        } as Response);
      window.fetch = mockFetch;

      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={["/events/123/order"]}>
          <Routes>
            <Route path="/events/:id/order" element={<PizzaOrderPage />} />
          </Routes>
        </MemoryRouter>
      );

      const pepperoniCheckbox = await screen.findByRole('switch', { name: /pepperoni/i });
      
      // Initially unchecked
      expect(pepperoniCheckbox).not.toBeChecked();

      // Click to select
      await user.click(pepperoniCheckbox);
      expect(pepperoniCheckbox).toBeChecked();

      // Click to deselect
      await user.click(pepperoniCheckbox);
      expect(pepperoniCheckbox).not.toBeChecked();
    });

    it('should show message when no ingredients are available', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 123,
            name: 'Friday Pizza Party',
            date: '2025-11-15T00:00:00.000Z',
            location: 'Main Office',
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ingredients: [],
          }),
        } as Response);
      window.fetch = mockFetch;

      render(
        <MemoryRouter initialEntries={["/events/123/order"]}>
          <Routes>
            <Route path="/events/:id/order" element={<PizzaOrderPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/no ingredients available/i)).toBeInTheDocument();
      });
    });
  });
});

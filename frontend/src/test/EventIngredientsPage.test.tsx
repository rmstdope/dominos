import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import EventIngredientsPage from '../pages/EventIngredientsPage';

const mockEvents = [
  { id: 1, name: 'Pizza Friday', date: '2025-11-15', location: 'Office' },
  { id: 2, name: 'Pizza Monday', date: '2025-11-18', location: 'Conference Room' },
  { id: 3, name: 'Holiday Party', date: '2025-12-20', location: 'Main Hall' },
];

const mockIngredients = [
  { id: 1, name: 'Mozzarella' },
  { id: 2, name: 'Pepperoni' },
  { id: 3, name: 'Mushrooms' },
  { id: 4, name: 'Olives' },
  { id: 5, name: 'Bell Peppers' },
];

function renderWithProviders(component: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('EventIngredientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cycle 1: Page Structure & Event Selection', () => {
    it('should display loading state initially', () => {
      window.fetch = vi.fn(() => new Promise(() => {})) as typeof window.fetch;

      renderWithProviders(<EventIngredientsPage />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should fetch and display events in selector', async () => {
      window.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: mockEvents }),
      } as Response);

      renderWithProviders(<EventIngredientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Friday')).toBeInTheDocument();
      });

      expect(screen.getByText('Pizza Monday')).toBeInTheDocument();
      expect(screen.getByText('Holiday Party')).toBeInTheDocument();
    });

    it('should show error if fetching events fails', async () => {
      window.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to load events' }),
      } as Response);

      renderWithProviders(<EventIngredientsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load events/i)).toBeInTheDocument();
      });
    });

    it('should select first event by default', async () => {
      window.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ events: mockEvents }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ingredients: mockIngredients }),
        } as Response);

      renderWithProviders(<EventIngredientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Friday')).toBeInTheDocument();
      });

      // Verify fetch was called for first event's ingredients
      await waitFor(() => {
        const calls = (window.fetch as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls.some((call) => 
          call[0].includes('/api/admin/events/1/ingredients')
        )).toBe(true);
      });
    });
  });

  describe('Cycle 2: Display Event Ingredients', () => {
    it('should display ingredients for selected event', async () => {
      const eventIngredients = [
        { id: 1, name: 'Mozzarella' },
        { id: 2, name: 'Pepperoni' },
      ];

      window.fetch = vi.fn((url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes('/api/admin/events') && !urlString.includes('/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ events: mockEvents }),
          } as Response);
        }
        if (urlString.includes('/api/admin/events/') && urlString.includes('/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => eventIngredients,
          } as Response);
        }
        if (urlString.includes('/api/admin/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithProviders(<EventIngredientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Mozzarella')).toBeInTheDocument();
      });

      expect(screen.getByText('Pepperoni')).toBeInTheDocument();
    });

    it('should show empty state when event has no ingredients', async () => {
      window.fetch = vi.fn((url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes('/api/admin/events') && !urlString.includes('/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ events: mockEvents }),
          } as Response);
        }
        if (urlString.includes('/api/admin/events/') && urlString.includes('/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => [],
          } as Response);
        }
        if (urlString.includes('/api/admin/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithProviders(<EventIngredientsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no ingredients added to this event yet/i)).toBeInTheDocument();
      });
    });

    it('should fetch ingredients when event selection changes', async () => {
      const event1Ingredients = [{ id: 1, name: 'Mozzarella' }];
      const event2Ingredients = [{ id: 3, name: 'Mushrooms' }];

      window.fetch = vi.fn((url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes('/api/admin/events') && !urlString.includes('/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ events: mockEvents }),
          } as Response);
        }
        if (urlString.includes('/api/admin/events/1/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => event1Ingredients,
          } as Response);
        }
        if (urlString.includes('/api/admin/events/2/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => event2Ingredients,
          } as Response);
        }
        if (urlString.includes('/api/admin/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const user = userEvent.setup();
      renderWithProviders(<EventIngredientsPage />);

      // Wait for first event to load
      await waitFor(() => {
        expect(screen.getByText('Mozzarella')).toBeInTheDocument();
      });

      // Click second event
      const pizzaMonday = screen.getByText('Pizza Monday');
      await user.click(pizzaMonday);

      // Should show second event's ingredients in the event section
      await waitFor(() => {
        const eventSection = screen.getByText('Event Ingredients').closest('div[class*="rounded-lg"]');
        expect(eventSection).toHaveTextContent('Mushrooms');
      });

      // Mozzarella should not be in event ingredients (but will be in available)
      const eventSection = screen.getByText('Event Ingredients').closest('div[class*="rounded-lg"]');
      expect(eventSection).not.toHaveTextContent('Mozzarella');
    });
  });

  describe('Cycle 3: Display Available Ingredients', () => {
    it('should display ingredients that are not in the event', async () => {
      const eventIngredients = [
        { id: 1, name: 'Mozzarella' },
        { id: 2, name: 'Pepperoni' },
      ];

      window.fetch = vi.fn((url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes('/api/admin/events') && !urlString.includes('/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ events: mockEvents }),
          } as Response);
        }
        if (urlString.includes('/api/admin/events/') && urlString.includes('/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => eventIngredients,
          } as Response);
        }
        if (urlString.includes('/api/admin/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithProviders(<EventIngredientsPage />);

      // Wait for data to load - wait for an ingredient that should be available
      await waitFor(() => {
        expect(screen.getByText('Mushrooms')).toBeInTheDocument();
      });

      // Should show ingredients NOT in the event
      expect(screen.getByText('Olives')).toBeInTheDocument();
      expect(screen.getByText('Bell Peppers')).toBeInTheDocument();

      // Should NOT show ingredients already in the event
      const eventIngredientsSection = screen.getByText('Event Ingredients').closest('div[class*="rounded-lg"]');
      expect(eventIngredientsSection).toBeInTheDocument();
      
      const availableSection = screen.getByText('Available Ingredients').closest('div[class*="rounded-lg"]');
      expect(availableSection).toBeInTheDocument();
      
      // Mozzarella and Pepperoni should only be in event ingredients, not in available
      expect(eventIngredientsSection).toHaveTextContent('Mozzarella');
      expect(availableSection).not.toHaveTextContent('Mozzarella');
    });

    it('should show all ingredients as available when event has no ingredients', async () => {
      window.fetch = vi.fn((url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes('/api/admin/events') && !urlString.includes('/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ events: mockEvents }),
          } as Response);
        }
        if (urlString.includes('/api/admin/events/') && urlString.includes('/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => [],
          } as Response);
        }
        if (urlString.includes('/api/admin/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithProviders(<EventIngredientsPage />);

      await waitFor(() => {
        expect(screen.getByText('Available Ingredients')).toBeInTheDocument();
      });

      // All ingredients should be available
      expect(screen.getByText('Mozzarella')).toBeInTheDocument();
      expect(screen.getByText('Pepperoni')).toBeInTheDocument();
      expect(screen.getByText('Mushrooms')).toBeInTheDocument();
      expect(screen.getByText('Olives')).toBeInTheDocument();
      expect(screen.getByText('Bell Peppers')).toBeInTheDocument();
    });

    it('should update available ingredients when event selection changes', async () => {
      const event1Ingredients = [{ id: 1, name: 'Mozzarella' }];
      const event2Ingredients = [{ id: 3, name: 'Mushrooms' }];

      window.fetch = vi.fn((url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes('/api/admin/events') && !urlString.includes('/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ events: mockEvents }),
          } as Response);
        }
        if (urlString.includes('/api/admin/events/1/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => event1Ingredients,
          } as Response);
        }
        if (urlString.includes('/api/admin/events/2/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => event2Ingredients,
          } as Response);
        }
        if (urlString.includes('/api/admin/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const user = userEvent.setup();
      renderWithProviders(<EventIngredientsPage />);

      // Wait for first event's available ingredients
      await waitFor(() => {
        const availableSection = screen.getByText('Available Ingredients').closest('div[class*="rounded-lg"]');
        expect(availableSection).toHaveTextContent('Pepperoni');
      });

      // First event: Mozzarella is in event, others are available
      const availableSection = screen.getByText('Available Ingredients').closest('div[class*="rounded-lg"]');
      expect(availableSection).not.toHaveTextContent('Mozzarella');

      // Click second event
      const pizzaMonday = screen.getByText('Pizza Monday');
      await user.click(pizzaMonday);

      // Second event: Mushrooms is in event, Mozzarella should now be available
      await waitFor(() => {
        const updatedAvailableSection = screen.getByText('Available Ingredients').closest('div[class*="rounded-lg"]');
        expect(updatedAvailableSection).toHaveTextContent('Mozzarella');
        expect(updatedAvailableSection).not.toHaveTextContent('Mushrooms');
      });
    });
  });
});

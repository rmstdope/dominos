import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import IngredientsPage from '../pages/IngredientsPage';

const mockIngredients = [
  { id: 1, name: 'Pepperoni' },
  { id: 2, name: 'Mushrooms' },
  { id: 3, name: 'Olives' },
];

describe('IngredientsPage', () => {
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
      if (typeof url === 'string' && url.includes('/api/admin/ingredients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ingredients: mockIngredients }),
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
          <IngredientsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display list of ingredients', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <IngredientsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for ingredients to load
    await waitFor(() => {
      expect(screen.getByText('Pepperoni')).toBeInTheDocument();
    });

    // Check all ingredients are displayed
    expect(screen.getByText('Pepperoni')).toBeInTheDocument();
    expect(screen.getByText('Mushrooms')).toBeInTheDocument();
    expect(screen.getByText('Olives')).toBeInTheDocument();
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
      if (typeof url === 'string' && url.includes('/api/admin/ingredients')) {
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
          <IngredientsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load ingredients/i)).toBeInTheDocument();
    });
  });

  it('should have add ingredient form with name input', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <IngredientsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pepperoni')).toBeInTheDocument();
    });

    // Should have input for ingredient name
    expect(screen.getByLabelText(/ingredient name/i)).toBeInTheDocument();
    // Should have add button
    expect(screen.getByRole('button', { name: /add ingredient/i })).toBeInTheDocument();
  });

  it('should add new ingredient when form is submitted', async () => {
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
      if (typeof url === 'string' && url.includes('/api/admin/ingredients') && options?.method === 'POST') {
        addCalled = true;
        const body = JSON.parse(options.body as string);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ingredient: { id: 4, name: body.name } }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/ingredients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ingredients: mockIngredients }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <IngredientsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pepperoni')).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/ingredient name/i);
    const addButton = screen.getByRole('button', { name: /add ingredient/i });

    await user.type(input, 'Pineapple');
    await user.click(addButton);

    await waitFor(() => {
      expect(addCalled).toBe(true);
    });
  });

  it('should show error when add ingredient fails', async () => {
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
      if (typeof url === 'string' && url.includes('/api/admin/ingredients') && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          statusText: 'Bad Request',
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/ingredients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ingredients: mockIngredients }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <IngredientsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pepperoni')).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/ingredient name/i);
    const addButton = screen.getByRole('button', { name: /add ingredient/i });

    await user.type(input, 'Bad Ingredient');
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to add ingredient/i)).toBeInTheDocument();
    });
  });

  it('should have delete buttons for each ingredient', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <IngredientsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pepperoni')).toBeInTheDocument();
    });

    // Should have delete buttons (one per ingredient)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(3);
  });

  it('should delete ingredient when delete button is clicked', async () => {
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
      if (typeof url === 'string' && url.includes('/api/admin/ingredients/1') && options?.method === 'DELETE') {
        deleteCalled = true;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/ingredients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ingredients: mockIngredients }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <IngredientsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pepperoni')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });

  it('should show error when delete ingredient fails', async () => {
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
      if (typeof url === 'string' && url.includes('/api/admin/ingredients/1') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: false,
          statusText: 'Forbidden',
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/ingredients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ingredients: mockIngredients }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <IngredientsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pepperoni')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/failed to delete ingredient/i)).toBeInTheDocument();
    });
  });

  it('should clear input field after successful add', async () => {
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
      if (typeof url === 'string' && url.includes('/api/admin/ingredients') && options?.method === 'POST') {
        const body = JSON.parse(options.body as string);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ingredient: { id: 4, name: body.name } }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/admin/ingredients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ingredients: mockIngredients }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
      } as Response);
    }) as typeof window.fetch;

    render(
      <MemoryRouter>
        <AuthProvider>
          <IngredientsPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pepperoni')).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/ingredient name/i) as HTMLInputElement;
    const addButton = screen.getByRole('button', { name: /add ingredient/i });

    await user.type(input, 'Pineapple');
    expect(input.value).toBe('Pineapple');

    await user.click(addButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });
});

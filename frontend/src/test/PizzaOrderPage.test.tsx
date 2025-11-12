import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import PizzaOrderPage from '../pages/PizzaOrderPage';
import { AuthProvider } from '../contexts/AuthContext';

describe('PizzaOrderPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });
  it('should render the PizzaOrderPage when navigating to /events/:id/order', async () => {
    window.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: 1, username: 'testuser', email: 'test@test.com', isAdmin: false },
            }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/events/123/ingredients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ingredients: [] }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/events/123')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 123,
              name: 'Friday Pizza Party',
              date: '2025-11-15T00:00:00.000Z',
              location: 'Main Office',
            }),
        } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    }) as typeof window.fetch;

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/events/123/order"]}>
          <Routes>
            <Route path="/events/:id/order" element={<PizzaOrderPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    
    // The page should show a heading unique to PizzaOrderPage
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /order your pizza/i })).toBeInTheDocument();
    });
  });

  it('should fetch and display event details', async () => {
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
      if (typeof url === 'string' && url.includes('/api/events/123/ingredients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ingredients: [] }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/events/123')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 123,
              name: 'Friday Pizza Party',
              date: '2025-11-15T00:00:00.000Z',
              location: 'Main Office, Conference Room A',
            }),
        } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    }) as typeof window.fetch;
    window.fetch = mockFetch;

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/events/123/order"]}>
          <Routes>
            <Route path="/events/:id/order" element={<PizzaOrderPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/events/123');
    });

    expect(await screen.findByText('Friday Pizza Party')).toBeInTheDocument();
    expect(screen.getByText('Main Office, Conference Room A')).toBeInTheDocument();
    expect(screen.getByText(/Saturday, November 15, 2025/i)).toBeInTheDocument();
  });

  it('should show loading state while fetching event', () => {
    window.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              user: { id: 1, username: 'testuser', email: 'test@test.com', isAdmin: false },
            }),
        } as Response);
      }
      // Make other requests never resolve
      return new Promise(() => {});
    }) as typeof window.fetch;

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/events/123/order"]}>
          <Routes>
            <Route path="/events/:id/order" element={<PizzaOrderPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show error state when event fetch fails', async () => {
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
      if (typeof url === 'string' && url.includes('/api/events/123/ingredients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ingredients: [] }),
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/events/123')) {
        return Promise.resolve({
          ok: false,
          status: 404,
        } as Response);
      }
      return Promise.resolve({ ok: false } as Response);
    }) as typeof window.fetch;
    window.fetch = mockFetch;

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/events/123/order"]}>
          <Routes>
            <Route path="/events/:id/order" element={<PizzaOrderPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/event not found/i)).toBeInTheDocument();
    });
  });

  describe('Ingredient Selection', () => {
    it('should fetch and display available ingredients', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                ingredients: [
                  { id: 1, name: 'Pepperoni' },
                  { id: 2, name: 'Mushrooms' },
                  { id: 3, name: 'Olives' },
                ],
              }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/123')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 123,
                name: 'Friday Pizza Party',
                date: '2025-11-15T00:00:00.000Z',
                location: 'Main Office',
              }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      }) as typeof window.fetch;
      window.fetch = mockFetch;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={["/events/123/order"]}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/events/123/ingredients');
      });

      expect(await screen.findByText('Pepperoni')).toBeInTheDocument();
      expect(screen.getByText('Mushrooms')).toBeInTheDocument();
      expect(screen.getByText('Olives')).toBeInTheDocument();
    });

    it('should allow selecting and deselecting ingredients', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                ingredients: [
                  { id: 1, name: 'Pepperoni' },
                  { id: 2, name: 'Mushrooms' },
                ],
              }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/123')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 123,
                name: 'Friday Pizza Party',
                date: '2025-11-15T00:00:00.000Z',
                location: 'Main Office',
              }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      }) as typeof window.fetch;
      window.fetch = mockFetch;

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={["/events/123/order"]}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
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
        if (typeof url === 'string' && url.includes('/api/events/123/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ingredients: [] }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/123')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 123,
                name: 'Friday Pizza Party',
                date: '2025-11-15T00:00:00.000Z',
                location: 'Main Office',
              }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      }) as typeof window.fetch;
      window.fetch = mockFetch;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={["/events/123/order"]}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/no ingredients available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pizza Size Selection', () => {
    it('should display available pizza sizes', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ingredients: [] }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/123')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 123,
                name: 'Friday Pizza Party',
                date: '2025-11-15T00:00:00.000Z',
                location: 'Main Office',
              }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      }) as typeof window.fetch;
      window.fetch = mockFetch;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={["/events/123/order"]}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Standard')).toBeInTheDocument();
        expect(screen.getByText('Small')).toBeInTheDocument();
      });
    });

    it('should have Standard size pre-selected by default', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ingredients: [] }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/123')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 123,
                name: 'Friday Pizza Party',
                date: '2025-11-15T00:00:00.000Z',
                location: 'Main Office',
              }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      }) as typeof window.fetch;
      window.fetch = mockFetch;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={["/events/123/order"]}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      const standardRadio = await screen.findByRole('radio', { name: /standard/i });
      expect(standardRadio).toBeChecked();
    });

    it('should allow selecting a different size', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ingredients: [] }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/123')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 123,
                name: 'Friday Pizza Party',
                date: '2025-11-15T00:00:00.000Z',
                location: 'Main Office',
              }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      }) as typeof window.fetch;
      window.fetch = mockFetch;

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={["/events/123/order"]}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      const smallRadio = await screen.findByRole('radio', { name: /small/i });
      const standardRadio = screen.getByRole('radio', { name: /standard/i });

      // Initially standard is selected
      expect(standardRadio).toBeChecked();
      expect(smallRadio).not.toBeChecked();

      // Click small
      await user.click(smallRadio);

      // Now small is selected and standard is not
      expect(smallRadio).toBeChecked();
      expect(standardRadio).not.toBeChecked();
    });
  });
});

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
        expect(screen.getAllByText('Standard').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Small').length).toBeGreaterThan(0);
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

  describe('Existing Order Check', () => {
    it('should fetch existing order on page load', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/orders/my-order')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                order: {
                  id: 1,
                  userId: 1,
                  eventId: 123,
                  size: 'Small',
                  ingredientIds: [1, 2],
                  createdAt: '2025-11-12T00:00:00.000Z',
                  updatedAt: '2025-11-12T00:00:00.000Z',
                },
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
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/events/123/orders/my-order',
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });

    it('should populate size and ingredients from existing order', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/orders/my-order')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                order: {
                  id: 1,
                  userId: 1,
                  eventId: 123,
                  size: 'Small',
                  ingredientIds: [1, 3],
                  createdAt: '2025-11-12T00:00:00.000Z',
                  updatedAt: '2025-11-12T00:00:00.000Z',
                },
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

      // Wait for page to load
      await screen.findByText('Friday Pizza Party');

      // Check that Small size is selected
      const smallRadio = screen.getByRole('radio', { name: /small/i });
      expect(smallRadio).toBeChecked();

      // Check that Pepperoni and Olives are selected
      const pepperoniSwitch = screen.getByRole('switch', { name: /pepperoni/i });
      const olivesSwitch = screen.getByRole('switch', { name: /olives/i });
      const mushroomsSwitch = screen.getByRole('switch', { name: /mushrooms/i });

      expect(pepperoniSwitch).toBeChecked();
      expect(olivesSwitch).toBeChecked();
      expect(mushroomsSwitch).not.toBeChecked();
    });

    it('should show "Order Submitted" message when order exists', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/orders/my-order')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                order: {
                  id: 1,
                  userId: 1,
                  eventId: 123,
                  size: 'Standard',
                  ingredientIds: [1],
                  createdAt: '2025-11-12T00:00:00.000Z',
                  updatedAt: '2025-11-12T00:00:00.000Z',
                },
              }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/123/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                ingredients: [{ id: 1, name: 'Pepperoni' }],
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
        expect(screen.getByText(/order submitted/i)).toBeInTheDocument();
      });
    });

    it('should not show error when no existing order is found', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/orders/my-order')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: 'No order found for this event' }),
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
        expect(screen.getByText('Friday Pizza Party')).toBeInTheDocument();
      });

      // Should not show an error for no existing order
      expect(screen.queryByText(/no order found/i)).not.toBeInTheDocument();
    });
  });

  describe('Order Summary', () => {
    it('should display selected size in summary', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/orders/my-order')) {
          return Promise.resolve({
            ok: false,
            status: 404,
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
        expect(screen.getByText('Friday Pizza Party')).toBeInTheDocument();
      });

      // Should show "Your Order" section
      expect(screen.getByText('Your Order')).toBeInTheDocument();
      
      // Should show Size label and Standard value
      expect(screen.getByText('Size:')).toBeInTheDocument();
      
      // Get all instances of "Standard" - one in the radio button area, one in the summary
      const standardElements = screen.getAllByText('Standard');
      expect(standardElements.length).toBeGreaterThan(1);
    });

    it('should display selected ingredients count in summary', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/orders/my-order')) {
          return Promise.resolve({
            ok: false,
            status: 404,
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

      await waitFor(() => {
        expect(screen.getByText('Pepperoni')).toBeInTheDocument();
      });

      // Initially 0 toppings
      expect(screen.getByText(/0 toppings/i)).toBeInTheDocument();

      // Select Pepperoni
      const pepperoniSwitch = screen.getByRole('switch', { name: /pepperoni/i });
      await user.click(pepperoniSwitch);

      // Should show 1 topping
      expect(screen.getByText(/1 topping/i)).toBeInTheDocument();

      // Select Mushrooms
      const mushroomsSwitch = screen.getByRole('switch', { name: /mushrooms/i });
      await user.click(mushroomsSwitch);

      // Should show 2 toppings
      expect(screen.getByText(/2 toppings/i)).toBeInTheDocument();
    });

    it('should list all selected ingredient names in summary', async () => {
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
        if (typeof url === 'string' && url.includes('/api/events/123/orders/my-order')) {
          return Promise.resolve({
            ok: false,
            status: 404,
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

      await waitFor(() => {
        expect(screen.getByText('Pepperoni')).toBeInTheDocument();
      });

      // Select Pepperoni and Olives
      const pepperoniSwitch = screen.getByRole('switch', { name: /pepperoni/i });
      const olivesSwitch = screen.getByRole('switch', { name: /olives/i });
      
      await user.click(pepperoniSwitch);
      await user.click(olivesSwitch);

      // Should show ingredient names in summary - look for the badge elements
      await waitFor(() => {
        const badges = screen.getAllByText('Pepperoni');
        // Should have Pepperoni in the summary (as well as in the selection area)
        expect(badges.length).toBeGreaterThan(0);
      });
      
      expect(screen.getAllByText('Olives').length).toBeGreaterThan(0);
      
      // Mushrooms should not be in the summary badges
      const mushroomElements = screen.queryAllByText('Mushrooms');
      // Should only be 1 (in the selection area, not in summary)
      expect(mushroomElements.length).toBe(1);
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when no ingredients are selected', async () => {
      const mockEvent = {
        id: 1,
        name: 'Friday Pizza Party',
        date: '2024-03-15',
        location: 'Office',
      };

      const mockIngredients = [
        { id: 1, name: 'Pepperoni' },
        { id: 2, name: 'Mushrooms' },
      ];

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
        if (typeof url === 'string' && url.includes('/api/events/1/orders/my-order')) {
          return Promise.resolve({
            ok: false,
            status: 404,
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/1/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockEvent,
        } as Response);
      }) as typeof window.fetch;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/events/1/order']}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Friday Pizza Party')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit order/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when at least one ingredient is selected', async () => {
      const mockEvent = {
        id: 1,
        name: 'Friday Pizza Party',
        date: '2024-03-15',
        location: 'Office',
      };

      const mockIngredients = [
        { id: 1, name: 'Pepperoni' },
        { id: 2, name: 'Mushrooms' },
      ];

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
        if (typeof url === 'string' && url.includes('/api/events/1/orders/my-order')) {
          return Promise.resolve({
            ok: false,
            status: 404,
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/1/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockEvent,
        } as Response);
      }) as typeof window.fetch;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/events/1/order']}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Friday Pizza Party')).toBeInTheDocument();
      });

      // Initially disabled
      const submitButton = screen.getByRole('button', { name: /submit order/i });
      expect(submitButton).toBeDisabled();

      // Select an ingredient
      const pepperoniSwitch = screen.getByLabelText('Pepperoni');
      await userEvent.click(pepperoniSwitch);

      // Should now be enabled
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });

    it('should disable submit button when all ingredients are deselected', async () => {
      const mockEvent = {
        id: 1,
        name: 'Friday Pizza Party',
        date: '2024-03-15',
        location: 'Office',
      };

      const mockIngredients = [
        { id: 1, name: 'Pepperoni' },
        { id: 2, name: 'Mushrooms' },
      ];

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
        if (typeof url === 'string' && url.includes('/api/events/1/orders/my-order')) {
          return Promise.resolve({
            ok: false,
            status: 404,
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/1/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockEvent,
        } as Response);
      }) as typeof window.fetch;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/events/1/order']}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Friday Pizza Party')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /submit order/i });
      
      // Select an ingredient
      const pepperoniSwitch = screen.getByLabelText('Pepperoni');
      await userEvent.click(pepperoniSwitch);

      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });

      // Deselect the ingredient
      await userEvent.click(pepperoniSwitch);

      // Should be disabled again
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Order Submission', () => {
    it('should submit order successfully when form is valid', async () => {
      const mockEvent = {
        id: 1,
        name: 'Friday Pizza Party',
        date: '2024-03-15',
        location: 'Office',
      };

      const mockIngredients = [
        { id: 1, name: 'Pepperoni' },
        { id: 2, name: 'Mushrooms' },
      ];

      const mockOrder = {
        id: 1,
        userId: 1,
        eventId: 1,
        size: 'Standard',
        ingredientIds: [1],
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z',
      };

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
        if (typeof url === 'string' && url.includes('/api/events/1/orders/my-order')) {
          return Promise.resolve({
            ok: false,
            status: 404,
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/1/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/1/orders') && url.endsWith('/orders')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ order: mockOrder }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockEvent,
        } as Response);
      }) as typeof window.fetch;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/events/1/order']}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Friday Pizza Party')).toBeInTheDocument();
      });

      // Select an ingredient
      const pepperoniSwitch = screen.getByLabelText('Pepperoni');
      await userEvent.click(pepperoniSwitch);

      // Click submit button
      const submitButton = screen.getByRole('button', { name: /submit order/i });
      await userEvent.click(submitButton);

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/order submitted/i)).toBeInTheDocument();
      });
    });

    it('should show loading state while submitting order', async () => {
      const mockEvent = {
        id: 1,
        name: 'Friday Pizza Party',
        date: '2024-03-15',
        location: 'Office',
      };

      const mockIngredients = [
        { id: 1, name: 'Pepperoni' },
      ];

      let resolveOrder: (value: Response) => void;
      const orderPromise = new Promise<Response>((resolve) => {
        resolveOrder = resolve;
      });

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
        if (typeof url === 'string' && url.includes('/api/events/1/orders/my-order')) {
          return Promise.resolve({
            ok: false,
            status: 404,
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/1/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/1/orders') && url.endsWith('/orders')) {
          return orderPromise;
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockEvent,
        } as Response);
      }) as typeof window.fetch;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/events/1/order']}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Friday Pizza Party')).toBeInTheDocument();
      });

      // Select an ingredient
      const pepperoniSwitch = screen.getByLabelText('Pepperoni');
      await userEvent.click(pepperoniSwitch);

      // Click submit button
      const submitButton = screen.getByRole('button', { name: /submit order/i });
      await userEvent.click(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/submitting/i)).toBeInTheDocument();
      });

      // Cleanup: resolve the promise to avoid hanging test
      resolveOrder({
        ok: true,
        json: async () => ({ order: {} }),
      } as Response);
    });

    it('should handle submission error and display error message', async () => {
      const mockEvent = {
        id: 1,
        name: 'Friday Pizza Party',
        date: '2024-03-15',
        location: 'Office',
      };

      const mockIngredients = [
        { id: 1, name: 'Pepperoni' },
      ];

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
        if (typeof url === 'string' && url.includes('/api/events/1/orders/my-order')) {
          return Promise.resolve({
            ok: false,
            status: 404,
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/1/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/1/orders') && url.endsWith('/orders')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Failed to submit order' }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockEvent,
        } as Response);
      }) as typeof window.fetch;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/events/1/order']}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Friday Pizza Party')).toBeInTheDocument();
      });

      // Select an ingredient
      const pepperoniSwitch = screen.getByLabelText('Pepperoni');
      await userEvent.click(pepperoniSwitch);

      // Click submit button
      const submitButton = screen.getByRole('button', { name: /submit order/i });
      await userEvent.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to submit order/i)).toBeInTheDocument();
      });
    });

    it('should prevent duplicate submissions when already submitted', async () => {
      const mockEvent = {
        id: 1,
        name: 'Friday Pizza Party',
        date: '2024-03-15',
        location: 'Office',
      };

      const mockIngredients = [
        { id: 1, name: 'Pepperoni' },
      ];

      const mockExistingOrder = {
        id: 1,
        userId: 1,
        eventId: 1,
        size: 'Standard',
        ingredientIds: [1],
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z',
      };

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
        if (typeof url === 'string' && url.includes('/api/events/1/orders/my-order')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ order: mockExistingOrder }),
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/events/1/ingredients')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ingredients: mockIngredients }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockEvent,
        } as Response);
      }) as typeof window.fetch;

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/events/1/order']}>
            <Routes>
              <Route path="/events/:id/order" element={<PizzaOrderPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Friday Pizza Party')).toBeInTheDocument();
      });

      // Should show "Order Submitted" alert
      expect(screen.getByText(/order submitted/i)).toBeInTheDocument();

      // Submit button should be disabled and show appropriate text
      const submitButton = screen.getByRole('button', { name: /order already submitted/i });
      expect(submitButton).toBeDisabled();
    });
  });
});

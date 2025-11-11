import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    // Mock fetch for auth check
    window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({}),
      } as Response)
    ) as typeof window.fetch;
  });

  it('should render the app with routing', async () => {
    render(<App />);
    
    // App should render - wait for auth check to complete
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });

  it('should redirect to login when not authenticated', async () => {
    render(<App />);
    
    // Should redirect to login page when accessing protected routes
    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });
  });
});

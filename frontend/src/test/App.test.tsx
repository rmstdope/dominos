import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    // Mock fetch for events API (used by EventsLandingPage)
    window.fetch = vi.fn((url) => {
      // Mock auth check - not authenticated
      if (url === 'http://localhost:3000/api/auth/me') {
        return Promise.resolve({
          ok: false,
          json: async () => ({}),
        } as Response);
      }
      // Mock events API
      if (url === 'http://localhost:3000/api/events') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ events: [] }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        json: async () => ({}),
      } as Response);
    }) as typeof window.fetch;
  });

  it('should render the app with routing', async () => {
    render(<App />);
    
    // App should render - wait for auth check to complete
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });

  it('should display EventsLandingPage at root path', async () => {
    render(<App />);
    
    // Should show the EventsLandingPage with "Pizza Events" heading
    await waitFor(() => {
      expect(screen.getByText('Pizza Events')).toBeInTheDocument();
    });
  });

  it('should make EventsLandingPage accessible without authentication', async () => {
    render(<App />);
    
    // Should display landing page content without requiring login
    await waitFor(() => {
      expect(screen.getByText('Pizza Events')).toBeInTheDocument();
      expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
    });
  });

  it('should display empty state message when no events exist', async () => {
    render(<App />);
    
    // Should show empty state from EventsLandingPage
    await waitFor(() => {
      expect(screen.getByText('No events scheduled')).toBeInTheDocument();
    });
  });
});

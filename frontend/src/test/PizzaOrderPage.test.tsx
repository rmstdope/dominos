import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PizzaOrderPage from '../pages/PizzaOrderPage';

describe('PizzaOrderPage', () => {
  it('should render the PizzaOrderPage when navigating to /events/:id/order', () => {
    render(
      <MemoryRouter initialEntries={["/events/123/order"]}>
        <PizzaOrderPage />
      </MemoryRouter>
    );
    
    // The page should show a heading unique to PizzaOrderPage
    expect(screen.getByRole('heading', { name: /order your pizza/i })).toBeInTheDocument();
  });
});

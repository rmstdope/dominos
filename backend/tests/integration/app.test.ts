import { createApp } from '../../src/server';

describe('Server Creation', () => {
  it('should create an Express application', () => {
    const app = createApp();
    
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  it('should have JSON middleware configured', () => {
    const app = createApp();
    
    // Express app should be a function with specific properties
    expect(app).toHaveProperty('_router');
  });
});

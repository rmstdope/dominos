import '@testing-library/jest-dom';

// Mock ResizeObserver for Radix UI components
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

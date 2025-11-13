import '@testing-library/jest-dom';
import { beforeEach, afterEach } from 'vitest';

// Mock ResizeObserver for Radix UI components
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Add a div with id 'root' to the document body for portals
beforeEach(() => {
  const portalRoot = document.createElement('div');
  portalRoot.setAttribute('id', 'root');
  document.body.appendChild(portalRoot);
});

afterEach(() => {
  const portalRoot = document.getElementById('root');
  if (portalRoot) {
    document.body.removeChild(portalRoot);
  }
});

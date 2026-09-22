import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store';
import App from '../App';

// Keep the noise down but do not hide errors from the reporter.
const realError = console.error;
beforeEach(() => {
  console.error = vi.fn((...args) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('not wrapped in act') || msg.includes('cross-origin')) return;
    realError(...args);
  });
});
afterEach(() => {
  console.error = realError;
});

describe('App smoke test', () => {
  it('renders the home route without crashing', async () => {
    const { container } = render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    // App mounts inside BrowserRouter; just wait a tick for lazy Home to resolve
    await new Promise((r) => setTimeout(r, 50));
    expect(container.innerHTML).not.toBe('');
  });
});

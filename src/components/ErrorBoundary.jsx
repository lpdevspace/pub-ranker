import React from 'react';

/**
 * ErrorBoundary
 * Catches render errors in any child component tree and shows a friendly
 * fallback instead of a blank screen. Wrap around <App /> in main.jsx
 * and optionally around individual lazy-loaded pages for isolated recovery.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 *   // Custom fallback:
 *   <ErrorBoundary fallback={<p>Something went wrong.</p>}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Surface to console in dev; swap for a real error reporter (Sentry etc.) in prod
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // Allow a custom fallback to be passed in
    if (this.props.fallback) return this.props.fallback;

    const isDark = document.documentElement.classList.contains('dark');

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 text-center"
        style={{
          background: isDark ? '#0f172a' : '#f8fafc',
          color:      isDark ? '#cbd5e1' : '#334155',
        }}
      >
        <div
          className="max-w-md w-full rounded-2xl p-8 shadow-xl"
          style={{
            background:   isDark ? '#1e293b' : '#ffffff',
            border:       isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          }}
        >
          <div className="text-5xl mb-4">🍺</div>
          <h1
            className="text-2xl font-black mb-2"
            style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
          >
            Something went wrong
          </h1>
          <p className="mb-6 text-sm leading-relaxed">
            An unexpected error occurred. Don&apos;t worry — your data is safe.
            Try refreshing, or hit the button below to recover.
          </p>

          {/* Show error message in dev only */}
          {import.meta.env.DEV && this.state.error && (
            <pre
              className="text-left text-xs rounded-lg p-3 mb-6 overflow-auto max-h-40"
              style={{
                background: isDark ? '#0f172a' : '#f1f5f9',
                color: '#ef4444',
              }}
            >
              {this.state.error.message}
            </pre>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-lg font-bold text-sm transition"
              style={{
                background: '#f59e0b',
                color: '#0f172a',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg font-bold text-sm transition"
              style={{
                background: isDark ? '#334155' : '#e2e8f0',
                color:      isDark ? '#f1f5f9'  : '#0f172a',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

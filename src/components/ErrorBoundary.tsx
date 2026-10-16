import { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Catches a render-time exception instead of losing the application.
 *
 * There was no boundary anywhere in the tree. React's behaviour on an
 * uncaught render error is to unmount the whole root, so a single thrown
 * exception — a null dereference in one card, a malformed API shape reaching
 * one chart — replaced the entire site with a blank white page. No message, no
 * way back, and nothing reported: the user saw an empty tab and we never knew.
 *
 * Two levels are used (see `App.tsx`):
 *
 *  - **Route level**, inside the router, so a failing page keeps the shell and
 *    the user can navigate away. This is the one that saves the session.
 *  - **Root level**, outside it, as the backstop for a provider that throws
 *    during its own initialisation — where there is no router to keep.
 *
 * A class component on purpose: `componentDidCatch` has no hook equivalent.
 */

interface Props {
  children: ReactNode;
  /** Distinguishes the root boundary's copy from a route's. */
  scope?: 'root' | 'route';
  /**
   * Remounting the subtree when this changes is what makes "navigate away"
   * work: the boundary resets on a new location instead of staying broken
   * until a full page reload.
   */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The browser console is the only sink available client-side today. When
    // an error reporter is added, this is the single place it hooks into —
    // which is the other half of why a boundary matters.
    console.error('[nexus] Unhandled render error', {
      scope: this.props.scope ?? 'route',
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isRoot = this.props.scope === 'root';

    return (
      <div
        className="flex min-h-[60vh] items-center justify-center bg-[var(--surface-base)] px-6 py-16"
        role="alert"
      >
        <div className="w-full max-w-md text-center">
          <div
            className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF5F56]/10"
            aria-hidden="true"
          >
            {/* Inline, not an icon import: a boundary must not depend on a
                chunk that may itself be what failed to load. */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FF5F56"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>

          <h1 className="text-lg font-bold text-primary">
            {isRoot ? 'Nexus could not start' : 'This page ran into a problem'}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-secondary">
            {isRoot
              ? 'Something went wrong before the app finished loading. Reloading usually clears it.'
              : 'The rest of the site is still working — you can go back to shopping, or try this page again.'}
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            {!isRoot && (
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-xl bg-[var(--ink)]/5 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-[var(--ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#FFBD2E] px-5 py-2.5 text-sm font-semibold text-[#0B0D1B] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBD2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]"
            >
              Reload the page
            </button>
          </div>

          {/* The message, in development only. In production it would be the
              same internals leak the API's error handler was fixed for. */}
          {import.meta.env.DEV && (
            <pre className="mt-7 max-h-48 overflow-auto rounded-lg bg-[var(--ink)]/5 p-3 text-left text-xs leading-relaxed text-muted">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

"use client";

import { Component } from "react";

/**
 * ErrorBoundary — reusable class component for wrapping any subtree.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComplexComponent />
 *   </ErrorBoundary>
 *
 *   // Custom fallback:
 *   <ErrorBoundary fallback={<p>Failed to load this section.</p>}>
 *     <SomeComplexComponent />
 *   </ErrorBoundary>
 *
 *   // Custom label (shown in the default fallback UI):
 *   <ErrorBoundary label="Persona Card">
 *     <PersonaCard />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production, pipe to your error monitoring service
    // e.g. Sentry.captureException(error, { extra: info })
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Allow fully custom fallback
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const label = this.props.label || "This section";

    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5 text-red-500"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <p className="text-sm font-medium text-gray-800">
          {label} failed to load
        </p>
        <p className="mt-1 text-xs text-gray-500">
          An unexpected error occurred in this section.
        </p>

        {process.env.NODE_ENV !== "production" && this.state.error?.message && (
          <pre className="mt-3 overflow-auto rounded-lg bg-white border border-red-100 p-2 text-left text-xs text-red-600">
            {this.state.error.message}
          </pre>
        )}

        <button
          onClick={this.handleReset}
          className="mt-4 rounded-lg border border-red-200 bg-white px-4 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
        >
          Retry
        </button>
      </div>
    );
  }
}

/**
 * withErrorBoundary — HOC to wrap any component with an ErrorBoundary.
 *
 * Usage:
 *   const SafePersonaCard = withErrorBoundary(PersonaCard, "Persona Card");
 */
export function withErrorBoundary(WrappedComponent, label) {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  function WithErrorBoundary(props) {
    return (
      <ErrorBoundary label={label || displayName}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}

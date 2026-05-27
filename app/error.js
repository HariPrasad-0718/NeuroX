"use client";

/**
 * Global error boundary for Next.js App Router.
 * Catches unhandled errors thrown inside any page or layout segment.
 * Must be a Client Component.
 */
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // In production, pipe this to your error monitoring service
    // e.g. Sentry.captureException(error)
    console.error("[NeuroX] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
      <div className="max-w-md w-full rounded-2xl border border-red-100 bg-white p-8 shadow-sm text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-7 w-7 text-red-500"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          An unexpected error occurred. If this keeps happening, please contact
          support.
        </p>

        {/* Show error message only in development */}
        {process.env.NODE_ENV !== "production" && error?.message && (
          <pre className="mt-4 overflow-auto rounded-lg bg-gray-50 border border-gray-200 p-3 text-left text-xs text-red-600">
            {error.message}
          </pre>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

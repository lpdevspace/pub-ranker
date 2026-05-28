import React from 'react';

/**
 * NotFoundPage — 404 fallback
 * Rendered by MainApp when no route matches.
 * Receives setPage so it can navigate back without a full reload.
 */
export default function NotFoundPage({ setPage }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-16">
      {/* Pint glass illustration */}
      <div className="text-8xl mb-6 select-none" aria-hidden="true">🍺</div>

      <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-3">
        404 — Lost the plot
      </h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed">
        We couldn&apos;t find that page. Maybe it&apos;s been renamed, removed,
        or you took a wrong turn on the pub crawl.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => setPage('dashboard')}
          className="
            inline-flex items-center gap-2 px-5 py-2.5
            bg-amber-500 hover:bg-amber-600 active:bg-amber-700
            text-gray-900 font-bold rounded-xl
            transition-colors duration-150
          "
        >
          🏠 Back to Dashboard
        </button>
        <button
          onClick={() => window.history.back()}
          className="
            inline-flex items-center gap-2 px-5 py-2.5
            bg-gray-100 hover:bg-gray-200 active:bg-gray-300
            dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-gray-600
            text-gray-900 dark:text-white font-bold rounded-xl
            transition-colors duration-150
          "
        >
          ← Go back
        </button>
      </div>
    </div>
  );
}

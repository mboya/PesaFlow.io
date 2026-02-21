"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="app-shell flex min-h-screen items-center justify-center px-4">
        <div className="app-card max-w-md p-8 text-center">
          <h2 className="app-section-title">Something went wrong</h2>
          <p className="mt-3 text-sm text-slate-600">
            We&apos;ve logged this error. Please try again.
          </p>
          <button className="app-btn-primary mt-6" onClick={reset}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

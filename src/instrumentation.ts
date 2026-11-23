import * as Sentry from "@sentry/nextjs";

export async function register() {
  // A stray rejected promise — e.g. a Postgres "statement timeout" from a
  // query nobody awaited — used to crash the whole Node process (exit 128).
  // On Vercel that took every in-flight request down with it and left new
  // ones hanging until the 300s limit (the 23 Nov 2026 outage). Log it
  // instead; the request that caused it still fails on its own.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      console.error("[unhandledRejection]", reason);
      if (process.env.SENTRY_DSN) Sentry.captureException(reason);
    });
  }

  // Server-side error monitoring. Inert unless SENTRY_DSN is set —
  // safe to ship before the Sentry project exists.
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // Never attach request bodies — they can contain gateway payloads/PII
    sendDefaultPii: false,
  });
}

export const onRequestError: typeof Sentry.captureRequestError = (...args) => {
  if (!process.env.SENTRY_DSN) return;
  return Sentry.captureRequestError(...args);
};

declare module '@sentry/react' {
  export function captureException(
    err: unknown,
    options?: { extra?: Record<string, unknown> },
  ): string
}

// Production consoles should identify the failing area without exposing
// response bodies, tokens, email addresses, stack traces, or SDK objects.
if (import.meta.env.PROD) {
  const originalError = console.error.bind(console);
  const safeLabel = (value: unknown): string => {
    if (typeof value !== 'string') return 'Unexpected application error';
    return value
      .split('\n')[0]
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '[id]')
      .replace(/https?:\/\/\S+/gi, '[url]')
      .slice(0, 180);
  };

  console.log = () => undefined;
  console.info = () => undefined;
  console.debug = () => undefined;
  console.warn = () => undefined;
  console.error = (first?: unknown) => originalError('[APP_ERROR]', safeLabel(first));
}

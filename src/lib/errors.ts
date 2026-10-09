/**
 * Converts unknown errors (Supabase, network, thrown strings) into short,
 * user-safe messages. Raw backend details are never shown verbatim when they
 * could leak internals; known auth messages are mapped to friendly text.
 */
export function toUserMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw = extractMessage(error);

  if (!raw) {
    return fallback;
  }

  const message = raw.toLowerCase();

  if (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('timeout')
  ) {
    return 'You appear to be offline. Check your connection and try again.';
  }

  if (message.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }

  if (message.includes('email not confirmed')) {
    return 'Please confirm your email address first. Check your inbox for the confirmation link.';
  }

  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (message.includes('password should be')) {
    return raw;
  }

  if (message.includes('jwt') || message.includes('not authenticated') || message.includes('auth session missing')) {
    return 'Your session has expired. Please sign in again.';
  }

  return fallback;
}

/**
 * Domain errors raised intentionally by our own code or by our own RPC
 * (prefixed with "WH:") are safe to display directly.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export function displayError(error: unknown, fallback?: string): string {
  if (error instanceof AppError) {
    return error.message;
  }

  return toUserMessage(error, fallback);
}

function extractMessage(error: unknown): string {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && 'message' in error) {
    const value = (error as { message: unknown }).message;
    return typeof value === 'string' ? value : '';
  }

  return '';
}

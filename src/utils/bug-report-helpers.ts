const MAX_STACK_LENGTH = 4_000;
const MAX_COMMENT_LENGTH = 1_000;
const MAX_ERROR_MESSAGE_LENGTH = 500;

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function scrubPii(text: string): string {
  return text.replace(EMAIL_REGEX, '[redacted]');
}

export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) + '...[truncated]' : text;
}

export function generateIdempotencyKey(): string {
  return `bug_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeErrorMessage(message: string): string {
  return scrubPii(truncate(message, MAX_ERROR_MESSAGE_LENGTH));
}

export function sanitizeStack(stack: string | null): string {
  if (!stack) return '';
  return scrubPii(truncate(stack, MAX_STACK_LENGTH));
}

export function sanitizeComment(comment: string): string {
  return truncate(comment.trim(), MAX_COMMENT_LENGTH);
}

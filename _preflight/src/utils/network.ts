interface ErrorWithCode {
  code?: string;
  message?: string;
}

const NETWORK_PATTERN = /network request failed|network error|failed to fetch|offline|timed out|connection/i;
const MISSING_RPC_PATTERN = /could not find the function|schema cache|does not exist/i;

export function isTransientNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return NETWORK_PATTERN.test(error.message);
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return NETWORK_PATTERN.test(String((error as ErrorWithCode).message ?? ''));
  }

  return false;
}

export function isMissingRpcError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const message = String((error as ErrorWithCode).message ?? '');
  const code = String((error as ErrorWithCode).code ?? '');

  return code === 'PGRST202' || MISSING_RPC_PATTERN.test(message);
}

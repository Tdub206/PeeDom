import { supabaseRuntimeConfig } from '@/lib/supabase-config';

const DEFAULT_EDGE_FUNCTION_TIMEOUT_MS = 15_000;

export type EdgeFunctionMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export type EdgeFunctionInvocationError = Error & {
  code?: string;
  responseBody?: unknown;
  status?: number;
};

export interface InvokeEdgeFunctionOptions<TBody = unknown> {
  functionName: string;
  accessToken: string;
  method?: EdgeFunctionMethod;
  body?: TBody;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface InvokeEdgeFunctionResult<TData> {
  data: TData | null;
  error: EdgeFunctionInvocationError | null;
  status: number | null;
}

function createEdgeFunctionError(
  message: string,
  options?: {
    code?: string;
    responseBody?: unknown;
    status?: number;
  }
): EdgeFunctionInvocationError {
  const error = new Error(message) as EdgeFunctionInvocationError;
  error.code = options?.code;
  error.responseBody = options?.responseBody;
  error.status = options?.status;
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function extractEdgeFunctionMessage(
  functionName: string,
  responseBody: unknown,
  status?: number
): string {
  if (typeof responseBody === 'string' && responseBody.trim().length > 0) {
    return responseBody.trim();
  }

  if (responseBody && typeof responseBody === 'object') {
    const messageCandidate =
      ('error' in responseBody && typeof responseBody.error === 'string' && responseBody.error.trim()) ||
      ('message' in responseBody && typeof responseBody.message === 'string' && responseBody.message.trim()) ||
      null;

    if (messageCandidate) {
      return messageCandidate;
    }
  }

  if (status === 401) {
    return 'Your session expired. Sign in again and retry.';
  }

  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }

  return `Unable to reach the ${functionName} function right now.`;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (_error) {
    return text;
  }
}

export async function invokeEdgeFunction<TData, TBody = unknown>(
  options: InvokeEdgeFunctionOptions<TBody>
): Promise<InvokeEdgeFunctionResult<TData>> {
  if (!supabaseRuntimeConfig.isConfigured) {
    return {
      data: null,
      error: createEdgeFunctionError(
        supabaseRuntimeConfig.errorMessage ??
          'Supabase runtime configuration is missing. Configure StallPass runtime variables before launch.',
        {
          code: 'SUPABASE_RUNTIME_CONFIG_MISSING',
        }
      ),
      status: null,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_EDGE_FUNCTION_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      new URL(`/functions/v1/${options.functionName}`, supabaseRuntimeConfig.supabaseUrl).toString(),
      {
        method: options.method ?? 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${options.accessToken}`,
          apikey: supabaseRuntimeConfig.supabaseAnonKey,
          ...(typeof options.body === 'undefined' ? {} : { 'Content-Type': 'application/json' }),
          ...options.headers,
        },
        body: typeof options.body === 'undefined' ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      }
    );
    const responseBody = await readResponseBody(response);

    if (!response.ok) {
      return {
        data: null,
        error: createEdgeFunctionError(
          extractEdgeFunctionMessage(options.functionName, responseBody, response.status),
          {
            code: 'EDGE_FUNCTION_HTTP_ERROR',
            responseBody,
            status: response.status,
          }
        ),
        status: response.status,
      };
    }

    return {
      data: responseBody as TData,
      error: null,
      status: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: createEdgeFunctionError(
        isAbortError(error)
          ? `The ${options.functionName} request timed out.`
          : `Unable to reach the ${options.functionName} function right now.`,
        {
          code: isAbortError(error) ? 'EDGE_FUNCTION_TIMEOUT' : 'EDGE_FUNCTION_NETWORK_ERROR',
        }
      ),
      status: null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

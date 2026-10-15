import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>;

type QueryParams = Record<string, QueryValue>;

type HeaderValue = string | number | boolean;
type RequestHeaders = Record<string, HeaderValue>;

interface UseFetchOptions<TBody = unknown> {
  url: string;
  method?: HttpMethod;
  params?: QueryParams;
  body?: TBody;
  headers?: RequestHeaders;
  manual?: boolean;
  skip?: boolean;
}

interface RefetchOptions<TBody = unknown> {
  url?: string;
  method?: HttpMethod;
  params?: QueryParams;
  body?: TBody;
  headers?: RequestHeaders;
}

function buildUrl(url: string, params?: QueryParams) {
  const result = new URL(url, window.location.origin);

  if (!params) return result.toString();

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item == null || item === "") continue;
        result.searchParams.append(key, String(item));
      }
    } else {
      result.searchParams.set(key, String(value));
    }
  }

  return result.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text() as Promise<T>;
}

export function useFetch<TData = unknown, TBody = unknown>({
  url,
  method = "GET",
  params,
  body,
  headers,
  manual = false,
  skip = false,
}: UseFetchOptions<TBody>) {
  const { token } = useAuth(); // adjust this to match your auth hook

  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(!manual && !skip);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(
    async (overrides: RefetchOptions<TBody> = {}) => {
      const finalUrl = overrides.url ?? url;
      const finalMethod = overrides.method ?? method;
      const finalParams = overrides.params ?? params;
      const finalBody = overrides.body ?? body;
      const finalHeaders = overrides.headers ?? headers;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const isGet = finalMethod === "GET";

        const mergedHeaders: Record<string, string> = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...Object.fromEntries(
            Object.entries(finalHeaders ?? {}).map(([key, value]) => [
              key,
              String(value),
            ]),
          ),
        };

        if (
          !isGet &&
          finalBody !== undefined &&
          !mergedHeaders["Content-Type"]
        ) {
          mergedHeaders["Content-Type"] = "application/json";
        }

        const response = await fetch(buildUrl(finalUrl, finalParams), {
          method: finalMethod,
          headers: Object.keys(mergedHeaders).length
            ? mergedHeaders
            : undefined,
          body: isGet
            ? undefined
            : finalBody !== undefined
              ? JSON.stringify(finalBody)
              : undefined,
          signal: controller.signal,
          credentials: "include",
        });

        if (!response.ok) {
          const message = await response
            .text()
            .catch(() => response.statusText);
          throw new Error(message || `HTTP ${response.status}`);
        }

        const result = await parseResponse<TData>(response);

        if (requestId === requestIdRef.current) {
          setData(result);
        }

        return result;
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          throw err;
        }

        const normalizedError =
          err instanceof Error ? err : new Error("Something went wrong");

        if (requestId === requestIdRef.current) {
          setError(normalizedError);
        }

        throw normalizedError;
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [url, method, params, body, headers, token],
  );

  useEffect(() => {
    if (manual || skip) return;

    refetch().catch((err) => {
      if ((err as Error).name !== "AbortError") {
        // error already stored in state
      }
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [manual, skip, refetch]);

  return {
    data,
    loading,
    error,
    refetch,
    abort: () => abortRef.current?.abort(),
  };
}

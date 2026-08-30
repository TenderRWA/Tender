/**
 * Server-only HTTP client for the TENDER API.
 *
 * Every call to api.tenderrwa.com is made from this module, which only ever runs
 * inside server functions (src/server/tender.ts). The browser talks to our own
 * origin, so no cross-origin request is ever issued and CORS never applies.
 */

const DEFAULT_PRIMARY = "https://api.tenderrwa.com";
const DEFAULT_FALLBACK = "https://tender-api-jpw2.onrender.com";
const REQUEST_TIMEOUT_MS = 20_000;

export class TenderApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: string,
  ) {
    super(message);
    this.name = "TenderApiError";
  }
}

function env(key: string): string | undefined {
  const value = typeof process !== "undefined" && process.env ? process.env[key] : undefined;
  return value && value.trim() ? value.trim().replace(/\/+$/, "") : undefined;
}

/** Primary host first, then the direct-host fallback from the integration spec. */
function hosts(): string[] {
  const primary = env("TENDER_API_URL") ?? env("VITE_API_URL") ?? DEFAULT_PRIMARY;
  const fallback = env("TENDER_API_FALLBACK_URL") ?? DEFAULT_FALLBACK;
  return primary === fallback ? [primary] : [primary, fallback];
}

async function readError(res: Response): Promise<TenderApiError> {
  let message = `TENDER API responded ${res.status}`;
  let details: string | undefined;
  try {
    const body = (await res.json()) as { error?: string; details?: string };
    if (body?.error) message = body.error;
    details = body?.details;
  } catch {
    /* non-JSON error body — keep the status message */
  }
  return new TenderApiError(message, res.status, details);
}

export async function tenderFetch<T>(
  path: string,
  init: {
    method?: "GET" | "POST" | "PUT";
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<T> {
  const { method = "GET", body, query } = init;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const suffix = search.size ? `?${search}` : "";

  let lastError: unknown;

  for (const host of hosts()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${host}${path}${suffix}`, {
        method,
        headers:
          body === undefined
            ? { accept: "application/json" }
            : { accept: "application/json", "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (res.ok) return (await res.json()) as T;

      const error = await readError(res);
      // A 4xx is a real answer from a healthy host — don't retry it elsewhere.
      if (res.status < 500) throw error;
      lastError = error;
    } catch (err) {
      if (err instanceof TenderApiError && err.status < 500) throw err;
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastError instanceof TenderApiError) throw lastError;
  throw new TenderApiError(
    lastError instanceof Error
      ? `TENDER API unreachable: ${lastError.message}`
      : "TENDER API unreachable",
    503,
  );
}

import { ViewerProfileRequest, RecommendResponse, HealthResponse, ApiTelemetry } from '../types/api';

const DEFAULT_API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const STORAGE_KEY = 'spectra_api_base_url';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null && saved.trim() !== '') {
      return saved.trim().replace(/\/+$/, '');
    }
  }
  return DEFAULT_API_URL;
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, cleanUrl);
    }
  }
}

export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!baseUrl) return `/api${cleanPath}`;
  return `${baseUrl}${cleanPath}`;
}

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

/**
 * Executes an HTTP fetch with dedicated AbortController per attempt.
 * If an explicit baseUrl was configured and the primary request encounters
 * a network/connection error, attempts fallback to the relative /api proxy route.
 */
async function executeApiFetch(
  path: string,
  options: FetchOptions = {}
): Promise<{ res: Response; usedUrl: string }> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const primaryUrl = getApiUrl(cleanPath);
  const fallbackUrl = `/api${cleanPath}`;

  // Attempt 1: primaryUrl with dedicated AbortController and timeout
  const controller1 = new AbortController();
  const timer1 = setTimeout(() => controller1.abort(), timeoutMs);

  try {
    const res = await fetch(primaryUrl, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      signal: controller1.signal,
    });
    return { res, usedUrl: primaryUrl };
  } catch (primaryErr: any) {
    // If primaryUrl differs from fallbackUrl (e.g. explicit baseUrl configured),
    // and primary failed with a network error, attempt fallback to /api/*
    // Each fetch attempt MUST have its own independent AbortController and timer.
    if (primaryUrl !== fallbackUrl) {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), timeoutMs);

      try {
        const res = await fetch(fallbackUrl, {
          method: options.method || 'GET',
          headers: options.headers,
          body: options.body,
          signal: controller2.signal,
        });
        return { res, usedUrl: fallbackUrl };
      } catch (fallbackErr: any) {
        throw fallbackErr;
      } finally {
        clearTimeout(timer2);
      }
    }
    throw primaryErr;
  } finally {
    clearTimeout(timer1);
  }
}

export async function checkHealth(): Promise<{
  ok: boolean;
  data: HealthResponse | null;
  latencyMs: number;
  error?: string;
}> {
  const startTime = performance.now();
  
  try {
    const { res } = await executeApiFetch('/health', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeoutMs: 4000,
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const rawBody = await res.text();
      let errorBody = rawBody;
      try {
        const parsed = rawBody ? JSON.parse(rawBody) : null;
        errorBody = typeof parsed === 'string'
          ? parsed
          : JSON.stringify(parsed, null, 2);
      } catch {
        // Keep raw text
      }
      return {
        ok: false,
        data: null,
        latencyMs,
        error: `HTTP ${res.status}: ${res.statusText}${errorBody ? ` - ${errorBody}` : ''}`,
      };
    }

    let data: HealthResponse;
    try {
      data = await res.json();
    } catch {
      return {
        ok: false,
        data: null,
        latencyMs,
        error: 'Backend returned invalid JSON response',
      };
    }

    const isAudienceApi = data && ('model_loaded' in data || 'features_count' in data || 'model_type' in data);
    if (!isAudienceApi) {
      return {
        ok: false,
        data: null,
        latencyMs,
        error: 'Target endpoint responded but does not appear to be the Audience Segmentation API. Please verify the API base URL.',
      };
    }

    return {
      ok: true,
      data,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    const msg = err.name === 'AbortError' 
      ? 'Connection timed out (4s)' 
      : (err.message || 'Failed to connect to backend service');
    return {
      ok: false,
      data: null,
      latencyMs,
      error: msg,
    };
  }
}

export async function postRecommend(
  profile: ViewerProfileRequest
): Promise<{
  data: RecommendResponse | null;
  telemetry: ApiTelemetry;
}> {
  const startTime = performance.now();
  let usedEndpointUrl = getApiUrl('/recommend');

  try {
    const { res, usedUrl } = await executeApiFetch('/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(profile),
      timeoutMs: 8000,
    });
    usedEndpointUrl = usedUrl;

    const latencyMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      // Read response body exactly once using res.text(), then safely parse JSON
      const rawBody = await res.text();

      let errorBody = rawBody;
      try {
        const parsed = rawBody ? JSON.parse(rawBody) : null;
        errorBody = typeof parsed === 'string'
          ? parsed
          : JSON.stringify(parsed, null, 2);
      } catch {
        // Keep raw text
      }

      const errorMsg = `Server returned HTTP ${res.status} (${res.statusText}): ${errorBody}`;
      return {
        data: null,
        telemetry: {
          status: res.status,
          latencyMs,
          timestamp: new Date().toISOString(),
          requestPayload: profile,
          responsePayload: null,
          error: errorMsg,
          endpointUrl: usedEndpointUrl,
        },
      };
    }

    const data: RecommendResponse = await res.json();
    return {
      data,
      telemetry: {
        status: res.status,
        latencyMs,
        timestamp: new Date().toISOString(),
        requestPayload: profile,
        responsePayload: data,
        endpointUrl: usedEndpointUrl,
      },
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    const baseUrl = getApiBaseUrl();
    const targetDesc = baseUrl || '/api';
    const errorMessage = err.name === 'AbortError'
      ? 'Request timed out after 8 seconds'
      : `Network error: ${err.message || 'Cannot reach API backend'}. Ensure the backend service is reachable at ${targetDesc}.`;

    return {
      data: null,
      telemetry: {
        status: 0,
        latencyMs,
        timestamp: new Date().toISOString(),
        requestPayload: profile,
        responsePayload: null,
        error: errorMessage,
        endpointUrl: usedEndpointUrl,
      },
    };
  }
}

export async function fetchLiveMetrics(): Promise<any> {
  try {
    const { res } = await executeApiFetch('/metrics', {
      headers: { 'Accept': 'application/json' },
      timeoutMs: 5000,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch /metrics from backend:', err);
  }
  return null;
}

export async function fetchLiveSegments(): Promise<any> {
  try {
    const { res } = await executeApiFetch('/segments', {
      headers: { 'Accept': 'application/json' },
      timeoutMs: 5000,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch /segments from backend:', err);
  }
  return null;
}

/**
 * Browserbase API Client
 *
 * V8-compatible HTTP client using fetch (web standard API).
 * Makes direct API calls to Browserbase without Node.js SDK.
 */

export interface BrowserbaseConfig {
  apiKey: string;
  projectId: string;
}

export interface SessionOptions {
  timeout?: number;
  keepAlive?: boolean;
  region?: "us-west-2" | "us-east-1" | "eu-central-1" | "ap-southeast-1";
  proxies?: boolean;
}

export interface BrowserbaseSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  status: "RUNNING" | "ERROR" | "TIMED_OUT" | "COMPLETED";
  connectUrl: string;
  seleniumRemoteUrl: string;
  region: string;
  startedAt?: string;
  endedAt?: string;
  expiresAt: string;
  avgCpuUsage?: number;
  memoryUsage?: number;
  proxyBytes?: number;
}

const BASE_URL = "https://api.browserbase.com/v1";

/**
 * Create a new Browserbase session
 */
export async function createSession(
  config: BrowserbaseConfig,
  options?: SessionOptions,
): Promise<BrowserbaseSession> {
  const response = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: {
      "x-bb-api-key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId: config.projectId,
      ...options,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserbase API error (${response.status}): ${errorText}`);
  }

  return (await response.json()) as BrowserbaseSession;
}

/**
 * Get session details
 */
export async function getSession(
  config: BrowserbaseConfig,
  sessionId: string,
): Promise<BrowserbaseSession> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    headers: {
      "x-bb-api-key": config.apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserbase API error (${response.status}): ${errorText}`);
  }

  return (await response.json()) as BrowserbaseSession;
}

/**
 * Complete a session (REQUEST_RELEASE)
 * This terminates the session gracefully to avoid additional charges
 */
export async function completeSession(
  config: BrowserbaseConfig,
  sessionId: string,
): Promise<BrowserbaseSession> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    method: "POST",
    headers: {
      "x-bb-api-key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId: config.projectId,
      status: "REQUEST_RELEASE",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserbase API error (${response.status}): ${errorText}`);
  }

  return (await response.json()) as BrowserbaseSession;
}

/**
 * Get session logs
 */
export async function getSessionLogs(
  config: BrowserbaseConfig,
  sessionId: string,
): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/logs`, {
    headers: {
      "x-bb-api-key": config.apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserbase API error (${response.status}): ${errorText}`);
  }

  return (await response.json()) as any[];
}

/**
 * Get session recording (rrweb events)
 */
export async function getSessionRecording(
  config: BrowserbaseConfig,
  sessionId: string,
): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/recording`, {
    headers: {
      "x-bb-api-key": config.apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserbase API error (${response.status}): ${errorText}`);
  }

  return (await response.json()) as any[];
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 15000, signal, ...rest } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...rest, signal: signal ?? controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

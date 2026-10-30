/* A small fetch for the Worker API that never throws: it resolves to the parsed JSON, or null when the
   network, the Worker or the response let it down (offline, timeout, 4xx/5xx, not JSON). */
export async function fetchJson(api, path, { method = 'GET', body, token, timeout = 4000, fetchImpl } = {}) {
  const f = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!f || !api) return null;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeout) : null;
  try {
    const headers = { accept: 'application/json' };
    if (body) headers['content-type'] = 'application/json';
    if (token) headers.authorization = 'Bearer ' + token;
    const res = await f(api + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctl ? ctl.signal : undefined });
    if (!res || !res.ok) return null;
    return await res.json();
  } catch (e) { return null; } finally { if (timer) clearTimeout(timer); }
}

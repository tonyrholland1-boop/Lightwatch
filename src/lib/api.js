export class ApiError extends Error {
  constructor(message, { status = 0, code = 'network_error' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      ...options,
    });
  } catch {
    throw new ApiError("We couldn't reach LightWatch. Check your connection and try again.", {
      code: 'network_error',
    });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || 'Something went wrong. Please try again in a moment.',
      { status: response.status, code: payload?.error || 'server_error' },
    );
  }
  return payload;
}

export const api = {
  overview: () => request('/api/overview'),
  neighbourhood: (slug) => request(`/api/neighbourhoods/${encodeURIComponent(slug)}`),
  search: (query) => request(`/api/neighbourhoods?q=${encodeURIComponent(query)}`),
  recentReports: (limit = 12) => request(`/api/reports/recent?limit=${limit}`),
  submitReport: (body) =>
    request('/api/reports', { method: 'POST', body: JSON.stringify(body) }),
};

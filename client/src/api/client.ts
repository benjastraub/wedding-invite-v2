import type { GuestViewResponse, RsvpPayload, SiteSettings } from 'shared';

/** Error carrying the HTTP status so pages can react (e.g. 404 → "not found"). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'network_error');
  }
  if (!res.ok) {
    let code = 'request_failed';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) code = body.error;
    } catch {
      // non-JSON error body — keep the generic code
    }
    throw new ApiError(res.status, code);
  }
  return (await res.json()) as T;
}

export function fetchSettings(): Promise<SiteSettings> {
  return request<SiteSettings>('/api/settings');
}

export function fetchGuest(token: string): Promise<GuestViewResponse> {
  return request<GuestViewResponse>(`/api/guest/${encodeURIComponent(token)}`);
}

export function submitRsvp(token: string, payload: RsvpPayload): Promise<{ ok: boolean; attending: RsvpPayload['attending'] }> {
  return request(`/api/guest/${encodeURIComponent(token)}/rsvp`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

async function parseError(response: Response): Promise<never> {
  let message = `Request failed (${response.status})`
  try {
    const payload = (await response.json()) as { detail?: string }
    if (payload.detail) message = payload.detail
  } catch {
    // Keep the status-based message when the server did not send JSON.
  }
  throw new Error(message)
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) return parseError(response)
  return response.json() as Promise<T>
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) return parseError(response)
  return response.json() as Promise<T>
}

export async function uploadCsv(file: File, role: 'before' | 'after') {
  const form = new FormData()
  form.append('file', file)
  form.append('role', role)
  const response = await fetch(`${API_BASE}/api/uploads`, { method: 'POST', body: form })
  if (!response.ok) return parseError(response)
  return response.json()
}

export function reportUrl(id: string, format: 'html' | 'json' | 'csv') {
  return `${API_BASE}/api/investigations/${id}/report?format=${format}`
}

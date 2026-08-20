const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api/v1';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}) {
  const { token, body, headers, ...requestOptions } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.erreur?.message || payload?.message || 'Une erreur inattendue est survenue.';
    throw new ApiError(message, response.status, payload?.erreur);
  }
  if (requestOptions.method && requestOptions.method.toUpperCase() !== 'GET') {
    globalThis.dispatchEvent?.(new CustomEvent('campushub:toast', {
      detail: { message: payload?.message || 'Enregistrement effectué avec succès.', type: 'success' },
    }));
  }
  return payload;
}

export async function uploadFile(path, file, token) {
  const body = new FormData(); body.append('fichier', file);
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST', body, credentials: 'include',
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(payload?.erreur?.message || 'Le fichier n’a pas pu être envoyé.', response.status, payload?.erreur);
  globalThis.dispatchEvent?.(new CustomEvent('campushub:toast', { detail: { message: 'Fichier chargé avec succès.', type: 'success' } }));
  return payload;
}

export { API_URL };

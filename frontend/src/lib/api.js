export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export function getStoredToken() {
  return localStorage.getItem('access_token') ?? '';
}

export function setStoredToken(token) {
  localStorage.setItem('access_token', token);
}

export function clearStoredToken() {
  localStorage.removeItem('access_token');
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', token = '', body, headers = {} } = options;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const backendMessage = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message;

    const error = new Error(
      backendMessage ?? `Request failed (${response.status})`,
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function apiUploadFile(path, { token = '', file, fieldName = 'file' }) {
  if (!file) {
    throw new Error('Arquivo não informado para upload');
  }

  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await parseJson(response);

  if (!response.ok) {
    const backendMessage = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message;

    const error = new Error(
      backendMessage ?? `Request failed (${response.status})`,
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

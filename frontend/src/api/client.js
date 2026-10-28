/**
 * Every network call in the app goes through this module.
 * Relative URLs work in dev (Vite proxy) and production (FastAPI serves both).
 */

const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch (error) {
    throw new ApiError(
      'Cannot reach the backend. Make sure the FastAPI server is running on port 8000.',
      0,
    );
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}.`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') {
        detail = body.detail;
      } else if (Array.isArray(body.detail) && body.detail.length > 0) {
        // Pydantic validation errors arrive as a list of objects.
        detail = body.detail.map((item) => item.msg).join(' ');
      }
    } catch (error) {
      /* Non-JSON error body: keep the generic message. */
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
}

export function getHealth() {
  return request('/health');
}

export function getModes() {
  return request('/modes');
}

export function getMetrics(mode) {
  return request(`/metrics?mode=${encodeURIComponent(mode)}`);
}

export function getDatasetStats(mode) {
  return request(`/dataset-stats?mode=${encodeURIComponent(mode)}`);
}

export function predict(message, mode) {
  return request('/predict', {
    method: 'POST',
    body: JSON.stringify({ message, mode }),
  });
}

export function predictBatch(messages, mode) {
  return request('/predict-batch', {
    method: 'POST',
    body: JSON.stringify({ messages, mode }),
  });
}

export function retrain(mode = 'all') {
  return request(`/retrain?mode=${encodeURIComponent(mode)}`, { method: 'POST' });
}

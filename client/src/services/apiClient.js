import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 30000,
});

let refreshPromise = null;

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || error?.message || fallback;
}

export function getApiErrorCode(error, fallback = 'UNKNOWN_ERROR') {
  return error?.response?.data?.code || fallback;
}

export function getApiErrorDetails(error) {
  const details = error?.response?.data?.details;
  return details && typeof details === 'object' ? details : null;
}

export function storeAccessToken(token) {
  if (token) {
    try { localStorage.setItem('wl_access_token', token); } catch { /* storage unavailable */ }
  }
}

export function clearAccessToken() {
  try { localStorage.removeItem('wl_access_token'); } catch { /* storage unavailable */ }
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${apiClient.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = res.data?.data?.tokens?.accessToken || null;
        if (token) storeAccessToken(token);
        return token;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const isAuthPath = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/register') || config?.url?.includes('/auth/refresh');
  if (isAuthPath) return config;
  try {
    const token = localStorage.getItem('wl_access_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* localStorage unavailable */
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthPath = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/register') || config?.url?.includes('/auth/refresh');
    if (response?.status === 401 && config && !config._retried && !isAuthPath) {
      config._retried = true;
      try {
        const accessToken = await refreshSession();
        if (accessToken) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient.request(config);
        }
      } catch { /* refresh failed — fall through to original error */
      }
    }
    return Promise.reject(error);
  },
);

export async function apiGet(url, params) {
  const res = await apiClient.get(url, { params });
  return { data: res.data?.data, meta: res.data?.meta || {}, message: res.data?.message };
}

export async function apiPost(url, body) {
  const res = await apiClient.post(url, body);
  return { data: res.data?.data, meta: res.data?.meta || {}, message: res.data?.message };
}

export async function apiPatch(url, body) {
  const res = await apiClient.patch(url, body);
  return { data: res.data?.data, meta: res.data?.meta || {}, message: res.data?.message };
}

export async function apiPut(url, body) {
  const res = await apiClient.put(url, body);
  return { data: res.data?.data, meta: res.data?.meta || {}, message: res.data?.message };
}

/**
 * Downloads a blob (e.g. the data-export JSON) with a friendly filename.
 * Returns the filename so callers can toast it.
 */
export async function apiDownload(url, filename) {
  const res = await apiClient.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  return filename;
}

export async function apiDelete(url) {
  const res = await apiClient.delete(url);
  return { data: res.data?.data, meta: res.data?.meta || {}, message: res.data?.message };
}

export default apiClient;

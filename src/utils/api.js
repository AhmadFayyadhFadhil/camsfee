// Central API Client for CAMS Frontend
const BASE_URL = '/api/v1';

class ApiClient {
  constructor() {
    // Clean up legacy localStorage keys to force migration to sessionStorage
    if (localStorage.getItem('cams_token')) {
      localStorage.removeItem('cams_token');
      localStorage.removeItem('cams_user');
    }
    this.token = sessionStorage.getItem('cams_token') || null;
    this.user = JSON.parse(sessionStorage.getItem('cams_user') || 'null');
    this.onUnauthorized = null; // Callback for when token expires
  }

  setToken(token, user) {
    this.token = token;
    this.user = user;
    if (token) {
      sessionStorage.setItem('cams_token', token);
      sessionStorage.setItem('cams_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('cams_token');
      sessionStorage.removeItem('cams_user');
    }
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  isAuthenticated() {
    return !!this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    // Set headers
    const headers = {
      'Accept': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Determine if request is FormData (for photo uploads)
    // If it is FormData, browser sets content-type automatically with boundaries, so delete it if manually set
    const isFormData = options.body instanceof FormData;
    if (!isFormData && options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle unauthorized
      if (response.status === 401) {
        this.setToken(null, null);
        if (this.onUnauthorized) {
          this.onUnauthorized();
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Sesi Anda telah berakhir. Silakan login kembali.');
      }

      // Check if response is a binary stream (e.g. download QR, stream image)
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('image/') || contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats-officedocument')) {
        if (!response.ok) {
          throw new Error(`Gagal mengunduh file: ${response.statusText}`);
        }
        return response.blob();
      }

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        // Handle validation errors from Laravel
        const error = new Error(data.message || 'Terjadi kesalahan sistem.');
        error.errors = data.errors || null;
        error.status = response.status;
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;

// Central API Client for CAMS Frontend with In-Flight Deduplication & Memory Cache
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

    // Performance Optimization: In-Flight Promise Deduplication & Memory Cache
    this.inFlightRequests = new Map();
    this.memoryCache = new Map();
  }

  setToken(token, user) {
    this.token = token;
    this.user = user;
    this.clearCache(); // Invalidate cache on user login/logout
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

  clearCache(prefix = '') {
    if (!prefix) {
      this.memoryCache.clear();
      return;
    }
    for (const key of this.memoryCache.keys()) {
      // Key format: `${token}:${endpoint}`
      const endpointPart = key.split(':').slice(1).join(':');
      if (endpointPart.startsWith(prefix) || endpointPart.includes(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Helper untuk menentukan prefix invalidasi otomatis berdasarkan endpoint mutasi
  getRelatedCachePrefixes(endpoint) {
    const cleanEndpoint = endpoint.split('?')[0].replace(/^\//, '');
    const segments = cleanEndpoint.split('/');
    const rootResource = '/' + segments[0];

    // Relasi invalidasi antar-entitas
    const relations = {
      '/rooms': ['/rooms', '/dashboard'],
      '/buildings': ['/buildings', '/rooms', '/dashboard'],
      '/schedules': ['/schedules', '/tasks', '/dashboard'],
      '/cs-assignments': ['/cs-assignments', '/schedules', '/tasks', '/dashboard'],
      '/checklist-templates': ['/checklist-templates', '/rooms', '/schedules', '/dashboard'],
      '/checklist-items': ['/checklist-items', '/checklist-templates', '/schedules'],
      '/users': ['/users', '/rooms', '/cs-assignments'],
      '/verifications': ['/verifications', '/tasks', '/dashboard', '/reports'],
      '/findings': ['/findings', '/dashboard'],
      '/tasks': ['/tasks', '/verifications', '/dashboard', '/reports'],
      '/cleaning-materials': ['/cleaning-materials', '/reports'],
      '/sla-parameters': ['/sla-parameters', '/verifications', '/dashboard'],
    };

    return relations[rootResource] || [rootResource];
  }

  async request(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const isGet = method === 'GET';
    const cacheKey = `${this.token || 'anon'}:${endpoint}`;

    // 1. Check in-memory cache for GET requests (Default TTL: 5 minutes for lookups, 15s for standard cache)
    let ttl = 0;
    if (typeof options.ttl === 'number') {
      ttl = options.ttl;
    } else if (options.lookup) {
      ttl = 300000; // 5 Menit untuk data master lookup
    } else if (options.cache) {
      ttl = 30000; // 30 Detik untuk data umum
    }

    if (isGet && !options.forceRefresh && ttl > 0) {
      const cached = this.memoryCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < ttl)) {
        return cached.data;
      }
    }

    // 2. In-Flight Request Deduplication for GET requests
    // Mencegah request ganda identik ditembakkan ke server di waktu yang sama (misal React StrictMode)
    if (isGet && !options.skipDedupe) {
      if (this.inFlightRequests.has(cacheKey)) {
        return this.inFlightRequests.get(cacheKey);
      }
    }

    const fetchPromise = (async () => {
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
      const isFormData = options.body instanceof FormData;
      if (!isFormData && options.body && typeof options.body === 'object') {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }

      const {
        cache: _appCache,
        ttl: _appTtl,
        lookup: _appLookup,
        skipDedupe: _appSkipDedupe,
        forceRefresh: _appForceRefresh,
        ...nativeFetchOptions
      } = options;

      const config = {
        ...nativeFetchOptions,
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
          const error = new Error(data.message || 'Terjadi kesalahan sistem.');
          error.errors = data.errors || null;
          error.status = response.status;
          throw error;
        }

        // Cache successful GET responses if TTL > 0
        if (isGet && ttl > 0) {
          this.memoryCache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        }

        // Targeted auto-invalidation on mutating operations (POST, PUT, PATCH, DELETE)
        if (!isGet) {
          const relatedPrefixes = this.getRelatedCachePrefixes(endpoint);
          for (const p of relatedPrefixes) {
            this.clearCache(p);
          }
        }

        return data;
      } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
      } finally {
        if (isGet) {
          this.inFlightRequests.delete(cacheKey);
        }
      }
    })();

    if (isGet && !options.skipDedupe) {
      this.inFlightRequests.set(cacheKey, fetchPromise);
    }

    return fetchPromise;
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


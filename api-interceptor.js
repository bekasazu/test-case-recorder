/**
 * API Request Interceptor for Chrome Extension
 * Captures fetch() and XMLHttpRequest calls during recording session
 * Communicates with background service worker for storage and filtering
 */

(function () {
  'use strict';

  // Config for API capturing
  const API_FILTER_CONFIG = {
    enabled: true,
    allowedDomains: ['*'],
    excludeDomains: [
      'google-analytics.com',
      'googletagmanager.com',
      'analytics.google.com',
      'cdn-cgi.com',
      'cdnjs.cloudflare.com',
      'unpkg.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com'
    ],
    captureMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
    captureResponseBodies: false,
    captureResponseHeaders: true,
    maxRequestBodySize: 50000,
    maxResponseBodySize: 50000,
    maxHeaderSize: 5000
  };

  let isRecording = false;
  const pendingRequests = new Map(); // Track requests by ID
  const MESSAGE_SOURCE = 'test-case-recorder-page';
  const CONTENT_SCRIPT_MESSAGE_SOURCE = 'test-case-recorder-context';

  /**
   * Generate unique request ID
   */
  function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Extract domain from URL
   */
  function extractDomain(url) {
    try {
      const u = new URL(url);
      return u.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Check if domain should be captured based on config
   */
  function shouldCaptureDomain(domain) {
    if (!API_FILTER_CONFIG.enabled || !domain) return false;
    
    // Check excluded domains
    for (const excluded of API_FILTER_CONFIG.excludeDomains) {
      if (domain.includes(excluded) || excluded.includes(domain)) {
        return false;
      }
    }
    
    // Check allowed domains
    if (API_FILTER_CONFIG.allowedDomains.includes('*')) {
      return true;
    }
    for (const allowed of API_FILTER_CONFIG.allowedDomains) {
      if (domain === allowed || domain.endsWith('.' + allowed)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Parse request/response body safely
   */
  function parseBody(body, contentType, maxSize) {
    if (!body) return null;
    
    const bodyStr = typeof body === 'string' ? body : String(body);
    if (bodyStr.length > maxSize) {
      return `[Body truncated - exceeds ${maxSize} bytes]`;
    }
    
    if (!contentType) return bodyStr;
    
    try {
      if (contentType.includes('application/json')) {
        return JSON.parse(bodyStr);
      }
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(bodyStr);
        const obj = {};
        for (const [key, val] of params) {
          obj[key] = val;
        }
        return obj;
      }
      if (contentType.includes('multipart/form-data')) {
        return '[FormData - not parsed]';
      }
    } catch (e) {
      return bodyStr;
    }
    
    return bodyStr;
  }

  /**
   * Extract headers from various header formats
   */
  function extractHeaders(headerSource) {
    const headers = {};
    if (!headerSource) return headers;
    
    if (typeof headerSource === 'object') {
      if (headerSource instanceof Headers) {
        for (const [key, val] of headerSource) {
          headers[key] = val;
        }
      } else {
        Object.assign(headers, headerSource);
      }
    } else if (typeof headerSource === 'string') {
      // Parse header string
      const lines = headerSource.split('\r\n');
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          const val = line.slice(colonIdx + 1).trim();
          headers[key] = val;
        }
      }
    }
    
    return headers;
  }

  /**
   * Mask sensitive headers for security
   */
  function maskSensitiveHeaders(headers) {
    const masked = { ...headers };
    const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'password', 'token'];
    
    for (const key of sensitiveKeys) {
      const lowerKey = Object.keys(masked).find(k => k.toLowerCase() === key);
      if (lowerKey) {
        const val = masked[lowerKey];
        masked[lowerKey] = typeof val === 'string' ? val.slice(0, 3) + '***' : '***';
      }
    }
    
    return masked;
  }

  /**
   * Send captured request to the content script bridge
   */
  function postMessageToContentScript(payload) {
    if (!isRecording) return;
    window.postMessage({ source: MESSAGE_SOURCE, ...payload }, '*');
  }

  function sendApiRequestToBackground(request) {
    if (!isRecording) return;
    postMessageToContentScript({ type: 'API_REQUEST', apiRequest: request });
  }

  /**
   * Intercept Fetch API
   */
  function interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = function (...args) {
      console.log("FETCH INTERCEPTED", args);
      if (!isRecording) {
        return originalFetch.apply(this, args);
      }

      const [resource, config = {}] = args;

      const url = typeof resource === 'string'
        ? resource
        : resource.url;

      const method = config.method || 'GET';
      const headers = new Headers(config.headers || {});

      const contentType = headers.get('content-type') || '';

      let requestBody = null;
      let requestBodyRaw = '';

      if (
        config.body &&
        method !== 'GET' &&
        method !== 'HEAD'
      ) {
        try {

          if (typeof config.body === 'string') {

            requestBodyRaw = config.body;

          } else if (config.body instanceof URLSearchParams) {

            requestBodyRaw = config.body.toString();

          } else if (config.body instanceof FormData) {

            requestBodyRaw = JSON.stringify(
              Object.fromEntries(config.body.entries())
            );

          } else if (config.body instanceof Blob) {

            requestBodyRaw = '[Blob body]';

          } else {

            requestBodyRaw = String(config.body);

          }


          requestBody = parseBody(
            requestBodyRaw,
            contentType,
            API_FILTER_CONFIG.maxRequestBodySize
          );

        } catch(e) {
          console.warn(
            '[Interceptor] Body parse error',
            e
          );
        }
      }
      const url = typeof resource === 'string'
        ? resource
        : resource.url;
      const domain = extractDomain(url);
      
      if (!shouldCaptureDomain(domain)) {
        return originalFetch.apply(this, args);
      }

      const requestId = generateRequestId();
      const startTime = Date.now();
      
      //const method = request.method || 'GET';
      if (!API_FILTER_CONFIG.captureMethods.includes(method)) {
        return originalFetch.apply(this, args);
      }

      // Extract request body
      let requestBody = null;
      let requestBodyRaw = '';
      const contentType = request.headers?.get?.('content-type') || '';
      
      if (request.body && method !== 'GET' && method !== 'HEAD') {
        if (request.body instanceof ReadableStream) {
          // Can't clone if already consumed, so just note it
          requestBodyRaw = '[ReadableStream body]';
        } else {
          try {
            requestBodyRaw = typeof request.body === 'string' ? request.body : String(request.body);
            requestBody = parseBody(requestBodyRaw, contentType, API_FILTER_CONFIG.maxRequestBodySize);
          } catch (e) {
            requestBodyRaw = '[Error reading body]';
          }
        }
      }

      // Extract request headers
      const requestHeaders = {};
      try {
        for (const [key, val] of request.headers || []) {
          requestHeaders[key] = val;
        }
      } catch (e) {
        // Headers may be restricted
      }

      const apiRequest = {
        requestId,
        timestamp: new Date().toISOString(),
        method,
        url,
        domain,
        endpoint: request.url.replace(/^https?:\/\/[^/]+/, ''),
        status: null,
        headers: maskSensitiveHeaders(requestHeaders),
        requestBody,
        requestBodyRaw,
        requestContentType: contentType,
        responseHeaders: {},
        responseBody: null,
        responseBodyRaw: '',
        responseContentType: '',
        pageUrl: window.location.href,
        pageTitle: document.title,
        duration: 0,
        initiator: 'fetch',
        size: 0,
        fromCache: false,
        relatedStep: null
      };

      pendingRequests.set(requestId, apiRequest);
      console.log("[INTERCEPTOR]", apiRequest);
      sendApiRequestToBackground(apiRequest);

      // Call original fetch
      return originalFetch.apply(this, args)
        .then(response => {
          const duration = Date.now() - startTime;
          apiRequest.status = response.status;
          apiRequest.duration = duration;
          
          // Try to capture response headers
          if (API_FILTER_CONFIG.captureResponseHeaders) {
            try {
              for (const [key, val] of response.headers || []) {
                apiRequest.responseHeaders[key] = val;
              }
            } catch (e) {
              // Headers may be restricted
            }
            const respContentType = response.headers?.get?.('content-type') || '';
            apiRequest.responseContentType = respContentType;
          }

          // Clone response to read body without consuming original
          const clonedResponse = response.clone();
          
          if (API_FILTER_CONFIG.captureResponseBodies) {
            return clonedResponse.text()
              .then(text => {
                apiRequest.size = text.length;
                apiRequest.responseBodyRaw = text;
                apiRequest.responseBody = parseBody(
                  text,
                  apiRequest.responseContentType,
                  API_FILTER_CONFIG.maxResponseBodySize
                );
                sendApiRequestToBackground(apiRequest);
                pendingRequests.delete(requestId);
                return response;
              })
              .catch(err => {
                console.debug('[API Interceptor] Error reading response body:', err);
                sendApiRequestToBackground(apiRequest);
                pendingRequests.delete(requestId);
                return response;
              });
          } else {
            sendApiRequestToBackground(apiRequest);
            pendingRequests.delete(requestId);
            return response;
          }
        })
        .catch(error => {
          const duration = Date.now() - startTime;
          apiRequest.duration = duration;
          apiRequest.status = 0; // Network error
          sendApiRequestToBackground(apiRequest);
          pendingRequests.delete(requestId);
          throw error;
        });
    };

    // Copy properties
    window.fetch.toString = originalFetch.toString.bind(originalFetch);
  }

  /**
   * Intercept XMLHttpRequest
   */
  function interceptXHR() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      if (isRecording) {
        this._apiMethod = method;
        this._apiUrl = url;
        this._apiHeaders = {};
        this._apiStartTime = Date.now();
        
        const domain = extractDomain(url);
        this._apiShouldCapture = shouldCaptureDomain(domain) && 
                                 API_FILTER_CONFIG.captureMethods.includes(method);
      }
      return originalOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      if (this._apiShouldCapture) {
        this._apiHeaders[header] = value;
      }
      return originalSetRequestHeader.apply(this, [header, value]);
    };

    XMLHttpRequest.prototype.send = function (body) {
      if (!isRecording || !this._apiShouldCapture) {
        return originalSend.apply(this, [body]);
      }

      const requestId = generateRequestId();
      const url = this._apiUrl;
      const domain = extractDomain(url);
      const method = this._apiMethod || 'GET';
      const contentType = this._apiHeaders['content-type'] || this._apiHeaders['Content-Type'] || '';

      // Parse request body
      let requestBody = null;
      let requestBodyRaw = '';
      if (body && method !== 'GET' && method !== 'HEAD') {
        try {
          requestBodyRaw = typeof body === 'string' ? body : String(body);
          requestBody = parseBody(requestBodyRaw, contentType, API_FILTER_CONFIG.maxRequestBodySize);
        } catch (e) {
          requestBodyRaw = '[Error reading body]';
        }
      }

      const apiRequest = {
        requestId,
        timestamp: new Date().toISOString(),
        method,
        url,
        domain,
        endpoint: url.replace(/^https?:\/\/[^/]+/, ''),
        status: null,
        headers: maskSensitiveHeaders(this._apiHeaders),
        requestBody,
        requestBodyRaw,
        requestContentType: contentType,
        responseHeaders: {},
        responseBody: null,
        responseBodyRaw: '',
        responseContentType: '',
        pageUrl: window.location.href,
        pageTitle: document.title,
        duration: 0,
        initiator: 'xhr',
        size: 0,
        fromCache: false,
        relatedStep: null
      };

      pendingRequests.set(requestId, apiRequest);
      sendApiRequestToBackground(apiRequest);

      // Track response
      const onReadyStateChange = () => {
        if (this.readyState === 4) {
          const duration = Date.now() - this._apiStartTime;
          apiRequest.status = this.status;
          apiRequest.duration = duration;

          if (API_FILTER_CONFIG.captureResponseHeaders) {
            try {
              const headerStr = this.getAllResponseHeaders?.();
              if (headerStr) {
                const headers = extractHeaders(headerStr);
                apiRequest.responseHeaders = headers;
                const respContentType = this.getResponseHeader?.('content-type') || '';
                apiRequest.responseContentType = respContentType;
              }
            } catch (e) {
              // Headers may be restricted
            }
          }

          if (API_FILTER_CONFIG.captureResponseBodies) {
            try {
              const responseText = this.responseText || '';
              apiRequest.size = responseText.length;
              apiRequest.responseBodyRaw = responseText;
              apiRequest.responseBody = parseBody(
                responseText,
                apiRequest.responseContentType,
                API_FILTER_CONFIG.maxResponseBodySize
              );
            } catch (e) {
              console.debug('[API Interceptor] Error reading XHR response:', e);
            }
          }

          sendApiRequestToBackground(apiRequest);
          pendingRequests.delete(requestId);
        }
      };

      this.addEventListener('readystatechange', onReadyStateChange);

      return originalSend.apply(this, [body]);
    };
  }

  /**
   * Listen for recording state changes from the content script bridge
   */
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const message = event.data;
    if (!message || message.source !== CONTENT_SCRIPT_MESSAGE_SOURCE) return;
    if (message.type !== 'RECORDING_STATE') return;

    isRecording = Boolean(message.isRecording);
    if (isRecording) {
      console.debug('[API Interceptor] Recording started');
    } else {
      console.debug('[API Interceptor] Recording stopped');
    }
  });

  /**
   * Setup interceptors immediately in page context
   */
  function setupInterceptors() {
    try {
      interceptFetch();
      interceptXHR();
      console.debug('[API Interceptor] Interceptors installed');
    } catch (err) {
      console.error('[API Interceptor] Setup error:', err);
    }
  }

  setupInterceptors();

  // Expose for testing/debugging
  if (typeof window !== 'undefined') {
    window.__apiInterceptor = {
      isRecording: () => isRecording,
      getPendingRequests: () => Array.from(pendingRequests.values()),
      getConfig: () => API_FILTER_CONFIG,
      updateConfig: (newConfig) => Object.assign(API_FILTER_CONFIG, newConfig)
    };
  }
})();

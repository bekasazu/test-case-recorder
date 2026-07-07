/**
 * Postman Collection v2.1 Generator
 * Generates a valid Postman collection from captured API requests
 */

/**
 * Parse URL into components for Postman format
 */
function parseUrlForPostman(urlString) {
  try {
    const url = new URL(urlString);
    const host = url.hostname.split('.').filter(Boolean);
    const path = url.pathname.split('/').filter(Boolean);
    
    // Include query params in path if present
    let pathWithQuery = path;
    if (url.search) {
      pathWithQuery = path;
      // Query params handled separately in Postman
    }

    return {
      protocol: url.protocol.replace(':', ''),
      host,
      path: path,
      query: parseUrlQuery(url.search),
      port: url.port ? parseInt(url.port) : undefined,
      raw: urlString
    };
  } catch (e) {
    return {
      protocol: 'https',
      host: ['example', 'com'],
      path: ['api'],
      query: [],
      raw: urlString
    };
  }
}

/**
 * Parse query string into Postman format
 */
function parseUrlQuery(queryString) {
  if (!queryString) return [];
  
  const params = [];
  const searchParams = new URLSearchParams(queryString);
  for (const [key, val] of searchParams) {
    params.push({ key, value: val });
  }
  return params;
}

/**
 * Extract unique domain from multiple requests
 */
function extractUniqueDomain(apiRequests) {
  const domains = new Set();
  for (const req of apiRequests) {
    if (req.domain) domains.add(req.domain);
  }
  return domains.size === 1 ? Array.from(domains)[0] : null;
}

/**
 * Group requests by domain
 */
function groupByDomain(apiRequests) {
  const groups = {};
  for (const req of apiRequests) {
    const domain = req.domain || 'other';
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(req);
  }
  return groups;
}

/**
 * Create a Postman request item from API request
 */
function createPostmanItem(apiRequest) {
  const urlParsed = parseUrlForPostman(apiRequest.url);
  
  // Build request body
  let bodyObj = null;
  if (apiRequest.requestBody || apiRequest.requestBodyRaw) {
    if (typeof apiRequest.requestBody === 'object') {
      bodyObj = {
        mode: 'raw',
        raw: JSON.stringify(apiRequest.requestBody, null, 2)
      };
    } else if (apiRequest.requestBodyRaw) {
      bodyObj = {
        mode: 'raw',
        raw: apiRequest.requestBodyRaw
      };
    }
  }

  // Build headers array
  const headers = [];
  if (apiRequest.headers && typeof apiRequest.headers === 'object') {
    for (const [key, val] of Object.entries(apiRequest.headers)) {
      headers.push({
        key,
        value: String(val),
        disabled: false
      });
    }
  }
  // Add content type if not already present
  if (apiRequest.requestContentType && !headers.find(h => h.key.toLowerCase() === 'content-type')) {
    headers.push({
      key: 'Content-Type',
      value: apiRequest.requestContentType,
      disabled: false
    });
  }

  // Build item
  const item = {
    name: `${apiRequest.method} ${apiRequest.endpoint || ''}`.trim(),
    request: {
      method: apiRequest.method,
      header: headers,
      url: urlParsed,
      description: `Status: ${apiRequest.status || 'unknown'} | Duration: ${apiRequest.duration || 0}ms`
    }
  };

  if (bodyObj) {
    item.request.body = bodyObj;
  }

  // Add response as example if available
  if (apiRequest.responseBody !== null && apiRequest.responseBody !== undefined) {
    const responseStr = typeof apiRequest.responseBody === 'object'
      ? JSON.stringify(apiRequest.responseBody, null, 2)
      : String(apiRequest.responseBody);
    
    item.response = [{
      name: `${apiRequest.status} Response`,
      originalRequest: item.request,
      status: apiRequest.status || 'Unknown',
      code: apiRequest.status || 0,
      _postman_previewlanguage: 'json',
      header: Object.entries(apiRequest.responseHeaders || {}).map(([key, val]) => ({
        key,
        value: String(val)
      })),
      cookie: [],
      body: responseStr
    }];
  }

  return item;
}

/**
 * Generate Postman Collection v2.1
 * Organize by domain and endpoint
 */
function generatePostmanCollection(apiRequests, options = {}) {
  if (!Array.isArray(apiRequests) || apiRequests.length === 0) {
    return {
      info: {
        name: 'Empty Collection',
        description: 'No API requests captured',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: []
    };
  }

  const {
    testCaseName = 'Recorded Test Case',
    testCaseDescription = '',
    groupBy = 'domain', // 'domain' | 'endpoint' | 'method'
    includeResponses = false
  } = options;

  // Filter responses if not requested
  const filteredRequests = includeResponses ? apiRequests : apiRequests.map(req => ({
    ...req,
    responseBody: null,
    responseHeaders: {}
  }));

  let items = [];
  let uniqueDomain = extractUniqueDomain(filteredRequests);

  if (groupBy === 'domain') {
    const grouped = groupByDomain(filteredRequests);
    
    for (const [domain, requests] of Object.entries(grouped)) {
      const domainFolder = {
        name: domain,
        item: requests.map(createPostmanItem)
      };
      items.push(domainFolder);
    }
  } else if (groupBy === 'method') {
    const grouped = {};
    for (const req of filteredRequests) {
      const method = req.method;
      if (!grouped[method]) {
        grouped[method] = [];
      }
      grouped[method].push(req);
    }
    
    for (const [method, requests] of Object.entries(grouped)) {
      const methodFolder = {
        name: `${method} Requests`,
        item: requests.map(createPostmanItem)
      };
      items.push(methodFolder);
    }
  } else if (groupBy === 'endpoint') {
    const grouped = {};
    for (const req of filteredRequests) {
      const endpoint = req.endpoint || '/';
      if (!grouped[endpoint]) {
        grouped[endpoint] = [];
      }
      grouped[endpoint].push(req);
    }
    
    for (const [endpoint, requests] of Object.entries(grouped)) {
      const endpointFolder = {
        name: endpoint || 'Root',
        item: requests.map(createPostmanItem)
      };
      items.push(endpointFolder);
    }
  } else {
    // Default: flat list
    items = filteredRequests.map(createPostmanItem);
  }

  // Build collection info
  const generatedAt = new Date().toISOString();
  const totalRequests = filteredRequests.length;

  const collection = {
    info: {
      name: testCaseName,
      description: testCaseDescription || `Recorded ${totalRequests} API requests on ${generatedAt.split('T')[0]}`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _postman_id: generateUUID(),
      _exporter_id: '0'
    },
    item: items,
    variable: []
  };

  return collection;
}

/**
 * Generate simple UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate HAR (HTTP Archive) format
 */
function generateHAR(apiRequests, options = {}) {
  const {
    testCaseName = 'Recorded Session',
    pageUrl = ''
  } = options;

  const entries = apiRequests.map(req => ({
    startedDateTime: req.timestamp,
    time: req.duration,
    request: {
      method: req.method,
      url: req.url,
      httpVersion: 'HTTP/1.1',
      headers: Object.entries(req.headers || {}).map(([name, value]) => ({
        name,
        value: String(value)
      })),
      queryString: [],
      cookies: [],
      headersSize: -1,
      bodySize: req.requestBodyRaw ? req.requestBodyRaw.length : -1,
      postData: req.requestBodyRaw ? {
        mimeType: req.requestContentType || 'text/plain',
        text: req.requestBodyRaw
      } : undefined
    },
    response: {
      status: req.status || 0,
      statusText: req.status ? 'OK' : 'Network Error',
      httpVersion: 'HTTP/1.1',
      headers: Object.entries(req.responseHeaders || {}).map(([name, value]) => ({
        name,
        value: String(value)
      })),
      cookies: [],
      content: {
        size: req.size || 0,
        mimeType: req.responseContentType || 'text/plain',
        text: req.responseBodyRaw || ''
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: req.size || -1
    },
    cache: {},
    timings: {
      blocked: -1,
      dns: -1,
      connect: -1,
      send: -1,
      wait: req.duration || 0,
      receive: -1,
      ssl: -1
    }
  }));

  return {
    log: {
      version: '1.2.0',
      creator: {
        name: 'Test Case Recorder',
        version: '1.0.5'
      },
      entries: entries,
      pages: [{
        startedDateTime: new Date().toISOString(),
        id: 'page_1',
        title: testCaseName,
        pageTimings: {
          onContentLoad: -1,
          onLoad: -1
        }
      }]
    }
  };
}

// Export for service worker and panel/popup
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generatePostmanCollection,
    generateHAR,
    generateUUID,
    parseUrlForPostman,
    parseUrlQuery
  };
}

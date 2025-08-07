/**
 * =============================================================================
 * TITLE EXTRACTION PROXY SERVER
 * =============================================================================
 * 
 * This is a simple Node.js server that can be used to fetch page titles
 * from external websites, bypassing CORS limitations.
 * 
 * In production, you would:
 * 1. Add proper error handling
 * 2. Implement rate limiting
 * 3. Add caching (Redis, memory cache)
 * 4. Add input validation and sanitization
 * 5. Add authentication/authorization
 * 6. Handle timeouts and retries
 * 
 * Usage:
 * node server/title-proxy.js
 * Then call: http://localhost:3001/api/page-title?url=https://www.ups.com
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

// Simple in-memory cache with TTL (milliseconds)
const cache = new Map(); // key: url, value: { title, expiresAt }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Default port moved to 3002 to avoid conflict with API server (3001)
const PORT = process.env.TITLE_PROXY_PORT || process.env.PORT || 3002;

function getCachedTitle(url) {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(url);
    return null;
  }
  return entry.title;
}

function setCachedTitle(url, title) {
  cache.set(url, { title, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Extract title from HTML content
 * @param {string} html - The HTML content
 * @returns {string|null} The extracted title or null
 */
function decodeHtmlEntities(str) {
  if (!str) return str;
  const map = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#96;': '`'
  };
  return String(str)
    .replace(/&#(x?[0-9A-Fa-f]+);/g, (_, code) => {
      try {
        if (code.startsWith('x') || code.startsWith('X')) {
          return String.fromCharCode(parseInt(code.slice(1), 16));
        }
        return String.fromCharCode(parseInt(code, 10));
      } catch {
        return _;
      }
    })
    .replace(/&(amp|lt|gt|quot|#39|#96);/g, (m) => map[m] || m);
}

function extractTitle(html) {
  if (!html) return null;
  // Primary: <title> ... </title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    const t = titleMatch[1].replace(/\s+/g, ' ').trim();
    return decodeHtmlEntities(t);
  }
  // Fallback: Open Graph
  const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]*>/i);
  if (ogMatch) {
    const contentMatch = ogMatch[0].match(/content=["']([^"']+)["']/i);
    if (contentMatch && contentMatch[1]) {
      return decodeHtmlEntities(contentMatch[1].trim());
    }
  }
  // Fallback: Twitter
  const twMatch = html.match(/<meta[^>]+name=["']twitter:title["'][^>]*>/i);
  if (twMatch) {
    const contentMatch = twMatch[0].match(/content=["']([^"']+)["']/i);
    if (contentMatch && contentMatch[1]) {
      return decodeHtmlEntities(contentMatch[1].trim());
    }
  }
  return null;
}

/**
 * Fetch page content and extract title
 * @param {string} targetUrl - The URL to fetch
 * @returns {Promise<string>} Promise that resolves to title
 */
function fetchPageTitle(targetUrl, maxRedirects = 3) {
  const cached = getCachedTitle(targetUrl);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    let resolved = false;
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TitleExtractor/1.1)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity',
        'DNT': '1',
        'Connection': 'close'
      },
      timeout: 12000 // 12 second timeout
    };

    const req = client.request(options, (res) => {
      const { statusCode = 0, headers } = res;

      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location) {
        res.resume(); // drain
        if (maxRedirects <= 0) {
          if (!resolved) {
            resolved = true;
            reject(new Error('Too many redirects'));
          }
          return;
        }
        try {
          const nextUrl = new URL(headers.location, urlObj);
          fetchPageTitle(nextUrl.toString(), maxRedirects - 1)
            .then((title) => {
              setCachedTitle(targetUrl, title);
              if (!resolved) { resolved = true; resolve(title); }
            })
            .catch((e) => { if (!resolved) { resolved = true; reject(e); } });
        } catch (e) {
          if (!resolved) { resolved = true; reject(e); }
        }
        return;
      }

      // Only parse body for 2xx
      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        if (!resolved) { resolved = true; reject(new Error(`HTTP ${statusCode}`)); }
        return;
      }

      const contentType = headers['content-type'] || '';
      const looksHtml = contentType.includes('text/html') || contentType.includes('application/xhtml+xml') || contentType === '';
      if (!looksHtml) {
        res.resume();
        if (!resolved) { resolved = true; reject(new Error('Not an HTML page')); }
        return;
      }

      let data = '';
      const MAX_BYTES = 100 * 1024; // 100KB
      res.on('data', (chunk) => {
        if (resolved) return;
        data += chunk;
        // Try early extraction to minimize bytes
        const title = extractTitle(data);
        if (title) {
          setCachedTitle(targetUrl, title);
          resolved = true;
          res.destroy();
          resolve(title);
          return;
        }
        if (data.length > MAX_BYTES) {
          res.destroy();
        }
      });

      res.on('end', () => {
        if (resolved) return;
        const title = extractTitle(data);
        if (title) {
          setCachedTitle(targetUrl, title);
          resolved = true;
          resolve(title);
        } else {
          resolved = true;
          reject(new Error('No title found'));
        }
      });

      res.on('error', (err) => {
        if (!resolved) { resolved = true; reject(err); }
      });
    });

    req.on('error', (error) => {
      if (!resolved) { resolved = true; reject(error); }
    });

    req.on('timeout', () => {
      req.destroy();
      if (!resolved) { resolved = true; reject(new Error('Request timeout')); }
    });

    req.end();
  });
}

/**
 * HTTP Server request handler
 */
const server = http.createServer(async (req, res) => {
  // Enable CORS for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only handle GET requests to /api/page-title
  if (req.method !== 'GET' || !req.url.startsWith('/api/page-title')) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const targetUrl = parsedUrl.searchParams.get('url');

    if (!targetUrl) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'URL parameter is required' }));
      return;
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch (urlError) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid URL format' }));
      return;
    }

    console.log(`Fetching title for: ${targetUrl}`);
    
  const title = await fetchPageTitle(targetUrl);
    
    res.writeHead(200);
    res.end(JSON.stringify({ 
      url: targetUrl, 
      title: title,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Error fetching title:', error.message);
    
    res.writeHead(500);
    res.end(JSON.stringify({ 
      error: 'Failed to fetch page title',
      details: error.message 
    }));
  }
});

server.listen(PORT, () => {
  console.log(`Title extraction proxy server running on http://localhost:${PORT}`);
  console.log(`Test with: http://localhost:${PORT}/api/page-title?url=https://www.ups.com`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

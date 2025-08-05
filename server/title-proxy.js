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

/**
 * Extract title from HTML content
 * @param {string} html - The HTML content
 * @returns {string|null} The extracted title or null
 */
function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim().replace(/\s+/g, ' '); // Clean up whitespace
  }
  return null;
}

/**
 * Fetch page content and extract title
 * @param {string} targetUrl - The URL to fetch
 * @returns {Promise<string>} Promise that resolves to title
 */
function fetchPageTitle(targetUrl) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TitleExtractor/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity', // Don't compress for simplicity
        'DNT': '1',
        'Connection': 'close'
      },
      timeout: 10000 // 10 second timeout
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      // Only process HTML content
      const contentType = res.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        reject(new Error('Not an HTML page'));
        return;
      }
      
      res.on('data', (chunk) => {
        data += chunk;
        // Stop collecting data once we have enough to find the title
        if (data.length > 50000) { // Limit to 50KB
          res.destroy();
        }
      });
      
      res.on('end', () => {
        const title = extractTitle(data);
        if (title) {
          resolve(title);
        } else {
          reject(new Error('No title found'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
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

const PORT = process.env.PORT || 3001;

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

// Title proxy integration tests
// Purpose: Spin up a local HTML server and the proxy, and validate title extraction,
// non-HTML rejection, redirects, and missing-parameter validation.
import { expect } from 'chai';
import http from 'http';
import { once } from 'events';

// We will spawn the title-proxy as a child process to use its actual server.
import { spawn } from 'node:child_process';

// Minimal local server to provide HTML, JSON, and a redirect for the proxy to consume
function startSimpleHtmlServer(port) {
  const html = '<!doctype html><html><head><title>Local Test Page</title></head><body>ok</body></html>';
  const server = http.createServer((req, res) => {
    if (req.url === '/json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
      return;
    }
    if (req.url === '/redir') {
      res.statusCode = 302;
      res.setHeader('Location', `http://localhost:${port}/`);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
  return new Promise((resolve, reject) => {
    server.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}

// Wait until the proxy prints its ready banner in stdout
async function waitForProxyReady(proc, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('proxy start timeout')), timeoutMs);
    proc.stdout.on('data', (d) => {
      const s = d.toString();
      if (s.includes('Title extraction proxy server running')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    proc.stderr.on('data', () => {});
  });
}

// Simple GET helper returning raw body for manual JSON.parse
async function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

describe('Integration: title-proxy', function () {
  this.timeout(15000);

  let htmlServer;
  let proxyProc;
  const htmlPort = 4567;
  const proxyPort = 3002; // default in title-proxy

  before(async () => {
    // Start both local content server and the proxy under test
    htmlServer = await startSimpleHtmlServer(htmlPort);
    proxyProc = spawn(process.execPath, ['server/title-proxy.js'], {
      env: { ...process.env, PORT: String(proxyPort) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await waitForProxyReady(proxyProc);
  });

  after(async () => {
    // Gracefully shut down servers after tests
    if (htmlServer) await new Promise((r) => htmlServer.close(r));
    if (proxyProc) proxyProc.kill('SIGTERM');
    // Give it a moment to close
    await new Promise((r) => setTimeout(r, 200));
  });

  it('returns the page title for a local HTML server', async () => {
    const target = encodeURIComponent(`http://localhost:${htmlPort}`);
    const { status, body } = await httpGet(`http://localhost:${proxyPort}/api/page-title?url=${target}`);
    expect(status).to.equal(200);
    const json = JSON.parse(body);
    expect(json).to.have.property('title', 'Local Test Page');
    expect(json).to.have.property('url');
  });

  it('rejects non-HTML content', async () => {
    const target = encodeURIComponent(`http://localhost:${htmlPort}/json`);
    const { status, body } = await httpGet(`http://localhost:${proxyPort}/api/page-title?url=${target}`);
    expect([400,500]).to.include(status); // proxy returns 500 on failure path
  });

  it('follows a simple redirect', async () => {
    const target = encodeURIComponent(`http://localhost:${htmlPort}/redir`);
    const { status, body } = await httpGet(`http://localhost:${proxyPort}/api/page-title?url=${target}`);
    expect(status).to.equal(200);
    const json = JSON.parse(body);
    expect(json.title).to.equal('Local Test Page');
  });

  it('validates missing url param', async () => {
    const { status, body } = await httpGet(`http://localhost:${proxyPort}/api/page-title`);
    expect(status).to.equal(400);
    const json = JSON.parse(body);
    expect(json.error).to.match(/required/i);
  });
});

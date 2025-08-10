import { spawn } from 'node:child_process';
import http from 'http';

const API_PORT = 3001;
let apiProc;

async function waitForLog(proc, match, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout waiting for log')), timeoutMs);
    const onData = (d) => {
      const s = d.toString();
      if (s.includes(match)) {
        clearTimeout(t);
        proc.stdout.off('data', onData);
        resolve();
      }
    };
    proc.stdout.on('data', onData);
  });
}

async function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(body || {}));
    req.end();
  });
}

async function waitForApiReady(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { status } = await httpPost(`http://localhost:${API_PORT}/api/test-connection`, {
        server: 'localhost,1433',
        database: 'TestNet_001'
      });
      if (status === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export const mochaHooks = {
  async beforeAll() {
    this.timeout?.(30000);
    apiProc = spawn(process.execPath, ['server/api-server.js'], { stdio: ['ignore', 'pipe', 'pipe'] });
    await waitForLog(apiProc, 'API Server running');
    const ready = await waitForApiReady();
    if (!ready) {
      throw new Error('Database not available: /api/test-connection did not succeed');
    }
  },
  async afterAll() {
    if (apiProc) {
      apiProc.kill('SIGINT');
      await new Promise((r) => setTimeout(r, 200));
    }
  }
};

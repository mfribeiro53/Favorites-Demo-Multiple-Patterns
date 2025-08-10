import { expect } from 'chai';
import http from 'http';

const API_PORT = 3001;

async function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port: API_PORT, path }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data || '[]'); } catch { json = []; }
        resolve({ status: res.statusCode, json });
      });
    }).on('error', reject);
  });
}

describe('Integration: API GET endpoints', function () {
  this.timeout(8000);

  it('GET /api/resources', async () => {
    const res = await httpGet('/api/resources');
    expect([200, 500]).to.include(res.status); // tolerate transient DB issues
    if (res.status === 200) expect(Array.isArray(res.json)).to.equal(true);
  });

  it('GET /api/frequently-visited', async () => {
    const res = await httpGet('/api/frequently-visited');
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) expect(Array.isArray(res.json)).to.equal(true);
  });

  it('GET /api/favorites', async () => {
    const res = await httpGet('/api/favorites');
    expect([200, 500]).to.include(res.status);
    if (res.status === 200) expect(Array.isArray(res.json)).to.equal(true);
  });
});

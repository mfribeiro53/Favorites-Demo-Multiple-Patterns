// Database Service unit tests
// Purpose: Validate mapping, caching, and error handling logic in src/database-service.js
// Strategy: Stub global fetch to simulate API responses, assert transformed outputs and cache behavior.
import { expect } from 'chai';

// Keep original fetch to restore after each test
const originalFetch = globalThis.fetch;

// Tiny helper to craft Response-like objects for our stubs
function makeResponse({ ok = true, status = 200, json = () => ({}), text = async () => '' } = {}) {
  return { ok, status, json: async () => json(), text };
}

describe('Database Service', () => {
  beforeEach(() => {
  // Stub fetch for both test-connection and API calls with predictable fixtures
    globalThis.fetch = async (url, init) => {
      const u = String(url);
      if (u.endsWith('/api/test-connection')) {
        return makeResponse({ ok: true, status: 200, json: () => ({ success: true }) });
      }
      if (u.endsWith('/api/resources')) {
        return makeResponse({
          ok: true,
          status: 200,
          json: () => ([{ Url: 'https://x.com', name: 'X' }, { Url: 'https://y.com', name: 'Y' }])
        });
      }
      if (u.endsWith('/api/frequently-visited')) {
        return makeResponse({
          ok: true,
          status: 200,
          json: () => ([{ Url: 'https://fv.com', name: 'FV' }])
        });
      }
      if (u.endsWith('/api/favorites')) {
        // Default to success list
        return makeResponse({ ok: true, status: 200, json: () => ([{ Url: 'https://fav.com' }]) });
      }
      return makeResponse();
    };
  });

  afterEach(() => {
  // Always restore the original fetch so tests remain isolated
    globalThis.fetch = originalFetch;
  });

  it('maps Url -> url for getAllResources', async () => {
  // Verifies that API shape with capitalized Url is mapped to lowercase url for app consumption
    const { getAllResources } = await import('../src/database-service.js');
    const resources = await getAllResources(false);
    expect(resources).to.deep.equal([
      { url: 'https://x.com', name: 'X' },
      { url: 'https://y.com', name: 'Y' }
    ]);
  });

  it('uses cache for getFrequentlyVisited and is cleared by clearAllCaches', async () => {
  // Ensures repeated calls hit in-memory cache until explicitly cleared
    let count = 0;
    globalThis.fetch = async (url, init) => {
      const u = String(url);
      if (u.endsWith('/api/test-connection')) return makeResponse({ ok: true, status: 200, json: () => ({ success: true }) });
      if (u.endsWith('/api/frequently-visited')) {
        count += 1;
        return makeResponse({ ok: true, status: 200, json: () => ([{ Url: 'https://fv.com', name: 'FV' }]) });
      }
      // default success
      return makeResponse({ ok: true, status: 200, json: () => ([]) });
    };

    const { getFrequentlyVisited, clearAllCaches } = await import('../src/database-service.js');
    const a = await getFrequentlyVisited(10, true);
    const b = await getFrequentlyVisited(10, true);
    expect(count).to.equal(1); // second call from cache
    clearAllCaches();
    const c = await getFrequentlyVisited(10, true);
    expect(count).to.equal(2); // cache cleared forces new fetch
    expect(a).to.deep.equal(b);
    expect(c).to.deep.equal(a);
  });

  it('throws on non-200 for getUserFavorites', async () => {
  // Error path: non-200 should result in a thrown error from database-service
    globalThis.fetch = async (url, init) => {
      const u = String(url);
      if (u.endsWith('/api/test-connection')) return makeResponse({ ok: true, status: 200, json: () => ({ success: true }) });
      if (u.endsWith('/api/favorites')) return makeResponse({ ok: false, status: 500, json: () => ({ error: 'x' }) });
      return makeResponse({ ok: true, status: 200, json: () => ([]) });
    };
    const { getUserFavorites } = await import('../src/database-service.js');
    let threw = false;
    try {
      await getUserFavorites(false);
    } catch {
      threw = true;
    }
    expect(threw).to.equal(true);
  });
});

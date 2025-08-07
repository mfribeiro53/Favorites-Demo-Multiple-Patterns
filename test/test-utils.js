import assert from 'node:assert/strict';
import { normalizeUrl, deriveDisplayName, escapeHTML, escapeAttr } from '../src/utils/url-display.js';

// URL normalization tests
assert.equal(normalizeUrl('example.com'), 'https://example.com');
assert.equal(normalizeUrl('https://example.com'), 'https://example.com');
assert.equal(normalizeUrl(' HTTP://Example.com '), 'HTTP://Example.com'.trim());
assert.equal(normalizeUrl(' HTTPS://github.com'), 'HTTPS://github.com');
assert.equal(normalizeUrl(' //example.org '), 'https://example.org');

// Display name derivation tests (domain mapping)
// Display name derivation tests (heuristic fallback)
assert.equal(deriveDisplayName('https://www.github.com/user/repo').startsWith('Github') || deriveDisplayName('https://www.github.com/user/repo').startsWith('GitHub'), true);
assert.equal(deriveDisplayName('amazon.com').startsWith('Amazon'), true);
assert.equal(deriveDisplayName('custom-domain.org').startsWith('Custom-domain (.org)'), true);

// Path enhancement should append last path segment when meaningful
const d1 = deriveDisplayName('https://site.com/products/widgets');
assert.equal(d1.includes(' - Widgets'), true);
const d2 = deriveDisplayName('https://site.com/index');
assert.equal(d2.includes(' - '), false);

// Escaping
assert.equal(escapeHTML('<b>x</b> & "\''), '&lt;b&gt;x&lt;/b&gt; &amp; &quot;&#39;');
assert.equal(escapeAttr('a&b"c'), 'a&amp;b&quot;c');

console.log('test-utils: PASS');

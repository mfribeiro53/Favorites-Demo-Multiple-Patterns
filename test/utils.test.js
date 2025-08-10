import { expect } from 'chai';
import { normalizeUrl, deriveDisplayName, escapeHTML, escapeAttr } from '../src/utils/url-display.js';

describe('URL utils', () => {
  it('normalizes URLs', () => {
    expect(normalizeUrl('example.com')).to.equal('https://example.com');
    expect(normalizeUrl('https://example.com')).to.equal('https://example.com');
    expect(normalizeUrl(' HTTP://Example.com ')).to.equal('HTTP://Example.com'.trim());
    expect(normalizeUrl(' HTTPS://github.com')).to.equal('HTTPS://github.com');
    expect(normalizeUrl(' //example.org ')).to.equal('https://example.org');
  });

  it('derives display name', () => {
    const d1 = deriveDisplayName('https://www.github.com/user/repo');
    expect(d1.startsWith('Github') || d1.startsWith('GitHub')).to.equal(true);
    expect(deriveDisplayName('amazon.com').startsWith('Amazon')).to.equal(true);
    expect(deriveDisplayName('custom-domain.org').startsWith('Custom-domain (.org)')).to.equal(true);

    const p1 = deriveDisplayName('https://site.com/products/widgets');
    expect(p1.includes(' - Widgets')).to.equal(true);
    const p2 = deriveDisplayName('https://site.com/index');
    expect(p2.includes(' - ')).to.equal(false);
  });

  it('escapes HTML and attributes', () => {
    expect(escapeHTML('<b>x</b> & "\'')).to.equal('&lt;b&gt;x&lt;/b&gt; &amp; &quot;&#39;');
    expect(escapeAttr('a&b"c')).to.equal('a&amp;b&quot;c');
  });
});

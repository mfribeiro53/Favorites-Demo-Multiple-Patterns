// Pure utilities for URL normalization, display name derivation, and safe escaping
// These are DOM-free and safe to import in Node tests.

export const escapeHTML = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
  .replace(/`/g, '&#96;');

export const escapeAttr = (str) => escapeHTML(str);

export const normalizeUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  return url.startsWith('http') ? url : `https://${url}`;
};

const KNOWN_DOMAINS = {
  'ups': 'UPS',
  'fedex': 'FedEx',
  'github': 'GitHub',
  'google': 'Google',
  'youtube': 'YouTube',
  'wikipedia': 'Wikipedia',
  'facebook': 'Facebook',
  'twitter': 'Twitter',
  'linkedin': 'LinkedIn',
  'amazon': 'Amazon',
  'microsoft': 'Microsoft',
  'apple': 'Apple',
  'netflix': 'Netflix'
};

export const deriveDisplayName = (fullUrl) => {
  try {
    const normalized = normalizeUrl(fullUrl);
    const urlObj = new URL(normalized);

    // Host-based name
    let displayName = urlObj.hostname;
    if (displayName.startsWith('www.')) displayName = displayName.substring(4);

    const parts = displayName.split('.');
    if (parts.length >= 2) {
      const main = parts[parts.length - 2];
      displayName = KNOWN_DOMAINS[main.toLowerCase()] || (main.charAt(0).toUpperCase() + main.slice(1));
      const ext = parts[parts.length - 1];
      if (ext !== 'com') displayName += ` (.${ext})`;
    }

    // Path-based enhancement
    if (urlObj.pathname && urlObj.pathname !== '/') {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        let last = pathParts[pathParts.length - 1];
        if (last.includes('.')) last = last.split('.')[0];
        const skip = ['index', 'home', 'default', 'main'];
        if (last && !skip.includes(last.toLowerCase())) {
          displayName += ` - ${last.charAt(0).toUpperCase() + last.slice(1)}`;
        }
      }
    }

    return displayName;
  } catch {
    return String(fullUrl || '');
  }
};

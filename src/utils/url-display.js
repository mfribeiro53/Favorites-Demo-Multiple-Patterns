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
  const trimmed = url.trim();
  if (!trimmed) return '';
  // If already has http/https (case-insensitive), keep as-is
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Support protocol-relative URLs like //example.com
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  return `https://${trimmed}`;
};

// No static domain map: prefer real titles via proxy; this is a heuristic fallback

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
      const mainLower = main.toLowerCase();
      // Heuristic: short domains (<=4) are often acronyms (UPS, DHL)
      if (/^[a-z0-9]+$/.test(mainLower) && mainLower.length <= 4) {
        displayName = mainLower.toUpperCase();
      } else {
        displayName = mainLower.charAt(0).toUpperCase() + mainLower.slice(1);
      }
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

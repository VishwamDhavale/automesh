/**
 * Simple HTML sanitizer for basic protection against XSS.
 * Note: For production use, a robust library like DOMPurify is strongly recommended.
 * This handles basic tags and prevents common injection patterns.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // 1. Remove script tags and their content
  let sanitized = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");

  // 2. Remove on* attributes (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/ \bon\w+="[^"]*"/gim, "");
  sanitized = sanitized.replace(/ \bon\w+='[^']*'/gim, "");
  sanitized = sanitized.replace(/ \bon\w+=[^\s>]+/gim, "");

  // 3. Remove javascript: pseudo-protocol
  sanitized = sanitized.replace(/javascript:/gim, "");

  // 4. Remove data: URIs in src/href (common XSS vector)
  sanitized = sanitized.replace(/src\s*=\s*['"]data:[^'"]*['"]/gim, "src=\"\"");
  sanitized = sanitized.replace(/href\s*=\s*['"]data:[^'"]*['"]/gim, "href=\"\"");

  return sanitized;
}

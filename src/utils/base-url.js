// src/utils/base-url.js
export function withBase(p = '') {
  const base = import.meta.env.BASE_URL || '/' // 例如 '/myListening/'

  if (!p) return base
  if (/^https?:\/\//i.test(p)) return p // 完整 URL 直接回傳

  // 已經帶了 base，就不要再加
  if (p.startsWith(base)) return p

  // '/content/...' → '/myListening/content/...'
  if (p.startsWith('/')) return base + p.slice(1)

  // 'content/...' → '/myListening/content/...'
  return base + p
}

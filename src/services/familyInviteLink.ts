export const SITE_URL = 'https://codegenzfam.vercel.app';
const KEY = 'codegenz.pending-family-invite';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export function normalizeInviteCode(code: string | null | undefined): string {
  const value = code?.trim().toUpperCase() || '';
  return /^[A-Z0-9][A-Z0-9-]{1,63}$/.test(value) ? value : '';
}
export function buildFamilyInviteUrl(code?: string): string {
  const value = normalizeInviteCode(code);
  return value ? `${SITE_URL}/?join=${encodeURIComponent(value)}` : SITE_URL;
}
export function readPendingFamilyInvite(): string {
  if (typeof window === 'undefined') return '';
  const urlCode = normalizeInviteCode(new URL(window.location.href).searchParams.get('join'));
  try {
    if (urlCode) {
      window.localStorage.setItem(KEY, JSON.stringify({ code: urlCode, createdAt: Date.now() }));
      return urlCode;
    }
    const saved = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (saved && Date.now() - saved.createdAt < MAX_AGE) return normalizeInviteCode(saved.code);
    window.localStorage.removeItem(KEY);
  } catch { /* URL still works when browser storage is unavailable. */ }
  return urlCode;
}
export function clearPendingFamilyInvite(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEY); } catch { /* Storage may be blocked. */ }
  const url = new URL(window.location.href);
  url.searchParams.delete('join');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

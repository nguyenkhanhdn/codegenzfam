// Reads only the old app's record caches. Supabase sessions and other origin storage are excluded.
export interface LegacyStorage { getItem(key: string): string | null }
const caches = {
  users: 'codegenz_custom_users',
  families: 'codegenz_custom_families',
  familyInvitations: 'codegenz_custom_family_invitations',
  journalEntries: 'codegenz_custom_journals',
  consultations: 'codegenz_custom_consultations',
  deepTalkTopics: 'codegenz_custom_deeptalk_topics',
  deepTalkSessions: 'codegenz_custom_deeptalk_sessions',
  challengeTasks: 'codegenz_custom_challenge_tasks',
  challengeProgress: 'codegenz_custom_challenge_progress',
  happinessHistory: 'codegenz_custom_happiness_history',
  notifications: 'codegenz_custom_notifications',
  auditLogs: 'codegenz_custom_audit_logs',
} as const;
function rows(storage: LegacyStorage, key: string): Record<string, unknown>[] | null {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Bộ nhớ dữ liệu cũ không hợp lệ. Chưa xuất để tránh bỏ sót bản ghi.'); }
  if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error('Bộ nhớ dữ liệu cũ không hợp lệ. Chưa xuất để tránh bỏ sót bản ghi.');
  }
  return value;
}
export function hasLegacyAccount(storage: LegacyStorage, email: string): boolean {
  try { return !!rows(storage, caches.users)?.some(u => typeof u.email === 'string' && u.email.trim().toLowerCase() === email.trim().toLowerCase()); }
  catch { return false; }
}
export function buildLegacyBackup(storage: LegacyStorage) {
  const result: Record<string, unknown> = {
    system: 'CODE GenZ Family legacy browser recovery',
    exportedAt: new Date().toISOString(),
    source: 'current-browser-cache',
    credentialsOmitted: true,
    availableCollections: [] as string[],
  };
  let count = 0;
  for (const [field, key] of Object.entries(caches)) {
    const records = rows(storage, key);
    if (records === null) continue;
    (result.availableCollections as string[]).push(field);
    result[field] = field === 'users' ? records.map(({password: _password, ...profile}) => profile) : records;
    count += records.length;
  }
  if (!count) throw new Error('Không có dữ liệu cũ trong trình duyệt này. Hãy mở trình duyệt và thiết bị đã dùng để đăng ký.');
  result.recordCount = count;
  // This is a source snapshot for reconciliation, not evidence of a completed cloud migration.
  return result;
}

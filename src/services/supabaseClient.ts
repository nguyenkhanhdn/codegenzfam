import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseConfig } from "./supabaseConfig";
// Only the publishable key belongs in the browser. Admin credentials stay in Edge Functions.
const env = (import.meta as any).env || {};
const config = resolveSupabaseConfig(env);
export const supabase = createClient(
  config.url,
  config.key,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
export const COLLECTIONS = {
  USERS: "users",
  FAMILIES: "families",
  FAMILY_INVITATIONS: "family_invitations",
  JOURNAL_ENTRIES: "journal_entries",
  CONSULTATIONS: "consultations",
  DEEP_TALK_TOPICS: "deep_talk_topics",
  DEEP_TALK_SESSIONS: "deep_talk_sessions",
  CHALLENGE_TASKS: "challenge_tasks",
  CHALLENGE_PROGRESS: "challenge_progress",
  HAPPINESS_HISTORY: "happiness_history",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "audit_logs",
  SETTINGS: "app_settings",
} as const;
export async function accountAction(
  action: string,
  input: Record<string, unknown> = {},
) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Vui lòng đăng nhập.");
  const response = await fetch(
    `${config.url}/functions/v1/account-admin`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
        apikey: config.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...input }),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (response.status === 404)
    throw new Error("Dịch vụ tài khoản Supabase chưa được triển khai. Vui lòng liên hệ quản trị viên.");
  let data;
  try { data = await response.json(); }
  catch { throw new Error("Dịch vụ tài khoản Supabase trả về phản hồi không hợp lệ. Vui lòng thử lại sau."); }
  if (!response.ok || data.error)
    throw new Error(data.error || "Không thể quản lý tài khoản.");
  return data;
}

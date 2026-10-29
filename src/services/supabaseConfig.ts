export interface SupabaseEnvironment {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export function resolveSupabaseConfig(env: SupabaseEnvironment) {
  return {
    url: (env.VITE_SUPABASE_URL || "https://tqnzlwkakeocxufznjfi.supabase.co").replace(/\/+$/, ""),
    key: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY ||
      "sb_publishable_Qk8-pIaX0Pg2zCkv-9Uf7g_FVvEKXzR",
  };
}

export function authErrorMessage(error: { code?: string; status?: number }) {
  switch (error.code) {
    case "email_not_confirmed":
      return "Tài khoản chưa được quản trị viên phê duyệt. Vui lòng liên hệ quản trị viên.";
    case "user_banned":
      return "Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.";
    case "invalid_credentials":
      return "Không xác thực được email và mật khẩu trên Supabase. Tài khoản cũ cần được chuyển sang Supabase trước khi đăng nhập.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.";
    default:
      return "Chưa kết nối được dịch vụ xác thực Supabase. Vui lòng thử lại sau; chưa thể xác minh mật khẩu.";
  }
}

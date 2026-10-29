import type { User } from '../types';

export async function loadAdminUserPages(
  request: (action: string, input: Record<string, unknown>) => Promise<{users: User[]}>,
): Promise<User[]> {
  const loaded: User[] = [];
  for (let offset = 0; ; offset += 200) {
    const result = await request('list', {offset});
    if (!Array.isArray(result.users)) throw new Error('Danh sách tài khoản trả về không hợp lệ.');
    loaded.push(...result.users);
    if (result.users.length < 200) return loaded;
  }
}

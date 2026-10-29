// Source credentials stay inside this server-side migration and are never returned.
function check(result: any, migrationStage = "read-source") {
  if (result.error) throw Object.assign(new Error('Legacy account migration operation failed'),{migrationStage,migrationCode:String(result.error.code || 'OPERATION_FAILED').replace(/[^a-zA-Z0-9_]/g,'')});
  return result.data;
}
export function mapLegacyUser(row: any) {
  const {password, ...source} = row;
  if (!row.id || typeof row.email !== 'string' || !row.email.trim() ||
      typeof password !== 'string' || password.length < 6 || password.length > 128 ||
      !['student','parent','psychologist','admin'].includes(row.role)) {
    throw new Error('Invalid legacy account mapping');
  }
  return {
    ...source,
    id: String(row.id),
    familyRole: row.family_role ?? 'none',
    familyId: row.family_id ?? undefined,
    mustChangePassword: false,
    passwordChangeReason: null,
    lastPasswordChangedAt: row.last_password_changed_at,
    failedLoginAttempts: row.failed_login_attempts,
    lockoutUntil: row.lockout_until,
    status: ['active','locked','pending'].includes(row.status) ? row.status : 'active',
    migrationSource: 'public.users',
  };
}
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([,v])=>v !== undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));
  return value;
}
const same = (a: any,b: any) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export async function migrateLegacyUsers(db: any, options: {dryRun?: boolean; verify?: boolean; offset?: number; limit?: number}) {
  const rows: any[] = [];
  for(let offset=0;;offset+=500) {
    const page=check(await db.from('users').select('*').order('id').range(offset,offset+499));
    rows.push(...page);
    if(page.length<500) break;
  }
  if(!rows.length) throw new Error('Empty legacy source');
  const expected=rows.map(mapLegacyUser);
  const emails=expected.map(row=>row.email.trim().toLowerCase());
  if(new Set(emails).size!==rows.length) throw new Error('Duplicate source emails');
  if(options.dryRun) return {source:'public.users',sourceCount:rows.length,valid:true};
  if(options.verify) {
    let verified=0;
    for(const profile of expected) {
      const actual=check(await db.from('codegenz_profiles').select('*').eq('legacy_id',profile.id).single());
      if(!same(actual.data,profile)) throw new Error('Profile content verification failed');
      const {user}=check(await db.auth.admin.getUserById(actual.auth_user_id));
      if(user.email.toLowerCase()!==profile.email.trim().toLowerCase() ||
         user.app_metadata?.legacy_id!==profile.id || user.app_metadata?.migration_source!=='public.users')
        throw new Error('Auth linkage verification failed');
      verified++;
    }
    return {source:'public.users',sourceCount:rows.length,verified};
  }
  const offset=Number(options.offset ?? 0),limit=Number(options.limit ?? 5);
  if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>10) throw new Error('Invalid batch');
  let imported=0;
  for(let i=offset;i<Math.min(offset+limit,rows.length);i++) {
    const source=rows[i],profile=expected[i];
    let existing=check(await db.from('codegenz_profiles').select('*').eq('legacy_id',profile.id).maybeSingle());
    if(!existing) existing=check(await db.from('codegenz_profiles').select('*').eq('data->>id',profile.id).maybeSingle());
    if(!existing) existing=check(await db.from('codegenz_profiles').select('*').eq('data->>email',profile.email.trim().toLowerCase()).maybeSingle());
    let authId=existing?.auth_user_id;
    if(existing) {
      const {user}=check(await db.auth.admin.getUserById(authId));
      if(user.email.toLowerCase()!==profile.email.trim().toLowerCase() ||
         user.app_metadata?.legacy_id!==profile.id || user.app_metadata?.migration_source!=='public.users')
        throw new Error('Existing identity conflict; no credentials overwritten');
    } else {
      const {user}=check(await db.auth.admin.createUser({
        email:profile.email.trim().toLowerCase(), password:source.password,
        // The legacy verified badge is not proof of email ownership.
        email_confirm:false,
        user_metadata:{name:profile.name,requested_role:profile.role},
        app_metadata:{legacy_id:profile.id,migration_source:'public.users'},
      }), 'create-auth');
      authId=user.id;
    }
    check(await db.from('codegenz_profiles').update({data:profile}).eq('auth_user_id',authId).select('auth_user_id').single(), 'update-profile');
    check(await db.rpc('codegenz_bind_legacy_account',{target:authId}), 'bind-identity');
    if(profile.status==='locked') check(await db.auth.admin.updateUserById(authId,{ban_duration:'876000h'}));
    imported++;
  }
  return {source:'public.users',sourceCount:rows.length,imported,nextOffset:offset+imported};
}

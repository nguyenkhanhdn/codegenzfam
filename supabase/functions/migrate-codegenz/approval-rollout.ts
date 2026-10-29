// One-time rollout, reachable only with an expiring grant scoped to this policy.
export async function confirmSystemAdministrators(db: any) {
  const admins: any[] = [];
  for (let offset = 0; ; offset += 200) {
    const result = await db.from('codegenz_profiles').select('auth_user_id,data')
      .eq('data->>role','admin').eq('data->>status','active')
      .order('auth_user_id').range(offset,offset+199);
    if(result.error) throw new Error('Administrator lookup failed');
    admins.push(...result.data);
    if(result.data.length<200) break;
  }
  if(!admins.length) throw new Error('No active administrator to confirm');
  let confirmed=0;
  for(const row of admins) {
    const result=await db.auth.admin.updateUserById(row.auth_user_id,{email_confirm:true});
    if(result.error || !result.data?.user?.email_confirmed_at) throw new Error('Administrator confirmation failed');
    confirmed++;
  }
  return {administratorsConfirmed:confirmed};
}

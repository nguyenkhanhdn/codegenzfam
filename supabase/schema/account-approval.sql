-- Public signup is always pending. Roles/activation remain server-controlled.
create or replace function codegenz_private.new_auth_user() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb; legacy text; requested text;
begin
 legacy:=coalesce(new.raw_app_meta_data->>'legacy_id',new.id::text);
 requested:=new.raw_user_meta_data->>'requested_role';
 d:=jsonb_build_object('id',legacy,'email',new.email,'name',coalesce(new.raw_user_meta_data->>'name','Thành viên mới'),
 'role',case when requested in ('parent','psychologist') then requested else 'student' end,
 'status','pending',
 'familyRole',case when requested='parent' then 'mother' when requested='psychologist' then 'none' else 'student' end,
 'avatar','', 'verified',false,'createdAt',new.created_at,'permissions','{}'::jsonb);
 insert into public.codegenz_profiles(auth_user_id,legacy_id,data) values(new.id,legacy,d);
 return new;
end $$;

-- Previously imported users have not been approved; preserve already locked/deleted accounts.
update public.codegenz_profiles set data=data||'{"status":"pending"}'::jsonb
where data->>'role'<>'admin' and data->>'status'='active' and not data ? 'approvedAt';

-- Auth app_metadata may be populated after the INSERT signup trigger fires.
-- Allow only a server-verified, one-time UUID-to-legacy binding; identities remain immutable otherwise.
create or replace function codegenz_private.profile_guard() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7418392);
 if old.data->>'role'='admin' and old.data->>'status'='active'
 and coalesce(old.data->'permissions'->>'canManageUsers','true')<>'false'
 and (new.data->>'role'<>'admin' or new.data->>'status'<>'active'
      or coalesce(new.data->'permissions'->>'canManageUsers','true')='false')
 and not exists(select 1 from public.codegenz_profiles p where p.auth_user_id<>old.auth_user_id
  and p.data->>'role'='admin' and p.data->>'status'='active'
  and coalesce(p.data->'permissions'->>'canManageUsers','true')<>'false') then
 raise exception 'Không thể thu hồi quyền của quản trị viên hoạt động cuối cùng.';
 end if;
 if new.auth_user_id<>old.auth_user_id then raise exception 'Identity is immutable';end if;
 if new.legacy_id<>old.legacy_id then
  if current_user<>'postgres' or old.legacy_id<>old.auth_user_id::text
   or new.data->>'id' is distinct from new.legacy_id
   or new.data->>'migrationSource' is distinct from 'public.users' then
   raise exception 'Identity is immutable';
  end if;
  -- Keep this lookup inside the privileged branch. Ordinary service updates
  -- must never plan a query against the Auth schema they cannot SELECT.
  if not exists(select 1 from auth.users a join public.users u on u.id=new.legacy_id
    where a.id=new.auth_user_id and a.raw_app_meta_data->>'legacy_id'=u.id
    and a.raw_app_meta_data->>'migration_source'='public.users'
    and lower(a.email)=lower(trim(u.email))) then
   raise exception 'Identity is immutable';
  end if;
 end if;
 new.version:=old.version+1;new.updated_at:=now();return new;
end $$;

create or replace function codegenz_private.bind_legacy_account(target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare source_id text; old_id text;
begin
 select u.id into source_id from auth.users a join public.users u
 on u.id=a.raw_app_meta_data->>'legacy_id' and lower(a.email)=lower(trim(u.email))
 where a.id=target and a.raw_app_meta_data->>'migration_source'='public.users';
 if source_id is null then raise exception 'No trusted source mapping';end if;
 select legacy_id into old_id from public.codegenz_profiles
 where auth_user_id=target and data->>'id'=source_id and data->>'migrationSource'='public.users';
 if old_id=source_id then return;end if;
 if old_id is distinct from target::text then raise exception 'Conflicting legacy identity';end if;
 update public.codegenz_profiles set legacy_id=source_id where auth_user_id=target;
end $$;
create or replace function public.codegenz_bind_legacy_account(target uuid) returns void
language sql security invoker set search_path='' as $$select codegenz_private.bind_legacy_account(target)$$;
revoke all on function codegenz_private.bind_legacy_account(uuid) from public,anon,authenticated;
revoke all on function public.codegenz_bind_legacy_account(uuid) from public,anon,authenticated;
grant execute on function codegenz_private.bind_legacy_account(uuid) to service_role;
grant execute on function public.codegenz_bind_legacy_account(uuid) to service_role;

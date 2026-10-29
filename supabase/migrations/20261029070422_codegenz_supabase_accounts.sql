-- Preserve legacy document IDs and fields; passwords live only in Supabase Auth.
create schema if not exists codegenz_private;
revoke all on schema codegenz_private from public;
create table if not exists public.codegenz_profiles (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  legacy_id text not null unique,
  data jsonb not null check (not data ? 'password'),
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
create unique index if not exists codegenz_profiles_email on public.codegenz_profiles(lower(data->>'email'));
create index if not exists codegenz_profiles_family on public.codegenz_profiles((data->>'familyId'));
create table if not exists public.codegenz_documents (
  collection text not null,
  id text not null,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key(collection,id),
  check (collection <> 'users')
);
create index if not exists codegenz_documents_family on public.codegenz_documents(collection,(data->>'familyId'));
create index if not exists codegenz_documents_owner on public.codegenz_documents(collection,(data->>'studentId'));
create table if not exists public.codegenz_migration_runs (
  id uuid primary key default gen_random_uuid(), token_hash text not null,
  expires_at timestamptz not null, completed boolean not null default false,
  manifest jsonb not null default '{}'
);
alter table public.codegenz_profiles enable row level security;
alter table public.codegenz_documents enable row level security;
alter table public.codegenz_migration_runs enable row level security;
revoke all on public.codegenz_profiles, public.codegenz_documents, public.codegenz_migration_runs from anon,authenticated;
grant select on public.codegenz_profiles to authenticated;
grant select,insert,update,delete on public.codegenz_documents to authenticated;
grant all on public.codegenz_profiles,public.codegenz_documents,public.codegenz_migration_runs to service_role;

create or replace function codegenz_private.session_live() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from auth.sessions s where s.user_id=auth.uid() and s.id::text=auth.jwt()->>'session_id');
$$;
create or replace function codegenz_private.actor() returns jsonb language sql stable security definer set search_path='' as $$
  select p.data from public.codegenz_profiles p where p.auth_user_id=auth.uid()
  and codegenz_private.session_live() and p.data->>'status'='active'
  and coalesce((p.data->>'mustChangePassword')::boolean,false)=false;
$$;
create or replace function public.codegenz_me() returns jsonb language sql stable security invoker set search_path='' as $$
  select p.data || jsonb_build_object('authUserId',p.auth_user_id,'version',p.version)
  from public.codegenz_profiles p where p.auth_user_id=auth.uid() and codegenz_private.session_live();
$$;
create or replace function codegenz_private.can_document(c text,d jsonb,w boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare a jsonb := codegenz_private.actor(); aid text; r text; fid text;
begin
  if a is null or auth.uid() is null then return false; end if;
  aid:=a->>'id'; r:=a->>'role'; fid:=a->>'familyId';
  if c in ('challenge_tasks','deep_talk_topics','app_settings') then return not w or r='admin'; end if;
  if c='audit_logs' then return r='admin' and not w; end if;
  if c='families' then return r='admin' or d->>'id'=fid or (d->'studentIds') ? aid or (d->'parentIds') ? aid; end if;
  if c in ('deep_talk_sessions','challenge_progress','happiness_history') then return d->>'familyId'=fid or (r='admin' and not w); end if;
  if c='notifications' then return d->>'userId'=aid; end if;
  if c='family_invitations' then return d->>'senderId'=aid or lower(d->>'recipientEmailOrPhone')=lower(a->>'email') or r='admin'; end if;
  if c='journal_entries' then
    return d->>'studentId'=aid or (not w and (
      (r='parent' and d->>'familyId'=fid and d->>'privacy' in ('share_parent','share_all','parents_only','family_open')) or
      (r='psychologist' and d->>'privacy' in ('share_psychologist','share_all','psychologist_only'))));
  end if;
  if c='consultations' then
    return (r='student' and d->>'studentId'=aid) or (r='psychologist' and (d->>'psychologistId'=aid or coalesce(d->>'psychologistId','')=''));
  end if;
  if c='professional_notes' then return r='psychologist' and d->>'psychologistId'=aid; end if;
  return r='admin'; -- Archived/unrecognized collections remain admin-only.
end $$;

create policy codegenz_profile_read on public.codegenz_profiles for select to authenticated using (
 codegenz_private.session_live() and (auth_user_id=auth.uid() or (
 codegenz_private.actor() is not null and (codegenz_private.actor()->>'role'='admin' or
 (data->>'familyId' <> '' and data->>'familyId'=codegenz_private.actor()->>'familyId') or
 (data->>'role'='psychologist' and data->>'status'='active'))))
);
create policy codegenz_document_read on public.codegenz_documents for select to authenticated using (codegenz_private.can_document(collection,data,false));
create policy codegenz_document_insert on public.codegenz_documents for insert to authenticated with check (codegenz_private.can_document(collection,data,true));
create policy codegenz_document_update on public.codegenz_documents for update to authenticated using (codegenz_private.can_document(collection,data,true)) with check (codegenz_private.can_document(collection,data,true));
create policy codegenz_document_delete on public.codegenz_documents for delete to authenticated using (codegenz_private.can_document(collection,data,true));

create or replace function codegenz_private.new_auth_user() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb; legacy text; requested text;
begin
 legacy:=coalesce(new.raw_app_meta_data->>'legacy_id',new.id::text);
 requested:=new.raw_user_meta_data->>'requested_role';
 d:=jsonb_build_object('id',legacy,'email',new.email,'name',coalesce(new.raw_user_meta_data->>'name','Thành viên mới'),
 'role',case when requested in ('parent','psychologist') then requested else 'student' end,
 'status',case when requested='psychologist' then 'pending' else 'active' end,
 'familyRole',case when requested='parent' then 'mother' when requested='psychologist' then 'none' else 'student' end,
 'avatar','', 'verified',false,'createdAt',new.created_at,'permissions','{}'::jsonb);
 insert into public.codegenz_profiles(auth_user_id,legacy_id,data) values(new.id,legacy,d);
 return new;
end $$;
drop trigger if exists codegenz_new_auth_user on auth.users;
create trigger codegenz_new_auth_user after insert on auth.users for each row execute function codegenz_private.new_auth_user();

create or replace function codegenz_private.profile_guard() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7418392);
 if old.data->>'role'='admin' and old.data->>'status'='active' and
 (new.data->>'role'<>'admin' or new.data->>'status'<>'active') and
 not exists(select 1 from public.codegenz_profiles p where p.auth_user_id<>old.auth_user_id and p.data->>'role'='admin' and p.data->>'status'='active') then
 raise exception 'Không thể vô hiệu hóa quản trị viên hoạt động cuối cùng.';
 end if;
 if new.legacy_id<>old.legacy_id or new.auth_user_id<>old.auth_user_id then raise exception 'Identity is immutable'; end if;
 new.version:=old.version+1; new.updated_at:=now(); return new;
end $$;
create trigger codegenz_profile_guard before update on public.codegenz_profiles for each row execute function codegenz_private.profile_guard();

-- Internal session invalidation. Only service_role can call its public wrapper.
create or replace function codegenz_private.revoke_sessions(target uuid) returns void language sql security definer set search_path='' as $$ delete from auth.sessions where user_id=target; $$;
create or replace function public.codegenz_revoke_sessions(target uuid) returns void language sql security invoker set search_path='' as $$ select codegenz_private.revoke_sessions(target); $$;
revoke all on function public.codegenz_revoke_sessions(uuid) from public,anon,authenticated;
grant execute on function public.codegenz_revoke_sessions(uuid) to service_role;
revoke all on all functions in schema codegenz_private from public,anon;
grant usage on schema codegenz_private to authenticated,service_role;
grant execute on function codegenz_private.session_live(),codegenz_private.actor(),codegenz_private.can_document(text,jsonb,boolean) to authenticated;
grant execute on function codegenz_private.revoke_sessions(uuid) to service_role;
revoke all on function public.codegenz_me() from public,anon;
grant execute on function public.codegenz_me() to authenticated;

create or replace function codegenz_private.document_guard() returns trigger language plpgsql set search_path='' as $$
declare a jsonb; owner text; changed jsonb;
begin
 if tg_op='DELETE' then
  if current_user in ('service_role','postgres') then return old;end if;
  if old.collection in ('families','family_invitations','audit_logs') then raise exception 'Use the authorized account service for deletion';end if;
  return old;
 end if;
 if tg_op='UPDATE' then new.version:=old.version+1;new.updated_at:=now();end if;
 if current_user in ('service_role','postgres') then return new;end if;
 a:=codegenz_private.actor();if a is null then raise exception 'Session inactive';end if;
 if tg_op='UPDATE' then
  if new.collection<>old.collection or new.id<>old.id then raise exception 'Document identity is immutable';end if;
  if (new.data->>'studentId',new.data->>'userId',new.data->>'familyId',new.data->>'senderId') is distinct from (old.data->>'studentId',old.data->>'userId',old.data->>'familyId',old.data->>'senderId') then raise exception 'Ownership is immutable';end if;
 end if;
 if new.collection in ('families','family_invitations','audit_logs') then raise exception 'Use the authorized account service for this operation';end if;
 if new.collection='consultations' then
  if new.data ? 'privateProfessionalNotes' then raise exception 'Private notes must be stored separately';end if;
  if a->>'role'='student' then
   if tg_op='INSERT' and new.data->>'status'<>'pending' then raise exception 'New consultations must be pending';end if;
   if tg_op='UPDATE' and (new.data-'messages'-'updatedAt')<>(old.data-'messages'-'updatedAt') then raise exception 'Student may only append messages';end if;
   if tg_op='UPDATE' and (jsonb_array_length(new.data->'messages')<>jsonb_array_length(old.data->'messages')+1 or (new.data->'messages')-(jsonb_array_length(new.data->'messages')-1)<>old.data->'messages' or new.data->'messages'->-1->>'senderId'<>a->>'id') then raise exception 'Invalid conversation append';end if;
  elsif a->>'role'='psychologist' and coalesce(new.data->>'psychologistId','')<>a->>'id' then raise exception 'Consultation must be assigned to the current clinician';end if;
 end if;
 if new.collection='notifications' then
  if tg_op<>'UPDATE' or (new.data-'isRead')<>(old.data-'isRead') then raise exception 'Only notification read state may be changed';end if;
 end if;
 return new;
end $$;
create trigger codegenz_document_guard before insert or update or delete on public.codegenz_documents for each row execute function codegenz_private.document_guard();
revoke all on function codegenz_private.document_guard() from public,anon,authenticated;

-- Treat removal of user-management permission as loss of administrative capacity.
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
 if new.legacy_id<>old.legacy_id or new.auth_user_id<>old.auth_user_id then raise exception 'Identity is immutable';end if;
 new.version:=old.version+1;new.updated_at:=now();return new;
end $$;

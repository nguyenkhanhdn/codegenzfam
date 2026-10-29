-- Only initial/migration password changes are disabled. Keep explicit admin resets.
update public.codegenz_profiles p
set data=data||'{"passwordChangeReason":"admin-reset"}'::jsonb
where coalesce((data->>'mustChangePassword')::boolean,false)
  and exists(select 1 from public.codegenz_documents d where d.collection='audit_logs'
    and d.data->>'action'='ADMIN_RESET_PASSWORD'
    and d.data->>'resource'='user:'||p.legacy_id
    and d.data->>'status'='SUCCESS');

update public.codegenz_profiles
set data=data||'{"mustChangePassword":false,"passwordChangeReason":null}'::jsonb
where coalesce((data->>'mustChangePassword')::boolean,false)
  and data->>'passwordChangeReason' is distinct from 'admin-reset';

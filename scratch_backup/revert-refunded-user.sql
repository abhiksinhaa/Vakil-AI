begin;

update public.profiles
set plan = 'free',
    drafts_limit = 5,
    drafts_used = 0,
    plan_expires_at = null,
    org_id = null,
    updated_at = now()
where id = 'USER_ID_HERE'::uuid;

update public.subscriptions
set plan = 'free'
where id = 'USER_ID_HERE'::uuid;

commit;
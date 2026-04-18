alter table public.users add column if not exists current_company text;
alter table public.users add column if not exists work_preference text[] default '{}';

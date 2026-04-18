-- ============================================================
-- Launchpad v2 — Tracker schema
-- ============================================================

-- 1. Alter applications table: add v2 fields, drop v1 fields
alter table public.applications
  add column if not exists job_url text,
  add column if not exists applied_via_referral boolean not null default false,
  add column if not exists reached_out_to_hm boolean not null default false,
  add column if not exists custom_tags text[] not null default '{}',
  add column if not exists attached_resume_url text;

-- Drop v1 columns no longer needed
alter table public.applications
  drop column if exists resume_variant_id,
  drop column if exists cover_letter_drive_url;

-- Widen status: remove the old check constraint so status is free-form text
alter table public.applications
  drop constraint if exists applications_status_check;

-- 2. User-defined status buckets
create table if not exists public.user_status_buckets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  name text not null,
  color text not null default '#64748B',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.user_status_buckets enable row level security;
create policy "Users can manage own status buckets"
  on public.user_status_buckets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_status_buckets_user_id_idx
  on public.user_status_buckets (user_id, position asc);

-- 3. Application stage timeline
create table if not exists public.application_stages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications on delete cascade,
  stage_name text not null,
  stage_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.application_stages enable row level security;
create policy "Users can manage stages in own applications"
  on public.application_stages for all
  using (
    auth.uid() = (
      select user_id from public.applications where id = application_id
    )
  );

create index if not exists application_stages_application_id_idx
  on public.application_stages (application_id, stage_date asc);

-- 4. Seed default status buckets for existing users who have none
insert into public.user_status_buckets (user_id, name, color, position)
select
  u.id,
  b.name,
  b.color,
  b.position
from public.users u
cross join (
  values
    ('Saved',         '#64748B', 0),
    ('Applied',       '#2563EB', 1),
    ('Phone Screen',  '#7C3AED', 2),
    ('Interview',     '#D97706', 3),
    ('Offer',         '#059669', 4),
    ('Rejected',      '#EF4444', 5),
    ('Withdrawn',     '#94A3B8', 6)
) as b(name, color, position)
where not exists (
  select 1 from public.user_status_buckets where user_id = u.id
);

-- 5. Migrate existing applications to v2 status names
update public.applications set status = 'Saved'        where status = 'drafting';
update public.applications set status = 'Applied'      where status = 'applied';
update public.applications set status = 'Interview'    where status = 'interviewing';
update public.applications set status = 'Offer'        where status = 'offer';
update public.applications set status = 'Rejected'     where status = 'rejected';

-- 6. Drop resume_variants table (v1 feature, no longer needed)
drop table if exists public.resume_variants cascade;

-- 7. Drop google_access_token from users (no longer needed)
alter table public.users
  drop column if exists google_access_token,
  drop column if exists resume_format;

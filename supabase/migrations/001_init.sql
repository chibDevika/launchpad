-- ============================================================
-- Launchpad MVP — Initial Schema
-- ============================================================

-- Users profile (extends Supabase auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  email text,
  current_role_title text,
  years_of_experience integer,
  target_roles text[],
  tone_preference text default 'balanced' check (tone_preference in ('formal', 'balanced', 'conversational')),
  industries_of_interest text[],
  base_resume jsonb,           -- structured: { summary, experience[], skills[], education[], links }
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;
create policy "Users can read/write own profile"
  on public.users for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create user row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Resume variants (tailored versions of the base resume)
create table if not exists public.resume_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  label text,                  -- e.g. "Fintech - Product Manager"
  role_type text,              -- for smart reuse suggestions
  content jsonb,               -- structured variant content
  drive_doc_url text,          -- Google Docs link
  created_at timestamptz default now()
);

alter table public.resume_variants enable row level security;
create policy "Users can manage own resume variants"
  on public.resume_variants for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- Job applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  company_name text,
  role_title text,
  jd_raw text,                 -- original pasted JD
  jd_extracted jsonb,          -- { role_title, company, requirements[], nice_to_haves[], benefits[], seniority, employment_type }
  match_score integer check (match_score between 0 and 100),
  match_breakdown jsonb,       -- { score, strengths[], gaps[], recommendation, reasoning }
  status text default 'drafting' check (status in ('drafting', 'applied', 'interviewing', 'offer', 'rejected')),
  resume_variant_id uuid references public.resume_variants,
  cover_letter_drive_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.applications enable row level security;
create policy "Users can manage own applications"
  on public.applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger applications_updated_at
  before update on public.applications
  for each row execute procedure public.set_updated_at();


-- Per-application chat history
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;
create policy "Users can manage chat in own applications"
  on public.chat_messages for all
  using (
    auth.uid() = (
      select user_id from public.applications where id = application_id
    )
  );


-- Indexes for common queries
create index if not exists applications_user_id_status_idx on public.applications (user_id, status);
create index if not exists applications_user_id_created_idx on public.applications (user_id, created_at desc);
create index if not exists resume_variants_user_id_idx on public.resume_variants (user_id, created_at desc);
create index if not exists chat_messages_application_id_idx on public.chat_messages (application_id, created_at asc);

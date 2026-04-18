-- Migration 007: Add Assessment and Ghosted to predefined status buckets
--
-- Final column order:
--   Saved (0) → Applied (1) → Phone Screen (2) → Interview (3)
--   → Assessment (4) → Offer (5) → Rejected (6) → Ghosted (7) → Withdrawn (8)

-- Shift existing positions to make room
update public.user_status_buckets set position = 5 where name = 'Offer';
update public.user_status_buckets set position = 6 where name = 'Rejected';
update public.user_status_buckets set position = 8 where name = 'Withdrawn';

-- Insert new buckets for every user who doesn't already have them
insert into public.user_status_buckets (user_id, name, color, position)
select
  u.id,
  b.name,
  b.color,
  b.position
from public.users u
cross join (
  values
    ('Assessment', '#0891B2', 4),  -- cyan: active/test phase
    ('Ghosted',    '#6B7280', 7)   -- gray: no response / faded out
) as b(name, color, position)
where not exists (
  select 1 from public.user_status_buckets
  where user_id = u.id and name = b.name
);

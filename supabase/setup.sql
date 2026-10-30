-- Sunbelt Receipts: run this once in Supabase > SQL Editor.
-- Crew (no login) can ONLY add receipts. They can't read, change or delete anything.
-- Office users (signed in AND listed in office_users) can view and mark receipts entered.

-- 1. Receipts table
create table if not exists public.field_receipts (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  submitted_by text not null,
  amount       numeric(12,2) not null check (amount > 0),
  vendor       text not null,
  receipt_date date,
  job          text,
  category     text,
  note         text,
  file_path    text not null,
  file_type    text not null,
  status       text not null default 'new' check (status in ('new','entered')),
  entered_at   timestamptz
);
create index if not exists field_receipts_created_idx on public.field_receipts (created_at desc);

-- 2. Who counts as "office"
create table if not exists public.office_users (
  email text primary key
);
-- Add each office person (use the email they will sign in with):
-- insert into public.office_users (email) values ('hannah@yourcompany.com');

create or replace function public.is_office() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.office_users where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

alter table public.field_receipts enable row level security;
alter table public.office_users  enable row level security;

drop policy if exists "crew can add receipts" on public.field_receipts;
create policy "crew can add receipts" on public.field_receipts
  for insert to anon, authenticated
  with check (status = 'new' and entered_at is null);

drop policy if exists "office can read receipts" on public.field_receipts;
create policy "office can read receipts" on public.field_receipts
  for select to authenticated using (public.is_office());

drop policy if exists "office can update receipts" on public.field_receipts;
create policy "office can update receipts" on public.field_receipts
  for update to authenticated using (public.is_office()) with check (public.is_office());

-- 3. Private storage bucket for the photos (20 MB max, images + PDF only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('field-receipts', 'field-receipts', false, 20971520,
        array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "crew can upload receipt files" on storage.objects;
create policy "crew can upload receipt files" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'field-receipts');

drop policy if exists "office can view receipt files" on storage.objects;
create policy "office can view receipt files" on storage.objects
  for select to authenticated
  using (bucket_id = 'field-receipts' and public.is_office());

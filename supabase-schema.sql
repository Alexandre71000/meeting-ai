-- MeetingAI — schéma Supabase (tables + Row Level Security)
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run

create table meetings (
  id text primary key,
  user_id uuid references auth.users not null default auth.uid(),
  client text,
  title text,
  participants text,
  type text,
  next_action text,
  next_date text,
  transcript text,
  summary text,
  notes text,
  duration integer,
  date timestamptz
);

create table clients (
  id text primary key,
  user_id uuid references auth.users not null default auth.uid(),
  name text,
  contact text,
  phone text,
  email text,
  notes text,
  created_at timestamptz
);

create table categories (
  id text primary key,
  user_id uuid references auth.users not null default auth.uid(),
  label text,
  prompt text,
  fixed boolean
);

alter table meetings enable row level security;
alter table clients enable row level security;
alter table categories enable row level security;

create policy "Users manage their own meetings" on meetings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own clients" on clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own categories" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

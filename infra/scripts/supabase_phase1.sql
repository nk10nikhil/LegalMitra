-- Enable extensions
create extension if not exists "pgcrypto";
create extension if not exists vector;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'citizen' check (role in ('citizen','lawyer','judge','admin')),
  full_name text,
  email text,
  phone text,
  dob date,
  aadhaar_hash text,
  aadhaar_last4 text,
  bar_council_id text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists dob date;
alter table public.profiles add column if not exists aadhaar_hash text;
alter table public.profiles add column if not exists aadhaar_last4 text;

-- Cases
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_number text not null,
  court_code text not null,
  case_data jsonb not null,
  next_hearing timestamptz,
  status text not null,
  last_synced timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Case notes
create table if not exists public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  lawyer_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

-- Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  type text not null,
  title text not null,
  file_url text not null,
  form_data jsonb not null,
  created_at timestamptz not null default now()
);

-- Hearings (future-ready)
create table if not exists public.hearings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  scheduled_at timestamptz not null,
  room_url text not null,
  status text not null,
  recording_url text,
  transcript text
);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  content jsonb not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Audit logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Case laws (Phase 4)
create table if not exists public.case_laws (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  court text not null,
  judgment_date date not null,
  summary text not null,
  full_text text not null,
  embedding vector(384),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_cases_user_id on public.cases(user_id);
create index if not exists idx_cases_case_number_court_code on public.cases(case_number, court_code);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_resource on public.audit_logs(resource);
create index if not exists idx_case_laws_court on public.case_laws(court);
create index if not exists idx_case_laws_judgment_date on public.case_laws(judgment_date);
create index if not exists idx_case_laws_embedding on public.case_laws using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- RLS
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.case_notes enable row level security;
alter table public.documents enable row level security;
alter table public.hearings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.case_laws enable row level security;

-- Profiles policies
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Cases policies
drop policy if exists "Users can manage own cases" on public.cases;

create policy "Users can manage own cases"
  on public.cases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Case notes policies (lawyer and case owner)
drop policy if exists "Lawyers can manage own notes" on public.case_notes;
drop policy if exists "Users can read notes on own cases" on public.case_notes;

create policy "Lawyers can manage own notes"
  on public.case_notes for all
  using (auth.uid() = lawyer_id)
  with check (auth.uid() = lawyer_id);

create policy "Users can read notes on own cases"
  on public.case_notes for select
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_notes.case_id and c.user_id = auth.uid()
    )
  );

-- Documents policies
drop policy if exists "Users can manage own documents" on public.documents;

create policy "Users can manage own documents"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Hearings policies
drop policy if exists "Users can read hearings on own cases" on public.hearings;

create policy "Users can read hearings on own cases"
  on public.hearings for select
  using (
    exists (
      select 1 from public.cases c
      where c.id = hearings.case_id and c.user_id = auth.uid()
    )
  );

-- Notifications policies
drop policy if exists "Users can manage own notifications" on public.notifications;

create policy "Users can manage own notifications"
  on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Audit log policies
drop policy if exists "Users can read own audit logs" on public.audit_logs;
drop policy if exists "Users can insert own audit logs" on public.audit_logs;

create policy "Users can read own audit logs"
  on public.audit_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own audit logs"
  on public.audit_logs for insert
  with check (auth.uid() = user_id);

-- Case law policies
drop policy if exists "Authenticated users can read case laws" on public.case_laws;

create policy "Authenticated users can read case laws"
  on public.case_laws for select
  using (auth.role() = 'authenticated');

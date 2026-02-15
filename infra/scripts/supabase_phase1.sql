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

-- Hearing transcript segments
create table if not exists public.hearing_transcript_segments (
  id uuid primary key default gen_random_uuid(),
  hearing_id uuid not null references public.hearings(id) on delete cascade,
  speaker text,
  text text not null,
  started_at timestamptz,
  ended_at timestamptz,
  confidence double precision,
  source text not null,
  source_event_id text,
  created_at timestamptz not null default now()
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

-- ODR rooms
create table if not exists public.odr_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  counterparty_email text not null,
  created_at timestamptz not null default now()
);

-- ODR messages
create table if not exists public.odr_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.odr_rooms(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

-- ODR settlement agreements
create table if not exists public.odr_settlement_agreements (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.odr_rooms(id) on delete cascade,
  proposer_user_id uuid not null references public.profiles(id) on delete cascade,
  terms text not null,
  ai_mediator_suggestion text,
  status text not null,
  decided_at timestamptz,
  document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Lawyer time entries
create table if not exists public.lawyer_time_entries (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  description text not null,
  hours double precision not null,
  hourly_rate double precision not null,
  worked_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Case access invites
create table if not exists public.case_access_invites (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  lawyer_id uuid not null references public.profiles(id) on delete cascade,
  invitee_email text not null,
  status text not null default 'pending',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Integration connector requests
create table if not exists public.integration_connector_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  connector text not null,
  status text not null,
  job_id text,
  request_payload jsonb,
  result_payload jsonb,
  error_message text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
create index if not exists idx_hearing_transcript_segments_hearing_id on public.hearing_transcript_segments(hearing_id);
create index if not exists idx_hearing_transcript_segments_created_at on public.hearing_transcript_segments(created_at);
create index if not exists idx_hearing_transcript_segments_source_event_id on public.hearing_transcript_segments(source_event_id);
create index if not exists idx_odr_rooms_owner_user_id on public.odr_rooms(owner_user_id);
create index if not exists idx_odr_messages_room_id on public.odr_messages(room_id);
create index if not exists idx_odr_messages_sender_user_id on public.odr_messages(sender_user_id);
create index if not exists idx_odr_settlement_agreements_room_id on public.odr_settlement_agreements(room_id);
create index if not exists idx_odr_settlement_agreements_proposer_user_id on public.odr_settlement_agreements(proposer_user_id);
create index if not exists idx_odr_settlement_agreements_status on public.odr_settlement_agreements(status);
create index if not exists idx_lawyer_time_entries_lawyer_id on public.lawyer_time_entries(lawyer_id);
create index if not exists idx_lawyer_time_entries_case_id on public.lawyer_time_entries(case_id);
create index if not exists idx_case_access_invites_case_id on public.case_access_invites(case_id);
create index if not exists idx_case_access_invites_lawyer_id on public.case_access_invites(lawyer_id);
create index if not exists idx_case_access_invites_invitee_email on public.case_access_invites(invitee_email);
create index if not exists idx_integration_connector_requests_user_id on public.integration_connector_requests(user_id);
create index if not exists idx_integration_connector_requests_case_id on public.integration_connector_requests(case_id);
create index if not exists idx_integration_connector_requests_connector_status on public.integration_connector_requests(connector, status);
create index if not exists idx_integration_connector_requests_job_id on public.integration_connector_requests(job_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.case_notes enable row level security;
alter table public.documents enable row level security;
alter table public.hearings enable row level security;
alter table public.hearing_transcript_segments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.case_laws enable row level security;
alter table public.odr_rooms enable row level security;
alter table public.odr_messages enable row level security;
alter table public.odr_settlement_agreements enable row level security;
alter table public.lawyer_time_entries enable row level security;
alter table public.case_access_invites enable row level security;
alter table public.integration_connector_requests enable row level security;

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

-- Hearing transcript segment policies
drop policy if exists "Users can read transcript segments on own hearings" on public.hearing_transcript_segments;

create policy "Users can read transcript segments on own hearings"
  on public.hearing_transcript_segments for select
  using (
    exists (
      select 1
      from public.hearings h
      join public.cases c on c.id = h.case_id
      where h.id = hearing_transcript_segments.hearing_id
        and c.user_id = auth.uid()
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

-- ODR room policies
drop policy if exists "Users can manage own ODR rooms" on public.odr_rooms;

create policy "Users can manage own ODR rooms"
  on public.odr_rooms for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- ODR message policies
drop policy if exists "Users can manage messages in own ODR rooms" on public.odr_messages;

create policy "Users can manage messages in own ODR rooms"
  on public.odr_messages for all
  using (
    exists (
      select 1 from public.odr_rooms r
      where r.id = odr_messages.room_id and r.owner_user_id = auth.uid()
    )
  )
  with check (
    sender_user_id = auth.uid()
    and exists (
      select 1 from public.odr_rooms r
      where r.id = odr_messages.room_id and r.owner_user_id = auth.uid()
    )
  );

-- ODR settlement agreement policies
drop policy if exists "Users can manage settlements in own ODR rooms" on public.odr_settlement_agreements;

create policy "Users can manage settlements in own ODR rooms"
  on public.odr_settlement_agreements for all
  using (
    exists (
      select 1 from public.odr_rooms r
      where r.id = odr_settlement_agreements.room_id and r.owner_user_id = auth.uid()
    )
  )
  with check (
    proposer_user_id = auth.uid()
    and exists (
      select 1 from public.odr_rooms r
      where r.id = odr_settlement_agreements.room_id and r.owner_user_id = auth.uid()
    )
  );

-- Lawyer time entry policies
drop policy if exists "Lawyers manage own time entries" on public.lawyer_time_entries;

create policy "Lawyers manage own time entries"
  on public.lawyer_time_entries for all
  using (auth.uid() = lawyer_id)
  with check (auth.uid() = lawyer_id);

-- Case invite policies
drop policy if exists "Lawyers manage own case invites" on public.case_access_invites;

create policy "Lawyers manage own case invites"
  on public.case_access_invites for all
  using (auth.uid() = lawyer_id)
  with check (auth.uid() = lawyer_id);

-- Integration connector request policies
drop policy if exists "Users can manage own integration connector requests" on public.integration_connector_requests;

create policy "Users can manage own integration connector requests"
  on public.integration_connector_requests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

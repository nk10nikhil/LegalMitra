-- Lawyer billing and case invite support
create table if not exists "lawyer_time_entries" (
  "id" uuid not null default gen_random_uuid(),
  "lawyer_id" uuid not null,
  "case_id" uuid,
  "description" text not null,
  "hours" double precision not null,
  "hourly_rate" double precision not null,
  "worked_at" timestamptz not null,
  "created_at" timestamptz not null default now(),
  constraint "lawyer_time_entries_pkey" primary key ("id"),
  constraint "lawyer_time_entries_lawyer_id_fkey" foreign key ("lawyer_id") references "profiles"("id") on delete cascade on update cascade,
  constraint "lawyer_time_entries_case_id_fkey" foreign key ("case_id") references "cases"("id") on delete set null on update cascade
);

create index if not exists "idx_lawyer_time_entries_lawyer_id" on "lawyer_time_entries"("lawyer_id");
create index if not exists "idx_lawyer_time_entries_case_id" on "lawyer_time_entries"("case_id");

create table if not exists "case_access_invites" (
  "id" uuid not null default gen_random_uuid(),
  "case_id" uuid not null,
  "lawyer_id" uuid not null,
  "invitee_email" text not null,
  "status" text not null,
  "accepted_at" timestamptz,
  "created_at" timestamptz not null default now(),
  constraint "case_access_invites_pkey" primary key ("id"),
  constraint "case_access_invites_case_id_fkey" foreign key ("case_id") references "cases"("id") on delete cascade on update cascade,
  constraint "case_access_invites_lawyer_id_fkey" foreign key ("lawyer_id") references "profiles"("id") on delete cascade on update cascade
);

create index if not exists "idx_case_access_invites_case_id" on "case_access_invites"("case_id");
create index if not exists "idx_case_access_invites_lawyer_id" on "case_access_invites"("lawyer_id");
create index if not exists "idx_case_access_invites_invitee_email" on "case_access_invites"("invitee_email");

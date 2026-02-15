-- Hearing transcript segment persistence
create table if not exists "hearing_transcript_segments" (
  "id" uuid not null default gen_random_uuid(),
  "hearing_id" uuid not null,
  "speaker" text,
  "text" text not null,
  "started_at" timestamptz,
  "ended_at" timestamptz,
  "confidence" double precision,
  "source" text not null,
  "source_event_id" text,
  "created_at" timestamptz not null default now(),
  constraint "hearing_transcript_segments_pkey" primary key ("id"),
  constraint "hearing_transcript_segments_hearing_id_fkey" foreign key ("hearing_id") references "hearings"("id") on delete cascade on update cascade
);

create index if not exists "idx_hearing_transcript_segments_hearing_id" on "hearing_transcript_segments"("hearing_id");
create index if not exists "idx_hearing_transcript_segments_created_at" on "hearing_transcript_segments"("created_at");
create index if not exists "idx_hearing_transcript_segments_source_event_id" on "hearing_transcript_segments"("source_event_id");

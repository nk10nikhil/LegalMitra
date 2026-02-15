-- ODR settlement agreement lifecycle
create table if not exists "odr_settlement_agreements" (
  "id" uuid not null default gen_random_uuid(),
  "room_id" uuid not null,
  "proposer_user_id" uuid not null,
  "terms" text not null,
  "ai_mediator_suggestion" text,
  "status" text not null,
  "decided_at" timestamptz,
  "document_id" uuid,
  "created_at" timestamptz not null default now(),
  constraint "odr_settlement_agreements_pkey" primary key ("id"),
  constraint "odr_settlement_agreements_room_id_fkey" foreign key ("room_id") references "odr_rooms"("id") on delete cascade on update cascade,
  constraint "odr_settlement_agreements_proposer_user_id_fkey" foreign key ("proposer_user_id") references "profiles"("id") on delete cascade on update cascade,
  constraint "odr_settlement_agreements_document_id_fkey" foreign key ("document_id") references "documents"("id") on delete set null on update cascade
);

create index if not exists "idx_odr_settlement_agreements_room_id" on "odr_settlement_agreements"("room_id");
create index if not exists "idx_odr_settlement_agreements_proposer_user_id" on "odr_settlement_agreements"("proposer_user_id");
create index if not exists "idx_odr_settlement_agreements_status" on "odr_settlement_agreements"("status");

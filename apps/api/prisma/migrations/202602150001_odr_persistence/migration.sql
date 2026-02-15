-- ODR persistence migration
create table if not exists "odr_rooms" (
  "id" uuid not null default gen_random_uuid(),
  "owner_user_id" uuid not null,
  "title" text not null,
  "counterparty_email" text not null,
  "created_at" timestamptz not null default now(),
  constraint "odr_rooms_pkey" primary key ("id"),
  constraint "odr_rooms_owner_user_id_fkey" foreign key ("owner_user_id") references "profiles"("id") on delete cascade on update cascade
);

create table if not exists "odr_messages" (
  "id" uuid not null default gen_random_uuid(),
  "room_id" uuid not null,
  "sender_user_id" uuid not null,
  "message" text not null,
  "created_at" timestamptz not null default now(),
  constraint "odr_messages_pkey" primary key ("id"),
  constraint "odr_messages_room_id_fkey" foreign key ("room_id") references "odr_rooms"("id") on delete cascade on update cascade,
  constraint "odr_messages_sender_user_id_fkey" foreign key ("sender_user_id") references "profiles"("id") on delete cascade on update cascade
);

create index if not exists "idx_odr_rooms_owner_user_id" on "odr_rooms"("owner_user_id");
create index if not exists "idx_odr_messages_room_id" on "odr_messages"("room_id");
create index if not exists "idx_odr_messages_sender_user_id" on "odr_messages"("sender_user_id");

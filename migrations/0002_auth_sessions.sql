-- Migration: Add password login and session tables
alter table admin_users add column password_hash text;

create table if not exists admin_sessions (
  id text primary key,
  admin_user_id integer not null references admin_users(id) on delete cascade,
  expires_at text not null,
  created_at text not null default current_timestamp
);

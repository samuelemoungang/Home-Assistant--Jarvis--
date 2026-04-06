create table if not exists public.pi_runtime_status (
  device_id text primary key,
  cpu_temp double precision not null default 0,
  ram_percent double precision not null default 0,
  ram_used double precision not null default 0,
  ram_total double precision not null default 0,
  uptime text not null default 'unknown',
  hand_detected boolean not null default false,
  temperature double precision,
  humidity double precision,
  source_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pi_camera_snapshots (
  device_id text primary key,
  content_type text not null default 'image/jpeg',
  image_base64 text,
  source_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pi_runtime_status enable row level security;
alter table public.pi_camera_snapshots enable row level security;

drop policy if exists "pi_runtime_status_public_select" on public.pi_runtime_status;
create policy "pi_runtime_status_public_select"
on public.pi_runtime_status
for select
to anon, authenticated
using (true);

drop policy if exists "pi_camera_snapshots_public_select" on public.pi_camera_snapshots;
create policy "pi_camera_snapshots_public_select"
on public.pi_camera_snapshots
for select
to anon, authenticated
using (true);

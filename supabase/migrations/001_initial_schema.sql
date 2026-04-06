-- =============================================================================
-- CLIENT ONBOARDING — Initial Schema
-- Run this entire script in the Supabase SQL Editor (once, in order).
-- =============================================================================

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

create type public.user_role as enum ('admin', 'client', 'freelancer');
create type public.client_status as enum ('pending', 'in_progress', 'completed');
create type public.project_status as enum ('active', 'on_hold', 'completed');
create type public.credential_status as enum ('draft', 'submitted');
create type public.file_type as enum ('contract', 'quote', 'spec', 'invoice', 'other');

-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PROFILES  (extends auth.users — one row per authenticated user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text        not null,
  role        public.user_role not null default 'client',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SYSTEMS  (admin-managed catalogue of external integrations)
-- credential_fields stores the dynamic form schema as a JSON array:
--   [{ name, label, type, required, placeholder?, help_text?, options? }]
-- ---------------------------------------------------------------------------
create table public.systems (
  id                 uuid        primary key default gen_random_uuid(),
  name               text        not null,
  logo_url           text,
  description        text,
  credential_fields  jsonb       not null default '[]'::jsonb,
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CLIENTS  (one row per client company)
-- ---------------------------------------------------------------------------
create table public.clients (
  id              uuid               primary key default gen_random_uuid(),
  user_id         uuid               references public.profiles (id) on delete set null,
  company_name    text               not null,
  monday_item_id  text,
  status          public.client_status not null default 'pending',
  created_at      timestamptz        not null default now(),
  created_by      uuid               references public.profiles (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- PROJECTS  (a client may have multiple projects)
-- ---------------------------------------------------------------------------
create table public.projects (
  id                  uuid                  primary key default gen_random_uuid(),
  client_id           uuid                  not null references public.clients (id) on delete cascade,
  name                text                  not null,
  monday_project_id   text,
  status              public.project_status not null default 'active',
  created_at          timestamptz           not null default now()
);

-- ---------------------------------------------------------------------------
-- PROJECT_SYSTEMS  (which systems are scoped to which project)
-- This drives the conditional onboarding form shown to the client.
-- ---------------------------------------------------------------------------
create table public.project_systems (
  id             uuid    primary key default gen_random_uuid(),
  project_id     uuid    not null references public.projects (id) on delete cascade,
  system_id      uuid    not null references public.systems  (id) on delete cascade,
  display_order  int     not null default 0,
  is_required    boolean not null default true,
  unique (project_id, system_id)
);

-- ---------------------------------------------------------------------------
-- FREELANCER_ASSIGNMENTS  (assigns freelancers to projects via API)
-- ---------------------------------------------------------------------------
create table public.freelancer_assignments (
  id             uuid        primary key default gen_random_uuid(),
  project_id     uuid        not null references public.projects  (id) on delete cascade,
  freelancer_id  uuid        not null references public.profiles  (id) on delete cascade,
  assigned_at    timestamptz not null default now(),
  assigned_by    uuid        references public.profiles (id) on delete set null,
  unique (project_id, freelancer_id)
);

-- ---------------------------------------------------------------------------
-- CREDENTIALS  (client submissions per system per project)
-- field_values: { "api_key": "abc123", "phone": "+1..." }
-- Supabase Native Webhook fires on status → 'submitted' (configured in dashboard).
-- ---------------------------------------------------------------------------
create table public.credentials (
  id            uuid                     primary key default gen_random_uuid(),
  project_id    uuid                     not null references public.projects (id) on delete cascade,
  system_id     uuid                     not null references public.systems  (id) on delete cascade,
  client_id     uuid                     not null references public.clients  (id) on delete cascade,
  field_values  jsonb                    not null default '{}'::jsonb,
  status        public.credential_status not null default 'draft',
  submitted_at  timestamptz,
  updated_at    timestamptz              not null default now(),
  unique (project_id, system_id)
);

-- ---------------------------------------------------------------------------
-- FILES  (admin uploads contracts / quotes / specs / invoices for clients)
-- is_visible_to_freelancer: admin toggle (invoices/quotes are ALWAYS hidden
-- from freelancers via RLS regardless of this flag).
-- ---------------------------------------------------------------------------
create table public.files (
  id                        uuid              primary key default gen_random_uuid(),
  client_id                 uuid              not null references public.clients  (id) on delete cascade,
  project_id                uuid              not null references public.projects (id) on delete cascade,
  file_name                 text              not null,
  storage_path              text              not null,
  file_type                 public.file_type  not null default 'other',
  is_visible_to_freelancer  boolean           not null default false,
  uploaded_by               uuid              references public.profiles (id) on delete set null,
  uploaded_at               timestamptz       not null default now()
);

-- =============================================================================
-- 3. INDEXES  (optimise the most common query patterns)
-- =============================================================================

create index idx_clients_user_id           on public.clients               (user_id);
create index idx_clients_monday_item_id    on public.clients               (monday_item_id);
create index idx_clients_status            on public.clients               (status);
create index idx_projects_client_id        on public.projects              (client_id);
create index idx_project_systems_proj      on public.project_systems       (project_id);
create index idx_project_systems_sys       on public.project_systems       (system_id);
create index idx_fa_project_id             on public.freelancer_assignments (project_id);
create index idx_fa_freelancer_id          on public.freelancer_assignments (freelancer_id);
create index idx_credentials_project_id    on public.credentials           (project_id);
create index idx_credentials_client_id     on public.credentials           (client_id);
create index idx_credentials_status        on public.credentials           (status);
create index idx_files_client_id           on public.files                 (client_id);
create index idx_files_project_id          on public.files                 (project_id);
create index idx_files_type                on public.files                 (file_type);

-- =============================================================================
-- 4. HELPER FUNCTIONS  (used inside RLS policies)
-- security definer + stable = evaluated once per query, not per row.
-- =============================================================================

create or replace function public.get_my_role()
returns public.user_role
language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql security definer stable as $$
  select public.get_my_role() = 'admin';
$$;

create or replace function public.is_assigned_to_project(p_project_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from public.freelancer_assignments
    where project_id = p_project_id
      and freelancer_id = auth.uid()
  );
$$;

create or replace function public.get_my_client_id()
returns uuid
language sql security definer stable as $$
  select id from public.clients where user_id = auth.uid();
$$;

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- Auto-update credentials.updated_at on every update
create or replace function public.fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_credentials_updated_at
  before update on public.credentials
  for each row execute procedure public.fn_set_updated_at();

-- Auto-stamp credentials.submitted_at when status transitions to 'submitted'
create or replace function public.fn_set_submitted_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'submitted' and (old.status is distinct from 'submitted') then
    new.submitted_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_credentials_submitted_at
  before update on public.credentials
  for each row execute procedure public.fn_set_submitted_at();

-- =============================================================================
-- 6. AUTO-CREATE PROFILE ON SIGN-UP
-- Reads role from user metadata so Make.com can pass it during user creation.
-- =============================================================================

create or replace function public.fn_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'client'
    )
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.fn_handle_new_user();

-- =============================================================================
-- 7. ROW LEVEL SECURITY — enable on every table
-- =============================================================================

alter table public.profiles               enable row level security;
alter table public.systems                enable row level security;
alter table public.clients                enable row level security;
alter table public.projects               enable row level security;
alter table public.project_systems        enable row level security;
alter table public.freelancer_assignments enable row level security;
alter table public.credentials            enable row level security;
alter table public.files                  enable row level security;

-- =============================================================================
-- 8. RLS POLICIES
-- =============================================================================

-- ── PROFILES ─────────────────────────────────────────────────────────────────
-- Admin: unrestricted
create policy "profiles: admin full access"
  on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Any user: read own row
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

-- Any user: update own row
create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ── SYSTEMS ──────────────────────────────────────────────────────────────────
-- Admin: full CRUD
create policy "systems: admin full access"
  on public.systems for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Everyone else: read only
create policy "systems: read for all authenticated"
  on public.systems for select to authenticated
  using (true);

-- ── CLIENTS ──────────────────────────────────────────────────────────────────
-- Admin
create policy "clients: admin full access"
  on public.clients for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Client: read own record
create policy "clients: client reads own"
  on public.clients for select to authenticated
  using (
    public.get_my_role() = 'client'
    and user_id = auth.uid()
  );

-- Freelancer: read clients on assigned projects
create policy "clients: freelancer reads assigned"
  on public.clients for select to authenticated
  using (
    public.get_my_role() = 'freelancer'
    and exists (
      select 1 from public.projects p
      join public.freelancer_assignments fa on fa.project_id = p.id
      where p.client_id = clients.id
        and fa.freelancer_id = auth.uid()
    )
  );

-- ── PROJECTS ─────────────────────────────────────────────────────────────────
create policy "projects: admin full access"
  on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "projects: client reads own"
  on public.projects for select to authenticated
  using (
    public.get_my_role() = 'client'
    and client_id = public.get_my_client_id()
  );

create policy "projects: freelancer reads assigned"
  on public.projects for select to authenticated
  using (
    public.get_my_role() = 'freelancer'
    and public.is_assigned_to_project(id)
  );

-- ── PROJECT_SYSTEMS ───────────────────────────────────────────────────────────
create policy "project_systems: admin full access"
  on public.project_systems for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "project_systems: client reads own project"
  on public.project_systems for select to authenticated
  using (
    public.get_my_role() = 'client'
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.client_id = public.get_my_client_id()
    )
  );

create policy "project_systems: freelancer reads assigned"
  on public.project_systems for select to authenticated
  using (
    public.get_my_role() = 'freelancer'
    and public.is_assigned_to_project(project_id)
  );

-- ── FREELANCER_ASSIGNMENTS ────────────────────────────────────────────────────
create policy "assignments: admin full access"
  on public.freelancer_assignments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "assignments: freelancer reads own"
  on public.freelancer_assignments for select to authenticated
  using (
    public.get_my_role() = 'freelancer'
    and freelancer_id = auth.uid()
  );

-- ── CREDENTIALS ───────────────────────────────────────────────────────────────
create policy "credentials: admin full access"
  on public.credentials for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Client: read own
create policy "credentials: client reads own"
  on public.credentials for select to authenticated
  using (
    public.get_my_role() = 'client'
    and client_id = public.get_my_client_id()
  );

-- Client: insert own (client_id must match self)
create policy "credentials: client inserts own"
  on public.credentials for insert to authenticated
  with check (
    public.get_my_role() = 'client'
    and client_id = public.get_my_client_id()
  );

-- Client: update own (no delete)
create policy "credentials: client updates own"
  on public.credentials for update to authenticated
  using (
    public.get_my_role() = 'client'
    and client_id = public.get_my_client_id()
  )
  with check (
    public.get_my_role() = 'client'
    and client_id = public.get_my_client_id()
  );

-- Freelancer: read credentials for assigned projects
create policy "credentials: freelancer reads assigned"
  on public.credentials for select to authenticated
  using (
    public.get_my_role() = 'freelancer'
    and public.is_assigned_to_project(project_id)
  );

-- ── FILES ─────────────────────────────────────────────────────────────────────
create policy "files: admin full access"
  on public.files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Client: read files uploaded for them
create policy "files: client reads own"
  on public.files for select to authenticated
  using (
    public.get_my_role() = 'client'
    and client_id = public.get_my_client_id()
  );

-- Freelancer: read files for assigned projects,
-- excluding invoices and quotes (always, regardless of is_visible_to_freelancer).
create policy "files: freelancer reads assigned non-financial"
  on public.files for select to authenticated
  using (
    public.get_my_role() = 'freelancer'
    and public.is_assigned_to_project(project_id)
    and is_visible_to_freelancer = true
    and file_type not in ('invoice', 'quote')
  );

-- =============================================================================
-- 9. STORAGE BUCKET  (run separately via Supabase dashboard or API)
-- =============================================================================
-- Create a bucket named "client-files" with:
--   • Public: false
--   • Allowed MIME types: application/pdf, image/*, application/msword,
--     application/vnd.openxmlformats-officedocument.*
--   • Max file size: 50 MB
--
-- Storage RLS policies (add via dashboard → Storage → Policies):
--
-- INSERT policy "admins can upload":
--   (select role from public.profiles where id = auth.uid()) = 'admin'
--
-- SELECT policy "admins see all":
--   (select role from public.profiles where id = auth.uid()) = 'admin'
--
-- SELECT policy "clients see own folder":
--   (select role from public.profiles where id = auth.uid()) = 'client'
--   AND name LIKE (select id::text from public.clients where user_id = auth.uid()) || '/%'
--
-- SELECT policy "freelancers see assigned non-financial":
--   exists (
--     select 1 from public.files f
--     join public.freelancer_assignments fa on fa.project_id = f.project_id
--     where f.storage_path = name
--       and fa.freelancer_id = auth.uid()
--       and f.is_visible_to_freelancer = true
--       and f.file_type not in ('invoice', 'quote')
--   )
--
-- =============================================================================
-- 10. SUPABASE NATIVE WEBHOOK  (configure via dashboard, not SQL)
-- =============================================================================
-- Dashboard → Database → Webhooks → Create a new webhook:
--   • Name:        credential_submitted_to_make
--   • Table:       public.credentials
--   • Events:      UPDATE
--   • URL:         <your Make.com webhook URL>
--   • HTTP method: POST
--   • Headers:     Content-Type: application/json
--   • Condition (pgmq filter):  new.status = 'submitted'
--
-- Make.com will receive the full credentials row as the payload.
-- The client name is available by joining on client_id → clients.company_name,
-- which Make.com can fetch via a Supabase HTTP module query.
-- =============================================================================

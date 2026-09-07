-- Click4Tech Solutions — CMS schema
-- Run this once in your Supabase project's SQL Editor (Supabase Dashboard → SQL Editor → New query → paste → Run).
--
-- Pattern: every table has Row Level Security enabled with ZERO policies for
-- anon/authenticated roles. That means the browser can NEVER read or write
-- these tables directly, no matter what key it has — only server-side code
-- using the service_role key (used by the Netlify Functions) can touch them.
-- This is the same lock-down pattern used for srisubramaniarlokkawi.org's CMS.

-- ---------------------------------------------------------------------------
-- Singleton content (one row each — id is always 1)
-- ---------------------------------------------------------------------------

create table if not exists hero_banner (
  id int primary key default 1,
  eyebrow text not null default '',
  headline_before text not null default '',
  headline_highlight text not null default '',
  headline_after text not null default '',
  lede text not null default '',
  cta_primary_text text not null default '',
  cta_secondary_text text not null default '',
  stat1_value text not null default '',
  stat1_suffix text not null default '',
  stat1_label text not null default '',
  stat2_value text not null default '',
  stat2_suffix text not null default '',
  stat2_label text not null default '',
  stat3_value text not null default '',
  stat3_suffix text not null default '',
  stat3_label text not null default '',
  updated_at timestamptz not null default now(),
  constraint hero_banner_singleton check (id = 1)
);

create table if not exists contact_info (
  id int primary key default 1,
  phone_display text not null default '',
  phone_href text not null default '',
  email text not null default '',
  address text not null default '',
  whatsapp_link text not null default '',
  footer_text text not null default '',
  updated_at timestamptz not null default now(),
  constraint contact_info_singleton check (id = 1)
);

-- ---------------------------------------------------------------------------
-- List content
-- ---------------------------------------------------------------------------

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  is_published boolean not null default true,
  name text not null,
  logo_url text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  is_published boolean not null default true,
  group_name text not null default 'core',       -- 'core' or 'digital' — drives the section divider on the site
  icon_key text not null default 'kiosk',         -- picks a fixed icon from the site's built-in icon set (see cms.html)
  title text not null,
  kicker text not null default '',
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists why_cards (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  is_published boolean not null default true,
  icon_key text not null default 'shield',
  title text not null,
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists work_items (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  is_published boolean not null default true,
  title text not null,
  status text not null default 'Live',
  description text not null default '',
  bullets jsonb not null default '[]'::jsonb,     -- array of strings, e.g. ["bullet one", "bullet two"]
  domain text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists pricing_factors (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  is_published boolean not null default true,
  title text not null,
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  is_published boolean not null default true,
  question text not null,
  answer text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security — lock every table to service-role-only access
-- ---------------------------------------------------------------------------

alter table hero_banner enable row level security;
alter table contact_info enable row level security;
alter table clients enable row level security;
alter table services enable row level security;
alter table why_cards enable row level security;
alter table work_items enable row level security;
alter table pricing_factors enable row level security;
alter table faqs enable row level security;

-- (Intentionally no policies are created for anon/authenticated — this means
-- those roles get zero access, and only the service_role key bypasses RLS.)

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded images (client logos, footer logo, future photos)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('click4tech-media', 'click4tech-media', true)
on conflict (id) do nothing;

-- Public read access to files in this bucket (so the live site can show images)
drop policy if exists "Public read access to click4tech-media" on storage.objects;
create policy "Public read access to click4tech-media"
  on storage.objects for select
  using (bucket_id = 'click4tech-media');

-- No insert/update/delete policies for anon/authenticated — uploads only
-- happen server-side via the service_role key (cms-upload-image.js).

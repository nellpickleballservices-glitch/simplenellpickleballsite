-- Gallery items table for public photo/video gallery
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('image', 'video')),
  url text not null,
  thumbnail_url text,
  title_es text,
  title_en text,
  caption_es text,
  caption_en text,
  grid_size text not null default '1x1' check (grid_size in ('1x1', '1x2', '2x1', '2x2')),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.gallery_items enable row level security;

-- Public read: only visible items
create policy "gallery_items_select_public"
  on public.gallery_items for select
  to anon, authenticated
  using (is_visible = true);

-- Service-role full access (admin actions use supabaseAdmin)
create policy "gallery_items_service_role_all"
  on public.gallery_items for all
  to service_role
  using (true)
  with check (true);

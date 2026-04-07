-- =============================================================================
-- Affiliate Tools table — admin-managed list shown to clients
-- =============================================================================

create table public.affiliate_tools (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  description    text,
  logo_url       text,
  color          text        not null default '#64748b',
  affiliate_url  text        not null,
  display_order  int         not null default 0,
  is_active      boolean     not null default true,
  created_at     timestamptz not null default now()
);

create index idx_affiliate_tools_order on public.affiliate_tools (display_order);

alter table public.affiliate_tools enable row level security;

-- Admin: full CRUD
create policy "affiliate_tools: admin full access"
  on public.affiliate_tools for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- All authenticated users: read active tools
create policy "affiliate_tools: read active for all authenticated"
  on public.affiliate_tools for select to authenticated
  using (is_active = true);

-- =============================================================================
-- Seed initial tools
-- =============================================================================

insert into public.affiliate_tools (name, description, color, affiliate_url, display_order) values
  ('n8n',       'אוטומציות / סוכני AI',                              '#e74c3c', 'https://n8n.partnerlinks.io/8v2tg6c00fyi', 1),
  ('Make',      'אוטומציות',                                          '#7e57c2', 'https://www.make.com/en/register?pc=avifinarsky', 2),
  ('Monday',    'ניהול משימות, לקוחות ולידים',                        '#f06292', 'https://try.monday.com/5f1fm76s4fsl', 3),
  ('Fireflies', 'תמלול שיחות',                                        '#8e44ad', 'https://fireflies.ai?fpr=autonomi', 4),
  ('Fillfaster','הצעות מחיר וחוזים',                                  '#2980b9', 'https://my.fillfaster.com/api/affurl/0LDqQQk8ujMymQdp/3lNRUzH761x7DpUp?target=0BaY5CV8qGnMR3fp', 5),
  ('ManyChat',  'בוטים לאינסטגרם / טלגרם / וואטסאפ / פייסבוק',      '#e67e22', 'https://manychat.partnerlinks.io/qwjvn5q0urpd', 6),
  ('Lovable',   'בניית אפליקציות עם AI',                              '#ec407a', 'https://lovable.dev/?via=autonomi-ai', 7),
  ('Cal.com',   'קביעת פגישות עם תזכורות אוטומטיות',                 '#334155', 'https://refer.cal.com/autonomi-ai', 8),
  ('Gamma AI',  'יצירת מצגות עם AI',                                  '#27ae60', 'https://try.gamma.app/71thgp0wv6er', 9);

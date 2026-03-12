-- NELL Pickleball Club — Admin, Events enhancements, CMS seed data
-- Run in: Supabase Dashboard -> SQL Editor
-- Adds event columns, court maintenance columns, admin reservation tracking,
-- and seeds content_blocks for Phase 5 pages.

-- ============================================================
-- 1. Events table enhancements
-- ============================================================
ALTER TABLE events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'social'
  CHECK (event_type IN ('tournament', 'training', 'social'));
ALTER TABLE events ADD COLUMN start_time TIME;
ALTER TABLE events ADD COLUMN end_time TIME;
ALTER TABLE events ADD COLUMN image_url TEXT;

-- ============================================================
-- 2. Courts maintenance window columns
-- ============================================================
ALTER TABLE courts ADD COLUMN maintenance_start TIMESTAMPTZ;
ALTER TABLE courts ADD COLUMN maintenance_end TIMESTAMPTZ;

-- ============================================================
-- 3. Reservations admin tracking
-- ============================================================
ALTER TABLE reservations ADD COLUMN created_by_admin BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 4. Seed content_blocks for Phase 5 pages (ON CONFLICT DO NOTHING)
-- ============================================================

-- Home page blocks
INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order)
VALUES
  ('home_hero', 'rich_text', '<h2>Bienvenido a NELL</h2><p>Contenido pendiente...</p>', '<h2>Welcome to NELL</h2><p>Content pending...</p>', 1),
  ('home_overview', 'rich_text', '<h2>Sobre NELL</h2><p>Contenido pendiente...</p>', '<h2>About NELL</h2><p>Content pending...</p>', 2)
ON CONFLICT (block_key) DO NOTHING;

-- About page blocks
INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order)
VALUES
  ('about_vision', 'rich_text', '<h2>Nuestra Vision</h2><p>Contenido pendiente...</p>', '<h2>Our Vision</h2><p>Content pending...</p>', 1),
  ('about_mission', 'rich_text', '<h2>Nuestra Mision</h2><p>Contenido pendiente...</p>', '<h2>Our Mission</h2><p>Content pending...</p>', 2),
  ('about_values', 'rich_text', '<h2>Nuestros Valores</h2><p>Contenido pendiente...</p>', '<h2>Our Values</h2><p>Content pending...</p>', 3)
ON CONFLICT (block_key) DO NOTHING;

-- Learn page blocks
INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order)
VALUES
  ('learn_origin', 'rich_text', '<h2>Origen del Pickleball</h2><p>Contenido pendiente...</p>', '<h2>Origin of Pickleball</h2><p>Content pending...</p>', 1),
  ('learn_rules', 'rich_text', '<h2>Reglas del Juego</h2><p>Contenido pendiente...</p>', '<h2>Game Rules</h2><p>Content pending...</p>', 2),
  ('learn_scoring', 'rich_text', '<h2>Puntuacion</h2><p>Contenido pendiente...</p>', '<h2>Scoring</h2><p>Content pending...</p>', 3),
  ('learn_equipment', 'rich_text', '<h2>Equipamiento</h2><p>Contenido pendiente...</p>', '<h2>Equipment</h2><p>Content pending...</p>', 4)
ON CONFLICT (block_key) DO NOTHING;

-- FAQ page blocks
INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order)
VALUES
  ('faq_general', 'rich_text', '<h2>Preguntas Generales</h2><p>Contenido pendiente...</p>', '<h2>General Questions</h2><p>Content pending...</p>', 1),
  ('faq_membership', 'rich_text', '<h2>Membresia</h2><p>Contenido pendiente...</p>', '<h2>Membership</h2><p>Content pending...</p>', 2),
  ('faq_reservations', 'rich_text', '<h2>Reservas</h2><p>Contenido pendiente...</p>', '<h2>Reservations</h2><p>Content pending...</p>', 3),
  ('faq_rules', 'rich_text', '<h2>Reglas del Club</h2><p>Contenido pendiente...</p>', '<h2>Club Rules</h2><p>Content pending...</p>', 4)
ON CONFLICT (block_key) DO NOTHING;

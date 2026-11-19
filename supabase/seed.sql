-- ===========================================================================
-- Frontage Local Seed Data
--
-- Configured in supabase/config.toml ([db.seed] sql_paths = ["./seed.sql"]).
-- Runs automatically on `supabase db reset`.
--
-- Seeds:
--   1. Product configurator types ('door', 'window')
--   2. Admin user:
--      - Email: admin@mail.com
--      - Password: admin@mail.com
--      - Role: admin (platform-level administrator)
--   3. Simple business user:
--      - Email: testing@mail.com
--      - Password: testing@mail.com
--      - Role: user (standard business / dealer account)
--   4. Components (embed_widgets) with diverse styling palettes:
--      - Slate & Charcoal Minimalist (Doors)
--      - British Racing Green & Sage (Windows)
--      - Coastal Azure Ocean Glazing (Doors)
--      - Warm Burnished Amber & Joinery (Windows)
--      - Atelier Luxe Royal Violet (Doors - Paused)
--      - Platform Showcase Doors & Windows (Admin)
--   5. Widget analytics views & sample leads (quotes) for dashboard demonstration
-- ===========================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Configurator types
INSERT INTO public.configurator_types (slug, label)
VALUES 
  ('door', 'Doors'),
  ('window', 'Windows')
ON CONFLICT (slug) DO NOTHING;

-- 3. Cleanup any prior seed records if re-running on an active DB
DELETE FROM auth.users WHERE email IN ('admin@mail.com', 'testing@mail.com');

-- 4. Create auth users with encrypted passwords matching their emails
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'admin@mail.com',
  extensions.crypt('admin@mail.com', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
  '{"name": "Admin User", "full_name": "Admin User"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
), (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'testing@mail.com',
  extensions.crypt('testing@mail.com', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"], "role": "user"}'::jsonb,
  '{"name": "Testing Business", "full_name": "Testing Business"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- 5. Insert auth identities for email provider
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'a0000000-0000-4000-8000-000000000001',
  format('{"sub":"%s","email":"%s","email_verified":true,"phone_verified":false}', 'a0000000-0000-4000-8000-000000000001', 'admin@mail.com')::jsonb,
  'email',
  'a0000000-0000-4000-8000-000000000001',
  now(),
  now(),
  now()
), (
  gen_random_uuid(),
  'b0000000-0000-4000-8000-000000000002',
  format('{"sub":"%s","email":"%s","email_verified":true,"phone_verified":false}', 'b0000000-0000-4000-8000-000000000002', 'testing@mail.com')::jsonb,
  'email',
  'b0000000-0000-4000-8000-000000000002',
  now(),
  now(),
  now()
);

-- 6. Ensure public.accounts roles are set correctly (handle_new_user defaults role to 'user')
UPDATE public.accounts
SET name = 'Admin User', role = 'admin'
WHERE id = 'a0000000-0000-4000-8000-000000000001';

UPDATE public.accounts
SET name = 'Testing Business', role = 'user'
WHERE id = 'b0000000-0000-4000-8000-000000000002';

-- 7. Components (embed_widgets) with varied styling
INSERT INTO public.embed_widgets (
  id,
  account_id,
  configurator_type_id,
  public_key,
  name,
  website_url,
  brand_name,
  brand_phone,
  brand_primary_color,
  brand_background_color,
  brand_text_color,
  enabled
) VALUES
  -- 1) Slate & Charcoal Minimalist (Doors, Business user)
  (
    'c0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002',
    (SELECT id FROM public.configurator_types WHERE slug = 'door'),
    'd0000000-0000-4000-8000-000000000001',
    'Main Website Composite Doors',
    'https://testingdoors.co.uk',
    'Apex Architectural Entrances',
    '0161 832 9000',
    '#1e293b',
    '#f8fafc',
    '#0f172a',
    true
  ),
  -- 2) British Heritage Racing Green (Windows, Business user)
  (
    'c0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000002',
    (SELECT id FROM public.configurator_types WHERE slug = 'window'),
    'd0000000-0000-4000-8000-000000000002',
    'Heritage Casement & Sash Windows',
    'https://cotswoldwindows.co.uk',
    'Cotswold Heritage Windows',
    '01386 852100',
    '#1b4332',
    '#f2f7f4',
    '#081c15',
    true
  ),
  -- 3) Coastal Azure Ocean Breeze (Doors, Business user)
  (
    'c0000000-0000-4000-8000-000000000003',
    'b0000000-0000-4000-8000-000000000002',
    (SELECT id FROM public.configurator_types WHERE slug = 'door'),
    'd0000000-0000-4000-8000-000000000003',
    'Contemporary Entrance Doors',
    'https://brightondoors.co.uk',
    'Coastline Architectural Glazing',
    '01273 680450',
    '#0284c7',
    '#f0f9ff',
    '#0c4a6e',
    true
  ),
  -- 4) Warm Burnished Amber & Joinery (Windows, Business user)
  (
    'c0000000-0000-4000-8000-000000000004',
    'b0000000-0000-4000-8000-000000000002',
    (SELECT id FROM public.configurator_types WHERE slug = 'window'),
    'd0000000-0000-4000-8000-000000000004',
    'Architectural Sculptured Windows',
    'https://artisanjoinery.co.uk',
    'Artisan Bronze & Oak',
    '0113 460 2305',
    '#b45309',
    '#fffbeb',
    '#451a03',
    true
  ),
  -- 5) Atelier Luxe Royal Violet (Doors, Business user - Paused)
  (
    'c0000000-0000-4000-8000-000000000005',
    'b0000000-0000-4000-8000-000000000002',
    (SELECT id FROM public.configurator_types WHERE slug = 'door'),
    'd0000000-0000-4000-8000-000000000005',
    'Designer Bi-Fold & Patio Doors',
    'https://atelierfrontage.com',
    'Atelier Entrance Collection',
    '020 7946 0192',
    '#6b21a8',
    '#faf5ff',
    '#3b0764',
    false
  ),
  -- 6) Platform Showcase Doors (Doors, Admin user)
  (
    'c0000000-0000-4000-8000-000000000006',
    'a0000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.configurator_types WHERE slug = 'door'),
    'd0000000-0000-4000-8000-000000000006',
    'Platform Showcase Doors',
    'https://frontage.design',
    'Frontage Showcase Doors',
    '0113 460 2305',
    '#191919',
    '#f5f5f5',
    '#191919',
    true
  ),
  -- 7) Platform Showcase Windows (Windows, Admin user)
  (
    'c0000000-0000-4000-8000-000000000007',
    'a0000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.configurator_types WHERE slug = 'window'),
    'd0000000-0000-4000-8000-000000000007',
    'Platform Showcase Windows',
    'https://frontage.design/windows',
    'Frontage Showcase Windows',
    '0113 460 2305',
    '#2563eb',
    '#eff6ff',
    '#1e3a8a',
    true
  );

-- 8. Analytics views for the business user
INSERT INTO public.widget_views (id, widget_id, account_id, session_id, created_at)
VALUES
  (gen_random_uuid(), 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', gen_random_uuid(), now() - interval '2 days'),
  (gen_random_uuid(), 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', gen_random_uuid(), now() - interval '1 day'),
  (gen_random_uuid(), 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', gen_random_uuid(), now() - interval '6 hours'),
  (gen_random_uuid(), 'c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', gen_random_uuid(), now() - interval '3 days'),
  (gen_random_uuid(), 'c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', gen_random_uuid(), now() - interval '12 hours'),
  (gen_random_uuid(), 'c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', gen_random_uuid(), now() - interval '4 hours'),
  (gen_random_uuid(), 'c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', gen_random_uuid(), now() - interval '1 hour');

-- 9. Sample quote queries (leads) for the business user
INSERT INTO public.leads (
  id,
  account_id,
  widget_id,
  session_id,
  name,
  email,
  phone,
  status,
  spec,
  created_at
) VALUES
  (
    'e0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000001',
    gen_random_uuid(),
    'Arthur Pendelton',
    'arthur.pendelton@example.com',
    '07700 900123',
    'new',
    '{"product": "ORiGINAL Composite Door", "style": "Contemporary", "colour": "Anthracite Grey", "hardware": "Brushed Stainless Bar Handle"}'::jsonb,
    now() - interval '2 hours'
  ),
  (
    'e0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000002',
    gen_random_uuid(),
    'Eleanor Vance',
    'eleanor.vance@example.co.uk',
    '07700 900456',
    'contacted',
    '{"product": "Advance70 Sculptured Casement", "style": "Georgian Bar", "colour": "Chartwell Green", "glass": "Double Glazed Acoustic"}'::jsonb,
    now() - interval '1 day'
  ),
  (
    'e0000000-0000-4000-8000-000000000003',
    'b0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000003',
    gen_random_uuid(),
    'Marcus Davies',
    'm.davies@example.com',
    '07700 900789',
    'quoted',
    '{"product": "Coastal Entrance Door", "style": "Full Glass Designer", "colour": "Cotswold Blue", "security": "Ultion 3-Star Cylinder"}'::jsonb,
    now() - interval '2 days'
  );

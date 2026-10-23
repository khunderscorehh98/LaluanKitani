-- Demo fixtures for development and tests, based on the screen designs.
--
-- NOT production data. Coordinates are approximate and some places are
-- fictional (e.g. Kedai Makan Sinar Kiulap, Simpang 1366). Real place data
-- comes from the Overture import plus admin entries made from local knowledge,
-- never copied from Google Maps.
--
-- Times are relative to now() so reports stay "live" whenever this is loaded.

-- ─── Users ──────────────────────────────────────────────────────────────
INSERT INTO users (id, email, auth_provider, nickname, role, status, reputation) VALUES
  ('00000000-0000-4000-8000-000000000001', 'admin@laluankitani.test',     'email',  'demo_admin',     'admin',     'active', 0),
  ('00000000-0000-4000-8000-000000000002', 'moderator@laluankitani.test', 'email',  'demo_moderator', 'moderator', 'active', 0),
  ('00000000-0000-4000-8000-000000000011', 'awang@example.test',          'google', 'awang_hadi',     'user',      'active', 2015),
  ('00000000-0000-4000-8000-000000000012', 'pemandu@example.test',        'google', 'pemandu_gadong', 'user',      'active', 1240),
  ('00000000-0000-4000-8000-000000000013', 'roadrunner@example.test',     'email',  'roadrunner_bn',  'user',      'warned', -40),
  ('00000000-0000-4000-8000-000000000014', 'user2290@example.test',       'apple',  'user_2290',      'user',      'active', 0);

-- ─── Places: base layer (stand-ins for Overture rows) ───────────────────
INSERT INTO places (id, source, overture_id, last_verified_at) VALUES
  ('00000000-0000-4000-8000-000000000101', 'base', 'demo-overture-national-stadium', now() - interval '11 days'),
  ('00000000-0000-4000-8000-000000000102', 'base', 'demo-overture-immigration',      NULL),
  ('00000000-0000-4000-8000-000000000103', 'base', 'demo-overture-masjid-oas',       NULL),
  ('00000000-0000-4000-8000-000000000104', 'base', 'demo-overture-land-transport',   NULL);

INSERT INTO places_base (place_id, name, category, address, geom, licence) VALUES
  ('00000000-0000-4000-8000-000000000101', 'Hassanal Bolkiah National Stadium', 'sports_venue', 'Berakas',
     ST_SetSRID(ST_MakePoint(114.9290, 4.9460), 4326)::geography, 'CDLA-Permissive-2.0'),
  ('00000000-0000-4000-8000-000000000102', 'Immigration and National Registration Department', 'immigration_office', 'Berakas',
     ST_SetSRID(ST_MakePoint(114.9330, 4.9195), 4326)::geography, 'CDLA-Permissive-2.0'),
  ('00000000-0000-4000-8000-000000000103', 'Omar Ali Saifuddien Mosque', 'mosque', 'Bandar Seri Begawan',
     ST_SetSRID(ST_MakePoint(114.9393, 4.8903), 4326)::geography, 'CDLA-Permissive-2.0'),
  ('00000000-0000-4000-8000-000000000104', 'Land Transport Department', 'land_transport_office', 'Beribi',
     ST_SetSRID(ST_MakePoint(114.9050, 4.9080), 4326)::geography, 'CDLA-Permissive-2.0');

-- Admin overrides add Malay names and districts without touching base data.
INSERT INTO place_overrides (place_id, name_ms, name_en, district, edited_by) VALUES
  ('00000000-0000-4000-8000-000000000101', 'Stadium Negara Hassanal Bolkiah', 'Hassanal Bolkiah National Stadium', 'brunei_muara', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000102', 'Jabatan Imigresen dan Pendaftaran Kebangsaan', 'Immigration Department', 'brunei_muara', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000103', 'Masjid Omar Ali Saifuddien', 'Omar Ali Saifuddien Mosque', 'brunei_muara', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000104', 'Jabatan Pengangkutan Darat', 'Land Transport Department', 'brunei_muara', '00000000-0000-4000-8000-000000000001');

-- ─── Places: local layer ────────────────────────────────────────────────
INSERT INTO places (id, source, last_verified_at) VALUES
  ('00000000-0000-4000-8000-000000000201', 'local', now() - interval '11 days'),
  ('00000000-0000-4000-8000-000000000202', 'local', NULL),
  ('00000000-0000-4000-8000-000000000203', 'local', NULL);

INSERT INTO places_local (place_id, name_ms, name_en, category, district, simpang, road, address, geom, created_by) VALUES
  ('00000000-0000-4000-8000-000000000201', 'Kedai Makan Sinar Kiulap', 'Sinar Kiulap Eatery', 'restaurant', 'brunei_muara',
     '1366', 'Jalan Gadong', 'Unit 4, Ground Floor, Simpang 1366, Jalan Gadong, Kiulap',
     ST_SetSRID(ST_MakePoint(114.9230, 4.9030), 4326)::geography, '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000202', 'Stesen Minyak Gadong', 'Gadong Petrol Station', 'petrol_station', 'brunei_muara',
     NULL, 'Jalan Gadong', 'Jalan Gadong',
     ST_SetSRID(ST_MakePoint(114.9160, 4.9060), 4326)::geography, '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000203', 'Kedai Runcit Simpang 1366', 'Simpang 1366 Grocery', 'grocery', 'tutong',
     '1366', 'Jalan Tutong', 'Simpang 1366, Jalan Tutong',
     ST_SetSRID(ST_MakePoint(114.8700, 4.8950), 4326)::geography, '00000000-0000-4000-8000-000000000001');

-- ─── Opening hours (0 = Sunday ... 6 = Saturday) ────────────────────────
-- Kedai Makan Sinar Kiulap: Mon-Thu 7-22, Fri 7-12 and 14-22, Sat-Sun 7-23
INSERT INTO place_hours (place_id, day, opens, closes)
SELECT '00000000-0000-4000-8000-000000000201', d, '07:00', '22:00' FROM generate_series(1, 4) AS d;
INSERT INTO place_hours (place_id, day, opens, closes) VALUES
  ('00000000-0000-4000-8000-000000000201', 5, '07:00', '12:00'),
  ('00000000-0000-4000-8000-000000000201', 5, '14:00', '22:00'),
  ('00000000-0000-4000-8000-000000000201', 6, '07:00', '23:00'),
  ('00000000-0000-4000-8000-000000000201', 0, '07:00', '23:00');

-- Government offices: Mon-Thu and Sat, 7:45-12:15 and 13:30-16:30. Closed Fri and Sun.
INSERT INTO place_hours (place_id, day, opens, closes)
SELECT p, d, w.opens::time, w.closes::time
FROM unnest(ARRAY['00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000104']::uuid[]) AS p,
     unnest(ARRAY[1, 2, 3, 4, 6]) AS d,
     (VALUES ('07:45', '12:15'), ('13:30', '16:30')) AS w (opens, closes);

-- Petrol station: 6-22 every day, one window. The Friday prayer rule still applies.
INSERT INTO place_hours (place_id, day, opens, closes)
SELECT '00000000-0000-4000-8000-000000000202', d, '06:00', '22:00' FROM generate_series(0, 6) AS d;

-- The mosque has no hours entered, so it shows "Hours not confirmed".

-- ─── Aliases ────────────────────────────────────────────────────────────
INSERT INTO place_aliases (place_id, alias, language, source, status, added_by) VALUES
  ('00000000-0000-4000-8000-000000000101', 'Stadium Negara',   'ms', 'moderator',  'active',  '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000101', 'National Stadium', 'en', 'moderator',  'active',  '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000101', 'Stadium Berakas',  'ms', 'suggestion', 'pending', '00000000-0000-4000-8000-000000000012'),
  ('00000000-0000-4000-8000-000000000102', 'Imigresen',        'ms', 'moderator',  'active',  '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000104', 'JPD',              'ms', 'moderator',  'active',  '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000201', 'Kedai Sinar',      'ms', 'moderator',  'active',  '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000201', 'Nasi katok Sinar', 'ms', 'moderator',  'active',  '00000000-0000-4000-8000-000000000002');

-- ─── Intent table ───────────────────────────────────────────────────────
INSERT INTO intents (need, keywords, categories, created_by) VALUES
  ('passport',   '{passport,pasport,"renew passport"}',        '{immigration_office}',    '00000000-0000-4000-8000-000000000001'),
  ('road tax',   '{"road tax","cukai jalan","lesen memandu"}', '{land_transport_office}', '00000000-0000-4000-8000-000000000001'),
  ('solat',      '{solat,masjid,surau}',                        '{mosque,surau}',          '00000000-0000-4000-8000-000000000001'),
  ('minyak',     '{minyak,petrol,"isi minyak"}',                '{petrol_station}',        '00000000-0000-4000-8000-000000000001'),
  ('nasi katok', '{"nasi katok",makan}',                        '{restaurant,food_stall}', '00000000-0000-4000-8000-000000000001'),
  ('klinik',     '{klinik,doctor,demam}',                       '{health_centre,clinic}',  '00000000-0000-4000-8000-000000000001');

-- ─── Driver reports ─────────────────────────────────────────────────────
INSERT INTO reports (id, label, description, geom, road_name, user_id, created_at, expires_at, status) VALUES
  -- Flooded, confirmed by two other drivers: hard avoid
  ('00000000-0000-4000-8000-000000000301', 'flooded',
     'Water over the left lane at the simpang entrance. Small cars, keep right.',
     ST_SetSRID(ST_MakePoint(114.9226, 4.9034), 4326)::geography, 'Jalan Gadong',
     '00000000-0000-4000-8000-000000000011', now() - interval '25 minutes', NULL, 'active'),
  -- Jammed: soft avoid, expires after 1 hour
  ('00000000-0000-4000-8000-000000000302', 'jammed', NULL,
     ST_SetSRID(ST_MakePoint(114.9190, 4.9050), 4326)::geography, 'Jalan Gadong',
     '00000000-0000-4000-8000-000000000012', now() - interval '12 minutes', now() + interval '48 minutes', 'active'),
  -- Careful: warning only, expires after 2 hours
  ('00000000-0000-4000-8000-000000000303', 'careful', NULL,
     ST_SetSRID(ST_MakePoint(114.9300, 4.9100), 4326)::geography, 'Jalan Kiulap',
     '00000000-0000-4000-8000-000000000012', now() - interval '6 minutes', now() + interval '114 minutes', 'active'),
  -- Closed, not yet confirmed: no routing effect
  ('00000000-0000-4000-8000-000000000304', 'closed', NULL,
     ST_SetSRID(ST_MakePoint(114.9240, 4.9040), 4326)::geography, 'Jalan Kiulap',
     '00000000-0000-4000-8000-000000000013', now() - interval '1 hour', NULL, 'active'),
  -- Expired jam: must not appear
  ('00000000-0000-4000-8000-000000000305', 'jammed', NULL,
     ST_SetSRID(ST_MakePoint(114.9235, 4.9032), 4326)::geography, 'Jalan Gadong',
     '00000000-0000-4000-8000-000000000014', now() - interval '3 hours', now() - interval '2 hours', 'active');

INSERT INTO report_votes (report_id, user_id, vote) VALUES
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000012', 'still_there'),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000013', 'still_there'),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000014', 'gone');

-- ─── Peak Spots ─────────────────────────────────────────────────────────
INSERT INTO peak_spots (id, name, geom, days, school_terms, created_by) VALUES
  ('00000000-0000-4000-8000-000000000401', 'Jalan Gadong school run',
     ST_GeogFromText('SRID=4326;POLYGON((114.9165 4.9035, 114.9200 4.9035, 114.9200 4.9065, 114.9165 4.9065, 114.9165 4.9035))'),
     '{1,2,3,4,5}', '{term_1,term_2,term_3,term_4}', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000402', 'Kiulap evening rush',
     ST_GeogFromText('SRID=4326;POLYGON((114.9285 4.9090, 114.9315 4.9090, 114.9315 4.9115, 114.9285 4.9115, 114.9285 4.9090))'),
     '{1,2,3,4,5}', '{}', '00000000-0000-4000-8000-000000000001');

INSERT INTO peak_spot_windows (peak_spot_id, starts, ends) VALUES
  ('00000000-0000-4000-8000-000000000401', '07:00', '07:45'),
  ('00000000-0000-4000-8000-000000000401', '12:15', '13:00'),
  ('00000000-0000-4000-8000-000000000402', '16:30', '17:45');

-- School term dates are left empty on purpose: add the official calendar
-- from the admin dashboard. Until then term filters are not applied.

-- ─── Event closures ─────────────────────────────────────────────────────
INSERT INTO event_closures (id, title, note, starts_at, ends_at, geom, road_names, status, created_by, published_at) VALUES
  ('00000000-0000-4000-8000-000000000501', 'Stadium event',
     'Closed for an event at the stadium. Use the main road.',
     ((current_date + 1)::timestamp + time '16:00') AT TIME ZONE 'Asia/Brunei',
     ((current_date + 1)::timestamp + time '22:00') AT TIME ZONE 'Asia/Brunei',
     ST_GeogFromText('SRID=4326;MULTILINESTRING((114.9270 4.9445, 114.9270 4.9475), (114.9270 4.9475, 114.9310 4.9475), (114.9310 4.9475, 114.9310 4.9445))'),
     '{"West access road","North access road","East access road"}', 'published',
     '00000000-0000-4000-8000-000000000001', now());

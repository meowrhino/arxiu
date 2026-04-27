-- migracion inicial desde data.json (13 archivos)
-- tamaños calculados desde /data/
INSERT OR IGNORE INTO files (id, filename, author, size, mime, uploaded_at, is_18_plus, status, hashtags_json) VALUES
  ('test001',            'test_diseno_grafico.pdf',   'manu',     645,  'application/pdf', '2026-02-23T14:51:00Z',      0, 'published', '["diseño","test"]'),
  ('test002',            'test_tipografia.pdf',       'manu',     650,  'application/pdf', '2026-02-23T14:51:00Z',      0, 'published', '["tipografia","test"]'),
  ('mlz932n88qvr',       'Prueba_de_texto.pdf',       'manu',     818,  'application/pdf', '2026-02-23T14:06:55.268Z',  0, 'published', '["texto","prueba"]'),
  ('mlzcmng69xel',       'test.pdf',                  'manu',     948,  'application/pdf', '2026-02-23T15:46:07.542Z',  0, 'published', '["test"]'),
  ('mlzdlak17ugx',       'Test_Markdown_Editor.pdf',  NULL,       1459, 'application/pdf', '2026-02-23T16:13:03.793Z',  0, 'published', '[]'),
  ('mlze32gnvtw4',       'a.pdf',                     'a',        760,  'application/pdf', '2026-02-23T16:26:53.111Z',  0, 'published', '["a"]'),
  ('mlzeec4ztwm8',       'Test_acentos.pdf',          NULL,       1263, 'application/pdf', '2026-02-23T16:35:38.867Z',  0, 'published', '[]'),
  ('mm10xelc1dz8',       'hskdj.pdf',                 'sususjs',  914,  'application/pdf', '2026-02-24T19:54:06.240Z',  0, 'published', '["jajajs"]'),
  ('mm13zsev8z99',       'hola_cm.pdf',               'acm',      917,  'application/pdf', '2026-02-24T21:19:56.313Z',  0, 'published', '["cma"]'),
  ('mm18qpvmv7il',       'aaaa.pdf',                  'aaaa',     909,  'application/pdf', '2026-02-24T23:32:51.202Z',  0, 'published', '["aaaa"]'),
  ('mm19c6q8napf',       'aaa.pdf',                   'aaa',      985,  'application/pdf', '2026-02-24T23:49:32.816Z',  0, 'published', '["aaaaa"]'),
  ('mm1k0l5xmv2t',       'eee.pdf',                   NULL,       907,  'application/pdf', '2026-02-25T04:48:27.430Z',  0, 'published', '[]'),
  ('ci_test_1772971624', 'test_ci_1772971445.pdf',    'ci-test',  302,  'application/pdf', '2026-03-08T12:07:04.000Z',  0, 'published', '["test","ci"]');

INSERT OR IGNORE INTO hashtags (tag, count) VALUES
  ('a',          1),
  ('aaaa',       1),
  ('aaaaa',      1),
  ('ci',         1),
  ('cma',        1),
  ('diseño',     1),
  ('jajajs',     1),
  ('prueba',     1),
  ('test',       4),
  ('texto',      1),
  ('tipografia', 1);

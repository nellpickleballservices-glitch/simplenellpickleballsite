-- Migration: Seed content blocks for public pages
-- Footer social links, learn page court dimensions, contact info

INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order)
VALUES
  (
    'footer_social_links',
    'plain_text',
    '{"instagram":"https://instagram.com/nellpickleball","facebook":"https://facebook.com/nellpickleball"}',
    '{"instagram":"https://instagram.com/nellpickleball","facebook":"https://facebook.com/nellpickleball"}',
    100
  ),
  (
    'learn_court_dimensions',
    'rich_text',
    '<p>Una cancha de pickleball mide 20x44 pies (6.1x13.4 metros), similar a una cancha de dobles de bádminton. La zona de no-volea ("kitchen") se extiende 7 pies desde la red a cada lado.</p>',
    '<p>A pickleball court measures 20x44 feet (6.1x13.4 meters), similar to a doubles badminton court. The non-volley zone ("kitchen") extends 7 feet from the net on each side.</p>',
    200
  ),
  (
    'contact_info',
    'plain_text',
    '{"email":"nellpickleball@gmail.com","phone":"+18091234567"}',
    '{"email":"nellpickleball@gmail.com","phone":"+18091234567"}',
    300
  )
ON CONFLICT (block_key) DO NOTHING;

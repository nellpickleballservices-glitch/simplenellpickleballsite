-- Add hours of operation content block for the contact page
INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order)
VALUES (
  'contact_hours',
  'plain_text',
  'Lunes - Domingo, 7:00 AM - 10:00 PM',
  'Monday - Sunday, 7:00 AM - 10:00 PM',
  1
)
ON CONFLICT (block_key) DO NOTHING;

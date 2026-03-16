-- Add hero image and description to locations for location card display.
ALTER TABLE locations ADD COLUMN hero_image_url TEXT;
ALTER TABLE locations ADD COLUMN description TEXT;

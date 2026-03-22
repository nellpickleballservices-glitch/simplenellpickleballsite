-- Add optional price to events (stored in cents, NULL = free)
ALTER TABLE events ADD COLUMN price_cents INT DEFAULT NULL;

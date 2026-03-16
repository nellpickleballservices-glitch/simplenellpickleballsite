-- Add unique constraint on locations.name so that
-- upsert (ON CONFLICT (name)) works in addCourtAction.
ALTER TABLE locations ADD CONSTRAINT locations_name_unique UNIQUE (name);

-- Add practice session time windows and per-mode session durations to court_config

ALTER TABLE court_config
  ADD COLUMN practice_start TIME,
  ADD COLUMN practice_end TIME,
  ADD COLUMN full_court_duration_minutes INT NOT NULL DEFAULT 60,
  ADD COLUMN open_play_duration_minutes INT NOT NULL DEFAULT 60,
  ADD COLUMN practice_duration_minutes INT NOT NULL DEFAULT 30;

-- Allow 'practice' as a booking_mode on reservations
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_booking_mode_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_booking_mode_check
  CHECK (booking_mode IN ('full_court', 'open_play', 'vip_guest', 'practice'));

-- Allow 'practice' as a mode on court_pricing
ALTER TABLE court_pricing DROP CONSTRAINT IF EXISTS court_pricing_mode_check;
ALTER TABLE court_pricing ADD CONSTRAINT court_pricing_mode_check
  CHECK (mode IN ('full_court', 'open_play', 'practice'));

-- Update the spot constraint to also allow practice mode without spot
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS chk_spot_required;
ALTER TABLE reservations ADD CONSTRAINT chk_spot_required
  CHECK (booking_mode IN ('full_court', 'practice') OR spot_number IS NOT NULL);

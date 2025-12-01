-- Unified Player Status Migration (Fixed)
-- This migration consolidates rsvp_status and status into a single status field

-- Step 1: Drop the existing check constraint on status
ALTER TABLE event_players
DROP CONSTRAINT IF EXISTS event_players_status_check;

-- Step 2: Merge rsvp_status data into status for existing records
-- Priority: If rsvp_status is set, use it to determine final status
UPDATE event_players
SET status = 'yes'
WHERE rsvp_status = 'yes' AND status = 'invited';

UPDATE event_players
SET status = 'no'
WHERE rsvp_status = 'no' AND status = 'invited';

-- Step 3: Convert old status values to new unified values
UPDATE event_players
SET status = 'yes'
WHERE status = 'playing';

UPDATE event_players
SET status = 'no'
WHERE status = 'not_playing';

-- Step 4: Add new check constraint with the new unified values
ALTER TABLE event_players
ADD CONSTRAINT event_players_status_check 
CHECK (status IN ('invited', 'yes', 'no', 'waitlist'));

-- Step 5: Drop the rsvp_status and rsvp_sent_at columns
ALTER TABLE event_players
DROP COLUMN IF EXISTS rsvp_status;

ALTER TABLE event_players
DROP COLUMN IF EXISTS rsvp_sent_at;
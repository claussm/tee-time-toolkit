-- Phase 1: Restructure tee_boxes table
DELETE FROM tee_boxes WHERE name IN ('Black', 'Gold', 'Blue', 'White', 'Red');

INSERT INTO tee_boxes (name, color, sort_order, is_active, typical_yardage) VALUES
('Platinum', '#E5E4E2', 0, true, 7200),
('Black', '#000000', 1, true, 6800),
('White', '#FFFFFF', 2, true, 6400),
('Green', '#228B22', 3, true, 6000),
('Gold', '#FFD700', 4, true, 5600);

-- Phase 2: Update existing players with tee assignments and rename Artie
-- First, update Artie Okeefe's name
UPDATE players SET name = 'Artie O''Keefe' WHERE name = 'Artie Okeefe';

-- Assign Green tee (31 players)
UPDATE players 
SET tee_box_id = (SELECT id FROM tee_boxes WHERE name = 'Green')
WHERE name IN (
  'Artie O''Keefe', 'Artie Valez', 'Carl Hiltz', 'Craig Raab', 'Dave O''Brian', 
  'Dave Rhodes', 'Dennis Grenier', 'Doug Hall', 'Gary Penebre', 'Graham Harding',
  'Jeff Walter', 'Jim Bartley', 'Jim Burlin', 'Jim Fontaine', 'Jim Russo',
  'Jim Troutman', 'Jim Watson', 'John Canavan', 'Mike Key', 'Mike Pitman',
  'Mike Vollmer', 'Randy Campbell', 'Randy Justice', 'Rick Hellmann', 'Rick Vance',
  'Ron Cooper', 'Sam Lamanna', 'Ted Jamison', 'Terry Reeves', 'Tom Streng', 'Tom Youngman'
);

-- Assign White tee (17 players)
UPDATE players 
SET tee_box_id = (SELECT id FROM tee_boxes WHERE name = 'White')
WHERE name IN (
  'Brian Brandman', 'Brian Snyder', 'Chris Haas', 'Chris Kwiecinski', 'Fred Caruso',
  'Jim Gutkowski', 'Jim Mellen', 'Kevin Busick', 'Mark Garber', 'Mark Thompson',
  'Mike Gasbarro', 'Mike Giardina', 'Pete Faight', 'Pete Matchekosky', 'Rich Messina',
  'Rich Rauzi', 'Tyler Caruso'
);

-- Phase 3: Add new inactive players
INSERT INTO players (name, tee_box_id, is_active) VALUES
('Jon Nuzzaci', (SELECT id FROM tee_boxes WHERE name = 'White'), false),
('Richard Convertini', (SELECT id FROM tee_boxes WHERE name = 'White'), false),
('Dwayne', (SELECT id FROM tee_boxes WHERE name = 'Green'), false),
('Mike J Bartley', (SELECT id FROM tee_boxes WHERE name = 'Green'), false),
('Doug Swirsky', (SELECT id FROM tee_boxes WHERE name = 'Green'), false);

-- Phase 4: Create 6 historical events
INSERT INTO events (
  course_name, 
  course_id, 
  date, 
  first_tee_time, 
  holes, 
  track_points, 
  slots_per_group, 
  max_players, 
  tee_interval_minutes
) VALUES
('Historical Round 6', (SELECT id FROM courses LIMIT 1), '2024-10-20', '08:00:00', 18, true, 4, 40, 8),
('Historical Round 5', (SELECT id FROM courses LIMIT 1), '2024-10-27', '08:00:00', 18, true, 4, 40, 8),
('Historical Round 4', (SELECT id FROM courses LIMIT 1), '2024-11-03', '08:00:00', 18, true, 4, 40, 8),
('Historical Round 3', (SELECT id FROM courses LIMIT 1), '2024-11-10', '08:00:00', 18, true, 4, 40, 8),
('Historical Round 2', (SELECT id FROM courses LIMIT 1), '2024-11-17', '08:00:00', 18, true, 4, 40, 8),
('Historical Round 1', (SELECT id FROM courses LIMIT 1), '2024-11-24', '08:00:00', 18, true, 4, 40, 8);

-- Phase 5: Import last 6 scores for all players
-- Helper function to insert scores for a player
DO $$
DECLARE
  v_event_ids uuid[];
  v_player_record RECORD;
BEGIN
  -- Get event IDs in order (oldest to newest for array index matching)
  SELECT ARRAY_AGG(id ORDER BY date) INTO v_event_ids
  FROM events 
  WHERE course_name LIKE 'Historical Round%';
  
  -- Insert scores for each player (Round 6, 5, 4, 3, 2, 1 maps to array[1-6])
  -- Format: player_name, score_array[6 oldest scores]
  
  -- Green Tee Players
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Artie O''Keefe'), v_event_ids[1], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Artie O''Keefe'), v_event_ids[2], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Artie O''Keefe'), v_event_ids[3], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Artie O''Keefe'), v_event_ids[4], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Artie O''Keefe'), v_event_ids[5], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Artie O''Keefe'), v_event_ids[6], 7;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Artie Valez'), v_event_ids[1], 6 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Artie Valez'), v_event_ids[2], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Artie Valez'), v_event_ids[3], 3 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Artie Valez'), v_event_ids[4], 7 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Artie Valez'), v_event_ids[5], 10 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Artie Valez'), v_event_ids[6], 2;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Carl Hiltz'), v_event_ids[1], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Carl Hiltz'), v_event_ids[2], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Carl Hiltz'), v_event_ids[3], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Carl Hiltz'), v_event_ids[4], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Carl Hiltz'), v_event_ids[5], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Carl Hiltz'), v_event_ids[6], 16;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Craig Raab'), v_event_ids[1], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Craig Raab'), v_event_ids[2], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Craig Raab'), v_event_ids[3], 19 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Craig Raab'), v_event_ids[4], 19 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Craig Raab'), v_event_ids[5], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Craig Raab'), v_event_ids[6], 16;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Dave O''Brian'), v_event_ids[1], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dave O''Brian'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dave O''Brian'), v_event_ids[3], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dave O''Brian'), v_event_ids[4], 21 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dave O''Brian'), v_event_ids[5], 21 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dave O''Brian'), v_event_ids[6], 21;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Dave Rhodes'), v_event_ids[1], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dave Rhodes'), v_event_ids[2], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dave Rhodes'), v_event_ids[3], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dave Rhodes'), v_event_ids[4], 8 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dave Rhodes'), v_event_ids[5], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dave Rhodes'), v_event_ids[6], 16;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Dennis Grenier'), v_event_ids[1], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dennis Grenier'), v_event_ids[2], 9 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dennis Grenier'), v_event_ids[3], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dennis Grenier'), v_event_ids[4], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dennis Grenier'), v_event_ids[5], 19 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Dennis Grenier'), v_event_ids[6], 21;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Doug Hall'), v_event_ids[1], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Doug Hall'), v_event_ids[2], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Doug Hall'), v_event_ids[3], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Doug Hall'), v_event_ids[4], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Doug Hall'), v_event_ids[5], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Doug Hall'), v_event_ids[6], 18;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Gary Penebre'), v_event_ids[1], 8 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Gary Penebre'), v_event_ids[2], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Gary Penebre'), v_event_ids[3], 10 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Gary Penebre'), v_event_ids[4], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Gary Penebre'), v_event_ids[5], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Gary Penebre'), v_event_ids[6], 14;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Graham Harding'), v_event_ids[1], 21 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Graham Harding'), v_event_ids[2], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Graham Harding'), v_event_ids[3], 22 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Graham Harding'), v_event_ids[4], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Graham Harding'), v_event_ids[5], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Graham Harding'), v_event_ids[6], 17;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Jeff Walter'), v_event_ids[1], 9 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jeff Walter'), v_event_ids[2], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jeff Walter'), v_event_ids[3], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jeff Walter'), v_event_ids[4], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jeff Walter'), v_event_ids[5], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jeff Walter'), v_event_ids[6], 17;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Jim Bartley'), v_event_ids[1], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Bartley'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Bartley'), v_event_ids[3], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Bartley'), v_event_ids[4], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Bartley'), v_event_ids[5], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Bartley'), v_event_ids[6], 19;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Jim Burlin'), v_event_ids[1], 9 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Burlin'), v_event_ids[2], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Burlin'), v_event_ids[3], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Burlin'), v_event_ids[4], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Burlin'), v_event_ids[5], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Burlin'), v_event_ids[6], 17;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Jim Fontaine'), v_event_ids[1], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Fontaine'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Fontaine'), v_event_ids[3], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Fontaine'), v_event_ids[4], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Fontaine'), v_event_ids[5], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Fontaine'), v_event_ids[6], 21;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Jim Russo'), v_event_ids[1], 10 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Russo'), v_event_ids[2], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Russo'), v_event_ids[3], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Russo'), v_event_ids[4], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Russo'), v_event_ids[5], 21 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Russo'), v_event_ids[6], 20;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Jim Troutman'), v_event_ids[1], 9 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Troutman'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Troutman'), v_event_ids[3], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Troutman'), v_event_ids[4], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Troutman'), v_event_ids[5], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Troutman'), v_event_ids[6], 18;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Jim Watson'), v_event_ids[1], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Watson'), v_event_ids[2], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Watson'), v_event_ids[3], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Watson'), v_event_ids[4], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Watson'), v_event_ids[5], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Watson'), v_event_ids[6], 19;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'John Canavan'), v_event_ids[1], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'John Canavan'), v_event_ids[2], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'John Canavan'), v_event_ids[3], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'John Canavan'), v_event_ids[4], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'John Canavan'), v_event_ids[5], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'John Canavan'), v_event_ids[6], 16;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Mike Key'), v_event_ids[1], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Key'), v_event_ids[2], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Key'), v_event_ids[3], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Key'), v_event_ids[4], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Key'), v_event_ids[5], 22 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Key'), v_event_ids[6], 16;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Mike Pitman'), v_event_ids[1], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Pitman'), v_event_ids[2], 19 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Pitman'), v_event_ids[3], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Pitman'), v_event_ids[4], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Pitman'), v_event_ids[5], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Pitman'), v_event_ids[6], 23;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Mike Vollmer'), v_event_ids[1], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Vollmer'), v_event_ids[2], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Vollmer'), v_event_ids[3], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Vollmer'), v_event_ids[4], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Vollmer'), v_event_ids[5], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Vollmer'), v_event_ids[6], 18;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Randy Campbell'), v_event_ids[1], 7 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Randy Campbell'), v_event_ids[2], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Randy Campbell'), v_event_ids[3], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Randy Campbell'), v_event_ids[4], 10 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Randy Campbell'), v_event_ids[5], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Randy Campbell'), v_event_ids[6], 15;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Randy Justice'), v_event_ids[1], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Randy Justice'), v_event_ids[2], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Randy Justice'), v_event_ids[3], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Randy Justice'), v_event_ids[4], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Randy Justice'), v_event_ids[5], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Randy Justice'), v_event_ids[6], 18;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Rick Hellmann'), v_event_ids[1], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rick Hellmann'), v_event_ids[2], 9 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rick Hellmann'), v_event_ids[3], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rick Hellmann'), v_event_ids[4], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rick Hellmann'), v_event_ids[5], 21 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rick Hellmann'), v_event_ids[6], 19;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Rick Vance'), v_event_ids[1], 10 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rick Vance'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rick Vance'), v_event_ids[3], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rick Vance'), v_event_ids[4], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rick Vance'), v_event_ids[5], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rick Vance'), v_event_ids[6], 16;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Ron Cooper'), v_event_ids[1], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Ron Cooper'), v_event_ids[2], 8 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Ron Cooper'), v_event_ids[3], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Ron Cooper'), v_event_ids[4], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Ron Cooper'), v_event_ids[5], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Ron Cooper'), v_event_ids[6], 18;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Sam Lamanna'), v_event_ids[1], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Sam Lamanna'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Sam Lamanna'), v_event_ids[3], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Sam Lamanna'), v_event_ids[4], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Sam Lamanna'), v_event_ids[5], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Sam Lamanna'), v_event_ids[6], 17;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Ted Jamison'), v_event_ids[1], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Ted Jamison'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Ted Jamison'), v_event_ids[3], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Ted Jamison'), v_event_ids[4], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Ted Jamison'), v_event_ids[5], 23 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Ted Jamison'), v_event_ids[6], 18;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Terry Reeves'), v_event_ids[1], 10 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Terry Reeves'), v_event_ids[2], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Terry Reeves'), v_event_ids[3], 10 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Terry Reeves'), v_event_ids[4], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Terry Reeves'), v_event_ids[5], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Terry Reeves'), v_event_ids[6], 15;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Tom Streng'), v_event_ids[1], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tom Streng'), v_event_ids[2], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tom Streng'), v_event_ids[3], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tom Streng'), v_event_ids[4], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tom Streng'), v_event_ids[5], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tom Streng'), v_event_ids[6], 19;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Tom Youngman'), v_event_ids[1], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tom Youngman'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tom Youngman'), v_event_ids[3], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tom Youngman'), v_event_ids[4], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tom Youngman'), v_event_ids[5], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tom Youngman'), v_event_ids[6], 14;
  
  -- White Tee Players
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Brian Brandman'), v_event_ids[5], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Brian Brandman'), v_event_ids[6], 14;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Brian Snyder'), v_event_ids[4], 30 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Brian Snyder'), v_event_ids[5], 10 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Brian Snyder'), v_event_ids[6], 12;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Chris Haas'), v_event_ids[1], 9 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Chris Haas'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Chris Haas'), v_event_ids[3], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Chris Haas'), v_event_ids[4], 8 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Chris Haas'), v_event_ids[5], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Chris Haas'), v_event_ids[6], 15;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Chris Kwiecinski'), v_event_ids[1], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Chris Kwiecinski'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Chris Kwiecinski'), v_event_ids[3], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Chris Kwiecinski'), v_event_ids[4], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Chris Kwiecinski'), v_event_ids[5], 22 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Chris Kwiecinski'), v_event_ids[6], 20;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Fred Caruso'), v_event_ids[1], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Fred Caruso'), v_event_ids[2], 21 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Fred Caruso'), v_event_ids[3], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Fred Caruso'), v_event_ids[4], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Fred Caruso'), v_event_ids[5], 22 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Fred Caruso'), v_event_ids[6], 24;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Jim Gutkowski'), v_event_ids[1], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Gutkowski'), v_event_ids[2], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Gutkowski'), v_event_ids[3], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Gutkowski'), v_event_ids[4], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Gutkowski'), v_event_ids[5], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Gutkowski'), v_event_ids[6], 19;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Jim Mellen'), v_event_ids[1], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Mellen'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Mellen'), v_event_ids[3], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Mellen'), v_event_ids[4], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Mellen'), v_event_ids[5], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jim Mellen'), v_event_ids[6], 18;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Kevin Busick'), v_event_ids[1], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Kevin Busick'), v_event_ids[2], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Kevin Busick'), v_event_ids[3], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Kevin Busick'), v_event_ids[4], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Kevin Busick'), v_event_ids[5], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Kevin Busick'), v_event_ids[6], 18;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Mark Garber'), v_event_ids[1], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mark Garber'), v_event_ids[2], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mark Garber'), v_event_ids[3], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mark Garber'), v_event_ids[4], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mark Garber'), v_event_ids[5], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mark Garber'), v_event_ids[6], 19;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Mark Thompson'), v_event_ids[1], 9 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mark Thompson'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mark Thompson'), v_event_ids[3], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mark Thompson'), v_event_ids[4], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mark Thompson'), v_event_ids[5], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mark Thompson'), v_event_ids[6], 17;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Mike Gasbarro'), v_event_ids[1], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Gasbarro'), v_event_ids[2], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Gasbarro'), v_event_ids[3], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Gasbarro'), v_event_ids[4], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Gasbarro'), v_event_ids[5], 19 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Gasbarro'), v_event_ids[6], 20;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Mike Giardina'), v_event_ids[1], 10 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Giardina'), v_event_ids[2], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Giardina'), v_event_ids[3], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Giardina'), v_event_ids[4], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Giardina'), v_event_ids[5], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Mike Giardina'), v_event_ids[6], 16;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Pete Faight'), v_event_ids[1], 8 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Pete Faight'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Pete Faight'), v_event_ids[3], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Pete Faight'), v_event_ids[4], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Pete Faight'), v_event_ids[5], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Pete Faight'), v_event_ids[6], 17;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Pete Matchekosky'), v_event_ids[1], 9 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Pete Matchekosky'), v_event_ids[2], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Pete Matchekosky'), v_event_ids[3], 9 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Pete Matchekosky'), v_event_ids[4], 10 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Pete Matchekosky'), v_event_ids[5], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Pete Matchekosky'), v_event_ids[6], 13;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Rich Messina'), v_event_ids[1], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rich Messina'), v_event_ids[2], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rich Messina'), v_event_ids[3], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rich Messina'), v_event_ids[4], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rich Messina'), v_event_ids[5], 16 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rich Messina'), v_event_ids[6], 17;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Rich Rauzi'), v_event_ids[1], 10 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rich Rauzi'), v_event_ids[2], 13 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rich Rauzi'), v_event_ids[3], 14 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rich Rauzi'), v_event_ids[4], 11 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rich Rauzi'), v_event_ids[5], 15 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Rich Rauzi'), v_event_ids[6], 16;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Tyler Caruso'), v_event_ids[1], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tyler Caruso'), v_event_ids[2], 21 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tyler Caruso'), v_event_ids[3], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tyler Caruso'), v_event_ids[4], 19 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tyler Caruso'), v_event_ids[5], 22 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Tyler Caruso'), v_event_ids[6], 20;
  
  -- New Inactive Players (with scores)
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Jon Nuzzaci'), v_event_ids[1], 20 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jon Nuzzaci'), v_event_ids[2], 19 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jon Nuzzaci'), v_event_ids[3], 12 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jon Nuzzaci'), v_event_ids[4], 18 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jon Nuzzaci'), v_event_ids[5], 17 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Jon Nuzzaci'), v_event_ids[6], 10;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Richard Convertini'), v_event_ids[1], 26 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Richard Convertini'), v_event_ids[2], 28 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Richard Convertini'), v_event_ids[3], 33 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Richard Convertini'), v_event_ids[4], 33 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Richard Convertini'), v_event_ids[5], 31 UNION ALL
  SELECT (SELECT id FROM players WHERE name = 'Richard Convertini'), v_event_ids[6], 14;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Dwayne'), v_event_ids[6], 0;
  
  INSERT INTO round_scores (player_id, event_id, points) 
  SELECT (SELECT id FROM players WHERE name = 'Mike J Bartley'), v_event_ids[6], 4;
  
END $$;
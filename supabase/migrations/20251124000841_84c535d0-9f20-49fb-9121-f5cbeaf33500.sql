-- Create player_teams table
CREATE TABLE public.player_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_teams ENABLE ROW LEVEL SECURITY;

-- Create policy for player_teams
CREATE POLICY "Allow all operations on player_teams" 
ON public.player_teams 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_player_teams_updated_at
BEFORE UPDATE ON public.player_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create player_team_members table (many-to-many)
CREATE TABLE public.player_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.player_teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, player_id)
);

-- Enable RLS
ALTER TABLE public.player_team_members ENABLE ROW LEVEL SECURITY;

-- Create policy for player_team_members
CREATE POLICY "Allow all operations on player_team_members" 
ON public.player_team_members 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create tee_boxes table
CREATE TABLE public.tee_boxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  typical_yardage INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tee_boxes ENABLE ROW LEVEL SECURITY;

-- Create policy for tee_boxes
CREATE POLICY "Allow all operations on tee_boxes" 
ON public.tee_boxes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Insert default tee boxes
INSERT INTO public.tee_boxes (name, color, typical_yardage, sort_order) VALUES
  ('Black', '#000000', 7200, 1),
  ('Gold', '#FFD700', 6800, 2),
  ('Blue', '#0000FF', 6400, 3),
  ('White', '#FFFFFF', 6000, 4),
  ('Red', '#FF0000', 5200, 5);

-- Create round_scores table
CREATE TABLE public.round_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  points NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, player_id)
);

-- Create index for efficient "last 6" queries
CREATE INDEX idx_round_scores_player_created ON public.round_scores(player_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.round_scores ENABLE ROW LEVEL SECURITY;

-- Create policy for round_scores
CREATE POLICY "Allow all operations on round_scores" 
ON public.round_scores 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add columns to players table
ALTER TABLE public.players 
ADD COLUMN tee_box_id UUID REFERENCES public.tee_boxes(id),
ADD COLUMN default_team_id UUID REFERENCES public.player_teams(id);

-- Add columns to events table
ALTER TABLE public.events 
ADD COLUMN track_points BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN points_multiplier NUMERIC NOT NULL DEFAULT 1.0;
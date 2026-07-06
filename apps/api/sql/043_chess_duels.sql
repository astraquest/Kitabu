CREATE TABLE IF NOT EXISTS chess_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenger_color TEXT NOT NULL DEFAULT 'white',
  status TEXT NOT NULL DEFAULT 'active',
  current_fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn TEXT NOT NULL DEFAULT '',
  turn_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  winner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT chess_matches_distinct_players_check
    CHECK (challenger_user_id <> opponent_user_id),
  CONSTRAINT chess_matches_challenger_color_check
    CHECK (challenger_color IN ('white', 'black')),
  CONSTRAINT chess_matches_status_check
    CHECK (status IN ('active', 'completed', 'cancelled')),
  CONSTRAINT chess_matches_result_check
    CHECK (result IS NULL OR result IN ('checkmate', 'draw', 'stalemate', 'threefold_repetition', 'insufficient_material', 'fifty_move_rule', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS chess_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES chess_matches(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_square TEXT NOT NULL,
  to_square TEXT NOT NULL,
  promotion TEXT,
  san TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chess_moves_square_check
    CHECK (from_square ~ '^[a-h][1-8]$' AND to_square ~ '^[a-h][1-8]$'),
  CONSTRAINT chess_moves_promotion_check
    CHECK (promotion IS NULL OR promotion IN ('q', 'r', 'b', 'n')),
  UNIQUE (match_id, move_number)
);

CREATE INDEX IF NOT EXISTS idx_chess_matches_challenger
  ON chess_matches (challenger_user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chess_matches_opponent
  ON chess_matches (opponent_user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chess_moves_match
  ON chess_moves (match_id, move_number ASC);

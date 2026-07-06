import { apiRequest } from './apiClient';

export interface ChessOpponent {
  id: string;
  name: string;
  grade: string | null;
  schoolName: string | null;
  roles: string[];
  status: 'Online' | 'Offline';
  lastSeenAt: string | null;
}

export interface ChessMatch {
  id: string;
  status: 'active' | 'completed' | 'cancelled';
  currentFen: string;
  pgn: string;
  turnUserId: string | null;
  winnerUserId: string | null;
  result: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  playerColor: 'white' | 'black';
  opponent: {
    id: string;
    name: string;
    grade: string | null;
    schoolName: string | null;
    status: 'Online' | 'Offline';
  };
}

export interface ChessMove {
  id: string;
  matchId: string;
  moveNumber: number;
  userId: string;
  from: string;
  to: string;
  promotion: string | null;
  san: string;
  fenAfter: string;
  createdAt: string;
}

export async function getChessOpponents() {
  const payload = await apiRequest<{ opponents: ChessOpponent[] }>('/games/chess/opponents', {
    method: 'GET',
  });
  return payload.opponents;
}

export async function getChessMatches() {
  const payload = await apiRequest<{ matches: ChessMatch[] }>('/games/chess/matches', {
    method: 'GET',
  });
  return payload.matches;
}

export async function createChessMatch(opponentUserId: string) {
  const payload = await apiRequest<{ match: ChessMatch }>('/games/chess/matches', {
    method: 'POST',
    body: JSON.stringify({ opponentUserId }),
  });
  return payload.match;
}

export async function getChessMoves(matchId: string) {
  const payload = await apiRequest<{ moves: ChessMove[] }>(`/games/chess/matches/${matchId}/moves`, {
    method: 'GET',
  });
  return payload.moves;
}

export async function submitChessMove(
  matchId: string,
  input: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' },
) {
  return apiRequest<{ match: ChessMatch; move: ChessMove }>(`/games/chess/matches/${matchId}/moves`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

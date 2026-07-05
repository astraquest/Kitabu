import { GameMode } from '../../../runtime-contracts/src/game';

export interface CrazyBalloonQuestion {
  prompt: string;
  options: string[];
  answer: string;
}

export interface CrazyBalloonEntity {
  id: number;
  leftPct: number;
  bottomPct: number;
  color: string;
  speedPctPerTick: number;
  isMonster: boolean;
}

export interface CrazyBalloonState {
  mode: GameMode;
  status: 'menu' | 'lobby' | 'playing' | 'rescue_quiz' | 'gameover' | 'match_result';
  score: number;
  opponentScore: number;
  opponentAlive: boolean;
  livesUsed: number;
  balloons: CrazyBalloonEntity[];
  rescueQuestion: CrazyBalloonQuestion | null;
  rescueTimeLeftSec: number;
  matchResult: 'win' | 'loss' | null;
  nextEntityId: number;
}

export type CrazyBalloonInput =
  | { type: 'tick' }
  | { type: 'open_lobby' }
  | { type: 'return_menu' }
  | { type: 'start_single' }
  | { type: 'start_multi' }
  | { type: 'pop_balloon'; id: number }
  | { type: 'answer_rescue'; answer: string }
  | { type: 'set_opponent_alive'; alive: boolean }
  | { type: 'add_opponent_score'; amount: number }
  | { type: 'force_finish'; result: 'win' | 'loss' };

export type CrazyBalloonEvent =
  | { type: 'score_changed'; score: number }
  | { type: 'rescue_started'; question: CrazyBalloonQuestion }
  | { type: 'rescued'; rescuesUsed: number }
  | { type: 'monster_attack' }
  | { type: 'game_over'; score: number }
  | { type: 'match_result'; result: 'win' | 'loss'; score: number; opponentScore: number };

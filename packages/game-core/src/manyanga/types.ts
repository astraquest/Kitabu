export type ManyangaLane = 0 | 1 | 2;

export interface ManyangaQuestion {
  prompt: string;
  options: string[];
  answer: string;
}

export interface ManyangaTraffic {
  id: number;
  lane: ManyangaLane;
  z: number;
  liveryIndex: number;
}

export interface ManyangaCoin {
  id: number;
  lane: ManyangaLane;
  z: number;
}

export interface ManyangaState {
  status: 'menu' | 'playing' | 'rescue_quiz' | 'gameover';
  playerLane: ManyangaLane;
  speed: number;
  distanceM: number;
  scoreFloat: number;
  coins: number;
  rescuesUsed: number;
  invulnerableSec: number;
  traffic: ManyangaTraffic[];
  coinItems: ManyangaCoin[];
  rescueQuestion: ManyangaQuestion | null;
  rescueTimeLeftSec: number;
  nextEntityId: number;
  nextSpawnAtM: number;
}

export type ManyangaInput =
  | { type: 'tick' }
  | { type: 'start' }
  | { type: 'return_menu' }
  | { type: 'steer'; direction: 'left' | 'right' }
  | { type: 'answer_rescue'; answer: string };

export type ManyangaEvent =
  | { type: 'started' }
  | { type: 'coin_collected'; coins: number }
  | { type: 'crashed'; question: ManyangaQuestion }
  | { type: 'rescued'; rescuesUsed: number }
  | { type: 'game_over'; score: number; distanceM: number; coins: number };

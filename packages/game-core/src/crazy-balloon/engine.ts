import { GameEngine, SeededRandom } from '../../../runtime-contracts/src/game';
import { CRAZY_BALLOON_RESCUE_QUESTIONS } from './questions';
import {
  CrazyBalloonEntity,
  CrazyBalloonEvent,
  CrazyBalloonInput,
  CrazyBalloonQuestion,
  CrazyBalloonState,
} from './types';

const COLORS = ['#FF5252', '#448AFF', '#69F0AE', '#FFD740', '#E040FB', '#FF6E40'];
const MAX_BOTTOM_PCT = 116;
const SPAWN_CHANCE_PER_TICK = 0.2;
const RESCUE_DURATION_SEC = 5;

function shuffleOptions(question: CrazyBalloonQuestion, rng: SeededRandom): CrazyBalloonQuestion {
  const options = [...question.options];
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng.next() * (index + 1));
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }
  return { ...question, options };
}

function pickQuestion(rng: SeededRandom) {
  const index = Math.floor(rng.next() * CRAZY_BALLOON_RESCUE_QUESTIONS.length);
  return shuffleOptions(CRAZY_BALLOON_RESCUE_QUESTIONS[index], rng);
}

function getMonsterChance(score: number) {
  return Math.min(0.52, 0.12 + score / 900);
}

function createBalloon(nextEntityId: number, rng: SeededRandom, score: number): CrazyBalloonEntity {
  return {
    id: nextEntityId,
    leftPct: 8 + rng.next() * 78,
    bottomPct: -8,
    color: COLORS[Math.floor(rng.next() * COLORS.length)],
    speedPctPerTick: 2 + rng.next() * 3,
    isMonster: rng.next() < getMonsterChance(score),
  };
}

function createBaseState(initial?: Partial<CrazyBalloonState>): CrazyBalloonState {
  return {
    mode: 'single',
    status: 'menu',
    score: 0,
    opponentScore: 0,
    opponentAlive: true,
    livesUsed: 0,
    balloons: [],
    rescueQuestion: null,
    rescueTimeLeftSec: 0,
    matchResult: null,
    nextEntityId: 1,
    ...initial,
  };
}

export function createCrazyBalloonEngine(rng: SeededRandom): GameEngine<CrazyBalloonState, CrazyBalloonInput, CrazyBalloonEvent> {
  let pendingEvents: CrazyBalloonEvent[] = [];

  function emit(event: CrazyBalloonEvent) {
    pendingEvents.push(event);
  }

  function finishRun(state: CrazyBalloonState, result: 'win' | 'loss'): CrazyBalloonState {
    const nextState: CrazyBalloonState = {
      ...state,
      matchResult: result,
      rescueQuestion: null,
      rescueTimeLeftSec: 0,
      status: state.mode === 'multi' ? 'match_result' : 'gameover',
    };

    if (state.mode === 'multi') {
      emit({
        type: 'match_result',
        result,
        score: nextState.score,
        opponentScore: nextState.opponentScore,
      });
    } else {
      emit({ type: 'game_over', score: nextState.score });
    }

    return nextState;
  }

  return {
    create(initial) {
      pendingEvents = [];
      return createBaseState(initial);
    },
    update(state, input, dtMs) {
      pendingEvents = [];

      switch (input.type) {
        case 'open_lobby':
          return createBaseState({ mode: 'multi', status: 'lobby' });
        case 'return_menu':
          return createBaseState({ status: 'menu' });
        case 'start_single':
          return createBaseState({ mode: 'single', status: 'playing' });
        case 'start_multi':
          return createBaseState({ mode: 'multi', status: 'playing' });
        case 'add_opponent_score':
          return { ...state, opponentScore: state.opponentScore + input.amount };
        case 'set_opponent_alive':
          return { ...state, opponentAlive: input.alive };
        case 'force_finish':
          return finishRun(state, input.result);
        case 'pop_balloon': {
          if (state.status !== 'playing') {
            return state;
          }

          const balloon = state.balloons.find(item => item.id === input.id);
          if (!balloon) {
            return state;
          }

          const remaining = state.balloons.filter(item => item.id !== input.id);
          if (balloon.isMonster) {
            if (state.livesUsed >= 2) {
              emit({ type: 'monster_attack' });
              return finishRun({ ...state, balloons: remaining }, 'loss');
            }

            const question = pickQuestion(rng);
            emit({ type: 'rescue_started', question });
            return {
              ...state,
              balloons: remaining,
              status: 'rescue_quiz',
              rescueQuestion: question,
              rescueTimeLeftSec: RESCUE_DURATION_SEC,
            };
          }

          const score = state.score + 10;
          emit({ type: 'score_changed', score });
          return { ...state, balloons: remaining, score };
        }
        case 'answer_rescue': {
          if (state.status !== 'rescue_quiz' || !state.rescueQuestion) {
            return state;
          }

          if (input.answer === state.rescueQuestion.answer) {
            return {
              ...state,
              status: 'playing',
              livesUsed: state.livesUsed + 1,
              rescueQuestion: null,
              rescueTimeLeftSec: 0,
            };
          }

          return finishRun(state, 'loss');
        }
        case 'tick': {
          if (state.status === 'rescue_quiz' && state.rescueQuestion) {
            const rescueTimeLeftSec = Math.max(0, state.rescueTimeLeftSec - dtMs / 1000);
            if (rescueTimeLeftSec <= 0) {
              return finishRun({ ...state, rescueTimeLeftSec }, 'loss');
            }
            return { ...state, rescueTimeLeftSec };
          }

          if (state.status !== 'playing') {
            return state;
          }

          let balloons = state.balloons
            .map(balloon => ({
              ...balloon,
              bottomPct: balloon.bottomPct + balloon.speedPctPerTick,
            }))
            .filter(balloon => balloon.bottomPct < MAX_BOTTOM_PCT);

          let nextEntityId = state.nextEntityId;
          if (rng.next() < SPAWN_CHANCE_PER_TICK) {
            balloons = [...balloons, createBalloon(nextEntityId, rng, state.score)];
            nextEntityId += 1;
          }

          return {
            ...state,
            balloons,
            nextEntityId,
          };
        }
        default:
          return state;
      }
    },
    collectEvents() {
      const events = pendingEvents;
      pendingEvents = [];
      return events;
    },
  };
}

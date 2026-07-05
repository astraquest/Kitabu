import { GameEngine, SeededRandom } from '../../../runtime-contracts/src/game';
import { MANYANGA_RESCUE_QUESTIONS } from './questions';
import {
  ManyangaCoin,
  ManyangaEvent,
  ManyangaInput,
  ManyangaLane,
  ManyangaQuestion,
  ManyangaState,
  ManyangaTraffic,
} from './types';

const LANES: ManyangaLane[] = [0, 1, 2];
const START_SPEED = 16;
const MAX_SPEED = 40;
const ACCELERATION = 0.4;
const TRAFFIC_SPEED = 7;
const SPAWN_EVERY_M = 52;
const SPAWN_Z = 230;
const DESPAWN_Z = -12;
const CRASH_NEAR_Z = -1.5;
const CRASH_FAR_Z = 5.5;
const COIN_COLLECT_Z = 3.5;
const SCORE_PER_METER = 0.6;
const COIN_SCORE = 5;
const MAX_RESCUES = 3;
const RESCUE_DURATION_SEC = 5;
const RESCUE_INVULN_SEC = 2.5;
const RESCUE_CLEAR_AHEAD_M = 45;
const WAVE_STAGGER_M = 14;
const COIN_ROW_GAP_M = 7;
const COIN_ROW_CHANCE = 0.75;
export const MANYANGA_LIVERY_COUNT = 5;

function shuffleOptions(question: ManyangaQuestion, rng: SeededRandom): ManyangaQuestion {
  const options = [...question.options];
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng.next() * (index + 1));
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }
  return { ...question, options };
}

function pickQuestion(rng: SeededRandom) {
  const index = Math.floor(rng.next() * MANYANGA_RESCUE_QUESTIONS.length);
  return shuffleOptions(MANYANGA_RESCUE_QUESTIONS[index], rng);
}

function getDoubleWaveChance(distanceM: number) {
  return Math.min(0.65, 0.25 + distanceM / 4000);
}

function createBaseState(initial?: Partial<ManyangaState>): ManyangaState {
  return {
    status: 'menu',
    playerLane: 1,
    speed: START_SPEED,
    distanceM: 0,
    scoreFloat: 0,
    coins: 0,
    rescuesUsed: 0,
    invulnerableSec: 0,
    traffic: [],
    coinItems: [],
    rescueQuestion: null,
    rescueTimeLeftSec: 0,
    nextEntityId: 1,
    nextSpawnAtM: SPAWN_EVERY_M,
    ...initial,
  };
}

export function createManyangaEngine(
  rng: SeededRandom,
): GameEngine<ManyangaState, ManyangaInput, ManyangaEvent> {
  let pendingEvents: ManyangaEvent[] = [];

  function emit(event: ManyangaEvent) {
    pendingEvents.push(event);
  }

  function finishRun(state: ManyangaState): ManyangaState {
    const nextState: ManyangaState = {
      ...state,
      status: 'gameover',
      rescueQuestion: null,
      rescueTimeLeftSec: 0,
    };
    emit({
      type: 'game_over',
      score: Math.floor(nextState.scoreFloat),
      distanceM: Math.floor(nextState.distanceM),
      coins: nextState.coins,
    });
    return nextState;
  }

  function spawnWave(state: {
    traffic: ManyangaTraffic[];
    coinItems: ManyangaCoin[];
    nextEntityId: number;
    distanceM: number;
  }) {
    const doubleWave = rng.next() < getDoubleWaveChance(state.distanceM);
    const shuffledLanes = [...LANES];
    for (let index = shuffledLanes.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng.next() * (index + 1));
      [shuffledLanes[index], shuffledLanes[swapIndex]] = [
        shuffledLanes[swapIndex],
        shuffledLanes[index],
      ];
    }

    // Never block all three lanes: at most 2 matatus per wave, one lane stays free.
    const blockedLanes = shuffledLanes.slice(0, doubleWave ? 2 : 1);
    const freeLanes = shuffledLanes.slice(doubleWave ? 2 : 1);

    let nextEntityId = state.nextEntityId;
    const traffic = [...state.traffic];
    blockedLanes.forEach((lane, index) => {
      traffic.push({
        id: nextEntityId,
        lane,
        z: SPAWN_Z + index * WAVE_STAGGER_M,
        liveryIndex: Math.floor(rng.next() * MANYANGA_LIVERY_COUNT),
      });
      nextEntityId += 1;
    });

    const coinItems = [...state.coinItems];
    if (rng.next() < COIN_ROW_CHANCE && freeLanes.length > 0) {
      const coinLane = freeLanes[Math.floor(rng.next() * freeLanes.length)];
      for (let index = 0; index < 3; index += 1) {
        coinItems.push({
          id: nextEntityId,
          lane: coinLane,
          z: SPAWN_Z + index * COIN_ROW_GAP_M,
        });
        nextEntityId += 1;
      }
    }

    return { traffic, coinItems, nextEntityId };
  }

  return {
    create(initial) {
      pendingEvents = [];
      return createBaseState(initial);
    },
    update(state, input, dtMs) {
      pendingEvents = [];

      switch (input.type) {
        case 'start': {
          emit({ type: 'started' });
          return createBaseState({ status: 'playing' });
        }
        case 'return_menu':
          return createBaseState({ status: 'menu' });
        case 'steer': {
          if (state.status !== 'playing') {
            return state;
          }
          const delta = input.direction === 'left' ? -1 : 1;
          const playerLane = Math.min(
            2,
            Math.max(0, state.playerLane + delta),
          ) as ManyangaLane;
          if (playerLane === state.playerLane) {
            return state;
          }
          return { ...state, playerLane };
        }
        case 'answer_rescue': {
          if (state.status !== 'rescue_quiz' || !state.rescueQuestion) {
            return state;
          }

          if (input.answer === state.rescueQuestion.answer) {
            const rescuesUsed = state.rescuesUsed + 1;
            emit({ type: 'rescued', rescuesUsed });
            return {
              ...state,
              status: 'playing',
              rescuesUsed,
              invulnerableSec: RESCUE_INVULN_SEC,
              rescueQuestion: null,
              rescueTimeLeftSec: 0,
              traffic: state.traffic.filter(
                item =>
                  !(item.lane === state.playerLane && item.z < RESCUE_CLEAR_AHEAD_M),
              ),
            };
          }

          return finishRun(state);
        }
        case 'tick': {
          const dt = dtMs / 1000;

          if (state.status === 'rescue_quiz' && state.rescueQuestion) {
            const rescueTimeLeftSec = Math.max(0, state.rescueTimeLeftSec - dt);
            if (rescueTimeLeftSec <= 0) {
              return finishRun({ ...state, rescueTimeLeftSec });
            }
            return { ...state, rescueTimeLeftSec };
          }

          if (state.status !== 'playing') {
            return state;
          }

          const speed = Math.min(MAX_SPEED, state.speed + ACCELERATION * dt);
          const travel = speed * dt;
          const distanceM = state.distanceM + travel;
          let scoreFloat = state.scoreFloat + travel * SCORE_PER_METER;
          const invulnerableSec = Math.max(0, state.invulnerableSec - dt);

          let traffic = state.traffic
            .map(item => ({ ...item, z: item.z - (speed - TRAFFIC_SPEED) * dt }))
            .filter(item => item.z > DESPAWN_Z);

          let coinItems = state.coinItems
            .map(item => ({ ...item, z: item.z - speed * dt }))
            .filter(item => item.z > DESPAWN_Z);

          let coins = state.coins;
          const collected = coinItems.filter(
            item =>
              item.lane === state.playerLane &&
              item.z >= 0 &&
              item.z <= COIN_COLLECT_Z,
          );
          if (collected.length > 0) {
            const collectedIds = new Set(collected.map(item => item.id));
            coinItems = coinItems.filter(item => !collectedIds.has(item.id));
            coins += collected.length;
            scoreFloat += collected.length * COIN_SCORE;
            emit({ type: 'coin_collected', coins });
          }

          const hit = traffic.find(
            item =>
              item.lane === state.playerLane &&
              item.z >= CRASH_NEAR_Z &&
              item.z <= CRASH_FAR_Z,
          );

          let nextEntityId = state.nextEntityId;
          let nextSpawnAtM = state.nextSpawnAtM;
          while (distanceM >= nextSpawnAtM) {
            const spawned = spawnWave({
              traffic,
              coinItems,
              nextEntityId,
              distanceM,
            });
            traffic = spawned.traffic;
            coinItems = spawned.coinItems;
            nextEntityId = spawned.nextEntityId;
            nextSpawnAtM += SPAWN_EVERY_M;
          }

          const movedState: ManyangaState = {
            ...state,
            speed,
            distanceM,
            scoreFloat,
            coins,
            invulnerableSec,
            traffic,
            coinItems,
            nextEntityId,
            nextSpawnAtM,
          };

          if (hit && invulnerableSec <= 0) {
            if (state.rescuesUsed >= MAX_RESCUES) {
              return finishRun(movedState);
            }
            const question = pickQuestion(rng);
            emit({ type: 'crashed', question });
            return {
              ...movedState,
              status: 'rescue_quiz',
              rescueQuestion: question,
              rescueTimeLeftSec: RESCUE_DURATION_SEC,
            };
          }

          return movedState;
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

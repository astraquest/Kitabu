import {
  createCrazyBalloonEngine,
  createManyangaEngine,
} from '../../packages/game-core/src';

class FixedSequenceRandom {
  private index = 0;

  constructor(private readonly values: number[]) {}

  next() {
    const value = this.values[this.index % this.values.length];
    this.index += 1;
    return value;
  }
}

describe('game-core contracts', () => {
  describe('crazy-balloon engine', () => {
    it('starts a rescue quiz when a monster balloon is popped before lives are exhausted', () => {
      const engine = createCrazyBalloonEngine(new FixedSequenceRandom([0.1, 0.2, 0.3, 0.4]));
      const initial = engine.create({
        status: 'playing',
        mode: 'single',
        livesUsed: 0,
        balloons: [
          {
            id: 7,
            leftPct: 40,
            bottomPct: 30,
            color: '#FF5252',
            speedPctPerTick: 3,
            isMonster: true,
          },
        ],
      });

      const next = engine.update(initial, { type: 'pop_balloon', id: 7 }, 0);
      const events = engine.collectEvents(next);

      expect(next.status).toBe('rescue_quiz');
      expect(next.rescueQuestion).not.toBeNull();
      expect(next.rescueTimeLeftSec).toBe(5);
      expect(events).toEqual([
        expect.objectContaining({
          type: 'rescue_started',
        }),
      ]);
    });

    it('finishes the run when rescue answer is wrong', () => {
      const engine = createCrazyBalloonEngine(new FixedSequenceRandom([0.1, 0.2, 0.3]));
      const initial = engine.create({
        status: 'rescue_quiz',
        mode: 'single',
        score: 30,
        rescueQuestion: {
          prompt: 'Test',
          options: ['A', 'B'],
          answer: 'A',
        },
        rescueTimeLeftSec: 5,
      });

      const next = engine.update(initial, { type: 'answer_rescue', answer: 'B' }, 0);
      const events = engine.collectEvents(next);

      expect(next.status).toBe('gameover');
      expect(next.matchResult).toBe('loss');
      expect(events).toEqual([{ type: 'game_over', score: 30 }]);
    });
  });

  describe('manyanga engine', () => {
    it('starts a rescue quiz when the player hits traffic with rescues remaining', () => {
      const engine = createManyangaEngine(new FixedSequenceRandom([0.1, 0.2, 0.3, 0.4]));
      const initial = engine.create({
        status: 'playing',
        playerLane: 1,
        traffic: [{ id: 3, lane: 1, z: 3, liveryIndex: 0 }],
      });

      const next = engine.update(initial, { type: 'tick' }, 33);
      const events = engine.collectEvents(next);

      expect(next.status).toBe('rescue_quiz');
      expect(next.rescueQuestion).not.toBeNull();
      expect(next.rescueTimeLeftSec).toBe(5);
      expect(events).toEqual([expect.objectContaining({ type: 'crashed' })]);
    });

    it('resumes the race with invulnerability and a cleared lane on a correct rescue answer', () => {
      const engine = createManyangaEngine(new FixedSequenceRandom([0.1]));
      const initial = engine.create({
        status: 'rescue_quiz',
        playerLane: 1,
        rescuesUsed: 0,
        traffic: [
          { id: 1, lane: 1, z: 2, liveryIndex: 0 },
          { id: 2, lane: 1, z: 30, liveryIndex: 1 },
          { id: 3, lane: 0, z: 10, liveryIndex: 2 },
          { id: 4, lane: 1, z: 80, liveryIndex: 3 },
        ],
        rescueQuestion: { prompt: 'Test', options: ['A', 'B'], answer: 'A' },
        rescueTimeLeftSec: 4,
      });

      const next = engine.update(initial, { type: 'answer_rescue', answer: 'A' }, 0);
      const events = engine.collectEvents(next);

      expect(next.status).toBe('playing');
      expect(next.rescuesUsed).toBe(1);
      expect(next.invulnerableSec).toBeGreaterThan(0);
      expect(next.traffic.map(item => item.id)).toEqual([3, 4]);
      expect(events).toEqual([{ type: 'rescued', rescuesUsed: 1 }]);
    });

    it('ends the run on a wrong rescue answer', () => {
      const engine = createManyangaEngine(new FixedSequenceRandom([0.1]));
      const initial = engine.create({
        status: 'rescue_quiz',
        scoreFloat: 33.7,
        distanceM: 52.4,
        coins: 2,
        rescueQuestion: { prompt: 'Test', options: ['A', 'B'], answer: 'A' },
        rescueTimeLeftSec: 4,
      });

      const next = engine.update(initial, { type: 'answer_rescue', answer: 'B' }, 0);
      const events = engine.collectEvents(next);

      expect(next.status).toBe('gameover');
      expect(events).toEqual([
        { type: 'game_over', score: 33, distanceM: 52, coins: 2 },
      ]);
    });

    it('ends the run when the rescue countdown expires', () => {
      const engine = createManyangaEngine(new FixedSequenceRandom([0.1]));
      const initial = engine.create({
        status: 'rescue_quiz',
        rescueQuestion: { prompt: 'Test', options: ['A', 'B'], answer: 'A' },
        rescueTimeLeftSec: 5,
      });

      const next = engine.update(initial, { type: 'tick' }, 5100);

      expect(next.status).toBe('gameover');
    });

    it('ends the run immediately on a crash after all rescues are used', () => {
      const engine = createManyangaEngine(new FixedSequenceRandom([0.1]));
      const initial = engine.create({
        status: 'playing',
        playerLane: 1,
        rescuesUsed: 3,
        traffic: [{ id: 3, lane: 1, z: 3, liveryIndex: 0 }],
      });

      const next = engine.update(initial, { type: 'tick' }, 33);
      const events = engine.collectEvents(next);

      expect(next.status).toBe('gameover');
      expect(events).toEqual([expect.objectContaining({ type: 'game_over' })]);
    });

    it('collects coins in the player lane and scores them', () => {
      const engine = createManyangaEngine(new FixedSequenceRandom([0.9]));
      const initial = engine.create({
        status: 'playing',
        playerLane: 1,
        coinItems: [
          { id: 5, lane: 1, z: 2 },
          { id: 6, lane: 0, z: 2 },
        ],
      });

      const next = engine.update(initial, { type: 'tick' }, 33);
      const events = engine.collectEvents(next);

      expect(next.coins).toBe(1);
      expect(next.scoreFloat).toBeGreaterThanOrEqual(5);
      expect(next.coinItems.map(item => item.id)).toEqual([6]);
      expect(events).toContainEqual({ type: 'coin_collected', coins: 1 });
    });

    it('clamps steering at the road edges and ignores it during a rescue quiz', () => {
      const engine = createManyangaEngine(new FixedSequenceRandom([0.1]));
      const atEdge = engine.create({ status: 'playing', playerLane: 0 });

      expect(engine.update(atEdge, { type: 'steer', direction: 'left' }, 0).playerLane).toBe(0);
      expect(engine.update(atEdge, { type: 'steer', direction: 'right' }, 0).playerLane).toBe(1);

      const inQuiz = engine.create({
        status: 'rescue_quiz',
        playerLane: 1,
        rescueQuestion: { prompt: 'Test', options: ['A', 'B'], answer: 'A' },
        rescueTimeLeftSec: 4,
      });
      expect(engine.update(inQuiz, { type: 'steer', direction: 'left' }, 0).playerLane).toBe(1);
    });
  });
});

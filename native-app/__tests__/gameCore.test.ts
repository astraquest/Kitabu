import {
  createCrazyBalloonEngine,
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
});

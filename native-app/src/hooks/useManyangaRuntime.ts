import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createManyangaEngine,
  ManyangaEvent,
  ManyangaState,
} from '../../../packages/game-core/src';
import { IntervalGameLoop } from '../runtime/GameLoop';

class SeededRuntimeRandom {
  private seed: number;

  constructor(seed = Date.now()) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) {
      this.seed += 2147483646;
    }
  }

  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

export function useManyangaRuntime() {
  const engine = useMemo(
    () => createManyangaEngine(new SeededRuntimeRandom()),
    [],
  );
  const [state, setState] = useState<ManyangaState>(() => engine.create());
  const [events, setEvents] = useState<ManyangaEvent[]>([]);
  const stateRef = useRef(state);
  const playingLoop = useMemo(() => new IntervalGameLoop(33), []);
  const rescueLoop = useMemo(() => new IntervalGameLoop(100), []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const update = useCallback(
    (input: Parameters<typeof engine.update>[1], dtMs = 0) => {
      let nextState = stateRef.current;
      setState(current => {
        nextState = engine.update(current, input, dtMs);
        return nextState;
      });
      setEvents(engine.collectEvents(nextState));
    },
    [engine],
  );

  useEffect(() => {
    if (state.status !== 'playing') {
      playingLoop.stop();
      return undefined;
    }

    playingLoop.start(dtMs => {
      update({ type: 'tick' }, dtMs);
    });

    return () => playingLoop.stop();
  }, [playingLoop, state.status, update]);

  useEffect(() => {
    if (state.status !== 'rescue_quiz') {
      rescueLoop.stop();
      return undefined;
    }

    rescueLoop.start(dtMs => {
      update({ type: 'tick' }, dtMs);
    });

    return () => rescueLoop.stop();
  }, [rescueLoop, state.status, update]);

  return {
    events,
    state,
    start() {
      update({ type: 'start' });
    },
    returnMenu() {
      update({ type: 'return_menu' });
    },
    steer(direction: 'left' | 'right') {
      update({ type: 'steer', direction });
    },
    answerRescue(answer: string) {
      update({ type: 'answer_rescue', answer });
    },
  };
}

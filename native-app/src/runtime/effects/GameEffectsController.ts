import { useEffect, useState } from 'react';

import {
  CrazyBalloonEvent,
  ManyangaEvent,
} from '../../../../packages/game-core/src';

export type CrazyBalloonVisualEffect =
  | 'score_pulse'
  | 'danger_flash'
  | 'victory_flash'
  | 'defeat_flash'
  | null;

export function useCrazyBalloonEffects(events: CrazyBalloonEvent[]) {
  const [effect, setEffect] = useState<CrazyBalloonVisualEffect>(null);

  useEffect(() => {
    if (events.length === 0) {
      return undefined;
    }

    const latest = events[events.length - 1];

    switch (latest.type) {
      case 'score_changed':
        setEffect('score_pulse');
        break;
      case 'rescue_started':
        setEffect('danger_flash');
        break;
      case 'rescued':
        setEffect('victory_flash');
        break;
      case 'match_result':
        setEffect(latest.result === 'win' ? 'victory_flash' : 'defeat_flash');
        break;
      case 'game_over':
        setEffect('defeat_flash');
        break;
      default:
        setEffect(null);
        break;
    }

    const timer = setTimeout(() => setEffect(null), 420);
    return () => clearTimeout(timer);
  }, [events]);

  return effect;
}

export type ManyangaVisualEffect =
  | 'danger_flash'
  | 'victory_flash'
  | 'defeat_flash'
  | null;

export function useManyangaEffects(events: ManyangaEvent[]) {
  const [effect, setEffect] = useState<ManyangaVisualEffect>(null);

  useEffect(() => {
    if (events.length === 0) {
      return undefined;
    }

    const latest = events[events.length - 1];

    switch (latest.type) {
      case 'crashed':
        setEffect('danger_flash');
        break;
      case 'rescued':
        setEffect('victory_flash');
        break;
      case 'game_over':
        setEffect('defeat_flash');
        break;
      default:
        setEffect(null);
        break;
    }

    const timer = setTimeout(() => setEffect(null), 420);
    return () => clearTimeout(timer);
  }, [events]);

  return effect;
}

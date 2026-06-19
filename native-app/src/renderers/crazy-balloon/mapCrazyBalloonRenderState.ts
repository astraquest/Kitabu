import { CrazyBalloonState } from '../../../../packages/game-core/src';

export interface CrazyBalloonRenderState {
  balloons: Array<{
    id: number;
    leftPct: number;
    bottomPct: number;
    color: string;
    label: string;
  }>;
  showHint: boolean;
}

export function mapCrazyBalloonRenderState(
  state: CrazyBalloonState,
): CrazyBalloonRenderState {
  return {
    balloons: state.balloons.map(balloon => ({
      id: balloon.id,
      leftPct: balloon.leftPct,
      bottomPct: balloon.bottomPct,
      color: balloon.color,
      label: balloon.isMonster ? 'hazard' : 'balloon',
    })),
    showHint: state.status === 'playing' && state.score === 0,
  };
}

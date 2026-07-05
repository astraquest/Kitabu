import { ManyangaState } from '../../../../packages/game-core/src';

// Perspective constants — tune the 3D feel here (see MANYANGA_GAME_GUIDE.md §5).
const HORIZON_Y = 34;
const BOTTOM_Y = 97;
const CAM_DEPTH = 14;
const ROAD_HALF_BOTTOM = 46;
const LANE_OFFSET = 29;
const PLAYER_Z_VISUAL = 4;
const ROAD_HALF_HORIZON = 2.2;
const DASH_PERIOD = 14;
const DASH_COUNT = 17;
const MAX_DRAW_Z = 200;
const MIN_DRAW_Z = -6;
const MIN_DASH_SCALE = 0.045;

export interface ManyangaRenderSprite {
  kind: 'traffic' | 'coin';
  id: number;
  xPct: number;
  yPct: number;
  scale: number;
  liveryIndex: number;
}

export interface ManyangaRenderState {
  horizonYPct: number;
  roadPolygonPoints: string;
  edgeLines: { left: string; right: string };
  dashes: Array<{ key: string; xPct: number; yPct: number; scale: number }>;
  sprites: ManyangaRenderSprite[];
  player: { xPct: number; yPct: number; scale: number; blinking: boolean };
  speedKmh: number;
  showHint: boolean;
}

function depthScale(z: number) {
  return CAM_DEPTH / (z + CAM_DEPTH);
}

function projectY(scale: number) {
  return HORIZON_Y + (BOTTOM_Y - HORIZON_Y) * scale;
}

function projectX(laneUnits: number, scale: number) {
  return 50 + laneUnits * LANE_OFFSET * scale;
}

function laneToUnits(lane: 0 | 1 | 2) {
  return lane - 1;
}

const ROAD_POLYGON_POINTS = [
  `${50 - ROAD_HALF_BOTTOM},${BOTTOM_Y}`,
  `${50 + ROAD_HALF_BOTTOM},${BOTTOM_Y}`,
  `${50 + ROAD_HALF_HORIZON},${HORIZON_Y}`,
  `${50 - ROAD_HALF_HORIZON},${HORIZON_Y}`,
].join(' ');

function edgeLinePoints(side: -1 | 1) {
  const bottomOuter = 50 + side * ROAD_HALF_BOTTOM;
  const bottomInner = 50 + side * (ROAD_HALF_BOTTOM - 2.4);
  const topOuter = 50 + side * ROAD_HALF_HORIZON;
  const topInner = 50 + side * (ROAD_HALF_HORIZON - 0.14);
  return `${bottomOuter},${BOTTOM_Y} ${bottomInner},${BOTTOM_Y} ${topInner},${HORIZON_Y} ${topOuter},${HORIZON_Y}`;
}

const EDGE_LINES = {
  left: edgeLinePoints(-1),
  right: edgeLinePoints(1),
};

export function mapManyangaRenderState(state: ManyangaState): ManyangaRenderState {
  const dashes: ManyangaRenderState['dashes'] = [];
  const phase = state.distanceM % DASH_PERIOD;
  for (const dividerUnits of [-0.5, 0.5]) {
    for (let k = 0; k < DASH_COUNT; k += 1) {
      const z = k * DASH_PERIOD - phase + 2;
      if (z < 0) {
        continue;
      }
      const scale = depthScale(z);
      if (scale < MIN_DASH_SCALE) {
        continue;
      }
      dashes.push({
        key: `${dividerUnits}:${k}`,
        xPct: projectX(dividerUnits, scale),
        yPct: projectY(scale),
        scale,
      });
    }
  }

  const sprites: ManyangaRenderSprite[] = [];
  for (const item of state.traffic) {
    if (item.z > MAX_DRAW_Z || item.z < MIN_DRAW_Z) {
      continue;
    }
    const scale = depthScale(Math.max(0, item.z));
    sprites.push({
      kind: 'traffic',
      id: item.id,
      xPct: projectX(laneToUnits(item.lane), scale),
      yPct: projectY(scale),
      scale,
      liveryIndex: item.liveryIndex,
    });
  }
  for (const item of state.coinItems) {
    if (item.z > MAX_DRAW_Z || item.z < MIN_DRAW_Z) {
      continue;
    }
    const scale = depthScale(Math.max(0, item.z));
    sprites.push({
      kind: 'coin',
      id: item.id,
      xPct: projectX(laneToUnits(item.lane), scale),
      yPct: projectY(scale),
      scale,
      liveryIndex: 0,
    });
  }
  // Painter's algorithm: far (small scale) first, near last.
  sprites.sort((a, b) => a.scale - b.scale);

  const playerScale = depthScale(PLAYER_Z_VISUAL);

  return {
    horizonYPct: HORIZON_Y,
    roadPolygonPoints: ROAD_POLYGON_POINTS,
    edgeLines: EDGE_LINES,
    dashes,
    sprites,
    player: {
      xPct: projectX(laneToUnits(state.playerLane), playerScale),
      yPct: projectY(playerScale),
      scale: playerScale,
      blinking: state.invulnerableSec > 0,
    },
    speedKmh: Math.round(state.speed * 3.6),
    showHint: state.status === 'playing' && state.distanceM < 40,
  };
}

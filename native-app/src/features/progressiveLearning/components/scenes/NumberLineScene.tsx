import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import type { LearningVisualSpec } from '../../types';
import { SceneFrame } from './SceneFrame';
import { sceneTheme } from './sceneTheme';

type NumberLineSpec = Extract<LearningVisualSpec, { kind: 'number_line' }>;

const LEFT = 24;
const RIGHT = 316;
const AXIS_Y = 96;

export function NumberLineScene({ spec }: { spec: NumberLineSpec }) {
  const position = (value: number) => {
    if (spec.max === spec.min) return (LEFT + RIGHT) / 2;
    const ratio = (value - spec.min) / (spec.max - spec.min);
    return LEFT + Math.max(0, Math.min(1, ratio)) * (RIGHT - LEFT);
  };
  const ticks = buildTicks(spec.min, spec.max);
  const jumpFrom = spec.jump ? position(spec.jump.from) : 0;
  const jumpTo = spec.jump ? position(spec.jump.to) : 0;
  const jumpPeak = Math.max(
    25,
    Math.min(58, Math.abs(jumpTo - jumpFrom) * 0.33),
  );

  return (
    <SceneFrame
      accessibilityLabel={spec.caption}
      sceneKey={`number-line-${spec.caption}`}
      tone="cream"
    >
      <View style={styles.titleRow}>
        <View style={styles.routeBadge}>
          <Text style={styles.routeBadgeText}>NUMBER JOURNEY</Text>
        </View>
        {spec.jump?.label ? (
          <Text style={styles.jumpLabel}>{spec.jump.label}</Text>
        ) : null}
      </View>
      <Svg height="142" viewBox="0 0 340 142" width="100%">
        <Rect fill="#FFF2D4" height="38" rx="19" width="324" x="8" y="78" />
        <Line
          stroke="#526F8C"
          strokeLinecap="round"
          strokeWidth="5"
          x1={LEFT}
          x2={RIGHT}
          y1={AXIS_Y}
          y2={AXIS_Y}
        />
        <Path
          d={`M${LEFT} ${AXIS_Y} L${LEFT + 9} ${AXIS_Y - 6} V${AXIS_Y + 6}Z`}
          fill="#526F8C"
        />
        <Path
          d={`M${RIGHT} ${AXIS_Y} L${RIGHT - 9} ${AXIS_Y - 6} V${AXIS_Y + 6}Z`}
          fill="#526F8C"
        />
        {ticks.map(value => {
          const x = position(value);
          return (
            <React.Fragment key={value}>
              <Line
                stroke="#7890A8"
                strokeWidth="2"
                x1={x}
                x2={x}
                y1={AXIS_Y - 7}
                y2={AXIS_Y + 8}
              />
              <SvgText
                fill={sceneTheme.mutedInk}
                fontSize="10"
                fontWeight="800"
                textAnchor="middle"
                x={x}
                y="126"
              >
                {formatNumber(value)}
              </SvgText>
            </React.Fragment>
          );
        })}
        {spec.jump ? (
          <>
            <Path
              d={`M${jumpFrom} ${AXIS_Y - 9} Q${(jumpFrom + jumpTo) / 2} ${
                AXIS_Y - 9 - jumpPeak
              } ${jumpTo} ${AXIS_Y - 9}`}
              fill="none"
              stroke={sceneTheme.orange}
              strokeLinecap="round"
              strokeWidth="5"
            />
            <Path
              d={
                jumpTo >= jumpFrom
                  ? `M${jumpTo} ${AXIS_Y - 9} L${jumpTo - 10} ${AXIS_Y - 16} L${
                      jumpTo - 8
                    } ${AXIS_Y - 4}Z`
                  : `M${jumpTo} ${AXIS_Y - 9} L${jumpTo + 10} ${AXIS_Y - 16} L${
                      jumpTo + 8
                    } ${AXIS_Y - 4}Z`
              }
              fill={sceneTheme.orange}
            />
          </>
        ) : null}
        {spec.markers.map((marker, index) => {
          const x = position(marker.value);
          const fill = index % 2 ? sceneTheme.teal : sceneTheme.blue;
          return (
            <React.Fragment key={`${marker.value}-${index}`}>
              <Circle
                cx={x}
                cy={AXIS_Y}
                fill="#FFFFFF"
                r="9"
                stroke={fill}
                strokeWidth="4"
              />
              {marker.label ? (
                <>
                  <Rect
                    fill={fill}
                    height="23"
                    rx="11"
                    width={Math.max(38, marker.label.length * 7 + 13)}
                    x={x - Math.max(38, marker.label.length * 7 + 13) / 2}
                    y="43"
                  />
                  <SvgText
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="900"
                    textAnchor="middle"
                    x={x}
                    y="58"
                  >
                    {marker.label}
                  </SvgText>
                  <Line
                    stroke={fill}
                    strokeDasharray="3 3"
                    strokeWidth="2"
                    x1={x}
                    x2={x}
                    y1="66"
                    y2={AXIS_Y - 10}
                  />
                </>
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>
    </SceneFrame>
  );
}

function buildTicks(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max)
    return [min];
  const span = max - min;
  const rawStep = Math.abs(span) / 6;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = nice * magnitude;
  const values = [min];
  const direction = span > 0 ? 1 : -1;
  for (
    let value = min + direction * step;
    direction > 0 ? value < max : value > max;
    value += direction * step
  ) {
    values.push(Number(value.toPrecision(10)));
    if (values.length >= 9) break;
  }
  values.push(max);
  return values;
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2)));
}

const styles = StyleSheet.create({
  jumpLabel: { color: sceneTheme.orange, fontSize: 11, fontWeight: '900' },
  routeBadge: {
    backgroundColor: sceneTheme.ink,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  routeBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: -4,
  },
});

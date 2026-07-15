import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { LearningVisualSpec } from '../../types';
import { ConceptIllustration } from './ConceptIllustration';
import { SceneFrame } from './SceneFrame';
import { sceneTheme } from './sceneTheme';

type SequenceSpec = Extract<LearningVisualSpec, { kind: 'sequence' }>;

export function SequenceScene({ spec }: { spec: SequenceSpec }) {
  return (
    <SceneFrame
      accessibilityLabel={spec.caption}
      sceneKey={`sequence-${spec.caption}`}
      tone="mint"
    >
      <View style={styles.titleRow}>
        <Svg height="34" viewBox="0 0 54 34" width="54">
          <Path
            d="M4 27 C15 5 29 5 39 20"
            fill="none"
            stroke={sceneTheme.teal}
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <Path d="M35 15 L48 22 L36 29Z" fill={sceneTheme.orange} />
        </Svg>
        <Text style={styles.eyebrow}>FOLLOW IT STEP BY STEP</Text>
      </View>
      <View style={styles.list}>
        {spec.steps.map((step, index) => {
          const isActive = spec.activeIndex === index;
          const isDone =
            spec.activeIndex !== undefined && index < spec.activeIndex;
          return (
            <View key={step.id} style={styles.row}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.node,
                    isDone && styles.doneNode,
                    isActive && styles.activeNode,
                  ]}
                >
                  {isDone ? (
                    <Svg height="15" viewBox="0 0 20 16" width="18">
                      <Path
                        d="M2 8 L7 13 L18 2"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                      />
                    </Svg>
                  ) : (
                    <Text
                      style={[styles.number, isActive && styles.activeNumber]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                {index < spec.steps.length - 1 ? (
                  <View
                    style={[styles.connector, isDone && styles.doneConnector]}
                  />
                ) : null}
              </View>
              <View
                style={[
                  styles.stepCard,
                  isActive && styles.activeCard,
                  isDone && styles.doneCard,
                ]}
              >
                <ConceptIllustration
                  context="card"
                  label={`${step.label} ${step.detail ?? ''}`}
                  size={44}
                />
                <View style={styles.stepCopy}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>{step.label}</Text>
                    {isActive ? <Text style={styles.now}>NOW</Text> : null}
                  </View>
                  {step.detail ? (
                    <Text style={styles.detail}>{step.detail}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </SceneFrame>
  );
}

const styles = StyleSheet.create({
  activeCard: {
    backgroundColor: '#E7EFFF',
    borderColor: sceneTheme.blue,
    borderWidth: 2,
  },
  activeNode: {
    backgroundColor: sceneTheme.blue,
    borderColor: '#C9D8FF',
    borderWidth: 4,
    height: 32,
    width: 32,
  },
  activeNumber: { color: '#FFFFFF' },
  connector: {
    backgroundColor: '#C9DCD8',
    flex: 1,
    marginVertical: 2,
    width: 3,
  },
  detail: {
    color: sceneTheme.mutedInk,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    marginTop: 2,
  },
  doneCard: { backgroundColor: '#F3FBF7' },
  doneConnector: { backgroundColor: sceneTheme.teal },
  doneNode: { backgroundColor: sceneTheme.teal, borderColor: sceneTheme.teal },
  eyebrow: {
    color: sceneTheme.mutedInk,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  label: {
    color: sceneTheme.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  labelRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  list: { alignSelf: 'center', maxWidth: 360, width: '100%' },
  node: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#AFCAC4',
    borderRadius: 999,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  now: {
    backgroundColor: sceneTheme.blue,
    borderRadius: 999,
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  number: { color: sceneTheme.mutedInk, fontSize: 11, fontWeight: '900' },
  rail: { alignItems: 'center', marginRight: 8, width: 32 },
  row: { alignItems: 'stretch', flexDirection: 'row', minHeight: 43 },
  stepCard: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: sceneTheme.border,
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  stepCopy: { flex: 1 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
});

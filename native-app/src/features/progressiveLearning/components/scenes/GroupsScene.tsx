import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { LearningVisualSpec } from '../../types';
import { ObjectCluster } from './ObjectCluster';
import { SceneFrame } from './SceneFrame';
import { sceneTheme } from './sceneTheme';

type GroupsSpec = Extract<LearningVisualSpec, { kind: 'groups' }>;

export function GroupsScene({ spec }: { spec: GroupsSpec }) {
  const visibleGroups = Math.max(1, Math.min(spec.groups, 6));
  const each = spec.each === 'x' ? 1 : spec.each;

  return (
    <SceneFrame accessibilityLabel={spec.caption} sceneKey={`groups-${spec.caption}`} tone="mint">
      <View style={styles.scene}>
        <Svg height="54" style={styles.decor} viewBox="0 0 320 54" width="100%">
          <Path d="M0 47 Q52 17 104 47 T208 47 T320 47 V54 H0Z" fill="#D9F4EA" />
          <Circle cx="28" cy="17" fill="#FFE288" r="8" /><Circle cx="293" cy="12" fill="#B9DEFF" r="6" />
        </Svg>
        <View style={styles.groups}>
          {Array.from({ length: visibleGroups }).map((_, index) => (
            <View key={index} style={[styles.group, index % 2 === 1 && styles.groupAlt]}>
              <View style={styles.groupNumber}><Text style={styles.groupNumberText}>{index + 1}</Text></View>
              <ObjectCluster count={each} kind={spec.object} label={spec.each === 'x' ? 'x' : undefined} size="compact" />
            </View>
          ))}
        </View>
        {spec.total !== undefined ? (
          <View style={styles.totalPill}>
            <Text style={styles.totalLabel}>ALL TOGETHER</Text>
            <Text style={styles.totalValue}>{spec.total}</Text>
          </View>
        ) : (
          <View style={styles.rulePill}><Text style={styles.ruleText}>{spec.groups} equal groups</Text></View>
        )}
      </View>
    </SceneFrame>
  );
}

const styles = StyleSheet.create({
  decor: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  group: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#CAE8E0', borderRadius: 18, borderWidth: 1, elevation: 1, justifyContent: 'flex-end', minHeight: 73, minWidth: 83, padding: 6, position: 'relative', shadowColor: '#6B8FA1', shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.1, shadowRadius: 3 },
  groupAlt: { backgroundColor: '#FFF9E9', borderColor: '#F2DFA7' },
  groupNumber: { alignItems: 'center', backgroundColor: sceneTheme.ink, borderRadius: 9, height: 18, justifyContent: 'center', left: 5, position: 'absolute', top: 5, width: 18, zIndex: 2 },
  groupNumberText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  groups: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', minHeight: 78 },
  rulePill: { alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 999, marginTop: 10, paddingHorizontal: 13, paddingVertical: 6 },
  ruleText: { color: sceneTheme.mutedInk, fontSize: 11, fontWeight: '900' },
  scene: { minHeight: 143, paddingTop: 3, position: 'relative' },
  totalLabel: { color: '#147A69', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  totalPill: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#FFFFFF', borderColor: '#A7DDD2', borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 7, marginTop: 9, paddingHorizontal: 11, paddingVertical: 5 },
  totalValue: { color: sceneTheme.ink, fontSize: 18, fontWeight: '900' },
});

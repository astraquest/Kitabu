import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import type { LearningVisualSpec } from '../../types';
import { ObjectCluster } from './ObjectCluster';
import { SceneFrame } from './SceneFrame';
import { sceneTheme } from './sceneTheme';

type BalanceSpec = Extract<LearningVisualSpec, { kind: 'balance' }>;

export function BalanceScene({ spec }: { spec: BalanceSpec }) {
  const tilt = spec.balanced ? '0deg' : '-4deg';

  return (
    <SceneFrame accessibilityLabel={spec.caption} sceneKey={`balance-${spec.caption}`} tone="sky">
      <View style={styles.scene}>
        <View style={styles.cloudOne} /><View style={styles.cloudTwo} />
        <View style={[styles.panRow, !spec.balanced && styles.panRowTilted]}>
          <View style={styles.panContents}>
            {spec.left.map((item, index) => (
              <ObjectCluster key={`${item.object}-${index}`} count={item.count} kind={item.object} label={item.label} size="compact" />
            ))}
          </View>
          <View style={styles.panContents}>
            {spec.right.map((item, index) => (
              <ObjectCluster key={`${item.object}-${index}`} count={item.count} kind={item.object} label={item.label} size="compact" />
            ))}
          </View>
        </View>
        <View style={[styles.apparatus, { transform: [{ rotate: tilt }] }]}>
          <Svg height="58" viewBox="0 0 320 58" width="100%">
            <Path d="M28 10 H292" stroke={sceneTheme.ink} strokeLinecap="round" strokeWidth="8" />
            <Path d="M34 12 L20 46 M286 12 L300 46" stroke={sceneTheme.mutedInk} strokeLinecap="round" strokeWidth="3" />
            <Path d="M8 46 Q20 57 32 46Z M288 46 Q300 57 312 46Z" fill={sceneTheme.blue} />
            <Circle cx="160" cy="10" fill={sceneTheme.yellow} r="11" stroke="#FFFFFF" strokeWidth="4" />
          </Svg>
        </View>
        <Svg height="76" style={styles.stand} viewBox="0 0 110 76" width="110">
          <Path d="M55 3 L77 62 H33Z" fill={sceneTheme.teal} />
          <Path d="M46 24 H64 L72 62 H38Z" fill="#57C3AF" />
          <Rect fill={sceneTheme.ink} height="9" rx="4.5" width="92" x="9" y="62" />
          <Ellipse cx="55" cy="71" fill={sceneTheme.shadow} opacity={0.6} rx="48" ry="5" />
        </Svg>
        <View style={[styles.statusDot, spec.balanced ? styles.balancedDot : styles.tiltedDot]} />
      </View>
    </SceneFrame>
  );
}

const styles = StyleSheet.create({
  apparatus: { left: 0, position: 'absolute', right: 0, top: 74 },
  balancedDot: { backgroundColor: sceneTheme.teal },
  cloudOne: { backgroundColor: '#FFFFFF', borderRadius: 999, height: 14, left: 12, opacity: 0.7, position: 'absolute', top: 12, width: 52 },
  cloudTwo: { backgroundColor: '#FFFFFF', borderRadius: 999, height: 10, opacity: 0.65, position: 'absolute', right: 18, top: 26, width: 38 },
  panContents: { alignItems: 'flex-end', flex: 1, flexDirection: 'row', justifyContent: 'center', minHeight: 72, paddingHorizontal: 4 },
  panRow: { flexDirection: 'row', gap: 40, left: 3, position: 'absolute', right: 3, top: 22 },
  panRowTilted: { transform: [{ rotate: '-2deg' }] },
  scene: { height: 160, position: 'relative' },
  stand: { alignSelf: 'center', marginTop: 91 },
  statusDot: { borderColor: '#FFFFFF', borderRadius: 7, borderWidth: 2, height: 14, position: 'absolute', right: 5, top: 4, width: 14 },
  tiltedDot: { backgroundColor: sceneTheme.orange },
});

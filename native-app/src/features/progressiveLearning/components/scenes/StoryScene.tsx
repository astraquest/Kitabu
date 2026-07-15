import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import type { LearningVisualSpec } from '../../types';
import { ObjectCluster } from './ObjectCluster';
import { SceneFrame } from './SceneFrame';
import { sceneTheme } from './sceneTheme';

type StorySpec = Extract<LearningVisualSpec, { kind: 'story' }>;

export function StoryScene({ spec }: { spec: StorySpec }) {
  return (
    <SceneFrame accessibilityLabel={spec.caption} sceneKey={`story-${spec.caption}`} tone="sky">
      <View style={styles.scene}>
        <Svg height="142" style={styles.landscape} viewBox="0 0 320 142" width="100%">
          <Circle cx="270" cy="25" fill="#FFD86B" r="16" />
          <Path d="M0 91 Q52 54 103 91 Q152 47 212 91 Q267 58 320 89 V142 H0Z" fill="#CDEEDF" />
          <Path d="M0 111 Q57 82 121 112 Q183 74 240 112 Q281 90 320 108 V142 H0Z" fill="#82D1A8" />
          <Path d="M54 106 L66 68 L78 106Z" fill="#5DA27B" /><Ellipse cx="66" cy="66" fill="#3C9367" rx="20" ry="14" />
          <Path d="M260 116 L270 82 L280 116Z" fill="#5DA27B" /><Ellipse cx="270" cy="79" fill="#3C9367" rx="17" ry="12" />
        </Svg>
        <View style={styles.characters}>
          {spec.objects.map((item, index) => (
            <View key={`${item.object}-${index}`} style={[styles.character, index % 2 === 1 && styles.characterRaised]}>
              <ObjectCluster count={item.count} kind={item.object} label={item.label} />
              {item.label ? <View style={styles.speechTail} /> : null}
            </View>
          ))}
        </View>
        <View style={styles.storyChip}><Text style={styles.storyChipText}>LOOK • NOTICE • SOLVE</Text></View>
      </View>
    </SceneFrame>
  );
}

const styles = StyleSheet.create({
  character: { alignItems: 'center', justifyContent: 'flex-end', minWidth: 84 },
  characterRaised: { transform: [{ translateY: -7 }] },
  characters: { bottom: 9, flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', left: 15, position: 'absolute', right: 15 },
  landscape: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  scene: { minHeight: 150, position: 'relative' },
  speechTail: { borderLeftColor: 'transparent', borderLeftWidth: 5, borderRightColor: 'transparent', borderRightWidth: 5, borderTopColor: '#E9E3FF', borderTopWidth: 7, height: 0, marginTop: -1, width: 0 },
  storyChip: { alignSelf: 'center', backgroundColor: sceneTheme.ink, borderRadius: 999, left: 0, paddingHorizontal: 10, paddingVertical: 4, position: 'absolute', top: 0 },
  storyChipText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
});

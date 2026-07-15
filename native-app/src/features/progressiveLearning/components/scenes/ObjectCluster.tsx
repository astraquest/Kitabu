import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LearningObjectKind } from '../../types';
import { LEARNING_OBJECT_META, ObjectIllustration } from './ObjectIllustration';
import { sceneTheme } from './sceneTheme';

interface ObjectClusterProps {
  count: number;
  kind: LearningObjectKind;
  label?: string;
  size?: 'compact' | 'regular';
}

export function ObjectCluster({ count, kind, label, size = 'regular' }: ObjectClusterProps) {
  const visibleCount = Math.max(1, Math.min(count, size === 'compact' ? 3 : 4));
  const artSize = size === 'compact' ? 31 : visibleCount > 2 ? 37 : 47;
  const meta = LEARNING_OBJECT_META[kind];

  return (
    <View style={styles.cluster}>
      <View style={styles.artRow}>
        {Array.from({ length: visibleCount }).map((_, index) => (
          <View
            key={`${kind}-${index}`}
            style={[styles.artBubble, { backgroundColor: meta.soft }, index > 0 && styles.overlap]}>
            <ObjectIllustration kind={kind} size={artSize} />
          </View>
        ))}
      </View>
      <View style={styles.labelRow}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {count > visibleCount ? <Text style={styles.count}>×{count}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  artBubble: {
    alignItems: 'center',
    borderColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 38,
  },
  artRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cluster: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  count: {
    backgroundColor: sceneTheme.ink,
    borderRadius: 999,
    color: sceneTheme.white,
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    color: '#6446C5',
    fontSize: 11,
    fontWeight: '900',
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 16,
  },
  overlap: {
    marginLeft: -10,
  },
});

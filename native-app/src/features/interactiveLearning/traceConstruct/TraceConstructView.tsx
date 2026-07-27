import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  isTraceConstructComplete,
  normalizeTraceConstructSelection,
  serializeTraceConstructResponse,
  toggleTraceConstructTarget,
} from './engine';
import type { TraceConstructSceneProps } from './types';

type Props = {
  sceneId: string;
  props: TraceConstructSceneProps;
  disabled?: boolean;
  restoredSelection?: string[];
  onResponseChange: (response: string | null) => void;
};

/**
 * Tap-first construction activity. It intentionally avoids a drag-only gesture so
 * Grade 1 learners can complete the same task with a keyboard, switch, or touch.
 */
export function TraceConstructView({ sceneId, props, disabled = false, restoredSelection, onResponseChange }: Props) {
  const restoredKey = restoredSelection?.join('|') ?? '';
  const propsRef = useRef(props);
  const onResponseChangeRef = useRef(onResponseChange);
  propsRef.current = props;
  onResponseChangeRef.current = onResponseChange;
  const [selected, setSelected] = useState(() => normalizeTraceConstructSelection(restoredSelection ?? [], props));

  useEffect(() => {
    const next = normalizeTraceConstructSelection(restoredKey ? restoredKey.split('|') : [], propsRef.current);
    setSelected(next);
    onResponseChangeRef.current(isTraceConstructComplete(next, propsRef.current)
      ? serializeTraceConstructResponse(next)
      : null);
  }, [sceneId, restoredKey]);

  function update(id: string) {
    const next = toggleTraceConstructTarget(id, selected, props);
    setSelected(next);
    onResponseChange(isTraceConstructComplete(next, props) ? serializeTraceConstructResponse(next) : null);
  }

  return (
    <View accessibilityLabel={props.accessibility.selectionLabel.default} style={styles.container}>
      <Text style={styles.instruction}>{props.instruction.default}</Text>
      <View style={styles.grid}>
        {props.targets.map(target => {
          const chosen = selected.includes(target.id);
          const position = selected.indexOf(target.id);
          return (
            <Pressable
              key={target.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: chosen, disabled }}
              accessibilityLabel={target.accessibleDescription}
              disabled={disabled}
              onPress={() => update(target.id)}
              style={[styles.target, chosen && styles.targetSelected]}
            >
              <Text style={styles.targetLabel}>{target.label}</Text>
              <Text style={styles.targetHint}>{chosen ? `Choice ${position + 1}` : 'Tap to choose'}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, width: '100%' },
  instruction: { color: '#173B5C', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  target: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#B8C8DC', borderRadius: 18, borderWidth: 2, minHeight: 92, minWidth: 112, padding: 12 },
  targetSelected: { backgroundColor: '#E0F2FE', borderColor: '#0EA5E9', borderWidth: 3 },
  targetLabel: { color: '#102A43', fontSize: 26, fontWeight: '900' },
  targetHint: { color: '#486581', fontSize: 12, fontWeight: '700', marginTop: 5 },
});

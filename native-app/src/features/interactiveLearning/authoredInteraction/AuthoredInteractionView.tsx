import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowDown, ArrowUp, RotateCcw, Undo2 } from 'lucide-react-native';

import {
  isAssignmentComplete,
  moveItem,
  patternTargetLength,
  restoreAssignments,
  restoreSequence,
  serializeAssignments,
  serializeOrder,
  serializePattern,
} from './engine';
import type { AuthoredAssignments, AuthoredInteractionSceneProps } from './types';

type Props = {
  sceneId: string;
  props: AuthoredInteractionSceneProps;
  disabled?: boolean;
  restoredResponse?: string;
  onResponseChange: (response: string | null) => void;
};

/** Tap-first, subject-agnostic interaction renderer. It never receives grading answers. */
export function AuthoredInteractionView({
  sceneId,
  props,
  disabled = false,
  restoredResponse,
  onResponseChange,
}: Props) {
  const propsRef = useRef(props);
  const onResponseChangeRef = useRef(onResponseChange);
  propsRef.current = props;
  onResponseChangeRef.current = onResponseChange;

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AuthoredAssignments>(() => restoreAssignments(restoredResponse, props));
  const [sequence, setSequence] = useState<string[]>(() => restoreSequence(restoredResponse, props));

  useEffect(() => {
    const currentProps = propsRef.current;
    const nextAssignments = restoreAssignments(restoredResponse, currentProps);
    const nextSequence = restoreSequence(restoredResponse, currentProps);
    setSelectedItemId(null);
    setAssignments(nextAssignments);
    setSequence(nextSequence);

    if (currentProps.mode === 'classify' || currentProps.mode === 'match') {
      const ids = currentProps.items.map(item => item.id);
      onResponseChangeRef.current(isAssignmentComplete(nextAssignments, ids)
        ? serializeAssignments(currentProps.mode, nextAssignments, ids)
        : null);
    } else if (currentProps.mode === 'order') {
      onResponseChangeRef.current(serializeOrder(nextSequence));
    } else {
      onResponseChangeRef.current(nextSequence.length === patternTargetLength(currentProps)
        ? serializePattern(nextSequence)
        : null);
    }
  }, [sceneId, restoredResponse]);

  function assignTo(groupId: string) {
    if (!selectedItemId) return;
    const next = { ...assignments, [selectedItemId]: groupId };
    setAssignments(next);
    setSelectedItemId(null);
    const ids = props.items.map(item => item.id);
    onResponseChange(isAssignmentComplete(next, ids)
      ? serializeAssignments(props.mode as 'classify' | 'match', next, ids)
      : null);
  }

  function updateOrder(next: string[]) {
    setSequence(next);
    onResponseChange(serializeOrder(next));
  }

  function addPatternItem(itemId: string) {
    if (sequence.length >= patternTargetLength(props)) return;
    const next = [...sequence, itemId];
    setSequence(next);
    onResponseChange(next.length === patternTargetLength(props) ? serializePattern(next) : null);
  }

  function updatePattern(next: string[]) {
    setSequence(next);
    onResponseChange(next.length === patternTargetLength(props) ? serializePattern(next) : null);
  }

  if (props.mode === 'classify' || props.mode === 'match') {
    return (
      <View accessibilityLabel={props.instruction} style={styles.container}>
        <Text style={styles.instruction}>{props.instruction}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.guidance}>
          {selectedItemId ? 'Now choose where it belongs.' : 'Choose an item.'}
        </Text>
        <View style={styles.grid}>
          {props.items.map(item => {
            const selected = item.id === selectedItemId;
            const group = props.groups?.find(candidate => candidate.id === assignments[item.id]);
            return (
              <Pressable
                key={item.id}
                accessibilityHint={group ? `Currently in ${group.label}. Tap to change it.` : 'Tap, then choose a group.'}
                accessibilityLabel={item.accessibleDescription ?? item.label}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => setSelectedItemId(item.id)}
                style={[styles.card, selected && styles.cardSelected]}
              >
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardMeta}>{group?.label ?? 'Not placed'}</Text>
              </Pressable>
            );
          })}
        </View>
        <View accessibilityLabel="Groups" style={styles.groups}>
          {props.groups?.map(group => (
            <Pressable
              key={group.id}
              accessibilityHint={selectedItemId ? 'Places the selected item here.' : 'Choose an item first.'}
              accessibilityLabel={group.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: disabled || !selectedItemId }}
              disabled={disabled || !selectedItemId}
              onPress={() => assignTo(group.id)}
              style={[styles.group, selectedItemId && styles.groupReady]}
            >
              <Text style={styles.groupLabel}>{group.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  if (props.mode === 'order') {
    return (
      <View accessibilityLabel={props.instruction} style={styles.container}>
        <Text style={styles.instruction}>{props.instruction}</Text>
        {sequence.map((id, index) => {
          const item = props.items.find(candidate => candidate.id === id);
          if (!item) return null;
          return (
            <View key={id} style={styles.orderRow}>
              <Text style={styles.position}>{index + 1}</Text>
              <Text accessibilityLabel={item.accessibleDescription ?? item.label} style={styles.orderLabel}>{item.label}</Text>
              <Pressable accessibilityLabel={`Move ${item.label} up`} accessibilityRole="button" disabled={disabled || index === 0} onPress={() => updateOrder(moveItem(sequence, index, -1))} style={styles.iconButton}>
                <ArrowUp color="#3157A4" size={20} />
              </Pressable>
              <Pressable accessibilityLabel={`Move ${item.label} down`} accessibilityRole="button" disabled={disabled || index === sequence.length - 1} onPress={() => updateOrder(moveItem(sequence, index, 1))} style={styles.iconButton}>
                <ArrowDown color="#3157A4" size={20} />
              </Pressable>
            </View>
          );
        })}
        <Pressable accessibilityLabel="Reset order" accessibilityRole="button" disabled={disabled} onPress={() => updateOrder(props.items.map(item => item.id))} style={styles.actionButton}>
          <RotateCcw color="#3157A4" size={18} />
          <Text style={styles.actionText}>Reset</Text>
        </Pressable>
      </View>
    );
  }

  const targetLength = patternTargetLength(props);
  return (
    <View accessibilityLabel={props.instruction} style={styles.container}>
      <Text style={styles.instruction}>{props.instruction}</Text>
      <View accessibilityLabel={`Pattern, ${sequence.length} of ${targetLength} places filled`} style={styles.patternSlots}>
        {Array.from({ length: targetLength }, (_, index) => {
          const item = props.items.find(candidate => candidate.id === sequence[index]);
          return (
            <View key={props.groups?.[index]?.id ?? `slot-${index}`} style={[styles.patternSlot, item && styles.patternSlotFilled]}>
              <Text style={styles.patternSlotLabel}>{item?.label ?? props.groups?.[index]?.label ?? `${index + 1}`}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.grid}>
        {props.items.map(item => (
          <Pressable
            key={item.id}
            accessibilityHint="Adds this item to the next pattern place."
            accessibilityLabel={item.accessibleDescription ?? item.label}
            accessibilityRole="button"
            disabled={disabled || sequence.length >= targetLength}
            onPress={() => addPatternItem(item.id)}
            style={styles.card}
          >
            <Text style={styles.cardLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityLabel="Undo last pattern item" accessibilityRole="button" disabled={disabled || sequence.length === 0} onPress={() => updatePattern(sequence.slice(0, -1))} style={styles.actionButton}>
          <Undo2 color="#3157A4" size={18} />
          <Text style={styles.actionText}>Undo</Text>
        </Pressable>
        <Pressable accessibilityLabel="Reset pattern" accessibilityRole="button" disabled={disabled || sequence.length === 0} onPress={() => updatePattern([])} style={styles.actionButton}>
          <RotateCcw color="#3157A4" size={18} />
          <Text style={styles.actionText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, width: '100%' },
  instruction: { color: '#173B5C', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  guidance: { color: '#486581', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  card: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#B8C8DC', borderRadius: 16, borderWidth: 2, minHeight: 64, minWidth: 104, padding: 11 },
  cardSelected: { backgroundColor: '#E0F2FE', borderColor: '#0EA5E9', borderWidth: 3 },
  cardLabel: { color: '#102A43', fontSize: 17, fontWeight: '900', textAlign: 'center' },
  cardMeta: { color: '#486581', fontSize: 12, fontWeight: '700', marginTop: 4 },
  groups: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  group: { alignItems: 'center', backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', borderRadius: 16, borderWidth: 2, minHeight: 62, minWidth: 120, padding: 12 },
  groupReady: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  groupLabel: { color: '#173B5C', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  orderRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: 14, borderWidth: 2, flexDirection: 'row', minHeight: 58, padding: 8 },
  position: { color: '#3157A4', fontSize: 16, fontWeight: '900', textAlign: 'center', width: 30 },
  orderLabel: { color: '#0F172A', flex: 1, fontSize: 17, fontWeight: '800', paddingHorizontal: 8 },
  iconButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  actionButton: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: 42, padding: 8 },
  actionText: { color: '#3157A4', fontSize: 14, fontWeight: '800' },
  patternSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  patternSlot: { alignItems: 'center', backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', minHeight: 54, minWidth: 66, padding: 8 },
  patternSlotFilled: { backgroundColor: '#E0F2FE', borderColor: '#0EA5E9', borderStyle: 'solid' },
  patternSlotLabel: { color: '#173B5C', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
});

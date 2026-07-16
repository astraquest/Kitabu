import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RotateCcw, Undo2 } from 'lucide-react-native';

import type { LearningInteraction } from '../types';
import { SquishPressable } from './SquishPressable';

type BucketAssignments = Record<string, string[]>;

export function serializeSequenceResponse(itemIds: string[]) {
  return `sequence:${itemIds.join('>')}`;
}

export function serializeBucketResponse(assignments: BucketAssignments) {
  return `classify:${Object.keys(assignments)
    .sort()
    .map(bucketId => `${bucketId}=${[...assignments[bucketId]].sort().join(',')}`)
    .join('|')}`;
}

export function serializeChoiceResponse(itemId: string) {
  return `choice:${itemId}`;
}

type LearningInteractionProps = {
  interaction: LearningInteraction;
  disabled?: boolean;
  reduceMotion: boolean;
  onResponseChange: (response: string | null) => void;
};

export function LearningInteractionView({
  interaction,
  disabled = false,
  reduceMotion,
  onResponseChange,
}: LearningInteractionProps) {
  const [sequence, setSequence] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<BucketAssignments>({});
  const [assignmentHistory, setAssignmentHistory] = useState<BucketAssignments[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [choiceId, setChoiceId] = useState<string | null>(null);

  useEffect(() => {
    setSequence([]);
    setAssignments({});
    setAssignmentHistory([]);
    setSelectedItemId(null);
    setChoiceId(null);
    onResponseChange(null);
  }, [interaction, onResponseChange]);

  const assignedItemIds = useMemo(
    () => new Set(Object.values(assignments).flat()),
    [assignments],
  );

  function emitSequence(next: string[]) {
    setSequence(next);
    onResponseChange(
      next.length === interaction.items.length
        ? serializeSequenceResponse(next)
        : null,
    );
  }

  function emitAssignments(next: BucketAssignments) {
    setAssignments(next);
    const itemCount = Object.values(next).reduce(
      (total, itemIds) => total + itemIds.length,
      0,
    );
    onResponseChange(
      itemCount === interaction.items.length ? serializeBucketResponse(next) : null,
    );
  }

  function reset() {
    setAssignmentHistory([]);
    setSelectedItemId(null);
    if (interaction.kind === 'sequence_builder') {
      emitSequence([]);
    } else if (interaction.kind === 'choice_sprint') {
      setChoiceId(null);
      onResponseChange(null);
    } else {
      emitAssignments({});
    }
  }

  if (interaction.kind === 'sequence_builder') {
    const available = interaction.items.filter(item => !sequence.includes(item.id));
    return (
      <View
        accessibilityLabel="Build the sequence interaction"
        style={styles.container}
      >
        <Text style={styles.instruction}>{interaction.instruction}</Text>
        <View accessibilityLabel="Your sequence" style={styles.sequenceTray}>
          {sequence.length === 0 ? (
            <Text style={styles.emptyText}>Tap a block below to begin</Text>
          ) : (
            sequence.map((itemId, index) => {
              const item = interaction.items.find(candidate => candidate.id === itemId);
              return item ? (
                <View
                  accessibilityLabel={`Position ${index + 1}: ${item.label}`}
                  key={item.id}
                  style={styles.placedBlock}
                >
                  <Text style={styles.positionNumber}>{index + 1}</Text>
                  <View style={styles.itemTextWrap}>
                    <Text style={styles.placedLabel}>{item.label}</Text>
                    {item.detail ? <Text style={styles.placedDetail}>{item.detail}</Text> : null}
                  </View>
                </View>
              ) : null;
            })
          )}
        </View>
        <View accessibilityLabel="Available sequence blocks" style={styles.pool}>
          {available.map(item => (
            <SquishPressable
              accessibilityLabel={`Add ${item.label} to position ${sequence.length + 1}`}
              accessibilityRole="button"
              disabled={disabled}
              key={item.id}
              onPress={() => emitSequence([...sequence, item.id])}
              reduceMotion={reduceMotion}
            >
              <View style={styles.poolBlock}>
                <Text style={styles.poolLabel}>{item.label}</Text>
                {item.detail ? <Text style={styles.poolDetail}>{item.detail}</Text> : null}
              </View>
            </SquishPressable>
          ))}
          {available.length === 0 ? (
            <Text accessibilityLiveRegion="polite" style={styles.readyText}>
              Sequence ready to check
            </Text>
          ) : null}
        </View>
        <InteractionActions
          canUndo={sequence.length > 0}
          disabled={disabled}
          onReset={reset}
          onUndo={() => emitSequence(sequence.slice(0, -1))}
        />
      </View>
    );
  }

  if (interaction.kind === 'choice_sprint') {
    return (
      <View accessibilityLabel="Spotlight choice interaction" style={styles.container}>
        <Text style={styles.instruction}>{interaction.instruction}</Text>
        <View accessibilityLabel="Answer cards" style={styles.pool}>
          {interaction.items.map(item => {
            const selected = choiceId === item.id;
            return (
              <SquishPressable
                accessibilityLabel={`Spotlight ${item.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                key={item.id}
                onPress={() => {
                  setChoiceId(item.id);
                  onResponseChange(serializeChoiceResponse(item.id));
                }}
                reduceMotion={reduceMotion}
              >
                <View style={[styles.poolBlock, selected && styles.choiceSelected]}>
                  <Text style={styles.poolLabel}>{item.label}</Text>
                  {item.detail ? <Text style={styles.poolDetail}>{item.detail}</Text> : null}
                  {selected ? <Text style={styles.spotlightLabel}>SPOTLIGHTED</Text> : null}
                </View>
              </SquishPressable>
            );
          })}
        </View>
        {choiceId ? (
          <Text accessibilityLiveRegion="polite" style={styles.readyText}>
            Choice ready to check
          </Text>
        ) : null}
        <InteractionActions
          canUndo={Boolean(choiceId)}
          disabled={disabled}
          onReset={reset}
          onUndo={reset}
        />
      </View>
    );
  }

  const unassignedItems = interaction.items.filter(item => !assignedItemIds.has(item.id));
  function selectAssignedItem(itemId: string) {
    const next = Object.fromEntries(
      Object.entries(assignments).map(([bucketId, ids]) => [
        bucketId,
        ids.filter(id => id !== itemId),
      ]),
    );
    setAssignmentHistory(history => [...history, assignments]);
    emitAssignments(next);
    setSelectedItemId(itemId);
  }

  function placeInBucket(bucketId: string) {
    if (!selectedItemId) {
      return;
    }
    setAssignmentHistory(history => [...history, assignments]);
    emitAssignments({
      ...assignments,
      [bucketId]: [...(assignments[bucketId] ?? []), selectedItemId],
    });
    setSelectedItemId(null);
  }

  return (
    <View accessibilityLabel="Sort into buckets interaction" style={styles.container}>
      <Text style={styles.instruction}>{interaction.instruction}</Text>
      <View accessibilityLabel="Items to sort" style={styles.pool}>
        {unassignedItems.map(item => {
          const selected = selectedItemId === item.id;
          return (
            <SquishPressable
              accessibilityLabel={`Select ${item.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              key={item.id}
              onPress={() => setSelectedItemId(item.id)}
              reduceMotion={reduceMotion}
            >
              <View style={[styles.poolBlock, selected && styles.poolBlockSelected]}>
                <Text style={styles.poolLabel}>{item.label}</Text>
                {item.detail ? <Text style={styles.poolDetail}>{item.detail}</Text> : null}
              </View>
            </SquishPressable>
          );
        })}
        {unassignedItems.length === 0 ? (
          <Text accessibilityLiveRegion="polite" style={styles.readyText}>
            Every item has a home
          </Text>
        ) : null}
      </View>
      {selectedItemId ? (
        <Text accessibilityLiveRegion="polite" style={styles.selectionHint}>
          Now choose a bucket
        </Text>
      ) : null}
      <View style={styles.bucketRow}>
        {interaction.buckets.map(bucket => {
          const bucketItems = (assignments[bucket.id] ?? [])
            .map(id => interaction.items.find(item => item.id === id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
          return (
            <View
              key={bucket.id}
              style={[styles.bucket, selectedItemId && styles.bucketReady]}
            >
              <Text style={styles.bucketLabel}>{bucket.label}</Text>
              <Pressable
                accessibilityLabel={`Place selected item in ${bucket.label}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: disabled || !selectedItemId }}
                disabled={disabled || !selectedItemId}
                onPress={() => placeInBucket(bucket.id)}
                style={styles.bucketDropTarget}
              >
                <Text style={styles.bucketEmpty}>
                  {selectedItemId ? 'Place here' : 'Choose an item first'}
                </Text>
              </Pressable>
              {bucketItems.length === 0 ? (
                <Text style={styles.bucketEmpty}>Drop choices here</Text>
              ) : (
                bucketItems.map(item => (
                  <Pressable
                    accessibilityLabel={`Move ${item.label} from ${bucket.label}`}
                    accessibilityRole="button"
                    disabled={disabled}
                    key={item.id}
                    onPress={() => selectAssignedItem(item.id)}
                    style={styles.bucketItem}
                  >
                    <Text style={styles.bucketItemText}>{item.label}</Text>
                  </Pressable>
                ))
              )}
            </View>
          );
        })}
      </View>
      <InteractionActions
        canUndo={assignmentHistory.length > 0}
        disabled={disabled}
        onReset={reset}
        onUndo={() => {
          const previous = assignmentHistory.at(-1);
          if (!previous) return;
          setAssignmentHistory(history => history.slice(0, -1));
          setSelectedItemId(null);
          emitAssignments(previous);
        }}
      />
    </View>
  );
}

function InteractionActions({
  canUndo,
  disabled,
  onReset,
  onUndo,
}: {
  canUndo: boolean;
  disabled: boolean;
  onReset: () => void;
  onUndo: () => void;
}) {
  return (
    <View style={styles.actions}>
      <Pressable
        accessibilityLabel="Undo last move"
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || !canUndo }}
        disabled={disabled || !canUndo}
        onPress={onUndo}
        style={[styles.actionButton, !canUndo && styles.actionDisabled]}
      >
        <Undo2 color="#334155" size={16} />
        <Text style={styles.actionText}>Undo</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Reset interaction"
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || !canUndo }}
        disabled={disabled || !canUndo}
        onPress={onReset}
        style={[styles.actionButton, !canUndo && styles.actionDisabled]}
      >
        <RotateCcw color="#334155" size={16} />
        <Text style={styles.actionText}>Reset</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  actionDisabled: { opacity: 0.42 },
  actionText: { color: '#334155', fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 9, justifyContent: 'flex-end' },
  bucket: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flex: 1,
    gap: 7,
    minHeight: 128,
    padding: 10,
  },
  bucketEmpty: { color: '#94A3B8', fontSize: 11, textAlign: 'center' },
  bucketDropTarget: {
    alignItems: 'center',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
  },
  bucketItem: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8 },
  bucketItemText: { color: '#1E293B', fontSize: 12, fontWeight: '800' },
  bucketLabel: { color: '#0F766E', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  bucketReady: { backgroundColor: '#F0FDFA', borderColor: '#2DD4BF' },
  bucketRow: { flexDirection: 'row', gap: 10 },
  container: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DCE6E4',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 13,
  },
  choiceSelected: {
    backgroundColor: '#FFF7D6',
    borderColor: '#F2B84B',
    shadowColor: '#D69316',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  instruction: { color: '#334155', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  itemTextWrap: { flex: 1 },
  placedBlock: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#93C5FD',
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 9,
  },
  placedDetail: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 1 },
  placedLabel: { color: '#1E3A8A', fontSize: 13, fontWeight: '900' },
  pool: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  poolBlock: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 13,
    borderWidth: 1.5,
    minHeight: 48,
    minWidth: 92,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  poolBlockSelected: { backgroundColor: '#EFF6FF', borderColor: '#4F7CE8' },
  poolDetail: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 2 },
  poolLabel: { color: '#1E293B', fontSize: 13, fontWeight: '900' },
  positionNumber: {
    backgroundColor: '#4F7CE8',
    borderRadius: 999,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  readyText: { color: '#0F766E', fontSize: 12, fontWeight: '900', padding: 8 },
  selectionHint: { color: '#1D4ED8', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  spotlightLabel: { color: '#9A6500', fontSize: 9, fontWeight: '900', marginTop: 4 },
  sequenceTray: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
    minHeight: 64,
    padding: 10,
  },
});

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react-native';

import { isCompleteRankedList, moveRankedListItem, serializeRankedListResponse } from './engine';
import type { RankedListSceneProps } from './types';

type Props = {
  sceneId: string;
  props: RankedListSceneProps;
  disabled?: boolean;
  restoredOrder?: string[];
  onOrderChange?: (order: string[]) => void;
  onResponseChange: (response: string | null) => void;
};

export function RankedListView({ sceneId, props, disabled = false, restoredOrder, onOrderChange, onResponseChange }: Props) {
  const restoredOrderKey = restoredOrder?.join('>') ?? '';
  const propsRef = useRef(props);
  const onResponseChangeRef = useRef(onResponseChange);
  propsRef.current = props;
  onResponseChangeRef.current = onResponseChange;
  const initial = restoredOrder?.length === props.items.length
    ? restoredOrder
    : props.items.map(item => item.id);
  const [order, setOrder] = useState(initial);

  useEffect(() => {
    const currentProps = propsRef.current;
    const restored = restoredOrderKey ? restoredOrderKey.split('>') : undefined;
    const next = restored?.length === currentProps.items.length
      ? restored
      : currentProps.items.map(item => item.id);
    setOrder(next);
    onResponseChangeRef.current(isCompleteRankedList(next, currentProps) ? serializeRankedListResponse(next) : null);
  }, [sceneId, restoredOrderKey]);

  function update(next: string[]) {
    setOrder(next);
    onOrderChange?.(next);
    onResponseChange(isCompleteRankedList(next, props) ? serializeRankedListResponse(next) : null);
  }

  return (
    <View accessibilityLabel="Arrange items in order" style={styles.container}>
      {order.map((id, index) => {
        const item = props.items.find(candidate => candidate.id === id);
        if (!item) return null;
        return (
          <View key={id} style={styles.row}>
            {props.layout.showPositionNumbers ? <Text style={styles.position}>{index + 1}</Text> : null}
            <Text accessibilityLabel={item.accessibleDescription} style={styles.label}>{item.label}</Text>
            <Pressable accessibilityLabel={`Move ${item.label} up`} accessibilityRole="button" disabled={disabled || index === 0} onPress={() => update(moveRankedListItem(order, index, -1))} style={styles.move}>
              <ArrowUp color="#3157A4" size={20} />
            </Pressable>
            <Pressable accessibilityLabel={`Move ${item.label} down`} accessibilityRole="button" disabled={disabled || index === order.length - 1} onPress={() => update(moveRankedListItem(order, index, 1))} style={styles.move}>
              <ArrowDown color="#3157A4" size={20} />
            </Pressable>
          </View>
        );
      })}
      <Pressable accessibilityLabel="Reset order" accessibilityRole="button" disabled={disabled} onPress={() => update(props.items.map(item => item.id))} style={styles.reset}>
        <RotateCcw color="#3157A4" size={18} />
        <Text style={styles.resetText}>Reset</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, width: '100%' },
  row: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: 14, borderWidth: 2, flexDirection: 'row', minHeight: 58, padding: 8 },
  position: { color: '#3157A4', fontSize: 16, fontWeight: '900', textAlign: 'center', width: 30 },
  label: { color: '#0F172A', flex: 1, fontSize: 17, fontWeight: '800', paddingHorizontal: 8 },
  move: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  reset: { alignItems: 'center', alignSelf: 'flex-end', flexDirection: 'row', gap: 7, padding: 8 },
  resetText: { color: '#3157A4', fontSize: 14, fontWeight: '800' },
});

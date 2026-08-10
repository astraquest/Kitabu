import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { GenericSampleSceneProps } from './types';

type Props = {
  props: GenericSampleSceneProps;
  value: string;
  onResponseChange: (value: string | null) => void;
  disabled?: boolean;
};

function HintCard({ kind, hint }: { kind: 'Canvas' | 'Model' | 'Map'; hint: { label: string; description?: string } }) {
  return (
    <View accessibilityLabel={`${kind} preview unavailable`} style={styles.hintCard}>
      <Text style={styles.hintTitle}>{hint.label}</Text>
      <Text style={styles.hintBody}>{hint.description ?? `${kind} presentation is not available in this preview.`}</Text>
      <Text style={styles.hintFallback}>Text fallback shown</Text>
    </View>
  );
}

export function GenericSampleView({ props, value, onResponseChange, disabled = false }: Props) {
  const [draft, setDraft] = useState(value);
  const options = props.options ?? props.items ?? [];
  const submitEvent = props.events?.some(event => event.type === 'submit') === true;

  function updateText(next: string) {
    setDraft(next);
    onResponseChange(next.trim() ? next : null);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} accessibilityLabel={props.title}>
      <Text style={styles.title}>{props.title}</Text>
      <Text style={styles.instructions}>{props.instructions}</Text>
      {props.body ? <Text style={styles.body}>{props.body}</Text> : null}

      {props.steps?.length ? (
        <View style={styles.section} accessibilityLabel="Steps">
          {props.steps.map((step, index) => (
            <View key={`${index}-${step}`} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {props.list?.length ? (
        <View style={styles.section} accessibilityLabel="List">
          {props.list.map((item, index) => <Text key={`${index}-${item}`} style={styles.listItem}>• {item}</Text>)}
        </View>
      ) : null}

      {props.table ? (
        <View style={styles.table} accessibilityLabel="Table">
          <View style={styles.tableRow}>
            {props.table.columns.map(column => <Text key={column} style={[styles.cell, styles.headerCell]}>{column}</Text>)}
          </View>
          {props.table.rows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.tableRow}>
              {row.map((cell, cellIndex) => <Text key={`cell-${rowIndex}-${cellIndex}`} style={styles.cell}>{cell}</Text>)}
            </View>
          ))}
        </View>
      ) : null}

      {props.presentation?.canvas ? <HintCard kind="Canvas" hint={props.presentation.canvas} /> : null}
      {props.presentation?.model ? <HintCard kind="Model" hint={props.presentation.model} /> : null}
      {props.presentation?.map ? <HintCard kind="Map" hint={props.presentation.map} /> : null}

      {props.inputKind === 'choice' ? (
        <View style={styles.section} accessibilityLabel="Choices">
          {options.map(option => (
            <Pressable
              key={option.id}
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: value === option.id, disabled }}
              disabled={disabled}
              onPress={() => onResponseChange(option.id)}
              style={[styles.option, value === option.id && styles.optionSelected]}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              {option.description ? <Text style={styles.optionDescription}>{option.description}</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {props.inputKind === 'text' || props.inputKind === 'numeric' ? (
        <View style={styles.section}>
          <Text style={styles.inputLabel}>{props.inputLabel ?? 'Your response'}</Text>
          <TextInput
            accessibilityLabel={props.inputLabel ?? 'Your response'}
            editable={!disabled}
            keyboardType={props.inputKind === 'numeric' ? 'numeric' : 'default'}
            maxLength={props.inputMaxLength}
            onChangeText={updateText}
            placeholder={props.inputPlaceholder}
            style={styles.input}
            value={draft}
          />
          {submitEvent ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: disabled || draft.trim().length === 0 }}
              disabled={disabled || draft.trim().length === 0}
              onPress={() => onResponseChange(draft.trim() || null)}
              style={styles.submitButton}>
              <Text style={styles.submitText}>Continue</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { color: '#334E68', fontSize: 15, lineHeight: 22 },
  cell: { borderColor: '#CBD5E1', borderWidth: 1, color: '#102A43', flex: 1, fontSize: 13, padding: 8 },
  container: { gap: 12, padding: 4, width: '100%' },
  headerCell: { backgroundColor: '#E2E8F0', fontWeight: '800' },
  hintBody: { color: '#475569', fontSize: 13, lineHeight: 18, marginTop: 4 },
  hintCard: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: 14, borderWidth: 1, padding: 12 },
  hintFallback: { color: '#64748B', fontSize: 12, fontWeight: '800', marginTop: 8 },
  hintTitle: { color: '#173B5C', fontSize: 15, fontWeight: '800' },
  input: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: 12, borderWidth: 2, color: '#0F172A', fontSize: 17, minHeight: 52, paddingHorizontal: 14 },
  inputLabel: { color: '#173B5C', fontSize: 14, fontWeight: '800' },
  instructions: { color: '#173B5C', fontSize: 17, fontWeight: '800', lineHeight: 23 },
  listItem: { color: '#334E68', fontSize: 15, lineHeight: 22 },
  option: { backgroundColor: '#FFFFFF', borderColor: '#B8C8DC', borderRadius: 14, borderWidth: 2, padding: 13 },
  optionDescription: { color: '#486581', fontSize: 13, marginTop: 4 },
  optionLabel: { color: '#102A43', fontSize: 16, fontWeight: '800' },
  optionSelected: { backgroundColor: '#E0F2FE', borderColor: '#0EA5E9' },
  section: { gap: 9 },
  stepNumber: { alignItems: 'center', backgroundColor: '#DBEAFE', borderRadius: 16, color: '#1D4ED8', fontWeight: '900', height: 30, paddingTop: 6, textAlign: 'center', width: 30 },
  stepRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  stepText: { color: '#334E68', flex: 1, fontSize: 15, lineHeight: 22, paddingTop: 3 },
  submitButton: { alignItems: 'center', backgroundColor: '#4F7CE8', borderRadius: 12, minHeight: 48, justifyContent: 'center', marginTop: 4 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  table: { borderColor: '#CBD5E1', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  title: { color: '#102A43', fontSize: 22, fontWeight: '900' },
});

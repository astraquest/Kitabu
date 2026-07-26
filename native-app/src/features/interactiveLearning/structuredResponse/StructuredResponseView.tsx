import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { ArrowRight } from 'lucide-react-native';

import type { StructuredResponseSceneProps } from './types';

export type StructuredResponseViewProps = StructuredResponseSceneProps & {
  value: string;
  onResponseChange: (value: string | null) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  submitLabel?: string;
  errorMessage?: string | null;
};

export function StructuredResponseView({
  mode,
  input,
  accessibility,
  value,
  onResponseChange,
  onSubmit,
  disabled = false,
  submitLabel = 'Check answer',
  errorMessage,
}: StructuredResponseViewProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isMultiline = mode === 'short-text' && input?.allowMultiline === true;
  const maxLength = input?.maxLength;
  const canSubmit = !disabled && value.trim().length > 0;
  const keyboardType: TextInputProps['keyboardType'] =
    mode === 'numeric' ? 'decimal-pad' : 'default';

  return (
    <View style={styles.container}>
      {accessibility.responseFormatHint ? (
        <Text style={styles.hint}>
          {accessibility.responseFormatHint.default}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputShell,
          isMultiline && styles.inputShellMultiline,
          isFocused && styles.inputShellFocused,
          Boolean(errorMessage) && styles.inputShellError,
          disabled && styles.inputShellDisabled,
        ]}>
        <TextInput
          accessibilityLabel={accessibility.inputLabel.default}
          accessibilityHint={accessibility.spokenPrompt?.default}
          editable={!disabled}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={isMultiline}
          onBlur={() => setIsFocused(false)}
          onChangeText={text => onResponseChange(text || null)}
          onFocus={() => setIsFocused(true)}
          onSubmitEditing={isMultiline || !canSubmit ? undefined : onSubmit}
          placeholder={input?.placeholder?.default}
          placeholderTextColor="#94A3B8"
          returnKeyType={onSubmit ? 'done' : 'default'}
          style={[styles.input, isMultiline && styles.inputMultiline]}
          textAlignVertical={isMultiline ? 'top' : 'center'}
          value={value}
        />
      </View>

      <View style={styles.metaRow}>
        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            {errorMessage}
          </Text>
        ) : (
          <View />
        )}
        {maxLength ? (
          <Text
            accessibilityLabel={`${value.length} of ${maxLength} characters used`}
            style={styles.characterCount}>
            {value.length}/{maxLength}
          </Text>
        ) : null}
      </View>

      {onSubmit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.submitButton,
            !canSubmit && styles.submitButtonDisabled,
            pressed && canSubmit && styles.submitButtonPressed,
          ]}>
          <Text style={styles.submitButtonText}>{submitLabel}</Text>
          <ArrowRight color="#FFFFFF" size={19} strokeWidth={3} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  characterCount: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  container: {
    gap: 8,
    width: '100%',
  },
  errorText: {
    color: '#B91C1C',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  hint: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  input: {
    color: '#0F172A',
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 120,
  },
  inputShell: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    borderWidth: 2,
    minHeight: 58,
    overflow: 'hidden',
  },
  inputShellDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.75,
  },
  inputShellError: {
    borderColor: '#EF4444',
  },
  inputShellFocused: {
    borderColor: '#4F7CE8',
  },
  inputShellMultiline: {
    minHeight: 124,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 18,
    paddingHorizontal: 2,
  },
  submitButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#4F7CE8',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 54,
    paddingHorizontal: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});

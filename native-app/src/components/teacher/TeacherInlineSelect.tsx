import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

interface TeacherInlineSelectProps {
  styles: Record<string, any>;
  label: string;
  value: string;
  options: string[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}

export function TeacherInlineSelect({
  styles,
  label,
  value,
  options,
  open,
  onToggle,
  onSelect,
}: TeacherInlineSelectProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.selectWrap}>
        <Pressable onPress={onToggle} style={styles.selectField}>
          <Text style={styles.selectFieldText}>{value}</Text>
          <ChevronDown size={16} color="#6B7280" />
        </Pressable>
        {open ? (
          <View style={styles.selectMenu}>
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={styles.selectMenuScroll}>
              {options.map(option => (
                <Pressable
                  key={option}
                  onPress={() => onSelect(option)}
                  style={[styles.menuItem, value === option && styles.menuItemActive]}>
                  <Text style={[styles.menuText, value === option && styles.menuTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

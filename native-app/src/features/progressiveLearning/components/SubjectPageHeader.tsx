import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Sparkles } from 'lucide-react-native';

import { getSubjectIconSource } from '../model/subjectIconAssets';

interface SubjectPageHeaderProps {
  backAccessibilityLabel: string;
  grade: string;
  onBack: () => void;
  subjectName: string;
}

export function SubjectPageHeader({
  backAccessibilityLabel,
  grade,
  onBack,
  subjectName,
}: SubjectPageHeaderProps) {
  return (
    <View
      accessibilityLabel={`${subjectName} subject header`}
      style={styles.header}
      testID="subject-page-header"
    >
      <Pressable
        accessibilityLabel={backAccessibilityLabel}
        onPress={onBack}
        style={styles.backButton}
      >
        <ArrowLeft color="#0B1F4D" size={24} strokeWidth={2.5} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.eyebrow}>{grade.toUpperCase()}</Text>
        <Text style={styles.subjectTitle}>{subjectName}</Text>
      </View>
      <LinearGradient
        colors={['#EEF5FF', '#FFFFFF']}
        style={styles.subjectBadge}
      >
        <SubjectBadgeIcon subjectName={subjectName} />
      </LinearGradient>
    </View>
  );
}

function SubjectBadgeIcon({ subjectName }: { subjectName: string }) {
  const source = getSubjectIconSource(subjectName);
  if (!source) {
    return <Sparkles color="#15803D" size={23} strokeWidth={2.4} />;
  }
  if (Platform.OS === 'web') {
    return React.createElement('img', {
      alt: `${subjectName} subject icon`,
      draggable: false,
      src: Asset.fromModule(source as number).uri,
      style: {
        height: 45,
        objectFit: 'contain',
        pointerEvents: 'none',
        width: 45,
      },
    });
  }
  return (
    <Image
      accessibilityLabel={`${subjectName} subject icon`}
      resizeMode="contain"
      source={source}
      style={styles.subjectBadgeImage}
    />
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E8F1',
    borderRadius: 15,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    width: 42,
  },
  eyebrow: {
    color: '#0EA56B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#F9FBFD',
    flexDirection: 'row',
    gap: 11,
    paddingBottom: 9,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerText: { alignItems: 'center', flex: 1 },
  subjectBadge: {
    alignItems: 'center',
    borderColor: '#D7E5FA',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    width: 44,
  },
  subjectBadgeImage: { height: 45, width: 45 },
  subjectTitle: {
    color: '#0B1F4D',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
});

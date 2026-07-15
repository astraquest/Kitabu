import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CheckCircle, ChevronLeft, ChevronRight, X } from 'lucide-react-native';

import { SubStrand } from '../types/app';

interface LetsLearnContentScreenProps {
  subStrand: SubStrand;
  onClose: () => void;
  onStartQuiz: (subStrandId: string) => void;
}

const FALLBACK_PAGE = {
  title: 'Overview',
  content: 'Content for this topic is currently being updated by your teacher.',
};

/**
 * Legacy lesson reader for curriculum nodes that do not yet have a progressive
 * lesson definition. New curriculum navigation belongs in SubjectLearningPathScreen.
 */
export function LetsLearnContentScreen({
  subStrand,
  onClose,
  onStartQuiz,
}: LetsLearnContentScreenProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const pages = subStrand.pages.length > 0 ? subStrand.pages : [FALLBACK_PAGE];
  const totalPages = pages.length;
  const page = pages[currentPage] || FALLBACK_PAGE;

  useEffect(() => {
    setCurrentPage(0);
  }, [subStrand.id]);

  const lines = useMemo(() => {
    return page.content
      .replace(/<\/(h3|p|ul)>/gi, '\n')
      .replace(/<li>/gi, '\u2022 ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }, [page.content]);

  const progress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
  const isLastPage = currentPage === totalPages - 1;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}>
          <X color="#6B7280" size={24} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>Learning</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {subStrand.title}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.pageBadge}>
          Page {currentPage + 1} of {totalPages}
        </Text>

        <Text style={styles.pageTitle}>{page.title}</Text>

        <View style={styles.copyWrap}>
          {lines.map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.copyLine}>
              {line}
            </Text>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {currentPage > 0 ? (
          <Pressable
            onPress={() => setCurrentPage(value => value - 1)}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}>
            <ChevronLeft color="#4B5563" size={24} strokeWidth={2.4} />
          </Pressable>
        ) : (
          <View style={styles.footerGap} />
        )}

        <Pressable
          onPress={() =>
            isLastPage
              ? onStartQuiz(subStrand.id)
              : setCurrentPage(value => value + 1)
          }
          style={({ pressed }) => [
            styles.primaryButton,
            isLastPage && styles.completeButton,
            pressed && styles.buttonPressed,
          ]}>
          <View style={styles.primaryInline}>
            <Text style={styles.primaryText}>
              {isLastPage ? 'Finish & Quiz' : 'Next'}
            </Text>
            {isLastPage ? (
              <CheckCircle color="#FFFFFF" size={22} strokeWidth={2.4} />
            ) : (
              <ChevronRight color="#FFFFFF" size={22} strokeWidth={2.6} />
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerSpacer: {
    width: 32,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerEyebrow: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    maxWidth: 180,
  },
  progressTrack: {
    backgroundColor: '#F3F4F6',
    height: 6,
  },
  progressBar: {
    backgroundColor: '#2563EB',
    height: '100%',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
  },
  pageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 16,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageTitle: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: 20,
  },
  copyWrap: {
    gap: 14,
  },
  copyLine: {
    color: '#4B5563',
    fontSize: 18,
    lineHeight: 30,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderTopColor: '#F3F4F6',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  footerGap: {
    width: 56,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
  },
  completeButton: {
    backgroundColor: '#22C55E',
  },
  primaryInline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
});

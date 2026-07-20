import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Brain,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

import { Flashcard } from '../types/app';

interface BrainTeaseScreenProps {
  cards: Flashcard[];
  onClose: () => void;
  onComplete: () => void;
  subjectName?: string;
}

export function BrainTeaseScreen({
  cards,
  onClose,
  onComplete,
}: BrainTeaseScreenProps) {
  const flashcards = cards;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setCurrentIndex(0);
    setRevealedCards({});
  }, [cards]);

  const currentCard = flashcards[currentIndex];
  const isRevealed = !!revealedCards[currentIndex];
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  function handleReveal() {
    setRevealedCards(prev => ({
      ...prev,
      [currentIndex]: true,
    }));
  }

  function handleNext() {
    if (currentIndex === flashcards.length - 1) {
      onComplete();
      return;
    }

    setCurrentIndex(prev => prev + 1);
  }

  function handlePrevious() {
    if (currentIndex === 0) {
      return;
    }

    setCurrentIndex(prev => prev - 1);
  }

  if (flashcards.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.headerButton}>
              <ArrowLeft color="#4B5563" size={24} strokeWidth={2.4} />
            </Pressable>
            <View style={styles.headerCenter}>
              <View style={styles.logoBadge}>
                <Brain color="#FFFFFF" size={18} strokeWidth={2.4} />
              </View>
              <Text style={styles.headerTitle}>Brain Tease</Text>
            </View>
            <View style={styles.progressCounter} />
          </View>

          <View style={styles.emptyState}>
            <BookOpen color="#9CA3AF" size={42} strokeWidth={2} />
            <Text style={styles.emptyTitle}>No flashcards yet</Text>
            <Text style={styles.emptyBody}>
              Generate a Brain Tease set or publish learning content first.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <ArrowLeft color="#4B5563" size={24} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={styles.logoBadge}>
              <Brain color="#FFFFFF" size={18} strokeWidth={2.4} />
            </View>
            <Text style={styles.headerTitle}>Brain Tease</Text>
          </View>

          <View style={styles.progressCounter}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>
              {currentIndex}/{flashcards.length}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.mainArea}>
          <View style={styles.cardWrap}>
            <View style={[styles.flashCard, isRevealed && styles.flashCardAnswer]}>
              <Text style={[styles.cardText, isRevealed && styles.cardTextAnswer]}>
                {isRevealed ? currentCard.answer : currentCard.question}
              </Text>
            </View>

            <Text style={styles.cardCounterText}>
              {currentIndex + 1} of {flashcards.length}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            disabled={currentIndex === 0}
            onPress={handlePrevious}
            style={[styles.sideAction, currentIndex === 0 && styles.sideActionDisabled]}>
            <ChevronLeft color="#4B5563" size={22} strokeWidth={2.6} />
            <Text style={styles.sideActionText}>Previous</Text>
          </Pressable>

          <Pressable
            onPress={isRevealed ? handleNext : handleReveal}
            style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>
              {isRevealed
                ? currentIndex === flashcards.length - 1
                  ? 'Finish'
                  : 'Next'
                : 'Reveal Answer'}
            </Text>
          </Pressable>

          <Pressable
            disabled={!isRevealed}
            onPress={handleNext}
            style={[styles.sideAction, !isRevealed && styles.sideActionDisabled]}>
            <Text style={styles.sideActionText}>Next</Text>
            <ChevronRight color="#4B5563" size={22} strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={styles.dotRow}>
          {flashcards.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E8E8EA',
    padding: 16,
  },
  shell: {
    flex: 1,
    backgroundColor: '#F7F7F8',
    borderRadius: 34,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#8B3DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
  },
  progressCounter: {
    alignItems: 'flex-end',
    minWidth: 74,
  },
  progressLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  progressValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    marginHorizontal: 22,
    marginBottom: 18,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D1D5DB',
  },
  mainArea: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    justifyContent: 'flex-end',
  },
  cardWrap: {
    alignItems: 'center',
    gap: 20,
  },
  flashCard: {
    width: '100%',
    minHeight: 360,
    borderRadius: 36,
    backgroundColor: '#F98A2E',
    borderWidth: 2,
    borderColor: '#DB6E1B',
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  flashCardAnswer: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1D4ED8',
  },
  cardText: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 40,
    fontWeight: '800',
    textAlign: 'center',
  },
  cardTextAnswer: {
    fontSize: 22,
    lineHeight: 34,
    fontWeight: '700',
  },
  cardCounterText: {
    color: '#6B7280',
    fontSize: 18,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sideAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 88,
  },
  sideActionDisabled: {
    opacity: 0.35,
  },
  sideActionText: {
    color: '#3F3F46',
    fontSize: 16,
    fontWeight: '500',
  },
  primaryAction: {
    minWidth: 170,
    minHeight: 62,
    borderRadius: 28,
    backgroundColor: '#16213E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 18,
    paddingBottom: 22,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#D4D4D8',
  },
  dotActive: {
    width: 36,
    backgroundColor: '#F97316',
  },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BookOpen,
  Moon,
  Settings,
  Sun,
  Type,
  Volume2,
  VolumeX,
} from 'lucide-react-native';

import { speechPlaybackBridge } from '../services/nativeBridges';
import { Book } from '../types/app';

interface BookReaderScreenProps {
  book: Book;
  initialPage: number;
  isSpotlightMode: boolean;
  isMuted: boolean;
  onClose: () => void;
  onToggleMute: () => void;
  onUpdateProgress: (page: number) => void;
}

type ThemeMode = 'light' | 'sepia' | 'dark';
type FontSize = 'sm' | 'base' | 'lg' | 'xl';

const TOTAL_PAGES = 142;
const MIN_SWIPE_DISTANCE = 50;

export function BookReaderScreen({
  book,
  initialPage,
  isSpotlightMode,
  isMuted,
  onClose,
  onToggleMute,
  onUpdateProgress,
}: BookReaderScreenProps) {
  const [page, setPage] = useState(initialPage);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [showSettings, setShowSettings] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const totalPages = Math.max(1, book.pages?.length || TOTAL_PAGES);

  useEffect(() => {
    setTheme(isSpotlightMode ? 'dark' : 'light');
  }, [isSpotlightMode]);

  useEffect(() => {
    setPage(Math.min(initialPage, totalPages));
    setShowSettings(false);
  }, [book.id, initialPage, totalPages]);

  useEffect(() => {
    onUpdateProgress(page);
  }, [onUpdateProgress, page]);

  useEffect(() => {
    return () => {
      speechPlaybackBridge.stop().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const data = getPageData(book, page);

    if (!isMuted && page > 1) {
      speechPlaybackBridge.stop().catch(() => undefined);
      speechPlaybackBridge.speak(data.paragraphs[0]).catch(() => undefined);
      return undefined;
    }

    speechPlaybackBridge.stop().catch(() => undefined);
    return undefined;
  }, [book, isMuted, page]);

  const content = useMemo(() => getPageData(book, page), [book, page]);

  function goNext() {
    setPage(current => Math.min(totalPages, current + 1));
  }

  function goPrev() {
    setPage(current => Math.max(1, current - 1));
  }

  function onTouchStartCapture(x: number) {
    setTouchEnd(null);
    setTouchStart(x);
  }

  function onTouchMoveCapture(x: number) {
    setTouchEnd(x);
  }

  function onTouchEndCapture() {
    if (touchStart === null || touchEnd === null) {
      return;
    }

    const distance = touchStart - touchEnd;
    if (distance > MIN_SWIPE_DISTANCE && page < totalPages) {
      goNext();
    }
    if (distance < -MIN_SWIPE_DISTANCE && page > 1) {
      goPrev();
    }
  }

  return (
    <View style={[styles.container, themeStyles[theme].container]}>
      <View
        style={[
          styles.header,
          theme === 'dark' ? styles.headerDarkBorder : styles.headerLightBorder,
        ]}>
        <Pressable onPress={onClose} style={styles.headerAction}>
          <ArrowLeft size={24} color={theme === 'dark' ? '#E5E7EB' : '#111827'} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, themeStyles[theme].text]}>
            {book.title}
          </Text>
          <Text style={styles.headerMeta}>
            Page {page} of {totalPages}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable onPress={onToggleMute} style={styles.headerAction}>
            {isMuted ? (
              <VolumeX size={20} color={theme === 'dark' ? '#E5E7EB' : '#111827'} />
            ) : (
              <Volume2 size={20} color={theme === 'dark' ? '#E5E7EB' : '#111827'} />
            )}
          </Pressable>

          <Pressable
            onPress={() => setShowSettings(current => !current)}
            style={[styles.headerAction, showSettings && styles.headerActionActive]}>
            <Settings size={20} color={theme === 'dark' ? '#E5E7EB' : '#111827'} />
          </Pressable>
        </View>
      </View>

      {showSettings ? (
        <View
          style={[
            styles.settingsPanel,
            theme === 'dark' ? styles.settingsPanelDark : styles.settingsPanelLight,
          ]}>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Theme</Text>
            <View style={styles.settingsGroup}>
              <Pressable
                onPress={() => setTheme('light')}
                style={[
                  styles.settingsIconButton,
                  theme === 'light' && styles.settingsIconButtonActive,
                ]}>
                <Sun size={16} color="#111827" />
              </Pressable>
              <Pressable
                onPress={() => setTheme('sepia')}
                style={[
                  styles.settingsIconButton,
                  theme === 'sepia' && styles.settingsIconButtonSepia,
                ]}>
                <BookOpen size={16} color="#5B4636" />
              </Pressable>
              <Pressable
                onPress={() => setTheme('dark')}
                style={[
                  styles.settingsIconButton,
                  theme === 'dark' && styles.settingsIconButtonDark,
                ]}>
                <Moon size={16} color={theme === 'dark' ? '#FFFFFF' : '#111827'} />
              </Pressable>
            </View>
          </View>

          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Size</Text>
            <View style={styles.settingsGroup}>
              {(['sm', 'base', 'lg', 'xl'] as FontSize[]).map(size => (
                <Pressable
                  key={size}
                  onPress={() => setFontSize(size)}
                  style={[
                    styles.typeButton,
                    fontSize === size && styles.typeButtonActive,
                  ]}>
                  <Type
                    size={typeIconSizes[size]}
                    color={fontSize === size ? '#111827' : '#475569'}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.contentArea}
        showsVerticalScrollIndicator={false}
        onTouchStart={event => onTouchStartCapture(event.nativeEvent.pageX)}
        onTouchMove={event => onTouchMoveCapture(event.nativeEvent.pageX)}
        onTouchEnd={onTouchEndCapture}>
        <View style={styles.contentInner}>
          {content.title ? (
            <Text style={[styles.pageHeading, themeStyles[theme].text]}>
              {content.title}
            </Text>
          ) : null}

          {content.paragraphs.map((paragraph, index) => (
            <Text
              key={`${page}-${index}`}
              style={[
                styles.paragraph,
                themeStyles[theme].text,
                fontSizeStyles[fontSize],
              ]}>
              {'      '}
              {paragraph}
            </Text>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          theme === 'dark' ? styles.headerDarkBorder : styles.headerLightBorder,
        ]}>
        <Pressable
          disabled={page <= 1}
          onPress={goPrev}
          style={[styles.footerButton, page <= 1 && styles.disabled]}>
          <Text style={styles.footerButtonText}>Prev</Text>
        </Pressable>
        <Text style={styles.footerMeta}>
          {Math.round((page / totalPages) * 100)}% Completed
        </Text>
        <Pressable
          disabled={page >= totalPages}
          onPress={goNext}
          style={[styles.footerButton, page >= totalPages && styles.disabled]}>
          <Text style={styles.footerButtonText}>Next</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getPageData(book: Book, pageNum: number) {
  const storedPage = book.pages?.[Math.max(0, pageNum - 1)];
  if (storedPage) {
    return {
      title: storedPage.title,
      paragraphs: storedPage.content
        .split(/\n{2,}|\r?\n/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean),
    };
  }

  if (pageNum === 1) {
    return {
      title: 'Table of Contents',
      paragraphs: [
        'Chapter 1: The Beginning',
        'Chapter 2: The Middle',
        'Chapter 3: The End',
        'About the Author',
      ],
    };
  }

  const texts = [
    'It was a bright cold day in April, and the clocks were striking thirteen.',
    'Call me Ishmael. Some years ago-never mind how long precisely-having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.',
    'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
    'Happy families are all alike; every unhappy family is unhappy in its own way.',
    'In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, but a hobbit-hole, and that means comfort.',
    'All children, except one, grow up. They soon know that they will grow up, and the way Wendy knew was this.',
    'The man in black fled across the desert, and the gunslinger followed.',
    'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
  ];

  const seed = pageNum % texts.length;
  let mainText = texts[seed];

  return {
    paragraphs: [
      mainText,
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    ],
  };
}

const themeStyles = {
  light: StyleSheet.create({
    container: { backgroundColor: '#FFFFFF' },
    text: { color: '#111827' },
  }),
  sepia: StyleSheet.create({
    container: { backgroundColor: '#F4ECD8' },
    text: { color: '#5B4636' },
  }),
  dark: StyleSheet.create({
    container: { backgroundColor: '#111827' },
    text: { color: '#D1D5DB' },
  }),
};

const fontSizeStyles = StyleSheet.create({
  sm: { fontSize: 14, lineHeight: 24 },
  base: { fontSize: 16, lineHeight: 28 },
  lg: { fontSize: 18, lineHeight: 31 },
  xl: { fontSize: 21, lineHeight: 35 },
});

const typeIconSizes: Record<FontSize, number> = {
  sm: 12,
  base: 16,
  lg: 20,
  xl: 24,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLightBorder: {
    borderBottomWidth: 1,
    borderColor: 'rgba(229,231,235,0.7)',
  },
  headerDarkBorder: {
    borderBottomWidth: 1,
    borderColor: '#1F2937',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionActive: {
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    opacity: 0.72,
    maxWidth: 170,
  },
  headerMeta: {
    marginTop: 2,
    fontSize: 10,
    color: '#9CA3AF',
  },
  settingsPanel: {
    position: 'absolute',
    top: 62,
    right: 16,
    zIndex: 4,
    width: 258,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    gap: 16,
  },
  settingsPanelLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  settingsPanelDark: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#6B7280',
    letterSpacing: 1.2,
  },
  settingsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.06)',
    padding: 4,
    borderRadius: 12,
  },
  settingsIconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  settingsIconButtonSepia: {
    backgroundColor: '#F4ECD8',
  },
  settingsIconButtonDark: {
    backgroundColor: '#4B5563',
  },
  typeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(15,23,42,0.1)',
  },
  contentArea: {
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  contentInner: {
    maxWidth: 760,
    alignSelf: 'center',
    gap: 24,
  },
  pageHeading: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  paragraph: {
    textAlign: 'justify',
    fontFamily: 'serif',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  footerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  footerButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  footerMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  disabled: {
    opacity: 0.3,
  },
});

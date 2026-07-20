import React, { useEffect, useMemo, useState } from 'react';
import {
  ImageBackground,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Book as BookIcon,
  BookOpen,
  Check,
  Download,
  GraduationCap,
  Lightbulb,
  Plus,
  Trash2,
  Wifi,
  X,
} from 'lucide-react-native';

import { getBookCoverPreviewUri } from '../services/contentService';
import { Book, UserProfile } from '../types/app';

interface BookshelfScreenProps {
  books: Book[];
  user: UserProfile;
  readingProgress: Record<string, number>;
  previewBookId: string | null;
  downloadedBooks: Set<string>;
  isSpotlightMode: boolean;
  onBack: () => void;
  onOpenBook: (book: Book, startPage?: number) => void;
  onSetPreviewBookId: (bookId: string | null) => void;
  onToggleSpotlight: () => void;
  onToggleDownload: (bookId: string) => Promise<void> | void;
}

const BOOKS_PER_SHELF = 6;

export function BookshelfScreen({
  books,
  user,
  readingProgress,
  previewBookId,
  downloadedBooks,
  isSpotlightMode,
  onBack,
  onOpenBook,
  onSetPreviewBookId,
  onToggleSpotlight,
  onToggleDownload,
}: BookshelfScreenProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestedTitle, setRequestedTitle] = useState('');
  const [requestedSubject, setRequestedSubject] = useState('');
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [coverPreviewUri, setCoverPreviewUri] = useState<string | null>(null);
  const [coverPreviewLoading, setCoverPreviewLoading] = useState(false);

  useEffect(() => {
    if (!previewBookId) {
      setSelectedBook(null);
      return;
    }

    const matchedBook = books.find(book => book.id === previewBookId) || null;
    setSelectedBook(matchedBook);
  }, [books, previewBookId]);

  useEffect(() => {
    setDownloadingBookId(null);
  }, [selectedBook]);

  useEffect(() => {
    if (!selectedBook) {
      setCoverPreviewUri(null);
      setCoverPreviewLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setCoverPreviewUri(selectedBook.localCoverUri ?? null);
    setCoverPreviewLoading(Boolean(selectedBook.coverImageUrl && !selectedBook.localCoverUri));

    getBookCoverPreviewUri(selectedBook)
      .then(uri => {
        if (cancelled) {
          if (uri?.startsWith('blob:')) {
            URL.revokeObjectURL(uri);
          }
          return;
        }
        objectUrl = uri?.startsWith('blob:') ? uri : null;
        setCoverPreviewUri(uri);
        setCoverPreviewLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setCoverPreviewUri(null);
          setCoverPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedBook]);

  const shelfGroups = useMemo(
    () =>
      Array.from(
        { length: Math.max(2, Math.ceil(books.length / BOOKS_PER_SHELF)) },
        (_, index) => index,
      ),
    [books.length],
  );

  const shelfBooks = useMemo(
    () =>
      shelfGroups.map(groupIndex => {
        const start = groupIndex * BOOKS_PER_SHELF;
        const visibleBooks = books.slice(start, start + BOOKS_PER_SHELF);
        const placeholders = Math.max(0, BOOKS_PER_SHELF - visibleBooks.length);
        return [...visibleBooks, ...Array.from({ length: placeholders }, () => null)];
      }),
    [books, shelfGroups],
  );

  function handlePreviewBook(book: Book) {
    setSelectedBook(book);
    onSetPreviewBookId(book.id);
  }

  function handleCloseModal() {
    setSelectedBook(null);
    setDownloadingBookId(null);
    setDownloadError(null);
    onSetPreviewBookId(null);
  }

  function getSavedPage(bookId: string) {
    return readingProgress[bookId] || 1;
  }

  async function handleDownload(bookId: string) {
    setDownloadError(null);
    setDownloadingBookId(bookId);
    try {
      await onToggleDownload(bookId);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Unable to update offline book.');
    } finally {
      setDownloadingBookId(null);
    }
  }

  function openBookFromModal(startPage: number) {
    if (!selectedBook) {
      return;
    }

    onOpenBook(selectedBook, startPage);
  }

  function submitBookRequest() {
    if (!requestedTitle.trim()) {
      setRequestMessage('Enter the book title you want.');
      return;
    }

    setRequestMessage('Request sent to the library team.');
    setRequestedTitle('');
    setRequestedSubject('');
  }

  const libraryTitle = `${user.name.split(' ')[0] || 'Student'}'s Library`;

  return (
    <View
      style={[
        styles.container,
        isSpotlightMode ? styles.containerDark : styles.containerLight,
      ]}>
      {isSpotlightMode ? (
        <LinearGradient
          colors={['rgba(255,230,200,0.16)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.58)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0.05 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.spotlightOverlay}
        />
      ) : null}

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={[
            styles.iconButton,
            isSpotlightMode && styles.iconButtonDark,
          ]}>
          <ArrowLeft
            color={isSpotlightMode ? '#E5E7EB' : '#1F2937'}
            size={24}
            strokeWidth={2.2}
          />
        </Pressable>

        <Text
          style={[
            styles.headerTitle,
            isSpotlightMode && styles.headerTitleDark,
          ]}>
          {libraryTitle}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={onToggleSpotlight}
          style={[
            styles.iconButton,
            isSpotlightMode ? styles.spotlightButtonActive : styles.spotlightButton,
          ]}>
          <Lightbulb
            color={isSpotlightMode ? '#FACC15' : '#9CA3AF'}
            size={24}
            fill={isSpotlightMode ? '#FACC15' : 'transparent'}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>

      {books.length === 0 ? (
        <View
          style={[
            styles.emptyBanner,
            isSpotlightMode && styles.emptyBannerDark,
          ]}>
          <BookOpen
            color={isSpotlightMode ? '#F8FAFC' : '#475569'}
            size={24}
            strokeWidth={2}
          />
          <View style={styles.emptyCopy}>
            <Text style={[styles.emptyTitle, isSpotlightMode && styles.emptyTitleDark]}>
              No books yet
            </Text>
            <Text style={[styles.emptyBody, isSpotlightMode && styles.emptyBodyDark]}>
              The shelves are ready. Add published books to populate this portal.
            </Text>
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {shelfGroups.map((shelfIndex, index) => (
          <View key={shelfIndex} style={styles.shelfSection}>
            <View style={styles.booksRow}>
              {shelfBooks[shelfIndex].map((book, slotIndex) => {
                if (!book) {
                  return (
                    <View
                      key={`placeholder-${shelfIndex}-${slotIndex}`}
                      style={[
                        styles.bookPlaceholder,
                        slotIndex % 2 === 0 ? styles.height36 : styles.height32,
                        isSpotlightMode && styles.bookPlaceholderDark,
                      ]}
                    />
                  );
                }

                const isDownloaded = downloadedBooks.has(book.id);

                return (
                  <ShelfBookSpine
                    key={book.id}
                    book={book}
                    isDownloaded={isDownloaded}
                    isSpotlightMode={isSpotlightMode}
                    onPress={() => handlePreviewBook(book)}
                  />
                );
              })}

              {index === 0 ? (
                <>
                  <Text
                    style={[
                      styles.decorLeft,
                      isSpotlightMode && styles.decorDimmed,
                    ]}>
                    🪴
                  </Text>
                  <Text style={styles.decorAvatar}>🧸</Text>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.decorSmallLeft,
                      isSpotlightMode && styles.decorDimmed,
                    ]}>
                    📚
                  </Text>
                  <Text
                    style={[
                      styles.decorSmallRight,
                      isSpotlightMode && styles.decorDimmed,
                    ]}>
                    👒
                  </Text>
                </>
              )}
            </View>

            <View
              style={[
                styles.shelfPlank,
                isSpotlightMode ? styles.shelfPlankDark : styles.shelfPlankLight,
              ]}>
              <View
                style={[
                  styles.shelfHighlight,
                  isSpotlightMode
                    ? styles.shelfHighlightDark
                    : styles.shelfHighlightLight,
                ]}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setRequestModalOpen(true);
          setRequestMessage(null);
        }}
        style={[
          styles.requestButton,
          isSpotlightMode ? styles.requestButtonDark : styles.requestButtonLight,
        ]}>
        <Plus size={20} color={isSpotlightMode ? '#F9FAFB' : '#F4ECD8'} strokeWidth={2.4} />
        <Text
          style={[
            styles.requestButtonText,
            isSpotlightMode && styles.requestButtonTextDark,
          ]}>
          REQUEST BOOK
        </Text>
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        visible={!!selectedBook}
        onRequestClose={handleCloseModal}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseModal} />
          {selectedBook ? (
            <View style={styles.modalCenter}>
              <View style={styles.modalBookWrap}>
                <Pressable
                  onPress={() => openBookFromModal(1)}
                  style={[
                    styles.bookPreview,
                    { backgroundColor: selectedBook.spineColor },
                  ]}>
                  {coverPreviewUri ? (
                    <ImageBackground
                      source={{ uri: coverPreviewUri }}
                      resizeMode="cover"
                      style={styles.coverPreviewImage}
                      imageStyle={styles.coverPreviewImageStyle}
                    />
                  ) : selectedBook.coverImageUrl ? (
                    <View style={styles.coverPreviewStatus}>
                      {coverPreviewLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="large" />
                      ) : (
                        <BookIcon size={42} color="#FFFFFF" strokeWidth={2} />
                      )}
                    </View>
                  ) : (
                    <>
                      <View style={styles.bookPreviewSpineShadow} />
                      <View
                        style={[
                          styles.previewRule,
                          { borderColor: withAlpha(selectedBook.textColor, 0.32) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.previewTitle,
                          { color: selectedBook.textColor },
                        ]}>
                        {selectedBook.title}
                      </Text>
                      <View
                        style={[
                          styles.previewDivider,
                          { backgroundColor: withAlpha(selectedBook.textColor, 0.5) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.previewAuthor,
                          { color: selectedBook.textColor },
                        ]}>
                        {selectedBook.author}
                      </Text>

                      <View
                        style={[
                          styles.previewIconCircle,
                          { borderColor: withAlpha(selectedBook.textColor, 0.2) },
                        ]}>
                        <BookIcon
                          size={40}
                          color={withAlpha(selectedBook.textColor, 0.7)}
                          strokeWidth={2}
                        />
                      </View>

                      <View style={styles.previewSeriesRow}>
                        <GraduationCap
                          size={16}
                          color={withAlpha(selectedBook.textColor, 0.65)}
                          strokeWidth={2.2}
                        />
                        <Text
                          style={[
                            styles.previewSeriesText,
                            { color: withAlpha(selectedBook.textColor, 0.7) },
                          ]}>
                          Education Series
                        </Text>
                      </View>
                    </>
                  )}

                  {downloadedBooks.has(selectedBook.id) ? (
                    <View style={styles.offlineBadge}>
                      <Wifi size={12} color="#FFFFFF" strokeWidth={2.2} />
                      <Text style={styles.offlineBadgeText}>Offline</Text>
                    </View>
                  ) : null}
                </Pressable>

                <View style={styles.modalActions}>
                  <Pressable onPress={handleCloseModal} style={styles.circleAction}>
                    <X size={24} color="#1F2937" strokeWidth={2.2} />
                  </Pressable>

                  <Pressable
                    onPress={() => handleDownload(selectedBook.id)}
                    disabled={downloadingBookId === selectedBook.id}
                    style={[
                      styles.circleAction,
                      downloadedBooks.has(selectedBook.id)
                        ? styles.circleActionMuted
                        : styles.circleActionPrimary,
                      downloadingBookId === selectedBook.id && styles.actionDisabled,
                    ]}>
                    {downloadedBooks.has(selectedBook.id) ? (
                      <Trash2 size={20} color="#6B7280" strokeWidth={2.2} />
                    ) : (
                      <Download size={20} color="#2563EB" strokeWidth={2.2} />
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => openBookFromModal(getSavedPage(selectedBook.id))}
                    style={styles.readButton}>
                    <BookOpen size={20} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.readButtonText}>
                      {getSavedPage(selectedBook.id) > 1 ? 'Resume' : 'Read'}
                    </Text>
                  </Pressable>
                </View>
                {downloadError ? (
                  <Text style={styles.downloadError}>{downloadError}</Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={requestModalOpen}
        onRequestClose={() => setRequestModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRequestModalOpen(false)} />
          <View style={styles.requestModal}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>Request a book</Text>
              <Pressable onPress={() => setRequestModalOpen(false)} style={styles.requestCloseButton}>
                <X size={20} color="#0F172A" />
              </Pressable>
            </View>
            <Text style={styles.requestModalText}>
              Tell the library team what learning book you want added next.
            </Text>
            <TextInput
              value={requestedTitle}
              onChangeText={setRequestedTitle}
              placeholder="Book title"
              placeholderTextColor="#94A3B8"
              style={styles.requestInput}
            />
            <TextInput
              value={requestedSubject}
              onChangeText={setRequestedSubject}
              placeholder="Subject or topic"
              placeholderTextColor="#94A3B8"
              style={styles.requestInput}
            />
            {requestMessage ? <Text style={styles.requestMessage}>{requestMessage}</Text> : null}
            <Pressable onPress={submitBookRequest} style={styles.requestSubmitButton}>
              <Text style={styles.requestSubmitText}>Send request</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ShelfBookSpine({
  book,
  isDownloaded,
  isSpotlightMode,
  onPress,
}: {
  book: Book;
  isDownloaded: boolean;
  isSpotlightMode: boolean;
  onPress: () => void;
}) {
  const spineTheme = getBookSpineTheme(book);
  const label = getBookSpineLabel(book);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.bookSpine,
        getHeightStyle(book.height),
        { backgroundColor: spineTheme.base },
        isSpotlightMode && styles.bookSpineDark,
      ]}>
      <LinearGradient
        colors={[spineTheme.top, spineTheme.base, spineTheme.bottom]}
        locations={[0, 0.48, 1]}
        style={styles.spineGradient}
      />
      <View style={[styles.spineAccentRail, { backgroundColor: spineTheme.accent }]} />
      <View style={styles.spinePattern}>
        {Array.from({ length: 6 }).map((_, stripeIndex) => (
          <View
            key={stripeIndex}
            style={[
              styles.spinePatternDash,
              { backgroundColor: withAlpha(spineTheme.accent, stripeIndex % 2 === 0 ? 0.42 : 0.22) },
            ]}
          />
        ))}
      </View>

      <View style={styles.spineBadge}>
        <Text style={[styles.spineBadgeText, { color: spineTheme.base }]}>KQ</Text>
      </View>

      <View style={[styles.rotatedLabelWrap, { borderColor: withAlpha(spineTheme.accent, 0.55) }]}>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          style={[styles.bookSpineTitle, { color: spineTheme.text }]}>
          {label}
        </Text>
      </View>

      <View style={[styles.spineGradePill, { backgroundColor: spineTheme.accent }]}>
        <Text style={styles.spineGradeText}>{getGradeShortLabel(book.gradeLevel)}</Text>
      </View>

      {isDownloaded ? (
        <View style={styles.downloadBadge}>
          <Check size={8} color={spineTheme.text} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

function getHeightStyle(height: string) {
  switch (height) {
    case 'h-40':
      return styles.height40;
    case 'h-36':
      return styles.height36;
    case 'h-32':
      return styles.height32;
    case 'h-28':
      return styles.height28;
    default:
      return styles.height36;
  }
}

function getBookSpineLabel(book: Book) {
  const subject = book.subjectName?.trim() ?? '';
  const normalized = subject.toLowerCase();
  if (normalized === 'science and technology') {
    return 'SCIENCE\n& TECH';
  }
  if (normalized === 'social studies') {
    return 'SOCIAL\nSTUDIES';
  }
  if (normalized === 'creative arts') {
    return 'CREATIVE\nARTS';
  }
  return subject.toUpperCase();
}

function getGradeShortLabel(grade: string | null | undefined) {
  const match = grade?.match(/\d+/);
  return match ? `G${match[0]}` : 'KQ';
}

function getBookSpineTheme(book: Book) {
  const subject = book.subjectName?.trim().toLowerCase() ?? '';
  const themes: Record<string, { base: string; top: string; bottom: string; accent: string; text: string }> = {
    agriculture: {
      base: '#14532D',
      top: '#22C55E',
      bottom: '#052E16',
      accent: '#FACC15',
      text: '#FFFFFF',
    },
    'creative arts': {
      base: '#C2410C',
      top: '#F97316',
      bottom: '#9A3412',
      accent: '#FDE047',
      text: '#FFFFFF',
    },
    english: {
      base: '#1D4ED8',
      top: '#60A5FA',
      bottom: '#1E3A8A',
      accent: '#FBBF24',
      text: '#FFFFFF',
    },
    kiswahili: {
      base: '#C2410C',
      top: '#FB923C',
      bottom: '#7C2D12',
      accent: '#FFFFFF',
      text: '#FFFFFF',
    },
    mathematics: {
      base: '#047857',
      top: '#34D399',
      bottom: '#064E3B',
      accent: '#A7F3D0',
      text: '#FFFFFF',
    },
    'science and technology': {
      base: '#15803D',
      top: '#4ADE80',
      bottom: '#14532D',
      accent: '#67E8F9',
      text: '#FFFFFF',
    },
    'social studies': {
      base: '#BE123C',
      top: '#FB7185',
      bottom: '#881337',
      accent: '#FED7AA',
      text: '#FFFFFF',
    },
  };

  return themes[subject] ?? {
    base: book.spineColor || '#0F766E',
    top: withAlpha(book.spineColor || '#0F766E', 0.72),
    bottom: '#0F172A',
    accent: '#FACC15',
    text: book.textColor || '#FFFFFF',
  };
}

function withAlpha(hex: string, alpha: number) {
  if (!hex.startsWith('#')) {
    return hex;
  }

  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;

  const parsedAlpha = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');

  return `${normalized}${parsedAlpha}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  containerLight: {
    backgroundColor: '#FDF2E9',
  },
  containerDark: {
    backgroundColor: '#1C1917',
  },
  emptyBanner: {
    zIndex: 2,
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyBannerDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  emptyCopy: {
    flex: 1,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },
  emptyTitleDark: {
    color: '#FFFFFF',
  },
  emptyBody: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyBodyDark: {
    color: '#CBD5E1',
  },
  spotlightOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#1F2937',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headerTitleDark: {
    color: '#F3F4F6',
  },
  spotlightButton: {
    backgroundColor: 'transparent',
  },
  spotlightButtonActive: {
    backgroundColor: 'rgba(234,179,8,0.2)',
    shadowColor: '#FACC15',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 140,
  },
  shelfSection: {
    marginBottom: 60,
  },
  booksRow: {
    minHeight: 190,
    justifyContent: 'center',
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    position: 'relative',
  },
  bookSpine: {
    width: 46,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.2)',
    borderRightColor: 'rgba(0,0,0,0.12)',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bookSpineDark: {
    opacity: 0.9,
  },
  spineGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  spineAccentRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 5,
  },
  spinePattern: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-evenly',
    opacity: 0.8,
  },
  spinePatternDash: {
    height: 3,
    marginLeft: 12,
    marginRight: 7,
    borderRadius: 999,
  },
  spineBadge: {
    position: 'absolute',
    top: 5,
    left: 8,
    right: 5,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spineBadgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  shelfCoverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  shelfCoverImageStyle: {
    borderRadius: 4,
  },
  shelfCoverScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  bookPlaceholder: {
    width: 46,
    borderRadius: 4,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(148,163,184,0.45)',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  bookPlaceholderDark: {
    borderColor: 'rgba(226,232,240,0.22)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  height40: {
    height: 160,
  },
  height36: {
    height: 144,
  },
  height32: {
    height: 128,
  },
  height28: {
    height: 112,
  },
  bandedStripe: {
    position: 'absolute',
    top: 18,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  stripedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    opacity: 0.32,
  },
  diagonalStripe: {
    height: 10,
    marginHorizontal: -16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ rotate: '45deg' }],
  },
  rotatedLabelWrap: {
    position: 'absolute',
    width: 108,
    minHeight: 26,
    borderRadius: 5,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.17)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 3,
    transform: [{ rotate: '-90deg' }],
  },
  rotatedLabelCoverWrap: {
    backgroundColor: 'rgba(15,23,42,0.4)',
    borderRadius: 999,
    paddingVertical: 3,
  },
  bookSpineTitle: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  spineGradePill: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    minWidth: 24,
    height: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spineGradeText: {
    color: '#0F172A',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  downloadBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorLeft: {
    position: 'absolute',
    left: -8,
    bottom: 4,
    fontSize: 28,
    opacity: 0.9,
  },
  decorAvatar: {
    position: 'absolute',
    right: -2,
    bottom: 8,
    fontSize: 40,
  },
  decorSmallLeft: {
    position: 'absolute',
    left: 8,
    bottom: 4,
    fontSize: 28,
  },
  decorSmallRight: {
    position: 'absolute',
    right: 28,
    bottom: 4,
    fontSize: 28,
  },
  decorDimmed: {
    opacity: 0.62,
  },
  shelfPlank: {
    marginTop: -2,
    height: 16,
    borderRadius: 999,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    overflow: 'hidden',
  },
  shelfPlankLight: {
    backgroundColor: '#C2A48D',
  },
  shelfPlankDark: {
    backgroundColor: '#3F322B',
  },
  shelfHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.5,
  },
  shelfHighlightLight: {
    backgroundColor: '#DCC4B0',
  },
  shelfHighlightDark: {
    backgroundColor: '#5C4A40',
  },
  requestButton: {
    position: 'absolute',
    right: 24,
    bottom: 28,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 18,
    paddingRight: 22,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  requestButtonLight: {
    backgroundColor: '#2C2420',
  },
  requestButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  requestButtonText: {
    color: '#F4ECD8',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  requestButtonTextDark: {
    color: '#F9FAFB',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  requestModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    gap: 12,
    padding: 18,
    width: '100%',
  },
  requestModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requestModalTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },
  requestCloseButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  requestModalText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  requestInput: {
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  requestMessage: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
  },
  requestSubmitButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 50,
  },
  requestSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  modalCenter: {
    width: '100%',
    alignItems: 'center',
  },
  modalBookWrap: {
    width: 290,
    alignItems: 'center',
  },
  bookPreview: {
    width: 270,
    aspectRatio: 2 / 3,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
    overflow: 'hidden',
  },
  coverPreviewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverPreviewImageStyle: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  coverPreviewStatus: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.72)',
  },
  bookPreviewSpineShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  previewRule: {
    alignSelf: 'stretch',
    height: 8,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    marginBottom: 28,
  },
  previewTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  previewDivider: {
    width: 48,
    height: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  previewAuthor: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  previewIconCircle: {
    marginTop: 'auto',
    marginBottom: 'auto',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSeriesRow: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewSeriesText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  offlineBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  offlineBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modalActions: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleAction: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  circleActionPrimary: {
    backgroundColor: '#FFFFFF',
  },
  circleActionMuted: {
    backgroundColor: '#E5E7EB',
  },
  actionDisabled: {
    opacity: 0.45,
  },
  readButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  readButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  downloadError: {
    color: '#FEE2E2',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 12,
    textAlign: 'center',
  },
});

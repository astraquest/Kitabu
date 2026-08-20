import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Volume2, VolumeX } from 'lucide-react-native';
import { buildScreenIntro, useGuidedNarration } from '../services/narrationService';
import type { LandingSoundtrackController } from '../services/landingSoundtrack';

const { width } = Dimensions.get('window');

const portraitDesk = require('../assets/intro-study-desk.jpg');
const portraitSisters = require('../assets/intro-sisters-study.jpg');
const portraitLaptop = require('../assets/intro-laptop-study.jpg');
const reportCardReview = require('../assets/intro-report-card-generated.jpeg');
const logoAsset = require('../assets/logo.png');

const SLIDES = [
  {
    image: portraitDesk,
    titleParts: [
      { text: 'Every Learner Deserves A ' },
      { text: 'Personal Tutor', highlight: true },
      { text: ' Who Never Gets Tired of Explaining.' },
    ],
    body: '',
  },
  {
    image: portraitSisters,
    titleParts: [
      { text: 'For Less than One ' },
      { text: 'Mandazi', highlight: true },
      { text: ', Get Unlimited Revision Questions Every Day.' },
    ],
    body: '',
  },
  {
    image: portraitLaptop,
    titleParts: [
      { text: 'Daily Homework Aligned with ' },
      { text: 'CBC', highlight: true },
      { text: '. Automated Grading for Teachers and Parents.' },
    ],
    body: '',
  },
  {
    image: reportCardReview,
    titleParts: [
      { text: 'Usingoje Report Form Ndio Ujue Kuna Makosa Mahali. ' },
      { text: 'Fungua Kitabu!', highlight: true },
    ],
    body: '',
  },
] as const;

interface IntroCarouselScreenProps {
  onSignIn: () => void;
  onCreateAccount: () => void;
  soundtrack: LandingSoundtrackController;
}

export function IntroCarouselScreen({
  onSignIn,
  onCreateAccount,
  soundtrack,
}: IntroCarouselScreenProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const soundtrackStartedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [narrationTrigger, setNarrationTrigger] = useState<string | null>(null);
  const isLast = activeIndex === SLIDES.length - 1;
  const ctaLabel = isLast ? 'Create account' : 'Next';

  const narrationCue = useMemo(
    () => buildScreenIntro(
      'intro-carousel',
      String(activeIndex),
      SLIDES[activeIndex].titleParts.map(part => part.text).join(''),
      'Samora',
      {
        language: activeIndex === 3 ? 'sw' : 'en',
        publicCueId: `intro-slide-${activeIndex + 1}`,
      },
    ),
    [activeIndex],
  );
  useGuidedNarration(narrationCue, true, narrationTrigger);
  const { muted, start: startSoundtrack, toggleMuted } = soundtrack;

  const progress = useMemo(
    () => SLIDES.map((_, index) => index <= activeIndex),
    [activeIndex],
  );

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(SLIDES.length - 1, nextIndex)));
  }

  function handlePrimaryAction() {
    if (isLast) {
      onCreateAccount();
      return;
    }

    if (!soundtrackStartedRef.current) {
      soundtrackStartedRef.current = true;
      startSoundtrack();
    }
    const nextIndex = activeIndex + 1;
    setNarrationTrigger(`screen-intro:intro-carousel:${nextIndex}`);
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setActiveIndex(nextIndex);
  }

  return (
    <LinearGradient
      colors={['#04192d', '#10375f', '#1d5c4b']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}>
      <View style={styles.topRow}>
        <View style={styles.brandPill}>
          <Image source={logoAsset} style={styles.brandLogo} resizeMode="cover" />
          <Text style={styles.brandText}>KITABU AI</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.carousel}>
        {SLIDES.map(slide => (
          <View key={slide.titleParts.map(part => part.text).join('')} style={styles.slide}>
            <View style={styles.card}>
              <View style={styles.imageWrap}>
                <View style={styles.imageHalo} />
                <Image source={slide.image} style={styles.image} resizeMode="cover" />
              </View>
              <Text style={styles.title}>
                {slide.titleParts.map(part => (
                  <Text
                    key={part.text}
                    style={part.highlight ? styles.titleHighlight : undefined}>
                    {part.text}
                  </Text>
                ))}
              </Text>
              {slide.body ? <Text style={styles.body}>{slide.body}</Text> : null}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.progressRow}>
          {progress.map((isActive, index) => (
            <View
              key={SLIDES[index].titleParts.map(part => part.text).join('')}
              style={[styles.progressDot, isActive && styles.progressDotActive]}
            />
          ))}
        </View>

        {isLast ? (
          <View style={styles.finalActionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                muted ? 'Unmute landing soundtrack' : 'Mute landing soundtrack'
              }
              accessibilityHint="Toggles the quiet landing soundtrack"
              onPress={toggleMuted}
              style={styles.soundtrackToggle}>
              {muted ? (
                <VolumeX color="#FFFFFF" size={22} />
              ) : (
                <Volume2 color="#FFFFFF" size={22} />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              onPress={onCreateAccount}
              style={[styles.primaryButton, styles.finalActionButton]}>
              <Text style={styles.primaryText}>{ctaLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              onPress={onSignIn}
              style={[styles.signInButton, styles.finalActionButton]}>
              <Text style={styles.signInText}>Sign in</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                muted ? 'Unmute landing soundtrack' : 'Mute landing soundtrack'
              }
              accessibilityHint="Toggles the quiet landing soundtrack"
              onPress={toggleMuted}
              style={styles.soundtrackToggle}>
              {muted ? (
                <VolumeX color="#FFFFFF" size={22} />
              ) : (
                <Volume2 color="#FFFFFF" size={22} />
              )}
            </Pressable>
            <Pressable
              accessibilityLabel={ctaLabel}
              onPress={handlePrimaryAction}
              style={[styles.primaryButton, styles.nextButton]}>
              <Text style={styles.primaryText}>{ctaLabel}</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.helperText}>
          Avoid Surprises. Get Ready For Exams with Kitabu AI.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 18,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  brandPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  brandLogo: {
    borderRadius: 8,
    height: 24,
    width: 24,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  signInButton: {
    alignItems: 'center',
    backgroundColor: '#0369A1',
    borderColor: '#38BDF8',
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 58,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  carousel: {
    flex: 1,
  },
  slide: {
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 20,
    width,
  },
  card: {
    backgroundColor: 'rgba(4, 12, 24, 0.22)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 34,
    borderWidth: 1,
    minHeight: 560,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 30,
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
    marginBottom: 22,
    position: 'relative',
  },
  imageHalo: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  image: {
    borderRadius: 18,
    height: 250,
    width: 250,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 31,
    textAlign: 'center',
  },
  titleHighlight: {
    color: '#FDE68A',
  },
  body: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
  },
  footer: {
    gap: 14,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  progressDot: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    height: 8,
    width: 18,
  },
  progressDotActive: {
    backgroundColor: '#fde68a',
    width: 34,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#f97316',
    borderRadius: 20,
    justifyContent: 'center',
    minHeight: 58,
  },
  nextButton: {
    flex: 1,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  finalActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  finalActionButton: {
    flex: 1,
  },
  helperText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    textAlign: 'center',
  },
  soundtrackToggle: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
});

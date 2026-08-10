import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle as SvgCircle,
  Path as SvgPath,
} from 'react-native-svg';
import {
  Calculator,
  CalendarClock,
  Check,
  Clock3,
  LockKeyhole,
  PencilLine,
  Play,
  RefreshCw,
  Scale,
  Sparkles,
  Star,
} from 'lucide-react-native';

import type {
  LearningStrand,
  OnboardingMascotKey,
  Subject,
} from '../../../types/app';
import { LEARNING_MASCOT_SOURCES } from '../components/LearningMascotReaction';
import { SubjectPageHeader } from '../components/SubjectPageHeader';
import { SquishPressable } from '../components/SquishPressable';
import { buildFallbackLearningPath } from '../model/buildFallbackLearningPath';
import type { LearningPathNode, SubjectLearningPath } from '../types';

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);
const PROGRESS_RING_CIRCUMFERENCE = 188.5;
const VISIBLE_TOPIC_COUNT = 5;
const PENDING_MASCOT_SOURCES = {
  rabbit: require('../../../assets/mascot/sungura-rabbit-quiz.png'),
  lion: require('../../../assets/mascot/simba-lion-quiz.png'),
  elephant: require('../../../assets/mascot/ndovu-elephant-quiz.png'),
  panda: require('../../../assets/mascot/panda.png'),
};

interface SubjectLearningPathScreenProps {
  subject: Subject;
  strands: LearningStrand[];
  grade: string;
  path: SubjectLearningPath | null;
  mascotKey: OnboardingMascotKey;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
  onOpenNode: (node: LearningPathNode) => void;
}

export function SubjectLearningPathScreen({
  subject,
  strands,
  grade,
  path,
  mascotKey,
  isLoading,
  error,
  onBack,
  onRetry,
  onOpenNode,
}: SubjectLearningPathScreenProps) {
  const fallbackPath = useMemo(
    () => buildFallbackLearningPath(subject, strands, grade),
    [grade, strands, subject],
  );
  const resolvedPath = useMemo<SubjectLearningPath>(
    () => path ?? fallbackPath,
    [fallbackPath, path],
  );
  const hasCurriculumFallback = !path && fallbackPath.nodes.length > 0;
  const displayedProgressPercent = useMemo(() => {
    const practisedCount = resolvedPath.nodes.filter(
      node =>
        node.status === 'completed' ||
        node.attemptCount > 0 ||
        node.bestScore !== null,
    ).length;
    const practisedProgress = resolvedPath.totalCount
      ? Math.round((practisedCount / resolvedPath.totalCount) * 100)
      : 0;
    return Math.min(
      100,
      Math.max(resolvedPath.progressPercent, practisedProgress),
    );
  }, [resolvedPath]);
  const progress = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pendingNode, setPendingNode] = useState<LearningPathNode | null>(null);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    entrance.stopAnimation();
    if (reduceMotion) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    Animated.spring(entrance, {
      toValue: 1,
      damping: 18,
      stiffness: 165,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
    return () => entrance.stopAnimation();
  }, [entrance, reduceMotion]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: Math.max(0, Math.min(100, displayedProgressPercent)),
      duration: reduceMotion ? 0 : 650,
      useNativeDriver: false,
    }).start();
    return () => progress.stopAnimation();
  }, [displayedProgressPercent, progress, reduceMotion]);

  const progressRingOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [PROGRESS_RING_CIRCUMFERENCE, 0],
  });
  const contentTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const currentNode =
    resolvedPath.nodes.find(node => node.status === 'current') ??
    resolvedPath.nodes.find(node => node.status === 'needs_practice') ??
    resolvedPath.nodes.find(node => node.status === 'content_pending');
  const currentNodeIndex = currentNode
    ? resolvedPath.nodes.findIndex(node => node.id === currentNode.id)
    : -1;
  const latestPossibleStart = Math.max(
    0,
    resolvedPath.nodes.length - VISIBLE_TOPIC_COUNT,
  );
  const visibleStartIndex =
    currentNodeIndex === -1
      ? latestPossibleStart
      : Math.min(Math.max(0, currentNodeIndex - 1), latestPossibleStart);
  const visibleEndIndex = visibleStartIndex + VISIBLE_TOPIC_COUNT;
  const visibleNodes = resolvedPath.nodes.slice(
    visibleStartIndex,
    visibleEndIndex,
  );

  if (pendingNode) {
    return (
      <ContentPendingPage
        grade={grade}
        mascotKey={mascotKey}
        node={pendingNode}
        onBack={() => setPendingNode(null)}
        subjectName={subject.name}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <SubjectPageHeader
        backAccessibilityLabel="Back to dashboard"
        grade={grade}
        onBack={onBack}
        subjectName={subject.name}
        subjectOfficialName={resolvedPath.subjectOfficialName}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.contentStack,
            Platform.OS === 'web'
              ? styles.contentStackWeb
              : {
                  opacity: entrance,
                  transform: [{ translateY: contentTranslateY }],
                },
          ]}
        >
          {currentNode ? (
            <AdventureBanner
              animatedProgressOffset={progressRingOffset}
              chapterTitle={currentNode.title}
              mascotKey={mascotKey}
              needsPractice={currentNode.status === 'needs_practice'}
              percentage={displayedProgressPercent}
              topicLabel={currentNode.subStrandNumber
                ? `TOPIC ${currentNode.subStrandNumber}`
                : `CHAPTER ${currentNode.position + 1}`}
            />
          ) : null}

          {isLoading && !path && !hasCurriculumFallback ? <PathSkeleton /> : null}

          {error && !hasCurriculumFallback ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>
                Using your saved curriculum
              </Text>
              <Text style={styles.noticeText}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onRetry}
                style={styles.retryButton}
              >
                <RefreshCw color="#0F766E" size={16} />
                <Text style={styles.retryText}>Refresh path</Text>
              </Pressable>
            </View>
          ) : null}

          <View
            accessibilityLabel="Curriculum learning path"
            accessibilityRole="list"
            style={styles.pathList}
          >
            {resolvedPath.nodes.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  This path is being prepared
                </Text>
                <Text style={styles.emptyText}>
                  Your curriculum will appear here as soon as it is published.
                </Text>
              </View>
            ) : (
              visibleNodes.map((node, index) => (
                <React.Fragment key={node.id}>
                  {node.strandTitle &&
                  (index === 0 ||
                    visibleNodes[index - 1]?.strandTitle !==
                      node.strandTitle) ? (
                    <Text style={styles.strandTitle}>
                      {node.strandNumber ? (
                        <Text>{node.strandNumber}  </Text>
                      ) : null}
                      <Text>{node.strandTitle}</Text>
                    </Text>
                  ) : null}
                  <PathNode
                    index={index}
                    isLast={index === visibleNodes.length - 1}
                    node={node}
                    onOpen={() => {
                      if (node.status === 'content_pending') {
                        setPendingNode(node);
                        return;
                      }
                      onOpenNode(node);
                    }}
                    reduceMotion={reduceMotion}
                  />
                </React.Fragment>
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function ContentPendingPage({
  grade,
  mascotKey,
  node,
  onBack,
  subjectName,
}: {
  grade: string;
  mascotKey: OnboardingMascotKey;
  node: LearningPathNode;
  onBack: () => void;
  subjectName: string;
}) {
  const mascotSource = PENDING_MASCOT_SOURCES[mascotKey];
  const mascotName = mascotKey === 'lion'
    ? 'Simba'
    : mascotKey === 'elephant'
      ? 'Ndovu'
      : mascotKey === 'panda'
        ? 'Panda'
      : 'Sungura';

  return (
    <View style={styles.pendingScreen}>
      <SubjectPageHeader
        backAccessibilityLabel="Back to learning path"
        grade={grade}
        onBack={onBack}
        subjectName={subjectName}
      />
      <ScrollView
        contentContainerStyle={styles.pendingContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pendingCard}>
          <View style={styles.pendingKickerRow}>
            <CalendarClock color="#F97316" size={18} strokeWidth={2.5} />
            <Text style={styles.pendingKicker}>MORE LEARNING IS ON THE WAY</Text>
          </View>
          <View style={styles.pendingMascotHalo}>
            <Image
              accessibilityLabel={`${mascotName}, your selected learning mascot`}
              resizeMode="contain"
              source={mascotSource}
              style={styles.pendingMascot}
            />
          </View>
          <Text style={styles.pendingTitle}>Come back tomorrow!</Text>
          <Text style={styles.pendingMessage}>
            {mascotName} is helping our teachers prepare a rich, playful lesson for
            {' '}<Text style={styles.pendingTopic}>{node.title}</Text>.
          </Text>
          <View style={styles.pendingTopicCard}>
            <Text style={styles.pendingTopicLabel}>
              {node.subStrandNumber ? `TOPIC ${node.subStrandNumber}` : 'NEXT TOPIC'}
            </Text>
            <Text style={styles.pendingTopicTitle}>{node.title}</Text>
            <Text style={styles.pendingStrand}>{node.strandTitle}</Text>
          </View>
          <Text style={styles.pendingPromise}>
            We only publish lessons after they are carefully authored and checked.
            Your place in the curriculum is safe.
          </Text>
          <SquishPressable
            accessibilityLabel="Back to learning path"
            accessibilityRole="button"
            onPress={onBack}
            containerStyle={styles.pendingButtonWrap}
          >
            <LinearGradient
              colors={['#3284F5', '#1268E8']}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={styles.pendingButton}
            >
              <Text style={styles.pendingButtonText}>Back to learning path</Text>
            </LinearGradient>
          </SquishPressable>
        </View>
      </ScrollView>
    </View>
  );
}

function ProgressRing({
  percentage,
  animatedOffset,
}: {
  percentage: number;
  animatedOffset: Animated.AnimatedInterpolation<number>;
}) {
  return (
    <View
      accessibilityLabel={`${percentage}% complete`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.max(0, Math.min(100, percentage)),
      }}
      style={styles.progressRingWrap}
    >
      <Svg height={68} width={68} viewBox="0 0 76 76">
        <SvgCircle
          cx="38"
          cy="38"
          fill="none"
          r="30"
          stroke="#D8F5E8"
          strokeWidth="8"
        />
        <AnimatedCircle
          cx="38"
          cy="38"
          fill="none"
          r="30"
          stroke="#19B978"
          strokeDasharray={PROGRESS_RING_CIRCUMFERENCE}
          strokeDashoffset={animatedOffset}
          strokeLinecap="round"
          strokeWidth="8"
          transform="rotate(-90 38 38)"
        />
      </Svg>
      <View style={styles.progressRingLabel}>
        <Text style={styles.progressNumber}>{percentage}%</Text>
        <Text style={styles.progressCaption}>complete</Text>
      </View>
    </View>
  );
}

function AdventureBanner({
  animatedProgressOffset,
  chapterTitle,
  mascotKey,
  needsPractice,
  percentage,
  topicLabel,
}: {
  animatedProgressOffset: Animated.AnimatedInterpolation<number>;
  chapterTitle: string;
  mascotKey: OnboardingMascotKey;
  needsPractice: boolean;
  percentage: number;
  topicLabel: string;
}) {
  const spokenTopicLabel = topicLabel
    .replace(/^CHAPTER\b/, 'Chapter')
    .replace(/^TOPIC\b/, 'Topic');
  const accessibilityMessage = needsPractice
    ? `Kitabu learning companion says: Let us practise ${chapterTitle} together.`
    : `Kitabu learning companion says: ${spokenTopicLabel}, ${chapterTitle}, is ready.`;
  return (
    <LinearGradient
      accessibilityLabel={accessibilityMessage}
      colors={['#FFF6E9', '#FFFFFF']}
      end={{ x: 1, y: 0 }}
      start={{ x: 0, y: 0 }}
      style={styles.adventureBanner}
    >
      <MascotBannerArt mascotKey={mascotKey} />
      <View style={styles.adventureTextWrap}>
        <Text style={styles.adventureKicker}>
          {needsPractice ? 'REPAIR STOP' : topicLabel}
        </Text>
        <Text numberOfLines={2} style={styles.adventureText}>
          {needsPractice ? 'Let us practise ' : 'Ready for '}
          <Text style={styles.adventureAccent}>{chapterTitle}</Text>?
        </Text>
      </View>
      <AdventureChallengeTrail />
      <ProgressRing
        animatedOffset={animatedProgressOffset}
        percentage={percentage}
      />
    </LinearGradient>
  );
}

function AdventureChallengeTrail() {
  return (
    <View pointerEvents="none" style={styles.adventureTrail}>
      <Svg height="100%" viewBox="0 0 286 40" width="100%">
        <SvgPath
          d="M4 33 C27 18 44 39 68 31 C92 22 108 38 132 29 C157 19 174 37 199 27 C224 17 244 32 263 21 C273 15 279 10 284 10"
          fill="none"
          opacity={0.95}
          stroke="#F3A85E"
          strokeDasharray="5 6"
          strokeLinecap="round"
          strokeWidth="3.4"
        />
        <SvgCircle cx="4" cy="33" fill="#F97316" r="3" />
      </Svg>
    </View>
  );
}

function MascotBannerArt({ mascotKey }: { mascotKey: OnboardingMascotKey }) {
  const source = LEARNING_MASCOT_SOURCES[mascotKey];
  return (
    <Image
      resizeMode="contain"
      source={source}
      style={styles.adventureMascot}
    />
  );
}

function PathNode({
  node,
  onOpen,
  isLast,
  index,
  reduceMotion,
}: {
  node: LearningPathNode;
  onOpen: () => void;
  isLast: boolean;
  index: number;
  reduceMotion: boolean;
}) {
  const isLocked = node.status === 'locked';
  const isCurrent =
    node.status === 'current' || node.status === 'needs_practice';
  const isContentPending = node.status === 'content_pending';
  const isUnpublished = node.availability === 'content_pending';
  const isComplete = node.status === 'completed';
  const nodeEntrance = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const actionLabel =
    node.status === 'needs_practice'
      ? 'Practise again'
      : isContentPending
        ? 'See update'
        : 'Start lesson';

  useEffect(() => {
    nodeEntrance.stopAnimation();
    if (reduceMotion) {
      nodeEntrance.setValue(1);
      return;
    }
    nodeEntrance.setValue(0);
    Animated.timing(nodeEntrance, {
      toValue: 1,
      duration: 320,
      delay: index * 70,
      useNativeDriver: true,
    }).start();
    return () => nodeEntrance.stopAnimation();
  }, [index, nodeEntrance, reduceMotion]);

  const translateY = nodeEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const dotScale = nodeEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [isCurrent ? 0.82 : 0.96, 1],
  });

  return (
    <Animated.View
      style={[
        styles.nodeRow,
        { opacity: nodeEntrance, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.railColumn}>
        <Animated.View
          style={[
            styles.nodeDot,
            isComplete && styles.nodeDotComplete,
            isCurrent && styles.nodeDotCurrent,
            isContentPending && styles.nodeDotPending,
            isLocked && styles.nodeDotLocked,
            { transform: [{ scale: dotScale }] },
          ]}
        >
          {isComplete ? (
            <Check color="#FFFFFF" size={18} strokeWidth={3} />
          ) : null}
          {isCurrent ? (
            node.status === 'needs_practice' ? (
              <RefreshCw color="#FFFFFF" size={17} />
            ) : (
              <Play color="#FFFFFF" fill="#FFFFFF" size={15} />
            )
          ) : null}
          {isLocked ? <LockKeyhole color="#94A3B8" size={16} /> : null}
          {isContentPending ? <CalendarClock color="#FFFFFF" size={17} /> : null}
        </Animated.View>
        {!isLast ? (
          <View
            style={[
              styles.rail,
              isComplete && styles.railComplete,
              isCurrent && styles.railCurrent,
            ]}
          />
        ) : null}
      </View>

      <View
        style={[
          styles.nodeCard,
          isComplete && styles.nodeCardComplete,
          isCurrent && styles.nodeCardCurrent,
          isContentPending && styles.nodeCardPending,
          isLocked && styles.nodeCardLocked,
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.cardGlow, isCurrent && styles.cardGlowCurrent]}
        />
        <View style={styles.nodeContentRow}>
          <NodeTopicIcon
            isComplete={isComplete}
            isCurrent={isCurrent}
            isLocked={isLocked}
            isContentPending={isContentPending}
            position={node.position}
          />
          <View style={styles.nodeTitleWrap}>
            <View style={styles.nodeTitleRow}>
              <Text
                numberOfLines={2}
                style={[styles.nodeTitle, isLocked && styles.nodeTextLocked]}
              >
                {node.subStrandNumber ? (
                  <Text>{node.subStrandNumber}  </Text>
                ) : null}
                <Text>{node.title}</Text>
              </Text>
              {node.status === 'needs_practice' ? (
                <Text style={styles.practicePill}>PRACTISE</Text>
              ) : null}
              {isCurrent && node.status !== 'needs_practice' ? (
                <Text style={styles.currentPill}>CURRENT</Text>
              ) : null}
              {isContentPending ? (
                <Text style={styles.pendingPill}>SOON</Text>
              ) : null}
              {isComplete ? (
                <Text style={styles.completePill}>DONE</Text>
              ) : null}
            </View>
            <View style={styles.nodeMetaRow}>
              <Clock3 color={isLocked ? '#94A3B8' : '#64748B'} size={14} />
              <Text
                style={[styles.nodeMeta, isLocked && styles.nodeTextLocked]}
              >
                {isContentPending
                  ? 'Come back tomorrow'
                  : isUnpublished
                    ? 'Content coming soon'
                    : `${node.estimatedMinutes} min`}
              </Text>
              {node.bestScore !== null ? (
                <View style={styles.scoreWrap}>
                  <Text style={styles.scoreMeta}>{node.bestScore}% best</Text>
                  <Star color="#22C55E" size={13} strokeWidth={2.4} />
                </View>
              ) : null}
            </View>

          </View>
        </View>

        {isCurrent || isContentPending ? (
          <SquishPressable
            accessibilityLabel={`${actionLabel}: ${node.title}`}
            accessibilityRole="button"
            onPress={onOpen}
            reduceMotion={reduceMotion}
            containerStyle={styles.actionButtonWrap}
          >
            <LinearGradient
              colors={
                node.status === 'needs_practice'
                  ? ['#FB923C', '#F97316']
                  : ['#3284F5', '#1268E8']
              }
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>{actionLabel}</Text>
              <Play color="#FFFFFF" fill="#FFFFFF" size={16} />
            </LinearGradient>
          </SquishPressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

function NodeTopicIcon({
  position,
  isComplete,
  isCurrent,
  isLocked,
  isContentPending,
}: {
  position: number;
  isComplete: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  isContentPending: boolean;
}) {
  const color = isContentPending
    ? '#F97316'
    : isLocked
    ? '#94A3B8'
    : isComplete
    ? '#0EA56B'
    : isCurrent
    ? '#2563EB'
    : '#15803D';
  const icon = position % 4;
  return (
    <View
      style={[
        styles.topicIcon,
        isComplete && styles.topicIconComplete,
        isCurrent && styles.topicIconCurrent,
        isContentPending && styles.topicIconPending,
        isLocked && styles.topicIconLocked,
      ]}
    >
      {icon === 0 ? <Scale color={color} size={25} strokeWidth={2.2} /> : null}
      {icon === 1 ? (
        <PencilLine color={color} size={25} strokeWidth={2.2} />
      ) : null}
      {icon === 2 ? (
        <Calculator color={color} size={25} strokeWidth={2.2} />
      ) : null}
      {icon === 3 ? (
        <Sparkles color={color} size={25} strokeWidth={2.2} />
      ) : null}
    </View>
  );
}

function PathSkeleton() {
  return (
    <View
      accessibilityLabel="Loading learning path"
      style={styles.skeletonWrap}
    >
      {[0, 1, 2].map(index => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonDot} />
          <View style={styles.skeletonCard} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 13,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 42,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  actionButtonWrap: { marginTop: 9 },
  adventureAccent: { color: '#F97316' },
  adventureBanner: {
    alignItems: 'center',
    borderColor: '#FED7AA',
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 77,
    paddingLeft: 82,
    paddingRight: 12,
    position: 'relative',
    shadowColor: '#F97316',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  adventureMascot: {
    bottom: -8,
    height: 92,
    left: 5,
    position: 'absolute',
    width: 76,
    zIndex: 2,
  },
  adventureKicker: {
    color: '#D75B12',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  adventureText: {
    color: '#6B2C14',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  adventureTextWrap: { flex: 1, paddingBottom: 10, zIndex: 2 },
  adventureTrail: {
    bottom: 4,
    height: 40,
    left: 52,
    position: 'absolute',
    right: 20,
    zIndex: 1,
  },
  cardGlow: {
    backgroundColor: 'transparent',
    borderRadius: 70,
    height: 140,
    position: 'absolute',
    right: -78,
    top: -88,
    width: 140,
  },
  cardGlowCurrent: { backgroundColor: '#EFF6FF' },
  completePill: {
    backgroundColor: '#E8FBF1',
    borderRadius: 999,
    color: '#0EA56B',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  content: { paddingBottom: 16, paddingHorizontal: 16, paddingTop: 8 },
  contentStack: { gap: 8 },
  contentStackWeb: { opacity: 1 },
  currentPill: {
    backgroundColor: '#E7F0FF',
    borderRadius: 999,
    color: '#1268E8',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    textAlign: 'center',
  },
  emptyTitle: { color: '#0B1F4D', fontSize: 18, fontWeight: '900' },
  nodeCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    marginBottom: 6,
    overflow: 'hidden',
    padding: 11,
    shadowColor: '#0F172A',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  nodeCardComplete: { borderColor: '#DDF3E7' },
  nodeCardCurrent: {
    borderColor: '#2D7FF4',
    borderWidth: 2,
    shadowColor: '#2563EB',
    shadowOpacity: 0.13,
  },
  nodeCardLocked: {
    backgroundColor: '#FBFCFE',
    borderColor: '#E5EAF2',
    paddingVertical: 9,
  },
  nodeCardPending: {
    backgroundColor: '#FFF9F2',
    borderColor: '#FDBA74',
    borderWidth: 2,
    shadowColor: '#F97316',
    shadowOpacity: 0.1,
  },
  nodeContentRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  nodeDot: {
    alignItems: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    width: 34,
    zIndex: 2,
  },
  nodeDotComplete: { backgroundColor: '#31C87A' },
  nodeDotCurrent: { backgroundColor: '#2478EF' },
  nodeDotLocked: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D5DDE8',
    borderWidth: 1,
  },
  nodeDotPending: { backgroundColor: '#F97316' },
  nodeMeta: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  nodeMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  nodeRow: { alignItems: 'stretch', flexDirection: 'row', gap: 9 },
  nodeTextLocked: { color: '#718198' },
  nodeTitle: {
    color: '#0B1F4D',
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  nodeTitleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 6 },
  nodeTitleWrap: { flex: 1, minWidth: 0 },
  noticeCard: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: { color: '#475569', fontSize: 11, lineHeight: 17, marginTop: 3 },
  noticeTitle: { color: '#0F766E', fontSize: 13, fontWeight: '900' },
  pathList: { marginTop: 1 },
  pendingButton: {
    alignItems: 'center',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 20,
  },
  pendingButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  pendingButtonWrap: { marginTop: 20, width: '100%' },
  pendingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FED7AA',
    borderRadius: 28,
    borderWidth: 1,
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    shadowColor: '#C2410C',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
  },
  pendingContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  pendingKicker: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  pendingKickerRow: {
    alignItems: 'center',
    backgroundColor: '#FFF1E7',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pendingMascot: { borderRadius: 71, height: 142, width: 142 },
  pendingMascotHalo: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
    borderRadius: 88,
    borderWidth: 8,
    height: 176,
    justifyContent: 'center',
    marginTop: 18,
    width: 176,
  },
  pendingMessage: {
    color: '#5B6474',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    textAlign: 'center',
  },
  pendingPill: {
    backgroundColor: '#FFEDD5',
    borderRadius: 999,
    color: '#C2410C',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingPromise: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
  pendingScreen: { backgroundColor: '#FFF9F3', flex: 1 },
  pendingStrand: { color: '#64748B', fontSize: 11, fontWeight: '700', marginTop: 4 },
  pendingTitle: {
    color: '#0B1F4D',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: 16,
    textAlign: 'center',
  },
  pendingTopic: { color: '#C2410C', fontWeight: '900' },
  pendingTopicCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 17,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
    width: '100%',
  },
  pendingTopicLabel: { color: '#F97316', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  pendingTopicTitle: { color: '#0B1F4D', fontSize: 16, fontWeight: '900', lineHeight: 21, marginTop: 4 },
  practicePill: {
    backgroundColor: '#FFF0E6',
    borderRadius: 999,
    color: '#D75B12',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  progressCaption: { color: '#53657F', fontSize: 9, fontWeight: '700' },
  progressNumber: { color: '#0B9470', fontSize: 17, fontWeight: '900' },
  progressRingLabel: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  progressRingWrap: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 34,
    height: 68,
    position: 'relative',
    shadowColor: '#0F766E',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    width: 68,
    zIndex: 3,
  },
  rail: { backgroundColor: '#CDD6E2', flex: 1, marginVertical: -1, width: 2 },
  railColumn: { alignItems: 'center', width: 34 },
  railComplete: { backgroundColor: '#31C87A' },
  railCurrent: { backgroundColor: '#2478EF' },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  retryText: { color: '#0F766E', fontSize: 11, fontWeight: '900' },
  scoreMeta: { color: '#0EA56B', fontSize: 11, fontWeight: '900' },
  scoreWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    marginLeft: 5,
  },
  screen: { backgroundColor: '#F9FBFD', flex: 1 },
  skeletonCard: {
    backgroundColor: '#E8EEED',
    borderRadius: 18,
    flex: 1,
    height: 88,
  },
  skeletonDot: {
    backgroundColor: '#E2E8F0',
    borderRadius: 17,
    height: 34,
    width: 34,
  },
  skeletonRow: { flexDirection: 'row', gap: 9 },
  skeletonWrap: { gap: 9 },
  strandTitle: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 6,
    marginLeft: 43,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  topicIcon: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 17,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  topicIconComplete: { backgroundColor: '#E7FAEF' },
  topicIconCurrent: { backgroundColor: '#E7F0FF' },
  topicIconLocked: { backgroundColor: '#EEF1F5' },
  topicIconPending: { backgroundColor: '#FFEDD5' },
});

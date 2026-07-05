import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, Polygon, Rect } from 'react-native-svg';

import { ManyangaRenderState, ManyangaRenderSprite } from './mapManyangaRenderState';

interface ManyangaRendererProps {
  renderState: ManyangaRenderState;
}

// Nganya liveries: [body, accent]. Index matches engine liveryIndex.
const LIVERIES: Array<[string, string]> = [
  ['#7C3AED', '#FDE047'],
  ['#DC2626', '#FFFFFF'],
  ['#16A34A', '#FACC15'],
  ['#0EA5E9', '#F472B6'],
  ['#F97316', '#0F172A'],
];
const PLAYER_LIVERY: [string, string] = ['#7C3AED', '#FDE047'];

const MATATU_W = 118;
const MATATU_H = 92;
const COIN_SIZE = 34;

const NairobiSkyline = memo(function NairobiSkyline() {
  return (
    <View pointerEvents="none" style={styles.skylineWrap}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 18"
        preserveAspectRatio="none">
        {/* Back row — hazy distant blocks */}
        <Rect x="2" y="9" width="7" height="9" fill="#A9B8CB" />
        <Rect x="12" y="7" width="5" height="11" fill="#A9B8CB" />
        <Rect x="36" y="8" width="6" height="10" fill="#A9B8CB" />
        <Rect x="46" y="6" width="4" height="12" fill="#A9B8CB" />
        <Rect x="60" y="9" width="6" height="9" fill="#A9B8CB" />
        <Rect x="77" y="7" width="5" height="11" fill="#A9B8CB" />
        <Rect x="90" y="9" width="7" height="9" fill="#A9B8CB" />
        {/* Front row */}
        <Rect x="7" y="11" width="8" height="7" fill="#64748B" />
        <Rect x="18" y="9.5" width="5" height="8.5" fill="#64748B" />
        {/* KICC — cylinder tower + helipad disc */}
        <Rect x="26.5" y="4.5" width="4.2" height="13.5" rx="1.9" fill="#64748B" />
        <Ellipse cx="28.6" cy="4.4" rx="3.5" ry="1.15" fill="#64748B" />
        <Rect x="23.5" y="13" width="10" height="5" rx="0.8" fill="#64748B" />
        {/* mid fillers */}
        <Rect x="38" y="10" width="7" height="8" fill="#64748B" />
        <Rect x="44" y="12" width="4" height="6" fill="#64748B" />
        {/* Times Tower — slab with stepped crown */}
        <Rect x="50.5" y="3" width="5.2" height="15" fill="#64748B" />
        <Rect x="51.7" y="1.4" width="2.8" height="2" fill="#64748B" />
        <Rect x="57" y="11" width="5" height="7" fill="#64748B" />
        {/* Britam Tower — tapering tower + mast */}
        <Polygon points="64.5,18 72.5,18 70.2,4.2 66.8,4.2" fill="#64748B" />
        <Rect x="68.2" y="1.2" width="0.6" height="3.2" fill="#64748B" />
        <Rect x="74" y="9.5" width="6" height="8.5" fill="#64748B" />
        <Rect x="82" y="11.5" width="4.5" height="6.5" fill="#64748B" />
        <Rect x="87.5" y="10" width="6" height="8" fill="#64748B" />
      </Svg>
    </View>
  );
});

const AcaciaTree = memo(function AcaciaTree({
  leftPct,
  topPct,
  size,
}: {
  leftPct: number;
  topPct: number;
  size: number;
}) {
  const width = 60 * size;
  const height = 46 * size;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.treeWrap,
        {
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width,
          height,
          marginLeft: -width / 2,
          marginTop: -height,
        },
      ]}>
      <View
        style={[
          styles.treeTrunk,
          {
            left: width / 2 - 2.5 * size,
            width: 5 * size,
            height: 22 * size,
            borderRadius: 2 * size,
          },
        ]}
      />
      <View
        style={[
          styles.treeCanopy,
          { width, height: 17 * size, borderRadius: 30 * size },
        ]}
      />
      <View
        style={[
          styles.treeCanopyLower,
          {
            top: 11 * size,
            left: 8 * size,
            width: 34 * size,
            height: 10 * size,
            borderRadius: 20 * size,
          },
        ]}
      />
    </View>
  );
});

function MatatuSprite({
  scale,
  livery,
  showName,
}: {
  scale: number;
  livery: [string, string];
  showName?: boolean;
}) {
  const [body, accent] = livery;
  const s = scale;
  return (
    <View style={{ width: MATATU_W * s, height: MATATU_H * s }}>
      {/* wheels */}
      <View
        style={[
          styles.wheel,
          { left: 10 * s, width: 18 * s, height: 14 * s, borderRadius: 4 * s },
        ]}
      />
      <View
        style={[
          styles.wheel,
          { right: 10 * s, width: 18 * s, height: 14 * s, borderRadius: 4 * s },
        ]}
      />
      {/* body */}
      <View
        style={[
          styles.matatuBody,
          {
            bottom: 6 * s,
            width: MATATU_W * s,
            height: 78 * s,
            borderRadius: 12 * s,
            backgroundColor: body,
          },
        ]}>
        {/* roof strip */}
        <View style={[styles.roofStrip, { height: 10 * s }]} />
        {/* rear windshield */}
        <View
          style={[
            styles.windshield,
            {
              top: 13 * s,
              left: 14 * s,
              right: 14 * s,
              height: 26 * s,
              borderRadius: 6 * s,
            },
          ]}>
          <View
            style={[
              styles.windshieldGlare,
              { left: 8 * s, width: 16 * s, height: 26 * s },
            ]}
          />
        </View>
        {/* graffiti accent stripe */}
        <View
          style={[
            styles.accentStripe,
            {
              bottom: 22 * s,
              left: -6 * s,
              right: -6 * s,
              height: 13 * s,
              backgroundColor: accent,
            },
          ]}>
          {showName && s > 0.5 ? (
            <Text
              numberOfLines={1}
              style={[
                styles.matatuName,
                { color: body, fontSize: 9 * s, letterSpacing: 1.5 * s },
              ]}>
              MANYANGA
            </Text>
          ) : null}
        </View>
        {/* brake lights */}
        <View
          style={[
            styles.brakeLight,
            {
              left: 8 * s,
              bottom: 8 * s,
              width: 10 * s,
              height: 6 * s,
              borderRadius: 2 * s,
            },
          ]}
        />
        <View
          style={[
            styles.brakeLight,
            {
              right: 8 * s,
              bottom: 8 * s,
              width: 10 * s,
              height: 6 * s,
              borderRadius: 2 * s,
            },
          ]}
        />
        {/* number plate */}
        <View
          style={[
            styles.numberPlate,
            {
              bottom: 7 * s,
              left: MATATU_W * s * 0.5 - 13 * s,
              width: 26 * s,
              height: 8 * s,
              borderRadius: 2 * s,
            },
          ]}
        />
      </View>
      {/* bumper */}
      <View
        style={[
          styles.bumper,
          {
            bottom: 4 * s,
            left: 4 * s,
            right: 4 * s,
            height: 8 * s,
            borderRadius: 4 * s,
          },
        ]}
      />
    </View>
  );
}

function CoinSprite({ scale }: { scale: number }) {
  const size = COIN_SIZE * scale;
  return (
    <View
      style={[
        styles.coinOuter,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(1, 3 * scale),
        },
      ]}>
      <View
        style={[
          styles.coinInner,
          {
            width: size * 0.45,
            height: size * 0.45,
            borderRadius: size * 0.225,
            borderWidth: Math.max(1, 2 * scale),
          },
        ]}
      />
    </View>
  );
}

function WorldSprite({ sprite }: { sprite: ManyangaRenderSprite }) {
  const isCoin = sprite.kind === 'coin';
  const width = (isCoin ? COIN_SIZE : MATATU_W) * sprite.scale;
  const height = (isCoin ? COIN_SIZE : MATATU_H) * sprite.scale;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.worldSprite,
        {
          left: `${sprite.xPct}%`,
          top: `${sprite.yPct}%`,
          marginLeft: -width / 2,
          marginTop: -height,
        },
      ]}>
      {isCoin ? (
        <CoinSprite scale={sprite.scale} />
      ) : (
        <MatatuSprite
          scale={sprite.scale}
          livery={LIVERIES[sprite.liveryIndex % LIVERIES.length]}
        />
      )}
    </View>
  );
}

export function ManyangaRenderer({ renderState }: ManyangaRendererProps) {
  const [fieldWidth, setFieldWidth] = useState(Dimensions.get('window').width);
  const playerTranslateX = useRef(new Animated.Value(0)).current;
  const playerOpacity = useRef(new Animated.Value(1)).current;
  const blinkLoop = useRef<Animated.CompositeAnimation | null>(null);

  const player = renderState.player;
  const playerWidth = MATATU_W * player.scale;
  const playerHeight = MATATU_H * player.scale;
  const playerTargetPx = ((player.xPct - 50) / 100) * fieldWidth;

  useEffect(() => {
    Animated.spring(playerTranslateX, {
      toValue: playerTargetPx,
      tension: 120,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [playerTargetPx, playerTranslateX]);

  useEffect(() => {
    if (player.blinking) {
      blinkLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(playerOpacity, {
            toValue: 0.35,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.timing(playerOpacity, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
        ]),
      );
      blinkLoop.current.start();
      return () => {
        blinkLoop.current?.stop();
        playerOpacity.setValue(1);
      };
    }
    blinkLoop.current?.stop();
    playerOpacity.setValue(1);
    return undefined;
  }, [player.blinking, playerOpacity]);

  const trees = useMemo(
    () => (
      <>
        <AcaciaTree leftPct={10} topPct={46} size={0.5} />
        <AcaciaTree leftPct={4} topPct={62} size={0.9} />
        <AcaciaTree leftPct={11} topPct={84} size={1.5} />
        <AcaciaTree leftPct={90} topPct={48} size={0.55} />
        <AcaciaTree leftPct={96} topPct={66} size={1.0} />
        <AcaciaTree leftPct={88} topPct={88} size={1.6} />
      </>
    ),
    [],
  );

  return (
    <View
      style={styles.playfield}
      onLayout={event => setFieldWidth(event.nativeEvent.layout.width)}>
      {/* Sky */}
      <LinearGradient
        colors={['#7DD3FC', '#BAE6FD', '#FEF3C7']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.sun} />
      <View style={styles.cloud} />
      <View style={[styles.cloud, styles.cloudTwo]} />

      <NairobiSkyline />

      {/* Ground */}
      <LinearGradient
        colors={['#A8DB60', '#569224']}
        style={[styles.ground, { top: `${renderState.horizonYPct}%` }]}
      />

      {trees}

      {/* Road + markings */}
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 100"
        preserveAspectRatio="none">
        <Polygon points={renderState.roadPolygonPoints} fill="#3F3F46" />
        <Polygon points={renderState.edgeLines.left} fill="#FACC15" />
        <Polygon points={renderState.edgeLines.right} fill="#FACC15" />
        {renderState.dashes.map(dash => (
          <Rect
            key={dash.key}
            x={dash.xPct - 0.8 * dash.scale}
            y={dash.yPct - 5.5 * dash.scale}
            width={1.6 * dash.scale}
            height={5.5 * dash.scale}
            fill="#F8FAFC"
            opacity={0.9}
          />
        ))}
      </Svg>

      {/* Traffic + coins, far to near */}
      {renderState.sprites.map(sprite => (
        <WorldSprite key={`${sprite.kind}-${sprite.id}`} sprite={sprite} />
      ))}

      {/* Player matatu */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.playerWrap,
          {
            top: `${player.yPct}%`,
            marginLeft: -playerWidth / 2,
            marginTop: -playerHeight,
            opacity: playerOpacity,
            transform: [{ translateX: playerTranslateX }],
          },
        ]}>
        <MatatuSprite scale={player.scale} livery={PLAYER_LIVERY} showName />
      </Animated.View>

      {/* Speed streaks */}
      <View pointerEvents="none" style={[styles.speedLine, styles.speedLineLeft]} />
      <View pointerEvents="none" style={[styles.speedLine, styles.speedLineRight]} />

      {renderState.showHint ? (
        <View style={styles.hintCard} pointerEvents="none">
          <Text style={styles.hintTitle}>Swipe or tap to change lanes</Text>
          <Text style={styles.hintBody}>
            Dodge the matatus, grab coins. Crash? Answer fast to keep racing!
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  playfield: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#7DD3FC',
  },
  sun: {
    position: 'absolute',
    top: '5%',
    right: '9%',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FDE68A',
  },
  cloud: {
    position: 'absolute',
    top: '9%',
    left: '10%',
    width: 88,
    height: 30,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  cloudTwo: {
    top: '16%',
    left: '58%',
    width: 110,
  },
  skylineWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '16%',
    height: '18%',
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  treeWrap: { position: 'absolute' },
  treeTrunk: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#854D0E',
  },
  treeCanopy: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#3F6212',
  },
  treeCanopyLower: {
    position: 'absolute',
    backgroundColor: '#4D7C0F',
  },
  wheel: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#1F2937',
  },
  matatuBody: {
    position: 'absolute',
    left: 0,
    overflow: 'hidden',
  },
  roofStrip: { backgroundColor: 'rgba(255,255,255,0.85)' },
  windshield: {
    position: 'absolute',
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  windshieldGlare: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ rotate: '18deg' }],
  },
  accentStripe: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-3deg' }],
  },
  matatuName: { fontWeight: '900' },
  brakeLight: {
    position: 'absolute',
    backgroundColor: '#F87171',
  },
  numberPlate: {
    position: 'absolute',
    backgroundColor: '#F8FAFC',
  },
  bumper: {
    position: 'absolute',
    backgroundColor: '#334155',
  },
  coinOuter: {
    backgroundColor: '#FBBF24',
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInner: { borderColor: '#FDE68A' },
  worldSprite: { position: 'absolute' },
  playerWrap: { position: 'absolute', left: '50%' },
  speedLine: {
    position: 'absolute',
    top: '58%',
    width: 3,
    height: 46,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  speedLineLeft: { left: '5%', transform: [{ rotate: '8deg' }] },
  speedLineRight: { right: '5%', transform: [{ rotate: '-8deg' }] },
  hintCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 26,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  hintTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  hintBody: { color: '#E2E8F0', lineHeight: 20 },
});

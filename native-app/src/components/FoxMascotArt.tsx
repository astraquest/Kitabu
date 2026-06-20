import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

export type FoxMascotMood = 'thinking' | 'thumbs-up' | 'note' | 'celebrate' | 'wave';

interface FoxMascotArtProps {
  mood?: FoxMascotMood;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function FoxMascotArt({ mood = 'thinking', size = 150, style }: FoxMascotArtProps) {
  const isCelebrate = mood === 'celebrate';
  const isThumbsUp = mood === 'thumbs-up';
  const isNote = mood === 'note';
  const isWave = mood === 'wave';
  const isThinking = mood === 'thinking';

  return (
    <View style={style} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 220 220">
        <Defs>
          <LinearGradient id="foxBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FB923C" />
            <Stop offset="55%" stopColor="#F97316" />
            <Stop offset="100%" stopColor="#EA580C" />
          </LinearGradient>
          <LinearGradient id="foxTail" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FDBA74" />
            <Stop offset="60%" stopColor="#F97316" />
            <Stop offset="100%" stopColor="#C2410C" />
          </LinearGradient>
          <LinearGradient id="belly" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFF7ED" />
            <Stop offset="100%" stopColor="#FED7AA" />
          </LinearGradient>
        </Defs>

        {isCelebrate ? (
          <G>
            <Rect x="29" y="20" width="8" height="16" rx="2" fill="#60A5FA" transform="rotate(-18 33 28)" />
            <Rect x="176" y="34" width="8" height="16" rx="2" fill="#A78BFA" transform="rotate(28 180 42)" />
            <Rect x="51" y="46" width="8" height="14" rx="2" fill="#34D399" transform="rotate(31 55 53)" />
            <Rect x="162" y="72" width="8" height="14" rx="2" fill="#FBBF24" transform="rotate(-32 166 79)" />
            <Path d="M34 82l5 10 10 5-10 5-5 10-5-10-10-5 10-5z" fill="#FDE68A" />
          </G>
        ) : null}

        <Ellipse cx="108" cy="198" rx="58" ry="10" fill="#0F172A" opacity="0.12" />
        <Path
          d="M145 142c22-28 46-31 56-18 9 12 2 32-17 45-18 13-39 16-59 6z"
          fill="url(#foxTail)"
        />
        <Path
          d="M173 134c13-9 26-9 32-2 5 7 1 19-11 27-10 7-23 10-36 7 14-7 20-18 15-32z"
          fill="#FFF7ED"
        />
        <Ellipse cx="105" cy="145" rx="45" ry="55" fill="url(#foxBody)" />
        <Path d="M82 113c5 37 10 60 23 70 14-11 22-34 25-70z" fill="url(#belly)" />

        {isThumbsUp ? (
          <G>
            <Path d="M60 132c-20 7-27 23-23 31 5 8 20 1 31-16z" fill="#F97316" />
            <Path d="M39 127c7-7 13-4 13 7v17c0 8-13 8-15 1l-4-15c-1-4 1-8 6-10z" fill="#3B2417" />
            <Path d="M52 127c4-13 11-15 15-10 3 5 0 13-8 22z" fill="#3B2417" />
          </G>
        ) : isCelebrate ? (
          <G>
            <Path d="M65 124c-17-16-21-32-13-38 8-6 20 7 28 31z" fill="#F97316" />
            <Path d="M150 124c17-16 21-32 13-38-8-6-20 7-28 31z" fill="#F97316" />
            <Circle cx="51" cy="86" r="7" fill="#3B2417" />
            <Circle cx="164" cy="86" r="7" fill="#3B2417" />
          </G>
        ) : isWave ? (
          <G>
            <Path d="M65 126c-22-13-28-29-21-37 7-7 19 4 33 29z" fill="#F97316" />
            <Circle cx="43" cy="89" r="8" fill="#3B2417" />
          </G>
        ) : (
          <G>
            <Path d="M64 129c-18 10-23 27-16 34 6 7 19-1 27-20z" fill="#F97316" />
            <Path d="M149 129c18 10 23 27 16 34-6 7-19-1-27-20z" fill="#F97316" />
          </G>
        )}

        <Path d="M80 191c0-17 10-27 22-27s22 10 22 27z" fill="#3B2417" />
        <Path d="M78 187h28v9H76c-5 0-6-7 2-9z" fill="#2A170E" />
        <Path d="M112 187h28c8 2 7 9 2 9h-30z" fill="#2A170E" />

        <Path d="M59 71L42 22c-2-6 4-12 10-8l38 29z" fill="#F97316" />
        <Path d="M151 71l17-49c2-6-4-12-10-8l-38 29z" fill="#F97316" />
        <Path d="M59 52L51 26l22 19z" fill="#FED7AA" />
        <Path d="M151 52l8-26-22 19z" fill="#FED7AA" />
        <Ellipse cx="105" cy="82" rx="61" ry="49" fill="url(#foxBody)" />
        <Path d="M46 85c18 2 31 11 40 25-27 9-46 2-56-15 4-7 9-10 16-10z" fill="#FFF7ED" />
        <Path d="M164 85c-18 2-31 11-40 25 27 9 46 2 56-15-4-7-9-10-16-10z" fill="#FFF7ED" />
        <Ellipse cx="105" cy="101" rx="30" ry="23" fill="#FFF7ED" />
        <Ellipse cx="105" cy="93" rx="9" ry="7" fill="#2A170E" />

        {isCelebrate ? (
          <G>
            <Path d="M78 78c4 8 13 8 18 0" stroke="#2A170E" strokeWidth="5" strokeLinecap="round" fill="none" />
            <Path d="M115 78c4 8 13 8 18 0" stroke="#2A170E" strokeWidth="5" strokeLinecap="round" fill="none" />
            <Path d="M92 107c8 12 21 12 28 0" fill="#2A170E" />
            <Path d="M101 116c5 3 10 3 15 0" stroke="#FCA5A5" strokeWidth="4" strokeLinecap="round" />
          </G>
        ) : isNote ? (
          <G>
            <Path d="M76 77c7-3 14-3 20 1" stroke="#2A170E" strokeWidth="5" strokeLinecap="round" fill="none" />
            <Path d="M118 81c7 2 14 1 20-3" stroke="#2A170E" strokeWidth="5" strokeLinecap="round" fill="none" />
            <Circle cx="86" cy="88" r="5" fill="#2A170E" />
            <Circle cx="124" cy="88" r="5" fill="#2A170E" />
            <Path d="M95 111c7 4 15 4 22 0" stroke="#2A170E" strokeWidth="4" strokeLinecap="round" fill="none" />
          </G>
        ) : (
          <G>
            <Circle cx="84" cy="86" r="7" fill="#FFFFFF" />
            <Circle cx="126" cy="86" r="7" fill="#FFFFFF" />
            <Circle cx="86" cy="87" r="4" fill="#2A170E" />
            <Circle cx="124" cy="87" r="4" fill="#2A170E" />
            {isThinking ? (
              <Path d="M94 112c6-4 17-4 23 0" stroke="#2A170E" strokeWidth="4" strokeLinecap="round" fill="none" />
            ) : (
              <Path d="M91 108c8 11 22 11 30 0" stroke="#2A170E" strokeWidth="4" strokeLinecap="round" fill="none" />
            )}
          </G>
        )}

        {isThinking ? (
          <G>
            <Circle cx="159" cy="45" r="5" fill="#FFFFFF" opacity="0.9" />
            <Circle cx="176" cy="32" r="7" fill="#FFFFFF" opacity="0.82" />
            <Circle cx="197" cy="20" r="10" fill="#FFFFFF" opacity="0.74" />
            <Path d="M104 35c-7-8-17-8-24 0" stroke="#2A170E" strokeWidth="5" strokeLinecap="round" fill="none" />
            <Path d="M129 35c7-8 17-8 24 0" stroke="#2A170E" strokeWidth="5" strokeLinecap="round" fill="none" />
          </G>
        ) : null}

        {isNote ? (
          <G>
            <Rect x="122" y="123" width="54" height="39" rx="7" fill="#64748B" />
            <Rect x="128" y="129" width="42" height="27" rx="4" fill="#CBD5E1" />
            <Path d="M134 137h27M134 146h20" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
            <Path d="M89 139c12-3 23 1 35 11" stroke="#3B2417" strokeWidth="10" strokeLinecap="round" />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

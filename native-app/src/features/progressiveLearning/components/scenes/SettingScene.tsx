import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import type { LearningVisualSpec } from '../../types';
import { ConceptIllustration } from './ConceptIllustration';
import { SceneFrame } from './SceneFrame';
import { sceneTheme } from './sceneTheme';

type SettingSpec = Extract<LearningVisualSpec, { kind: 'scene' }>;
type Setting = SettingSpec['setting'];

const SETTING_NAMES: Record<Setting, string> = {
  classroom: 'OUR CLASSROOM',
  garden: 'SCHOOL GARDEN',
  home: 'AT HOME',
  market: 'MARKET DAY',
  community: 'OUR COMMUNITY',
  nature: 'OUT IN NATURE',
  studio: 'CREATIVE STUDIO',
  computer_lab: 'COMPUTER LAB',
};

export function SettingScene({ spec }: { spec: SettingSpec }) {
  return (
    <SceneFrame
      accessibilityLabel={spec.caption}
      sceneKey={`setting-${spec.setting}-${spec.caption}`}
      tone="sky"
    >
      <View style={styles.stage}>
        <SettingBackdrop setting={spec.setting} />
        <Text style={styles.settingName}>{SETTING_NAMES[spec.setting]}</Text>
        <View style={styles.elements}>
          {spec.elements.map(element => (
            <View
              key={element.id}
              style={[
                styles.element,
                element.state === 'highlighted' && styles.highlighted,
                element.state === 'muted' && styles.muted,
              ]}
            >
              {element.count !== undefined ? (
                <Text style={styles.count}>{element.count}</Text>
              ) : null}
              <ConceptIllustration
                context={spec.setting}
                label={element.label}
                size={36}
              />
              <Text numberOfLines={2} style={styles.elementLabel}>
                {element.label}
              </Text>
              {element.state === 'highlighted' ? (
                <Text style={styles.focus}>FOCUS</Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </SceneFrame>
  );
}

function SettingBackdrop({ setting }: { setting: Setting }) {
  return (
    <Svg
      height="150"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 340 150"
      width="100%"
    >
      <Rect fill="#EAF4FF" height="150" width="340" />
      <Circle cx="291" cy="23" fill="#FFD665" r="14" />
      {setting === 'garden' || setting === 'nature' ? (
        <Outdoor setting={setting} />
      ) : null}
      {setting === 'market' || setting === 'community' ? (
        <Town setting={setting} />
      ) : null}
      {setting === 'home' ? <Home /> : null}
      {setting === 'classroom' ? <Classroom /> : null}
      {setting === 'studio' ? <Studio /> : null}
      {setting === 'computer_lab' ? <ComputerLab /> : null}
    </Svg>
  );
}

function Outdoor({ setting }: { setting: 'garden' | 'nature' }) {
  return (
    <G>
      <Path
        d="M0 86 Q55 58 112 88 Q174 51 226 87 Q286 60 340 83 V150 H0Z"
        fill="#BFE8CE"
      />
      <Path
        d="M0 108 Q64 82 124 111 Q190 74 248 111 Q298 88 340 103 V150 H0Z"
        fill="#67B985"
      />
      {setting === 'garden' ? (
        <>
          {[45, 84, 123, 162, 201, 240].map(x => (
            <G key={x}>
              <Line
                stroke="#7A5535"
                strokeWidth="3"
                x1={x}
                x2={x}
                y1="107"
                y2="133"
              />
              <Circle cx={x - 5} cy="104" fill="#45A96C" r="7" />
              <Circle cx={x + 5} cy="102" fill="#58BD75" r="7" />
            </G>
          ))}
          <Path
            d="M18 139 Q111 118 197 139 T340 139"
            fill="none"
            stroke="#94643C"
            strokeWidth="9"
          />
        </>
      ) : (
        <>
          <Path d="M52 110 L69 57 L86 110Z" fill="#5D9470" />
          <Circle cx="69" cy="54" fill="#347A55" r="22" />
          <Path d="M264 116 L276 76 L288 116Z" fill="#5D9470" />
          <Circle cx="276" cy="73" fill="#3D8960" r="18" />
          <Path d="M128 150 Q163 105 201 150" fill="#80CCE4" />
        </>
      )}
    </G>
  );
}

function Town({ setting }: { setting: 'market' | 'community' }) {
  return (
    <G>
      <Rect fill="#E7D9BD" height="53" width="340" y="97" />
      <Path
        d="M0 108 L340 108"
        stroke="#FFFFFF"
        strokeDasharray="16 9"
        strokeWidth="3"
      />
      {setting === 'market' ? (
        <>
          {[20, 105, 190, 275].map((x, index) => (
            <G key={x}>
              <Rect fill="#FFF7E7" height="49" rx="4" width="60" x={x} y="45" />
              <Path
                d={`M${x - 4} 48 L${x + 30} 24 L${x + 64} 48Z`}
                fill={index % 2 ? sceneTheme.teal : sceneTheme.orange}
              />
              <Path
                d={`M${x + 7} 50 V93 M${x + 53} 50 V93`}
                stroke="#8B6749"
                strokeWidth="3"
              />
              <Rect
                fill="#C77842"
                height="10"
                rx="3"
                width="49"
                x={x + 6}
                y="69"
              />
            </G>
          ))}
        </>
      ) : (
        <>
          <Rect fill="#F7C85A" height="66" rx="4" width="91" x="34" y="30" />
          <Path d="M24 35 L79 6 L135 35Z" fill="#E56B57" />
          <Rect fill="#6AA9D8" height="34" width="25" x="68" y="62" />
          <Rect fill="#F6F0DF" height="56" rx="4" width="104" x="204" y="40" />
          <Path d="M194 44 L256 12 L318 44Z" fill="#4B8B67" />
          <Rect fill="#83BCE1" height="24" width="28" x="222" y="57" />
          <Rect fill="#83BCE1" height="24" width="28" x="265" y="57" />
        </>
      )}
    </G>
  );
}

function Home() {
  return (
    <G>
      <Rect fill="#F3DFC0" height="72" width="226" x="57" y="57" />
      <Path d="M39 62 L170 8 L301 62Z" fill="#D15E4C" />
      <Rect fill="#7FC4E6" height="37" width="45" x="86" y="73" />
      <Path d="M108 73 V110 M86 91 H131" stroke="#FFFFFF" strokeWidth="3" />
      <Rect fill="#8B5D3E" height="56" width="43" x="199" y="73" />
      <Circle cx="231" cy="100" fill="#F5CA5C" r="3" />
      <Path d="M0 130 H340 V150 H0Z" fill="#72BA7D" />
    </G>
  );
}

function Classroom() {
  return (
    <G>
      <Rect fill="#FFF6DD" height="114" width="340" y="36" />
      <Rect fill="#315A68" height="55" rx="4" width="145" x="97" y="44" />
      <Path
        d="M116 65 H217 M116 80 H194"
        stroke="#E4F7ED"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <Rect fill="#BA7A4B" height="19" rx="4" width="86" x="37" y="112" />
      <Rect fill="#BA7A4B" height="19" rx="4" width="86" x="217" y="112" />
      <Path
        d="M49 131 V147 M111 131 V147 M229 131 V147 M291 131 V147"
        stroke="#805034"
        strokeWidth="5"
      />
    </G>
  );
}

function Studio() {
  return (
    <G>
      <Rect fill="#FFF2E5" height="114" width="340" y="36" />
      <Path
        d="M88 130 L126 50 L164 130 M104 97 H148"
        fill="none"
        stroke="#895A3B"
        strokeWidth="7"
      />
      <Rect
        fill="#FFFFFF"
        height="62"
        rx="4"
        stroke="#C98865"
        strokeWidth="4"
        width="72"
        x="90"
        y="48"
      />
      <Circle cx="112" cy="68" fill={sceneTheme.coral} r="10" />
      <Path d="M100 99 Q126 71 153 99" fill="#65B987" />
      <Path d="M212 132 Q233 89 254 132" fill="#D8A66C" />
      <Circle cx="233" cy="87" fill="#F6CE68" r="19" />
      <Circle cx="229" cy="83" fill={sceneTheme.blue} r="5" />
      <Circle cx="241" cy="91" fill={sceneTheme.coral} r="5" />
    </G>
  );
}

function ComputerLab() {
  return (
    <G>
      <Rect fill="#EDE8F9" height="114" width="340" y="36" />
      {[35, 127, 219].map(x => (
        <G key={x}>
          <Rect fill="#2D4662" height="53" rx="7" width="78" x={x} y="54" />
          <Rect fill="#70B9DF" height="39" rx="3" width="64" x={x + 7} y="61" />
          <Path
            d={`M${x + 39} 107 V121 M${x + 21} 122 H${x + 57}`}
            stroke="#617894"
            strokeWidth="5"
          />
          <Rect fill="#C48A5C" height="9" rx="3" width="90" x={x - 6} y="127" />
        </G>
      ))}
    </G>
  );
}

const styles = StyleSheet.create({
  count: {
    backgroundColor: sceneTheme.ink,
    borderRadius: 999,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    minWidth: 20,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 3,
    position: 'absolute',
    right: -5,
    textAlign: 'center',
    top: -6,
  },
  element: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: sceneTheme.border,
    borderRadius: 13,
    borderWidth: 1.5,
    elevation: 2,
    flexBasis: '28%',
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: '47%',
    minHeight: 79,
    paddingHorizontal: 7,
    paddingVertical: 7,
    shadowColor: sceneTheme.shadow,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 5,
  },
  elementLabel: {
    color: sceneTheme.ink,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
    textAlign: 'center',
  },
  elements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginHorizontal: 8,
    marginTop: 61,
  },
  focus: {
    color: sceneTheme.blueDark,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 3,
  },
  highlighted: {
    backgroundColor: '#E6EEFF',
    borderColor: sceneTheme.blue,
    borderWidth: 2.5,
    transform: [{ translateY: -3 }],
  },
  muted: { opacity: 0.5 },
  settingName: {
    alignSelf: 'center',
    backgroundColor: 'rgba(24,49,83,0.88)',
    borderRadius: 999,
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginTop: 6,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  stage: {
    borderRadius: 18,
    minHeight: 208,
    overflow: 'hidden',
    position: 'relative',
  },
});

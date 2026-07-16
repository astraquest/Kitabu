import React from 'react';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
} from 'react-native-svg';

import { sceneTheme } from './sceneTheme';

export type ConceptKind =
  | 'plant'
  | 'water'
  | 'soil'
  | 'sun'
  | 'air'
  | 'heart'
  | 'lungs'
  | 'circuit'
  | 'map'
  | 'language'
  | 'paint'
  | 'rhythm'
  | 'shield'
  | 'computer'
  | 'verify'
  | 'food'
  | 'wash'
  | 'book'
  | 'person'
  | 'animal'
  | 'force'
  | 'money'
  | 'laboratory'
  | 'tools'
  | 'fire'
  | 'sport'
  | 'goal'
  | 'dialogue'
  | 'molecule'
  | 'geometry'
  | 'pattern'
  | 'blocks';

type Context =
  | 'classroom'
  | 'garden'
  | 'home'
  | 'market'
  | 'community'
  | 'nature'
  | 'studio'
  | 'computer_lab'
  | 'card';

interface ConceptIllustrationProps {
  context?: Context;
  label: string;
  size?: number;
}

const includesAny = (value: string, terms: string[]) =>
  terms.some(term => value.includes(term));

/**
 * Converts authored curriculum language into a compact visual vocabulary.
 * The label remains the source of truth; this never infers a lesson answer.
 */
export function resolveConceptKind(
  label: string,
  context: Context = 'card',
): ConceptKind {
  const value = label.toLocaleLowerCase();

  if (includesAny(value, ['fire', 'flame', 'extinguisher', 'fire triangle'])) {
    return 'fire';
  }
  if (includesAny(value, ['atom', 'molecule', 'chemical element', 'elements and compounds', 'compound', 'particle'])) {
    return 'molecule';
  }
  if (includesAny(value, ['geometry', 'compass tool', 'set square', 'angle', 'plane shape'])) {
    return 'geometry';
  }
  if (
    includesAny(value, [
      'laboratory',
      'lab ',
      'experiment',
      'investigation',
      'test tube',
      'beaker',
      'fair test',
      'observe safely',
    ])
  ) {
    return 'laboratory';
  }
  if (
    includesAny(value, [
      'tool',
      'workshop',
      'hammer',
      'ruler',
      'maker',
      'technical drawing',
      'protective equipment',
      'ppe',
    ])
  ) {
    return 'tools';
  }
  if (
    includesAny(value, [
      'money',
      'income',
      'budget',
      'saving',
      'financial',
      'price',
      'cost',
      'payment',
      'business',
      'enterprise',
    ])
  ) {
    return 'money';
  }
  if (
    includesAny(value, [
      'football',
      'volleyball',
      'sport',
      'ball',
      'serve',
      'dribble',
      'athletics',
      'fitness',
      'relay',
    ])
  ) {
    return 'sport';
  }
  if (
    includesAny(value, [
      'goal',
      'milestone',
      'personal growth',
      'growth area',
      'habit',
      'self-esteem',
      'strength',
      'plan step',
      'values path',
      'community service',
      'service hands',
      'peace circle',
      'responsible living',
    ])
  ) {
    return 'goal';
  }
  if (
    includesAny(value, [
      'dialogue',
      'conversation',
      'listen',
      'speaker',
      'tone',
      'mood',
      'greeting',
      'maamkuzi',
      'mazungumzo',
      'usikilizaji',
    ])
  ) {
    return 'dialogue';
  }

  if (
    includesAny(value, [
      'password',
      'private',
      'safety',
      'protect',
      'blocked',
      'log out',
      'logout',
      'address',
      'secret',
    ])
  ) {
    return 'shield';
  }
  if (
    includesAny(value, [
      'trusted',
      'verify',
      'check',
      'evidence',
      'official',
      'source',
      'correct your notes',
    ])
  ) {
    return 'verify';
  }
  if (
    includesAny(value, [
      'computer',
      'screen',
      'digital',
      'ai ',
      'ai asks',
      'prompt',
      'generated',
      'save work',
      'signs in',
    ]) ||
    context === 'computer_lab'
  ) {
    return 'computer';
  }
  if (
    includesAny(value, [
      'circuit',
      'battery',
      'bulb',
      'switch',
      'wire',
      'electric',
    ])
  ) {
    return 'circuit';
  }
  if (includesAny(value, ['heart', 'blood', 'heartbeat', 'pump'])) {
    return 'heart';
  }
  if (includesAny(value, ['lung', 'breath', 'oxygen', 'gill'])) {
    return 'lungs';
  }
  if (includesAny(value, ['wash', 'soap', 'rinse', 'dry hands'])) {
    return 'wash';
  }
  if (
    includesAny(value, [
      'ugali',
      'beans',
      'sukuma',
      'cabbage',
      'fruit',
      'orange',
      'rice',
      'food',
      'meal',
      'plate',
      'tomato',
    ])
  ) {
    return 'food';
  }
  if (
    includesAny(value, [
      'compass',
      'north',
      'south',
      'east',
      'west',
      'route',
      'map',
      'road',
      'bridge',
      'clinic',
      'library',
      'bus stop',
      'move ',
    ])
  ) {
    return 'map';
  }
  if (includesAny(value, ['river', 'water', 'rain', 'drop', 'gutter', 'moist'])) {
    return 'water';
  }
  if (includesAny(value, ['soil', 'clay', 'sand', 'humus', 'gritty', 'slope'])) {
    return 'soil';
  }
  if (includesAny(value, ['sun', 'light', 'dark', 'shadow'])) {
    return 'sun';
  }
  if (/(^|\s)air($|\s|[,.])/.test(value) || value.includes('wind')) {
    return 'air';
  }
  if (
    includesAny(value, [
      'seed',
      'root',
      'shoot',
      'plant',
      'leaf',
      'leaves',
      'flower',
      'pod',
      'crop',
      'grass',
      'weed',
      'tree',
      'nutrient',
      'harvest',
    ]) ||
    context === 'garden'
  ) {
    return 'plant';
  }
  if (
    includesAny(value, [
      'paint',
      'colour',
      'color',
      'blue',
      'yellow',
      'green',
      'red',
      'white',
      'black',
      'tint',
      'artist',
      'mural',
      'craft',
      'bright',
      'muted',
    ]) ||
    context === 'studio'
  ) {
    return 'paint';
  }
  if (
    includesAny(value, [
      'clap',
      'beat',
      'rhythm',
      'music',
      'soft',
      'loud',
      'instrument',
      'dance',
      'stage',
      'performance',
      'ta |',
      'ti-ti',
    ])
  ) {
    return 'rhythm';
  }
  if (
    includesAny(value, [
      'pattern',
      'over',
      'under',
      'weav',
      'paper strip',
      'circle',
      'triangle',
      'dot',
    ])
  ) {
    return 'pattern';
  }
  if (
    includesAny(value, [
      'word',
      'sentence',
      'verb',
      'noun',
      'pronoun',
      'adjective',
      'adverb',
      'capital',
      'question',
      'meaning',
      'kiwakilishi',
      'kitenzi',
      'nomino',
      'sentensi',
      'andika',
      'soma',
      'jana',
      'leo',
      'kesho',
      'tulisoma',
      'tunasoma',
      'tutasoma',
      'small',
      'ran',
    ])
  ) {
    return 'language';
  }
  if (
    includesAny(value, [
      'book',
      'read',
      'story',
      'flask',
      'calendar',
      'kalenda',
      'timetable',
      'notes',
    ])
  ) {
    return 'book';
  }
  if (
    includesAny(value, [
      'learner',
      'teacher',
      'classmate',
      'family',
      'musa',
      'naliaka',
      'rehema',
      'amina',
      'juma',
      'neema',
      'zuri',
      'kato',
      'baraka',
      'farmer',
      'leader',
      'shoppers',
      'wauzaji',
      'wanunuzi',
    ])
  ) {
    return 'person';
  }
  if (
    includesAny(value, [
      'fish',
      'bird',
      'grasshopper',
      'cattle',
      'chicken',
      'kuku',
      'puppy',
      'goat',
      'insect',
    ])
  ) {
    return 'animal';
  }
  if (
    includesAny(value, [
      'push',
      'pull',
      'force',
      'wheelbarrow',
      'moving',
      'run',
      'muscles work',
    ])
  ) {
    return 'force';
  }
  if (context === 'nature') return 'plant';
  if (context === 'community') return 'map';
  if (context === 'classroom') return 'book';
  if (context === 'home') return 'person';
  if (context === 'market') return 'food';
  return 'blocks';
}

export function ConceptIllustration({
  context = 'card',
  label,
  size = 44,
}: ConceptIllustrationProps) {
  const kind = resolveConceptKind(label, context);
  return (
    <Svg
      height={size}
      testID={`concept-art-${kind}`}
      viewBox="0 0 80 64"
      width={size}
    >
      <ConceptArtwork kind={kind} label={label.toLocaleLowerCase()} />
    </Svg>
  );
}

function ConceptArtwork({ kind, label }: { kind: ConceptKind; label: string }) {
  switch (kind) {
    case 'plant':
      return <PlantArtwork label={label} />;
    case 'water':
      return <WaterArtwork />;
    case 'soil':
      return <SoilArtwork />;
    case 'sun':
      return <SunArtwork label={label} />;
    case 'air':
      return <AirArtwork />;
    case 'heart':
      return <HeartArtwork />;
    case 'lungs':
      return <LungsArtwork />;
    case 'circuit':
      return <CircuitArtwork label={label} />;
    case 'map':
      return <MapArtwork label={label} />;
    case 'language':
      return <LanguageArtwork />;
    case 'paint':
      return <PaintArtwork label={label} />;
    case 'rhythm':
      return <RhythmArtwork />;
    case 'shield':
      return <ShieldArtwork />;
    case 'computer':
      return <ComputerArtwork />;
    case 'verify':
      return <VerifyArtwork />;
    case 'food':
      return <FoodArtwork />;
    case 'wash':
      return <WashArtwork />;
    case 'book':
      return <BookArtwork />;
    case 'person':
      return <PersonArtwork />;
    case 'animal':
      return <AnimalArtwork label={label} />;
    case 'force':
      return <ForceArtwork />;
    case 'money':
      return <MoneyArtwork />;
    case 'laboratory':
      return <LaboratoryArtwork />;
    case 'tools':
      return <ToolsArtwork />;
    case 'fire':
      return <FireArtwork />;
    case 'sport':
      return <SportArtwork />;
    case 'goal':
      return <GoalArtwork />;
    case 'dialogue':
      return <DialogueArtwork />;
    case 'molecule':
      return <MoleculeArtwork />;
    case 'geometry':
      return <GeometryArtwork />;
    case 'pattern':
      return <PatternArtwork />;
    case 'blocks':
      return <BlocksArtwork />;
  }
}

function PlantArtwork({ label }: { label: string }) {
  const seedOnly = includesAny(label, ['dry seed', 'full clean seed', 'mouldy seed', 'broken seed']);
  const flower = includesAny(label, ['flower', 'pod', 'harvest', 'mature']);
  const rootFocus = label.includes('root');
  return (
    <G>
      <Path d="M7 44 Q39 34 73 44 V62 H7Z" fill="#A96E43" />
      <Path d="M8 48 Q39 40 72 48" fill="none" stroke="#D9A16F" strokeWidth="3" />
      <Ellipse cx="40" cy="45" fill="#7B4C30" rx={seedOnly ? 10 : 6} ry={seedOnly ? 6 : 4} />
      {!seedOnly ? (
        <>
          <Path d="M40 44 C38 34 41 24 40 10" fill="none" stroke="#397C50" strokeLinecap="round" strokeWidth="5" />
          <Path d="M40 29 C27 17 18 21 21 32 C27 37 34 35 40 29Z" fill="#54B86C" />
          <Path d="M40 21 C52 9 64 13 61 25 C55 31 47 28 40 21Z" fill="#73C982" />
          {flower ? (
            <>
              <Circle cx="40" cy="9" fill={sceneTheme.orange} r="5" />
              {[0, 1, 2, 3, 4].map(index => {
                const angle = (index * Math.PI * 2) / 5;
                return (
                  <Circle
                    key={index}
                    cx={40 + Math.cos(angle) * 8}
                    cy={9 + Math.sin(angle) * 8}
                    fill={sceneTheme.yellow}
                    r="5"
                  />
                );
              })}
            </>
          ) : null}
          <Path d="M40 46 C31 50 29 56 25 61 M40 46 C46 51 49 56 54 61 M39 49 L38 61" fill="none" stroke={rootFocus ? '#FFF0B8' : '#7A4A2D'} strokeLinecap="round" strokeWidth={rootFocus ? 3 : 2} />
        </>
      ) : null}
    </G>
  );
}

function WaterArtwork() {
  return (
    <G>
      <Path d="M9 46 Q23 38 38 46 T70 46 V61 H9Z" fill="#8ED4F0" />
      <Path d="M9 49 Q23 41 38 49 T70 49" fill="none" stroke="#367FC3" strokeWidth="3" />
      <Path d="M40 4 C31 18 26 25 26 34 C26 43 32 49 40 49 C48 49 54 43 54 34 C54 25 49 18 40 4Z" fill="#4FA9E4" />
      <Path d="M34 29 C35 22 39 17 43 13" fill="none" stroke="#CDEFFF" strokeLinecap="round" strokeWidth="4" />
    </G>
  );
}

function SoilArtwork() {
  return (
    <G>
      <Rect fill="#E7C08B" height="48" rx="10" width="68" x="6" y="8" />
      <Path d="M6 22 Q22 13 38 22 T74 20 V39 Q56 31 39 40 T6 39Z" fill="#A96E43" />
      <Path d="M6 40 Q24 32 40 42 T74 39 V56 H6Z" fill="#6F4932" />
      {[15, 27, 47, 62].map((x, index) => (
        <Circle key={x} cx={x} cy={index % 2 ? 32 : 29} fill="#F2D2A7" r={index % 2 ? 3 : 2} />
      ))}
      <Path d="M36 9 V24 M36 18 C29 13 25 15 26 21 M36 15 C42 10 48 12 47 18" fill="none" stroke="#4AA566" strokeLinecap="round" strokeWidth="3" />
    </G>
  );
}

function SunArtwork({ label }: { label: string }) {
  const dark = label.includes('dark');
  return (
    <G>
      <Circle cx="40" cy="31" fill={dark ? '#AAB9D0' : sceneTheme.yellow} r="15" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map(index => {
        const angle = (index * Math.PI * 2) / 8;
        return (
          <Line
            key={index}
            stroke={dark ? '#8294AD' : sceneTheme.orange}
            strokeLinecap="round"
            strokeWidth="4"
            x1={40 + Math.cos(angle) * 22}
            x2={40 + Math.cos(angle) * 29}
            y1={31 + Math.sin(angle) * 22}
            y2={31 + Math.sin(angle) * 29}
          />
        );
      })}
      {dark ? <Path d="M22 20 Q38 9 58 19 Q48 30 28 29Z" fill="#53657B" opacity="0.8" /> : null}
    </G>
  );
}

function AirArtwork() {
  return (
    <G fill="none" stroke={sceneTheme.teal} strokeLinecap="round" strokeWidth="5">
      <Path d="M8 19 H48 C61 19 61 7 51 7" />
      <Path d="M14 32 H65 C75 32 75 45 64 45" />
      <Path d="M8 48 H42" />
    </G>
  );
}

function HeartArtwork() {
  return (
    <G>
      <Path d="M40 57 C33 48 15 39 15 23 C15 7 35 6 40 20 C45 6 65 7 65 23 C65 39 47 48 40 57Z" fill={sceneTheme.coral} />
      <Path d="M40 19 C37 29 41 35 48 39" fill="none" stroke="#B63E4A" strokeLinecap="round" strokeWidth="4" />
      <Path d="M40 15 V5 M47 16 L53 6" fill="none" stroke={sceneTheme.blue} strokeLinecap="round" strokeWidth="5" />
      <Path d="M22 31 H30 L35 22 L42 42 L48 30 H58" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </G>
  );
}

function LungsArtwork() {
  return (
    <G>
      <Path d="M39 7 V30 M41 18 L26 27 M41 18 L55 27" fill="none" stroke="#5B7694" strokeLinecap="round" strokeWidth="5" />
      <Path d="M28 22 C15 25 11 40 14 52 C17 61 30 59 36 51 V28Z" fill="#F19A9A" stroke="#C85666" strokeWidth="2" />
      <Path d="M52 22 C65 25 69 40 66 52 C63 61 50 59 44 51 V28Z" fill="#F19A9A" stroke="#C85666" strokeWidth="2" />
      <Path d="M18 39 Q26 32 35 34 M62 39 Q54 32 45 34" fill="none" stroke="#FFD5D3" strokeWidth="3" />
    </G>
  );
}

function CircuitArtwork({ label }: { label: string }) {
  const focusBattery = label.includes('battery');
  const focusBulb = label.includes('bulb');
  const focusSwitch = label.includes('switch');
  return (
    <G>
      <Path d="M14 18 H35 M47 18 H65 V50 H14 V18" fill="none" stroke="#526E8E" strokeLinecap="round" strokeWidth="3" />
      <Rect fill={focusBattery ? sceneTheme.yellow : '#DDE8F5'} height="22" rx="4" stroke={sceneTheme.ink} strokeWidth="2" width="15" x="7" y="25" />
      <Line stroke={sceneTheme.ink} strokeWidth="2" x1="10" x2="19" y1="30" y2="30" />
      <Line stroke={sceneTheme.ink} strokeWidth="2" x1="14.5" x2="14.5" y1="26" y2="34" />
      <Circle cx="65" cy="38" fill={focusBulb ? '#FFE47D' : '#FFF7C7'} r="10" stroke={sceneTheme.orange} strokeWidth="3" />
      <Path d="M60 38 Q65 31 70 38 M62 44 H68" fill="none" stroke={sceneTheme.orange} strokeWidth="2" />
      <Circle cx="35" cy="18" fill={focusSwitch ? sceneTheme.coral : sceneTheme.teal} r="3" />
      <Circle cx="47" cy="18" fill={focusSwitch ? sceneTheme.coral : sceneTheme.teal} r="3" />
      <Path d="M35 18 L45 10" fill="none" stroke={focusSwitch ? sceneTheme.coral : sceneTheme.ink} strokeLinecap="round" strokeWidth="3" />
    </G>
  );
}

function MapArtwork({ label }: { label: string }) {
  const east = label.includes('east');
  const west = label.includes('west');
  const south = label.includes('south');
  const north = label.includes('north');
  const angle = east && north ? -45 : west && north ? -135 : east && south ? 45 : west && south ? 135 : east ? 0 : west ? 180 : south ? 90 : -90;
  return (
    <G>
      <Path d="M7 12 L28 7 L51 14 L73 8 V53 L51 59 L28 52 L7 58Z" fill="#E5F3DF" stroke="#5A8C69" strokeLinejoin="round" strokeWidth="2" />
      <Path d="M28 8 V52 M51 14 V59" fill="none" stroke="#A9C7A8" strokeWidth="2" />
      <Path d="M12 48 C23 33 32 44 42 29 C50 18 60 29 68 17" fill="none" stroke={sceneTheme.blue} strokeDasharray="4 3" strokeLinecap="round" strokeWidth="3" />
      <G origin="40,32" rotation={angle}>
        <Path d="M40 12 L47 34 L40 30 L33 34Z" fill={sceneTheme.coral} />
        <Path d="M40 52 L47 30 L40 34 L33 30Z" fill="#FFFFFF" stroke="#8BA2B8" strokeWidth="1" />
      </G>
      <Circle cx="14" cy="48" fill={sceneTheme.orange} r="4" />
      <Circle cx="68" cy="17" fill={sceneTheme.teal} r="4" />
    </G>
  );
}

function LanguageArtwork() {
  return (
    <G>
      <Rect fill="#FFFFFF" height="43" rx="8" stroke={sceneTheme.blue} strokeWidth="2" width="63" x="8" y="10" />
      <Rect fill="#DDE8FF" height="9" rx="4" width="18" x="15" y="18" />
      <Rect fill="#DDF7F1" height="9" rx="4" width="27" x="38" y="18" />
      <Rect fill="#FFF0BD" height="9" rx="4" width="29" x="15" y="33" />
      <Rect fill="#FFE2DF" height="9" rx="4" width="16" x="49" y="33" />
      <Path d="M17 58 H62" stroke="#91A6BC" strokeLinecap="round" strokeWidth="3" />
    </G>
  );
}

function PaintArtwork({ label }: { label: string }) {
  const primary = label.includes('blue') ? sceneTheme.blue : label.includes('yellow') ? sceneTheme.yellow : label.includes('red') ? sceneTheme.coral : label.includes('green') ? sceneTheme.teal : sceneTheme.orange;
  return (
    <G>
      <Path d="M42 7 C21 7 8 19 8 35 C8 50 21 57 36 57 C43 57 45 51 43 47 C41 43 45 39 50 41 C64 46 72 35 69 24 C66 12 55 7 42 7Z" fill="#F7D7A0" stroke="#A66C43" strokeWidth="2" />
      <Circle cx="24" cy="25" fill={sceneTheme.blue} r="6" />
      <Circle cx="39" cy="18" fill={sceneTheme.yellow} r="6" />
      <Circle cx="54" cy="24" fill={sceneTheme.coral} r="6" />
      <Circle cx="25" cy="41" fill={primary} r="7" />
      <Path d="M57 54 L70 14" stroke="#7B5038" strokeLinecap="round" strokeWidth="5" />
      <Path d="M68 17 L72 6 L74 18Z" fill={primary} />
    </G>
  );
}

function RhythmArtwork() {
  return (
    <G>
      {[17, 28, 39, 50].map(y => (
        <Line key={y} stroke="#B8C9D9" strokeWidth="2" x1="7" x2="73" y1={y} y2={y} />
      ))}
      <Path d="M28 14 V42 M28 17 L51 11 V36" fill="none" stroke={sceneTheme.blueDark} strokeLinecap="round" strokeWidth="5" />
      <Ellipse cx="21" cy="45" fill={sceneTheme.blue} rx="9" ry="6" transform="rotate(-14 21 45)" />
      <Ellipse cx="44" cy="39" fill={sceneTheme.coral} rx="9" ry="6" transform="rotate(-14 44 39)" />
      {[11, 27, 43, 59].map(x => (
        <Rect key={x} fill={sceneTheme.yellow} height="5" rx="2" width="10" x={x} y="56" />
      ))}
    </G>
  );
}

function ShieldArtwork() {
  return (
    <G>
      <Path d="M40 5 L67 15 V32 C67 47 56 57 40 62 C24 57 13 47 13 32 V15Z" fill="#DDE8FF" stroke={sceneTheme.blue} strokeLinejoin="round" strokeWidth="3" />
      <Rect fill="#FFFFFF" height="20" rx="5" stroke={sceneTheme.blueDark} strokeWidth="3" width="27" x="26.5" y="29" />
      <Path d="M32 29 V24 C32 13 48 13 48 24 V29" fill="none" stroke={sceneTheme.blueDark} strokeLinecap="round" strokeWidth="4" />
      <Circle cx="40" cy="39" fill={sceneTheme.orange} r="3" />
      <Path d="M40 41 V45" stroke={sceneTheme.orange} strokeLinecap="round" strokeWidth="3" />
    </G>
  );
}

function ComputerArtwork() {
  return (
    <G>
      <Rect fill="#263F5B" height="42" rx="7" width="66" x="7" y="6" />
      <Rect fill="#EAF4FF" height="30" rx="3" width="54" x="13" y="12" />
      <Rect fill={sceneTheme.blue} height="6" rx="3" width="17" x="18" y="17" />
      <Rect fill={sceneTheme.teal} height="6" rx="3" width="30" x="18" y="26" />
      <Rect fill={sceneTheme.yellow} height="6" rx="3" width="20" x="18" y="35" />
      <Path d="M40 48 V56 M25 58 H55" stroke="#5D7793" strokeLinecap="round" strokeWidth="5" />
      <Circle cx="59" cy="18" fill={sceneTheme.coral} r="3" />
    </G>
  );
}

function VerifyArtwork() {
  return (
    <G>
      <Rect fill="#FFFFFF" height="50" rx="7" stroke="#83A0BC" strokeWidth="2" width="43" x="12" y="7" />
      <Path d="M22 20 H45 M22 29 H40 M22 38 H35" stroke="#B3C5D5" strokeLinecap="round" strokeWidth="3" />
      <Circle cx="56" cy="43" fill={sceneTheme.teal} r="16" />
      <Path d="M47 43 L53 49 L65 35" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
    </G>
  );
}

function FoodArtwork() {
  return (
    <G>
      <Circle cx="40" cy="33" fill="#FFFFFF" r="26" stroke="#8FA5B9" strokeWidth="3" />
      <Path d="M40 8 V33 L62 46" fill="#FFF0B8" stroke="#FFFFFF" strokeWidth="3" />
      <Path d="M40 33 L18 48 A26 26 0 0 1 40 8Z" fill="#DDF7E7" stroke="#FFFFFF" strokeWidth="3" />
      <Path d="M40 33 L62 46 A26 26 0 0 1 40 8Z" fill="#FFDAD6" stroke="#FFFFFF" strokeWidth="3" />
      <Circle cx="31" cy="26" fill="#6DBE72" r="5" />
      <Ellipse cx="51" cy="28" fill="#D86854" rx="7" ry="5" />
      <Circle cx="37" cy="44" fill="#F3B83B" r="5" />
    </G>
  );
}

function WashArtwork() {
  return (
    <G>
      <Path d="M20 39 C27 28 36 28 42 36 L50 27 C54 23 60 28 57 33 L49 48 C44 57 29 58 22 51Z" fill="#E8B58E" stroke="#B97556" strokeWidth="2" />
      <Path d="M12 18 H44 V26 H12Z M34 18 V10 H52 V18" fill="#AFC2D2" stroke="#607C96" strokeWidth="2" />
      <Path d="M28 27 C25 33 22 36 22 40" fill="none" stroke="#4FA9E4" strokeLinecap="round" strokeWidth="4" />
      {[45, 55, 64].map((x, index) => (
        <Circle key={x} cx={x} cy={12 + index * 7} fill="#C7EEFA" r={4 - index * 0.5} stroke="#66B9D9" strokeWidth="1" />
      ))}
    </G>
  );
}

function BookArtwork() {
  return (
    <G>
      <Path d="M7 14 Q24 7 39 17 V55 Q24 46 7 53Z" fill="#FFFFFF" stroke={sceneTheme.blue} strokeLinejoin="round" strokeWidth="3" />
      <Path d="M73 14 Q56 7 41 17 V55 Q56 46 73 53Z" fill="#FFFFFF" stroke={sceneTheme.blue} strokeLinejoin="round" strokeWidth="3" />
      <Path d="M40 17 V55" stroke={sceneTheme.blueDark} strokeWidth="3" />
      <Path d="M14 24 Q26 20 34 24 M14 33 Q26 29 34 33 M47 24 Q57 20 66 24 M47 33 Q57 29 66 33" fill="none" stroke="#B0C0D3" strokeLinecap="round" strokeWidth="2" />
    </G>
  );
}

function PersonArtwork() {
  return (
    <G>
      <Circle cx="40" cy="16" fill="#8A583D" r="10" />
      <Path d="M28 33 Q40 25 52 33 L58 57 H22Z" fill={sceneTheme.blue} />
      <Path d="M29 37 L14 48 M51 37 L66 48" stroke="#8A583D" strokeLinecap="round" strokeWidth="6" />
      <Path d="M34 57 L30 63 M46 57 L50 63" stroke="#314D6C" strokeLinecap="round" strokeWidth="7" />
      <Circle cx="36" cy="15" fill="#1D2D40" r="1.5" />
      <Circle cx="44" cy="15" fill="#1D2D40" r="1.5" />
      <Path d="M36 21 Q40 24 44 21" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.5" />
    </G>
  );
}

function AnimalArtwork({ label }: { label: string }) {
  if (label.includes('fish') || label.includes('gill')) {
    return (
      <G>
        <Path d="M12 33 C23 18 50 17 62 32 C50 48 23 48 12 33Z" fill="#6EBBE3" stroke="#3678A8" strokeWidth="2" />
        <Path d="M62 32 L75 18 V47Z" fill="#4D9AC8" />
        <Circle cx="27" cy="29" fill="#FFFFFF" r="4" />
        <Circle cx="27" cy="29" fill="#183153" r="2" />
        <Path d="M39 23 Q34 32 39 42" fill="none" stroke={sceneTheme.coral} strokeWidth="3" />
        <Path d="M4 13 Q16 4 27 13 M49 54 Q62 45 73 54" fill="none" stroke="#9EDCF0" strokeLinecap="round" strokeWidth="3" />
      </G>
    );
  }
  return (
    <G>
      <Ellipse cx="40" cy="37" fill="#DFA45D" rx="25" ry="17" />
      <Circle cx="58" cy="24" fill="#DFA45D" r="12" />
      <Path d="M63 13 L70 7 L69 19 M51 14 L45 7 L48 21" fill="#BF7A43" />
      <Circle cx="62" cy="23" fill="#183153" r="2" />
      <Path d="M22 49 V60 M36 52 V61 M50 50 V60" stroke="#9A633D" strokeLinecap="round" strokeWidth="5" />
      <Path d="M16 34 Q5 28 8 19" fill="none" stroke="#9A633D" strokeLinecap="round" strokeWidth="4" />
    </G>
  );
}

function ForceArtwork() {
  return (
    <G>
      <Circle cx="48" cy="50" fill="#304B68" r="10" />
      <Circle cx="48" cy="50" fill="#91A6B9" r="4" />
      <Path d="M25 22 L62 28 L55 45 H31Z" fill="#69B97B" stroke="#34764B" strokeWidth="2" />
      <Path d="M28 23 L17 13 M57 44 L70 58" stroke="#6F4D3A" strokeLinecap="round" strokeWidth="5" />
      <Path d="M6 33 H27 M6 33 L14 25 M6 33 L14 41" fill="none" stroke={sceneTheme.orange} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
    </G>
  );
}

function MoneyArtwork() {
  return (
    <G>
      <Rect fill="#DDF7E7" height="36" rx="6" stroke="#3F9364" strokeWidth="3" width="62" x="9" y="14" />
      <Circle cx="40" cy="32" fill="#FFFFFF" r="12" stroke="#65B984" strokeWidth="2" />
      <Path d="M34 25 H45 M34 39 H45 M37 22 V42" stroke="#27734E" strokeLinecap="round" strokeWidth="3" />
      <Circle cx="18" cy="23" fill={sceneTheme.yellow} r="3" />
      <Circle cx="62" cy="42" fill={sceneTheme.yellow} r="3" />
      <Path d="M16 56 H64" stroke={sceneTheme.orange} strokeDasharray="5 4" strokeLinecap="round" strokeWidth="3" />
    </G>
  );
}

function LaboratoryArtwork() {
  return (
    <G>
      <Path d="M24 7 V27 L12 52 Q9 58 18 59 H62 Q71 58 68 52 L56 27 V7" fill="#FFFFFF" stroke="#526E8E" strokeLinejoin="round" strokeWidth="3" />
      <Path d="M17 47 Q29 39 40 47 T63 46 L68 54 Q69 59 61 59 H19 Q11 59 13 54Z" fill="#8ED4F0" />
      <Path d="M20 7 H60" stroke="#526E8E" strokeLinecap="round" strokeWidth="5" />
      <Circle cx="31" cy="45" fill="#FFFFFF" opacity="0.8" r="4" />
      <Circle cx="50" cy="50" fill={sceneTheme.yellow} r="3" />
      <Path d="M34 21 H46" stroke={sceneTheme.coral} strokeDasharray="3 3" strokeWidth="3" />
    </G>
  );
}

function ToolsArtwork() {
  return (
    <G>
      <Path d="M14 53 L47 20" stroke="#8A5B3F" strokeLinecap="round" strokeWidth="8" />
      <Path d="M39 10 L62 25 L53 34 L30 18Z" fill="#7891A8" stroke="#405A75" strokeLinejoin="round" strokeWidth="2" />
      <Path d="M17 13 L67 52" stroke={sceneTheme.orange} strokeLinecap="round" strokeWidth="5" />
      <Path d="M19 15 L27 7 M27 22 L35 14 M35 29 L43 21 M43 36 L51 28 M51 43 L59 35" stroke="#FFFFFF" strokeWidth="2" />
      <Circle cx="18" cy="53" fill={sceneTheme.teal} r="6" />
    </G>
  );
}

function FireArtwork() {
  return (
    <G>
      <Path d="M42 4 C47 18 62 22 61 39 C60 55 49 61 39 61 C24 61 15 51 17 38 C19 27 28 22 30 10 C37 16 38 24 42 29 C45 22 46 14 42 4Z" fill={sceneTheme.coral} />
      <Path d="M40 27 C45 35 51 39 49 48 C47 56 42 58 37 57 C29 56 27 50 29 44 C31 38 37 36 40 27Z" fill={sceneTheme.yellow} />
      <Path d="M11 58 H69" stroke="#536C85" strokeLinecap="round" strokeWidth="4" />
      <Path d="M13 12 L67 58" stroke="#FFFFFF" opacity="0.85" strokeLinecap="round" strokeWidth="5" />
    </G>
  );
}

function SportArtwork() {
  return (
    <G>
      <Circle cx="39" cy="32" fill="#FFFFFF" r="25" stroke="#405A75" strokeWidth="3" />
      <Path d="M39 18 L49 25 L45 37 H33 L29 25Z" fill={sceneTheme.blueDark} />
      <Path d="M29 25 L18 22 M49 25 L60 21 M33 37 L27 49 M45 37 L52 49" fill="none" stroke="#405A75" strokeWidth="3" />
      <Path d="M18 22 L15 35 L27 49 L39 55 L52 49 L64 35 L60 21 L49 11 L39 7 L29 12Z" fill="none" stroke="#8CA1B5" strokeWidth="2" />
      <Path d="M5 58 H75" stroke={sceneTheme.teal} strokeDasharray="6 4" strokeLinecap="round" strokeWidth="3" />
    </G>
  );
}

function GoalArtwork() {
  return (
    <G>
      <Circle cx="44" cy="28" fill="#FFFFFF" r="23" stroke={sceneTheme.coral} strokeWidth="5" />
      <Circle cx="44" cy="28" fill="#FFE2DF" r="14" stroke={sceneTheme.coral} strokeWidth="3" />
      <Circle cx="44" cy="28" fill={sceneTheme.coral} r="5" />
      <Path d="M8 54 H66" stroke="#8AA1B8" strokeLinecap="round" strokeWidth="5" />
      <Path d="M15 54 V45 H27 V36 H37" fill="none" stroke={sceneTheme.teal} strokeLinejoin="round" strokeWidth="6" />
      <Path d="M39 28 L68 8 M68 8 L61 9 M68 8 L67 16" fill="none" stroke={sceneTheme.orange} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
    </G>
  );
}

function DialogueArtwork() {
  return (
    <G>
      <Path d="M6 10 Q6 5 12 5 H45 Q51 5 51 11 V29 Q51 35 45 35 H25 L15 44 L17 35 H12 Q6 35 6 29Z" fill="#DDE8FF" stroke={sceneTheme.blue} strokeWidth="2" />
      <Path d="M30 30 H68 Q74 30 74 36 V51 Q74 57 68 57 H60 L63 63 L52 57 H30 Q24 57 24 51 V36 Q24 30 30 30Z" fill="#DDF7F1" stroke={sceneTheme.teal} strokeWidth="2" />
      <Path d="M15 16 H41 M15 24 H34 M34 41 H64 M34 49 H55" stroke="#7891A8" strokeLinecap="round" strokeWidth="3" />
    </G>
  );
}

function MoleculeArtwork() {
  return (
    <G>
      <Path d="M20 42 L39 22 L59 42 M39 22 L42 53" fill="none" stroke="#7891A8" strokeWidth="5" />
      <Circle cx="20" cy="42" fill={sceneTheme.blue} r="11" stroke="#FFFFFF" strokeWidth="2" />
      <Circle cx="39" cy="22" fill={sceneTheme.coral} r="13" stroke="#FFFFFF" strokeWidth="2" />
      <Circle cx="59" cy="42" fill={sceneTheme.yellow} r="11" stroke="#FFFFFF" strokeWidth="2" />
      <Circle cx="42" cy="53" fill={sceneTheme.teal} r="8" stroke="#FFFFFF" strokeWidth="2" />
      <Circle cx="69" cy="12" fill="#DDE8FF" r="4" />
      <Circle cx="12" cy="12" fill="#FFE2DF" r="3" />
    </G>
  );
}

function GeometryArtwork() {
  return (
    <G>
      <Path d="M10 55 L34 10 L58 55Z" fill="#DDE8FF" stroke={sceneTheme.blue} strokeLinejoin="round" strokeWidth="3" />
      <Path d="M34 10 V55 M10 55 H70" stroke="#7891A8" strokeDasharray="4 3" strokeWidth="2" />
      <Circle cx="53" cy="31" fill="none" r="17" stroke={sceneTheme.coral} strokeWidth="3" />
      <Path d="M53 31 L69 22 M53 31 L54 14" stroke={sceneTheme.coral} strokeWidth="2" />
      <Path d="M11 49 H18 V56" fill="none" stroke={sceneTheme.orange} strokeWidth="3" />
    </G>
  );
}

function PatternArtwork() {
  return (
    <G>
      {[8, 24, 40, 56].map((x, index) => (
        <React.Fragment key={x}>
          <Rect fill={index % 2 ? '#DDE8FF' : '#FFF0B8'} height="46" width="12" x={x} y="9" />
          <Path d={`M${x} 20 H${x + 12} M${x} 43 H${x + 12}`} stroke={index % 2 ? sceneTheme.blue : sceneTheme.orange} strokeWidth="4" />
        </React.Fragment>
      ))}
      <Path d="M8 20 H68 M8 43 H68" stroke="#FFFFFF" strokeDasharray="7 5" strokeWidth="2" />
    </G>
  );
}

function BlocksArtwork() {
  return (
    <G>
      <Rect fill="#DDE8FF" height="20" rx="5" stroke={sceneTheme.blue} strokeWidth="2" width="28" x="8" y="9" />
      <Rect fill="#DDF7F1" height="20" rx="5" stroke={sceneTheme.teal} strokeWidth="2" width="28" x="44" y="9" />
      <Rect fill="#FFF0BD" height="20" rx="5" stroke={sceneTheme.orange} strokeWidth="2" width="28" x="8" y="37" />
      <Rect fill="#FFE2DF" height="20" rx="5" stroke={sceneTheme.coral} strokeWidth="2" width="28" x="44" y="37" />
      <Path d="M36 19 H44 M36 47 H44" stroke="#7890A8" strokeDasharray="2 2" strokeWidth="2" />
    </G>
  );
}

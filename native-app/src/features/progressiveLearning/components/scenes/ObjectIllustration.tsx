import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

import type { LearningObjectKind } from '../../types';
import { sceneTheme } from './sceneTheme';

export const LEARNING_OBJECT_META: Record<
  LearningObjectKind,
  { label: string; soft: string }
> = {
  elephant: { label: 'elephant', soft: '#DCEBFF' },
  zebra: { label: 'zebra', soft: '#EDF2F7' },
  giraffe: { label: 'giraffe', soft: '#FFF0B8' },
  lion: { label: 'lion', soft: '#FFE0B5' },
  rhino: { label: 'rhino', soft: '#DFE7EF' },
  flamingo: { label: 'flamingo', soft: '#FFE1ED' },
  gazelle: { label: 'gazelle', soft: '#F9E4C8' },
  ostrich: { label: 'ostrich', soft: '#E7EAF0' },
  goat: { label: 'goat', soft: '#EEE7FA' },
  chicken: { label: 'chicken', soft: '#FFF0D2' },
  mango: { label: 'mango', soft: '#FFF0B8' },
  banana: { label: 'banana', soft: '#FFF5AE' },
  basket: { label: 'basket', soft: '#FFE2C3' },
  seedling: { label: 'seedling', soft: '#E2F7E9' },
  chair: { label: 'chair', soft: '#DDEEFF' },
  cat: { label: 'cat', soft: '#FFE8C9' },
  sun: { label: 'sun', soft: '#FFF3B8' },
  pen: { label: 'pen', soft: '#DDEAFF' },
  hat: { label: 'hat', soft: '#F2E4FF' },
  book: { label: 'book', soft: '#FFE4D8' },
  table: { label: 'table', soft: '#F4E5D0' },
  pencil: { label: 'pencil', soft: '#FFF0B8' },
  face: { label: 'face', soft: '#FFE5C9' },
  teeth: { label: 'teeth', soft: '#E8F4FF' },
  hand: { label: 'hand', soft: '#FFE5C9' },
  foot: { label: 'foot', soft: '#FFE5C9' },
  hair: { label: 'hair', soft: '#E8D7C5' },
  leaf: { label: 'leaf', soft: '#DDF5E2' },
  flower: { label: 'flower', soft: '#FFE3EE' },
  stem: { label: 'stem', soft: '#DDF5E2' },
  roots: { label: 'roots', soft: '#F2E2CD' },
  mystery: { label: 'mystery value', soft: '#E9E3FF' },
};

interface ObjectIllustrationProps {
  kind: LearningObjectKind;
  size?: number;
}

export function ObjectIllustration({
  kind,
  size = 48,
}: ObjectIllustrationProps) {
  return (
    <Svg height={size} viewBox="0 0 64 64" width={size}>
      <Ellipse cx="32" cy="57" fill="#A8BDD2" opacity={0.35} rx="22" ry="4" />
      <ObjectDrawing kind={kind} />
    </Svg>
  );
}

function Eye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <Circle cx={cx} cy={cy} fill={sceneTheme.white} r="2.2" />
      <Circle cx={cx + 0.6} cy={cy + 0.3} fill={sceneTheme.ink} r="1" />
    </>
  );
}

function ObjectDrawing({ kind }: { kind: LearningObjectKind }) {
  switch (kind) {
    case 'elephant':
      return (
        <G>
          <Ellipse cx="29" cy="37" fill="#7F9BB5" rx="22" ry="15" />
          <Circle cx="46" cy="31" fill="#8DA9C2" r="12" />
          <Circle cx="38" cy="30" fill="#6F8AA5" r="9" />
          <Path
            d="M52 35 C58 40 57 50 51 52 C47 53 45 49 48 47 C52 46 52 41 49 39Z"
            fill="#8DA9C2"
          />
          <Rect fill="#708BA5" height="17" rx="4" width="8" x="15" y="40" />
          <Rect fill="#708BA5" height="17" rx="4" width="8" x="34" y="40" />
          <Path d="M53 34 L61 36 L54 39Z" fill="#FFF7DF" />
          <Path
            d="M9 33 C4 31 5 27 3 25"
            fill="none"
            stroke="#607D98"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <Eye cx={49} cy={29} />
          <Path
            d="M18 30 C25 24 35 24 41 30"
            fill="none"
            opacity={0.4}
            stroke="#B9CDDE"
            strokeWidth="3"
          />
        </G>
      );
    case 'zebra':
      return (
        <G>
          <Ellipse
            cx="29"
            cy="39"
            fill="#F8FAFC"
            rx="22"
            ry="13"
            stroke="#23384D"
            strokeWidth="2"
          />
          <Path
            d="M45 34 L48 18 L55 21 L58 36Z"
            fill="#F8FAFC"
            stroke="#23384D"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <Path
            d="M48 19 L47 13 L51 18 M54 20 L58 15 L57 23"
            fill="none"
            stroke="#23384D"
            strokeLinecap="round"
            strokeWidth="2"
          />
          <Rect
            fill="#F8FAFC"
            height="17"
            rx="2"
            stroke="#23384D"
            strokeWidth="2"
            width="6"
            x="16"
            y="43"
          />
          <Rect
            fill="#F8FAFC"
            height="17"
            rx="2"
            stroke="#23384D"
            strokeWidth="2"
            width="6"
            x="36"
            y="43"
          />
          <Path
            d="M15 28 L21 50 M25 26 L31 51 M36 27 L41 50 M47 26 L55 29 M46 31 L56 35"
            stroke="#23384D"
            strokeWidth="3"
          />
          <Path
            d="M7 36 C3 31 5 27 2 24"
            fill="none"
            stroke="#23384D"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <Eye cx={53} cy={25} />
        </G>
      );
    case 'giraffe':
      return (
        <G>
          <Ellipse cx="27" cy="43" fill="#F5C94A" rx="20" ry="11" />
          <Path
            d="M40 43 L43 15 Q45 8 53 12 L56 17 L50 25 L48 45Z"
            fill="#F5C94A"
          />
          <Rect fill="#E4B73D" height="15" rx="3" width="6" x="16" y="47" />
          <Rect fill="#E4B73D" height="15" rx="3" width="6" x="35" y="47" />
          <Path
            d="M47 12 L46 7 M53 12 L56 7"
            stroke="#8B6334"
            strokeLinecap="round"
            strokeWidth="2"
          />
          <Circle cx="47" cy="6" fill="#8B6334" r="2" />
          <Circle cx="57" cy="6" fill="#8B6334" r="2" />
          {[
            ['18', '39'],
            ['30', '46'],
            ['38', '35'],
            ['46', '25'],
            ['49', '16'],
          ].map(([cx, cy]) => (
            <Circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              fill="#A96F35"
              r="3.2"
            />
          ))}
          <Eye cx={52} cy={15} />
        </G>
      );
    case 'lion':
      return (
        <G>
          <Ellipse cx="26" cy="42" fill="#EFB24A" rx="20" ry="11" />
          <Circle cx="48" cy="29" fill="#A96632" r="14" />
          <Circle cx="48" cy="29" fill="#F2BD55" r="9" />
          <Rect fill="#D99435" height="14" rx="3" width="7" x="15" y="47" />
          <Rect fill="#D99435" height="14" rx="3" width="7" x="33" y="47" />
          <Circle cx="48" cy="32" fill="#6F4326" r="2.2" />
          <Path
            d="M43 35 Q48 39 53 35"
            fill="none"
            stroke="#6F4326"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
          <Path
            d="M7 42 C2 34 8 29 3 26"
            fill="none"
            stroke="#A96632"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <Eye cx={44} cy={28} />
          <Eye cx={52} cy={28} />
        </G>
      );
    case 'rhino':
      return (
        <G>
          <Ellipse cx="28" cy="40" fill="#788FA3" rx="23" ry="14" />
          <Path d="M43 36 Q48 24 58 30 L60 39 L50 46Z" fill="#859CAF" />
          <Polygon fill="#F8F2DE" points="56,30 63,24 60,36" />
          <Rect fill="#667E92" height="15" rx="3" width="8" x="14" y="46" />
          <Rect fill="#667E92" height="15" rx="3" width="8" x="36" y="46" />
          <Path
            d="M8 34 L5 29"
            stroke="#50697F"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <Eye cx={54} cy={34} />
        </G>
      );
    case 'flamingo':
      return (
        <G>
          <Ellipse cx="29" cy="35" fill="#F27CA6" rx="16" ry="11" />
          <Path
            d="M40 35 C49 32 43 17 49 12 C54 8 59 12 57 17 C55 21 50 20 49 25"
            fill="none"
            stroke="#F27CA6"
            strokeLinecap="round"
            strokeWidth="6"
          />
          <Path d="M56 15 L63 18 L57 21Z" fill="#24384C" />
          <Path
            d="M25 44 L23 59 M34 44 L38 58 L44 58"
            fill="none"
            stroke="#D95687"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <Path d="M15 34 Q27 23 39 35 Q27 31 15 34" fill="#FFADC8" />
          <Eye cx={54} cy={14} />
        </G>
      );
    case 'gazelle':
      return (
        <G>
          <Ellipse cx="28" cy="41" fill="#D69A58" rx="21" ry="11" />
          <Path d="M43 38 L47 23 Q51 17 56 22 L58 31 L51 40Z" fill="#D69A58" />
          <Path
            d="M50 21 Q47 11 51 6 M55 20 Q58 11 57 6"
            fill="none"
            stroke="#60472F"
            strokeLinecap="round"
            strokeWidth="2"
          />
          <Path
            d="M18 47 L15 61 M36 47 L40 61"
            stroke="#A66F3F"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <Path
            d="M11 37 C7 31 5 31 3 29"
            fill="none"
            stroke="#60472F"
            strokeLinecap="round"
            strokeWidth="2"
          />
          <Eye cx={53} cy={25} />
        </G>
      );
    case 'ostrich':
      return (
        <G>
          <Ellipse cx="28" cy="38" fill="#29394B" rx="18" ry="14" />
          <Path
            d="M40 35 C46 31 41 13 49 10"
            fill="none"
            stroke="#D99D75"
            strokeLinecap="round"
            strokeWidth="5"
          />
          <Circle cx="50" cy="9" fill="#D99D75" r="6" />
          <Path d="M54 9 L63 12 L54 14Z" fill="#E89A32" />
          <Path
            d="M23 49 L20 61 L15 61 M34 49 L39 61 L45 61"
            fill="none"
            stroke="#D99D75"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <Path
            d="M13 32 L5 26 M14 36 L3 35"
            stroke="#667A8F"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <Eye cx={51} cy={8} />
        </G>
      );
    case 'goat':
      return (
        <G>
          <Ellipse cx="28" cy="41" fill="#DDD4EA" rx="21" ry="12" />
          <Path d="M43 37 Q48 24 57 29 L59 40 L51 44Z" fill="#E9E2F2" />
          <Path
            d="M49 29 Q45 20 49 17 M55 28 Q61 21 59 17"
            fill="none"
            stroke="#826DA0"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <Path
            d="M55 41 Q56 50 52 53"
            fill="none"
            stroke="#B6A8CA"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <Rect fill="#B6A8CA" height="15" rx="3" width="6" x="17" y="48" />
          <Rect fill="#B6A8CA" height="15" rx="3" width="6" x="37" y="48" />
          <Eye cx={54} cy={33} />
        </G>
      );
    case 'chicken':
      return (
        <G>
          <Ellipse
            cx="30"
            cy="40"
            fill="#FFF4D9"
            rx="19"
            ry="15"
            stroke="#DCA34A"
            strokeWidth="2"
          />
          <Circle
            cx="47"
            cy="28"
            fill="#FFF4D9"
            r="10"
            stroke="#DCA34A"
            strokeWidth="2"
          />
          <Path d="M45 18 Q48 10 51 18 Q55 12 55 21" fill="#EB615B" />
          <Path d="M56 27 L64 31 L56 34Z" fill="#E79D31" />
          <Path
            d="M23 52 L21 61 M37 52 L40 61 M17 61 L25 61 M36 61 L44 61"
            stroke="#C77D2D"
            strokeLinecap="round"
            strokeWidth="2"
          />
          <Path d="M18 33 Q29 38 21 47" fill="#F1C969" />
          <Eye cx={49} cy={26} />
        </G>
      );
    case 'mango':
      return (
        <G>
          <Path
            d="M18 32 C18 14 43 10 51 25 C59 42 42 58 27 55 C17 53 12 43 18 32Z"
            fill="#F6B93B"
          />
          <Path d="M30 18 C35 8 46 5 53 9 C44 17 37 19 30 18Z" fill="#46A96B" />
          <Path
            d="M33 17 Q34 10 38 6"
            fill="none"
            stroke="#58764A"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <Path
            d="M22 30 Q30 19 41 22"
            fill="none"
            opacity={0.55}
            stroke="#FFE88A"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </G>
      );
    case 'banana':
      return (
        <G>
          <Path
            d="M14 18 C16 43 32 55 53 43 C41 58 16 60 7 31 C5 24 8 19 14 18Z"
            fill="#F8D548"
            stroke="#D7A925"
            strokeWidth="2"
          />
          <Path
            d="M13 19 L10 13"
            stroke="#72543B"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <Path
            d="M48 46 L54 48"
            stroke="#72543B"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <Path
            d="M15 27 Q24 48 44 46"
            fill="none"
            opacity={0.6}
            stroke="#FFF29A"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </G>
      );
    case 'basket':
      return (
        <G>
          <Path d="M11 28 L53 28 L48 56 L16 56Z" fill="#C9783D" />
          <Path
            d="M18 29 Q20 8 32 8 Q44 8 46 29"
            fill="none"
            stroke="#96512E"
            strokeWidth="5"
          />
          <Path
            d="M13 37 H51 M15 47 H49 M23 29 L25 56 M40 29 L38 56"
            stroke="#F1B06F"
            strokeWidth="2"
          />
          <Rect fill="#8D492C" height="5" rx="2" width="48" x="8" y="26" />
        </G>
      );
    case 'seedling':
      return (
        <G>
          <Path d="M17 45 Q32 39 47 45 L43 57 H21Z" fill="#8B5C3D" />
          <Ellipse cx="32" cy="45" fill="#A87550" rx="17" ry="5" />
          <Path
            d="M32 45 C31 36 31 28 34 18"
            fill="none"
            stroke="#3B8D5D"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <Path
            d="M33 28 C22 28 17 21 18 15 C27 14 34 18 33 28Z"
            fill="#62BC75"
          />
          <Path
            d="M34 22 C40 13 49 12 54 17 C50 25 43 29 34 27Z"
            fill="#48A968"
          />
          <Path
            d="M22 48 Q32 43 42 48"
            fill="none"
            opacity={0.5}
            stroke="#D8A77D"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </G>
      );
    case 'chair':
      return (
        <G>
          <Rect fill="#3498E8" height="22" rx="5" width="34" x="15" y="9" />
          <Rect fill="#2385D0" height="9" rx="4" width="40" x="12" y="35" />
          <Path d="M17 43 L14 60 M47 43 L50 60" stroke="#6F91AD" strokeLinecap="round" strokeWidth="5" />
          <Path d="M19 31 L19 36 M45 31 L45 36" stroke="#6F91AD" strokeLinecap="round" strokeWidth="4" />
          <Circle cx="22" cy="20" fill="#BEE4FF" r="2" />
          <Circle cx="42" cy="20" fill="#BEE4FF" r="2" />
          <Path d="M14 60 H20 M46 60 H52" stroke="#237AC0" strokeLinecap="round" strokeWidth="3" />
        </G>
      );
    case 'cat':
      return (
        <G>
          <Ellipse cx="31" cy="43" fill="#F2A64A" rx="17" ry="14" />
          <Circle cx="32" cy="25" fill="#F7B65D" r="15" />
          <Polygon fill="#F7B65D" points="19,17 21,5 29,13" />
          <Polygon fill="#F7B65D" points="35,13 44,5 45,18" />
          <Polygon fill="#E88943" points="22,15 23,9 27,14" />
          <Polygon fill="#E88943" points="38,14 43,9 43,16" />
          <Path d="M46 43 C59 39 61 25 54 22" fill="none" stroke="#E58E3D" strokeLinecap="round" strokeWidth="5" />
          <Eye cx={27} cy={24} />
          <Eye cx={37} cy={24} />
          <Polygon fill="#8B5737" points="29,30 35,30 32,34" />
          <Path d="M32 34 Q28 38 25 35 M32 34 Q36 38 39 35" fill="none" stroke="#8B5737" strokeLinecap="round" strokeWidth="1.5" />
          <Path d="M18 48 L14 59 M42 49 L47 59" stroke="#D97E35" strokeLinecap="round" strokeWidth="5" />
        </G>
      );
    case 'sun':
      return (
        <G>
          <Path d="M32 3 V11 M32 53 V61 M3 32 H11 M53 32 H61 M11 11 L17 17 M47 47 L53 53 M53 11 L47 17 M17 47 L11 53" stroke="#F4B72E" strokeLinecap="round" strokeWidth="4" />
          <Circle cx="32" cy="32" fill="#FFD34E" r="19" />
          <Circle cx="25" cy="29" fill="#6F5834" r="2" />
          <Circle cx="39" cy="29" fill="#6F5834" r="2" />
          <Path d="M24 38 Q32 45 40 38" fill="none" stroke="#6F5834" strokeLinecap="round" strokeWidth="2" />
        </G>
      );
    case 'pen':
      return (
        <G>
          <Path d="M17 49 L45 12 Q48 8 52 12 L55 15 Q58 18 54 22 L26 57Z" fill="#3D8BE8" />
          <Path d="M17 49 L26 57 L13 61Z" fill="#F0C690" />
          <Path d="M13 61 L17 55 L20 59Z" fill="#213B57" />
          <Path d="M43 14 L54 23" stroke="#B9DAFF" strokeWidth="4" />
          <Path d="M22 49 L49 16" stroke="#77B6F7" strokeLinecap="round" strokeWidth="3" />
        </G>
      );
    case 'hat':
      return (
        <G>
          <Ellipse cx="32" cy="49" fill="#7654C9" rx="27" ry="8" />
          <Path d="M18 45 Q18 15 32 10 Q46 15 46 45Z" fill="#8A68DB" />
          <Path d="M18 38 Q32 43 46 38 V47 Q32 52 18 47Z" fill="#F3A64A" />
          <Path d="M24 18 Q32 13 40 19" fill="none" opacity={0.55} stroke="#C2AFF4" strokeLinecap="round" strokeWidth="4" />
        </G>
      );
    case 'book':
      return (
        <G>
          <Path d="M6 13 Q19 8 31 15 V55 Q19 48 6 53Z" fill="#FF7A59" />
          <Path d="M58 13 Q45 8 33 15 V55 Q45 48 58 53Z" fill="#F05D45" />
          <Path d="M10 17 Q20 13 29 18 V49 Q20 44 10 48Z" fill="#FFF9E8" />
          <Path d="M54 17 Q44 13 35 18 V49 Q44 44 54 48Z" fill="#FFF9E8" />
          <Path d="M32 15 V55" stroke="#B84538" strokeWidth="2" />
          <Path d="M14 24 H25 M14 30 H25 M39 24 H50 M39 30 H50" stroke="#D8C8A8" strokeLinecap="round" strokeWidth="2" />
        </G>
      );
    case 'table':
      return (
        <G>
          <Rect fill="#C97A42" height="11" rx="4" width="52" x="6" y="22" />
          <Path d="M14 32 L11 59 M50 32 L53 59" stroke="#8D512F" strokeLinecap="round" strokeWidth="6" />
          <Path d="M9 28 H55" opacity={0.45} stroke="#F1B77A" strokeLinecap="round" strokeWidth="3" />
          <Path d="M10 59 H17 M47 59 H54" stroke="#704025" strokeLinecap="round" strokeWidth="3" />
        </G>
      );
    case 'pencil':
      return (
        <G>
          <Path d="M14 48 L46 16 L54 24 L22 56Z" fill="#F6C842" />
          <Path d="M14 48 L22 56 L9 61Z" fill="#EAC08C" />
          <Path d="M9 61 L13 54 L17 58Z" fill="#24384C" />
          <Path d="M46 16 L51 11 Q53 9 56 12 L58 14 Q60 17 57 19 L54 24Z" fill="#F58B9B" />
          <Path d="M20 49 L49 20" stroke="#FFF0A0" strokeLinecap="round" strokeWidth="3" />
          <Path d="M43 18 L55 30" stroke="#D99B2B" strokeWidth="2" />
        </G>
      );
    case 'face':
      return (
        <G>
          <Circle cx="32" cy="31" fill="#D9905B" r="23" />
          <Circle cx="9" cy="32" fill="#D9905B" r="6" />
          <Circle cx="55" cy="32" fill="#D9905B" r="6" />
          <Eye cx={24} cy={27} />
          <Eye cx={40} cy={27} />
          <Path d="M32 30 L29 37 H35" fill="none" stroke="#8C5039" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <Path d="M23 42 Q32 50 41 42" fill="none" stroke="#8C5039" strokeLinecap="round" strokeWidth="2.5" />
        </G>
      );
    case 'teeth':
      return (
        <G>
          <Path d="M8 25 Q32 7 56 25 Q52 54 32 56 Q12 54 8 25Z" fill="#B94E55" />
          <Path d="M13 27 Q32 17 51 27 Q48 43 32 45 Q16 43 13 27Z" fill="#FFFFFF" />
          <Path d="M21 23 V43 M32 20 V45 M43 23 V43 M14 34 H50" stroke="#D4DFE8" strokeWidth="1.5" />
        </G>
      );
    case 'hand':
      return (
        <G>
          <Path d="M20 56 C13 49 12 40 16 35 L20 38 V15 C20 11 26 11 26 15 V31 V10 C26 6 32 6 32 10 V30 V9 C32 5 38 6 38 10 V31 V13 C38 9 44 10 44 14 V36 L49 30 C52 27 57 31 54 35 L45 49 C41 56 31 60 20 56Z" fill="#D9905B" />
          <Path d="M22 39 Q32 45 43 39" fill="none" opacity={0.35} stroke="#8C5039" strokeLinecap="round" strokeWidth="2" />
        </G>
      );
    case 'foot':
      return (
        <G>
          <Path d="M23 8 C31 7 36 14 36 25 C36 34 48 37 52 44 C57 53 48 59 36 57 C22 55 13 48 14 38 C15 30 19 24 18 17 C17 12 19 9 23 8Z" fill="#D9905B" />
          <Circle cx="41" cy="31" fill="#D9905B" r="5" />
          <Circle cx="47" cy="34" fill="#D9905B" r="4.5" />
          <Circle cx="52" cy="38" fill="#D9905B" r="4" />
          <Circle cx="55" cy="43" fill="#D9905B" r="3.5" />
        </G>
      );
    case 'hair':
      return (
        <G>
          <Circle cx="32" cy="34" fill="#D9905B" r="20" />
          <Path d="M12 31 C10 12 24 5 34 9 C46 4 57 16 52 33 C47 23 41 18 34 20 C27 15 19 21 12 31Z" fill="#3E2B24" />
          <Path d="M17 21 Q22 10 29 18 M28 17 Q34 7 39 18 M39 18 Q47 10 49 25" fill="none" stroke="#6A4635" strokeLinecap="round" strokeWidth="4" />
          <Eye cx={25} cy={35} />
          <Eye cx={39} cy={35} />
        </G>
      );
    case 'leaf':
      return (
        <G>
          <Path d="M9 40 C12 15 32 5 55 13 C53 37 38 54 13 51Z" fill="#4CAF68" />
          <Path d="M13 50 Q31 33 51 16 M25 39 L18 27 M35 31 L39 19" fill="none" stroke="#257E48" strokeLinecap="round" strokeWidth="2.5" />
        </G>
      );
    case 'flower':
      return (
        <G>
          <Path d="M32 35 V59" stroke="#3C9C59" strokeLinecap="round" strokeWidth="5" />
          <Ellipse cx="23" cy="48" fill="#5DBE72" rx="10" ry="5" transform="rotate(28 23 48)" />
          <Circle cx="32" cy="25" fill="#F3B839" r="7" />
          <Circle cx="32" cy="12" fill="#F27BA0" r="9" />
          <Circle cx="45" cy="25" fill="#F27BA0" r="9" />
          <Circle cx="32" cy="38" fill="#F27BA0" r="9" />
          <Circle cx="19" cy="25" fill="#F27BA0" r="9" />
        </G>
      );
    case 'stem':
      return (
        <G>
          <Path d="M32 7 V58" stroke="#369355" strokeLinecap="round" strokeWidth="7" />
          <Path d="M31 27 C17 27 11 18 12 12 C24 11 31 17 31 27Z" fill="#66BC73" />
          <Path d="M34 40 C47 40 54 31 52 25 C41 25 34 31 34 40Z" fill="#4AAA67" />
        </G>
      );
    case 'roots':
      return (
        <G>
          <Path d="M7 24 H57" stroke="#9A6A45" strokeLinecap="round" strokeWidth="5" />
          <Path d="M32 5 V24" stroke="#3F9A59" strokeLinecap="round" strokeWidth="6" />
          <Path d="M32 24 C31 36 25 46 20 59 M32 29 C38 39 42 49 45 59 M28 36 L17 43 M36 39 L48 46 M24 47 L29 57 M42 49 L37 58" fill="none" stroke="#9A6A45" strokeLinecap="round" strokeWidth="3" />
        </G>
      );
    case 'mystery':
      return (
        <G>
          <Rect fill="#15803D" height="48" rx="14" width="48" x="8" y="7" />
          <Path
            d="M23 23 C24 12 43 12 43 25 C43 34 33 32 33 40"
            fill="none"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeWidth="6"
          />
          <Circle cx="33" cy="48" fill="#FFFFFF" r="3.5" />
          <Path
            d="M14 16 L20 10 M48 49 L53 44"
            opacity={0.6}
            stroke="#BFB1FF"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </G>
      );
  }
}

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
    case 'mystery':
      return (
        <G>
          <Rect fill="#7457D9" height="48" rx="14" width="48" x="8" y="7" />
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

import React from 'react';

import type { LearningVisualSpec } from '../types';
import { BalanceScene } from './scenes/BalanceScene';
import { CardsScene } from './scenes/CardsScene';
import { ClassifyScene } from './scenes/ClassifyScene';
import { GroupsScene } from './scenes/GroupsScene';
import { MarketScene } from './scenes/MarketScene';
import { NumberLineScene } from './scenes/NumberLineScene';
import { SequenceScene } from './scenes/SequenceScene';
import { SettingScene } from './scenes/SettingScene';
import { StoryScene } from './scenes/StoryScene';

/**
 * Routes lesson data to an original, concept-specific visual scene.
 * Keep this component exhaustive so adding a visual type always requires a renderer.
 */
export function LearningVisual({ spec }: { spec: LearningVisualSpec }) {
  switch (spec.kind) {
    case 'balance':
      return <BalanceScene spec={spec} />;
    case 'groups':
      return <GroupsScene spec={spec} />;
    case 'market':
      return <MarketScene spec={spec} />;
    case 'story':
      return <StoryScene spec={spec} />;
    case 'cards':
      return <CardsScene spec={spec} />;
    case 'sequence':
      return <SequenceScene spec={spec} />;
    case 'scene':
      return <SettingScene spec={spec} />;
    case 'number_line':
      return <NumberLineScene spec={spec} />;
    case 'classify':
      return <ClassifyScene spec={spec} />;
  }
}

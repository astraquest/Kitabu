export type RankedListItem = {
  id: string;
  label: string;
  value: number;
  accessibleDescription: string;
};

export type RankedListSceneProps = {
  mode: 'ranked-list';
  items: RankedListItem[];
  orderingRules: { direction: 'ascending' | 'descending' };
  allowMultiplePlacements: false;
  unplacedPolicy: 'all-items-required';
  layout: { orientation: 'vertical' | 'horizontal'; showPositionNumbers: boolean };
  shuffleSeed: string;
  explanationPolicy: { required: boolean };
  keyboardMoveModel: 'pick-move-drop' | 'move-buttons';
};

export const GRADE_6_WHOLE_NUMBERS_RANK_SCENE = {
  identity: { sceneId: 'ken-cbc-g6-math-whole-numbers-rank-001', schemaVersion: '1.0.1' },
  component: { componentId: 'classify-sort-match-rank', componentVersion: '1.0.0' },
  purpose: 'practice',
  prompt: { default: 'Arrange the number cards from smallest to largest.' },
  props: {
    mode: 'ranked-list',
    items: [
      { id: 'number-51090', label: '51,090', value: 51090, accessibleDescription: 'fifty-one thousand and ninety' },
      { id: 'number-7420', label: '7,420', value: 7420, accessibleDescription: 'seven thousand four hundred and twenty' },
      { id: 'number-99999', label: '99,999', value: 99999, accessibleDescription: 'ninety-nine thousand nine hundred and ninety-nine' },
      { id: 'number-18305', label: '18,305', value: 18305, accessibleDescription: 'eighteen thousand three hundred and five' }
    ],
    orderingRules: { direction: 'ascending' },
    allowMultiplePlacements: false,
    unplacedPolicy: 'all-items-required',
    layout: { orientation: 'vertical', showPositionNumbers: true },
    shuffleSeed: 'g6-whole-numbers-rank-001',
    explanationPolicy: { required: false },
    keyboardMoveModel: 'move-buttons'
  },
  evidenceClaims: [{ claimId: 'ken-cbc-g6-math-1.1-d', description: { default: 'Order numbers up to 100,000.' }, evidenceTypes: ['answer'], masteryRuleId: 'exact-ascending-order' }],
  grader: { graderId: 'ordered-item-ids', graderVersion: '1.0.0', mode: 'exact' },
  completion: { completionRuleId: 'whole-numbers-rank-complete', kind: 'evidence-claims-met', requiredClaimIds: ['ken-cbc-g6-math-1.1-d'] },
  tutorPermissions: [],
  assets: { manifestId: 'ken-cbc-g6-math-whole-numbers-rank-001-assets', assets: [] },
  deterministicSeed: 'g6-whole-numbers-rank-001',
  attemptPolicy: { maxAttempts: 3, feedbackTiming: 'on-submit', revealAnswer: 'after-completion' }
} as const;

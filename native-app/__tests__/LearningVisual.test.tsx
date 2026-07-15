import React from 'react';
import { AccessibilityInfo } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { LearningVisual } from '../src/features/progressiveLearning/components/LearningVisual';
import { ObjectIllustration } from '../src/features/progressiveLearning/components/scenes/ObjectIllustration';
import { ConceptIllustration } from '../src/features/progressiveLearning/components/scenes/ConceptIllustration';
import type { LearningVisualSpec } from '../src/features/progressiveLearning/types';

jest.setTimeout(15000);

const OBJECT_SPECS: LearningVisualSpec[] = [
  {
    kind: 'balance',
    left: [{ object: 'elephant', count: 1 }],
    right: [{ object: 'zebra', count: 4 }],
    balanced: true,
    caption: 'One elephant balances four zebras.',
  },
  {
    kind: 'groups',
    object: 'mango',
    groups: 3,
    each: 4,
    total: 12,
    caption: 'Three equal groups of four mangoes make twelve.',
  },
  {
    kind: 'market',
    items: [{ object: 'banana', count: 2, price: 40, label: 'Two bananas' }],
    caption: 'Two bananas cost forty shillings.',
  },
  {
    kind: 'story',
    objects: [{ object: 'giraffe', count: 2, label: 'At the watering hole' }],
    caption: 'Two giraffes meet at the watering hole.',
  },
];

const ABSTRACT_SPECS: LearningVisualSpec[] = [
  {
    kind: 'cards',
    cards: [
      {
        id: 'one',
        label: '40,000',
        detail: 'four ten-thousands',
        accent: 'blue',
        state: 'selected',
      },
      { id: 'two', label: '3,000', accent: 'gold' },
    ],
    layout: 'row',
    instruction: 'Join the place-value cards.',
    caption: 'Place-value cards build forty-three thousand.',
  },
  {
    kind: 'sequence',
    steps: [
      {
        id: 'seed',
        label: 'Plant the seed',
        detail: 'Place it in moist soil.',
      },
      { id: 'root', label: 'A root appears' },
      { id: 'shoot', label: 'A shoot grows' },
    ],
    activeIndex: 1,
    caption: 'A bean seed grows in three stages.',
  },
  {
    kind: 'scene',
    setting: 'garden',
    elements: [
      { id: 'sun', label: 'sunlight', state: 'highlighted' },
      { id: 'plant', label: 'healthy seedling', count: 3 },
    ],
    caption: 'Seedlings grow in the school garden.',
  },
  {
    kind: 'number_line',
    min: 0,
    max: 12,
    markers: [
      { value: 0, label: 'start' },
      { value: 8, label: 'finish' },
    ],
    jump: { from: 2, to: 8, label: 'jump 6' },
    caption: 'Jump six spaces from two to eight.',
  },
  {
    kind: 'classify',
    buckets: [
      { id: 'energy', label: 'Energy' },
      { id: 'protective', label: 'Protective' },
    ],
    items: [
      { id: 'ugali', label: 'ugali', accent: 'gold' },
      { id: 'sukuma', label: 'sukuma wiki', accent: 'green' },
    ],
    caption: 'Sort foods by the job they do in the body.',
  },
];

const SPECS = [...OBJECT_SPECS, ...ABSTRACT_SPECS];

beforeEach(() => {
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test.each(SPECS)(
  '$kind scene exposes one concise image description and contains no emoji artwork',
  async spec => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<LearningVisual spec={spec} />);
    });

    expect(
      renderer.root.findByProps({ accessibilityRole: 'image' }).props
        .accessibilityLabel,
    ).toBe(spec.caption);
    const imageDescriptions = new Set(
      renderer.root
        .findAllByProps({ accessibilityRole: 'image' })
        .map(node => node.props.accessibilityLabel),
    );
    expect([...imageDescriptions]).toEqual([spec.caption]);
    expect(JSON.stringify(renderer.toJSON())).not.toMatch(
      /\p{Extended_Pictographic}/u,
    );

    await act(async () => {
      renderer.unmount();
    });
  },
);

test.each(OBJECT_SPECS)(
  '$kind object scene uses original vector illustrations',
  async spec => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<LearningVisual spec={spec} />);
    });

    expect(
      renderer.root.findAllByType(ObjectIllustration).length,
    ).toBeGreaterThan(0);

    await act(async () => {
      renderer.unmount();
    });
  },
);

test.each(ABSTRACT_SPECS.filter(spec => spec.kind !== 'number_line'))(
  '$kind abstract scene uses authored concept illustrations instead of text-only chips',
  async spec => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<LearningVisual spec={spec} />);
    });

    expect(
      renderer.root.findAllByType(ConceptIllustration).length,
    ).toBeGreaterThan(0);

    await act(async () => {
      renderer.unmount();
    });
  },
);

test('concept vocabulary renders meaningful science, map, arts, and digital-safety models', async () => {
  const specs: LearningVisualSpec[] = [
    {
      kind: 'sequence',
      steps: [
        { id: 'seed', label: 'dry seed' },
        { id: 'root', label: 'root appears' },
        { id: 'shoot', label: 'young plant' },
      ],
      caption: 'A plant changes as it grows.',
    },
    {
      kind: 'scene',
      setting: 'classroom',
      elements: [
        { id: 'heart', label: 'heart in chest' },
        { id: 'blood', label: 'blood moving' },
      ],
      caption: 'The heart moves blood around the body.',
    },
    {
      kind: 'cards',
      cards: [
        { id: 'map', label: 'move north to market' },
        { id: 'paint', label: 'blue and yellow paint' },
        { id: 'rhythm', label: 'four steady beats' },
        { id: 'privacy', label: 'keep password private' },
        { id: 'prompt', label: 'clear AI prompt' },
      ],
      layout: 'grid',
      caption: 'Different ideas use different visual models.',
    },
  ];

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <>{specs.map((spec, index) => <LearningVisual key={index} spec={spec} />)}</>,
    );
  });

  [
    'concept-art-plant',
    'concept-art-heart',
    'concept-art-map',
    'concept-art-paint',
    'concept-art-rhythm',
    'concept-art-shield',
    'concept-art-computer',
  ].forEach(testID => {
    expect(renderer.root.findAllByProps({ testID }).length).toBeGreaterThan(0);
  });

  await act(async () => {
    renderer.unmount();
  });
});

test('scene motion follows live reduced-motion changes and removes its listener', async () => {
  const remove = jest.fn();
  const addEventListenerSpy = jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue(
      { remove } as unknown as ReturnType<
        typeof AccessibilityInfo.addEventListener
      >,
    );

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<LearningVisual spec={ABSTRACT_SPECS[1]} />);
  });

  const reduceMotionListener = addEventListenerSpy.mock.calls[0][1] as unknown as (
    enabled: boolean,
  ) => void;
  await act(async () => {
    reduceMotionListener(false);
    reduceMotionListener(true);
  });
  await act(async () => {
    renderer.unmount();
  });
  expect(remove).toHaveBeenCalledTimes(1);
});

import type { GenericSampleSceneInput } from '../genericSampleScene.js';

export const LANGUAGE_SOCIAL_DIGITAL_SAMPLES: readonly GenericSampleSceneInput[] = [
  {
    sceneId: 'ken-cbc-g1-english.comprehension-questions-school-garden-001',
    componentId: 'comprehension-questions',
    prompt: 'Read about Akinyi helping in the school garden, then share what you understand.',
    props: {
      title: 'Akinyi in the school garden',
      instructions: 'Read the short passage and answer each question in your own words.',
      body: 'Akinyi carries a small watering can to the school garden. She waters the sukuma wiki and checks that the soil is moist. Her class will use the vegetables for a healthy lunch.',
      list: [
        'Who carries the watering can?',
        'Which vegetable does Akinyi water?',
        'Why does the class grow vegetables?',
      ],
      inputKind: 'text',
      inputLabel: 'Write one answer at a time',
      inputPlaceholder: 'Use a short sentence',
      inputMaxLength: 160,
    },
  },
  {
    sceneId: 'ken-cbc-g2-art.scribble-sign-doodle-canvas-community-market-001',
    componentId: 'scribble-sign-doodle-canvas',
    prompt: 'Make a friendly sign for a Kenyan community market stall.',
    props: {
      title: 'Market stall sign',
      instructions: 'Scribble, sign, or doodle a bright sign for a fruit stall. Add a picture and a few words.',
      list: [
        'Draw one fruit sold at the stall.',
        'Add the stall name or a welcoming phrase.',
        'Use lines, shapes, or colours to make the sign easy to see.',
      ],
      inputKind: 'none',
      presentation: {
        canvas: {
          label: 'Doodle canvas',
          description: 'A free drawing area for a market-stall sign.',
        },
      },
    },
  },
  {
    sceneId: 'ken-cbc-g3-science.draw-annotate-canvas-maize-plant-001',
    componentId: 'draw-annotate-canvas',
    prompt: 'Draw and label the main parts of a maize plant growing on a Kenyan farm.',
    props: {
      title: 'Parts of a maize plant',
      instructions: 'Sketch the plant, then add labels and arrows to show what you know.',
      list: [
        'Include the roots, stem, leaves, and maize cob.',
        'Draw an arrow from each label to the correct part.',
        'Write one observation about how the plant grows.',
      ],
      inputKind: 'none',
      presentation: {
        canvas: {
          label: 'Plant annotation canvas',
          description: 'A drawing area for a maize plant and learner-made labels.',
        },
      },
    },
  },
  {
    sceneId: 'ken-cbc-g4-social-studies.map-explorer-kenya-regions-001',
    componentId: 'map-explorer',
    prompt: 'Explore a map of Kenya and compare places near the coast, lake, and highlands.',
    props: {
      title: 'Kenya places and regions',
      instructions: 'Use the map view to locate the examples, then describe one difference between two places.',
      list: [
        'Find Mombasa near the Indian Ocean.',
        'Find Kisumu near Lake Victoria.',
        'Find a highland town such as Nyeri or Eldoret.',
        'Describe one way land or water may affect life in two places.',
      ],
      inputKind: 'text',
      inputLabel: 'Compare two places',
      inputPlaceholder: 'Write one observation',
      inputMaxLength: 220,
      presentation: {
        map: {
          label: 'Kenya map explorer',
          description: 'A map view for locating Kenyan places and comparing their surroundings.',
        },
      },
    },
  },
  {
    sceneId: 'ken-cbc-g5-history.history-timeline-independence-001',
    componentId: 'history-timeline',
    prompt: 'Place key events from Kenya\'s journey to independence in a clear timeline.',
    props: {
      title: 'Kenya: independence milestones',
      instructions: 'Read the milestones, put them in time order, and add one sentence about why timelines help.',
      table: {
        columns: ['Year', 'Milestone'],
        rows: [
          ['1963', 'Kenya gained independence.'],
          ['1964', 'Kenya became a republic.'],
          ['2010', 'Kenya adopted a new Constitution.'],
        ],
      },
      list: [
        'Notice which event happened first.',
        'Compare the years and the spaces between them.',
        'Explain how a timeline shows change over time.',
      ],
      inputKind: 'text',
      inputLabel: 'Your timeline reflection',
      inputPlaceholder: 'Write one sentence',
      inputMaxLength: 180,
    },
  },
  {
    sceneId: 'ken-cbc-g6-social-studies.primary-source-analysis-school-archive-001',
    componentId: 'primary-source-analysis',
    prompt: 'Study a school archive note about a community clean-up and explain what it can tell us.',
    props: {
      title: 'Reading a community archive note',
      instructions: 'Read the source description carefully. Separate details you can observe from ideas you infer.',
      body: 'Source description: A handwritten note in a Kisumu school archive records a Saturday clean-up near a footpath by the lake. It names the date, the clubs that joined, and the number of rubbish bags collected.',
      list: [
        'Which details come directly from the note?',
        'Who might have created this source, and why?',
        'What question would you ask before using it as evidence?',
      ],
      inputKind: 'text',
      inputLabel: 'Write your source analysis',
      inputPlaceholder: 'Use details from the source description',
      inputMaxLength: 280,
    },
  },
  {
    sceneId: 'ken-cbc-g7-computer-studies.hardware-labeling-solar-lab-001',
    componentId: 'hardware-labeling',
    prompt: 'Label the hardware in a solar-powered computer lab and describe each part\'s role.',
    props: {
      title: 'Solar computer lab hardware',
      instructions: 'Match each visible part with a useful label, then describe how it helps the learner use the computer.',
      items: [
        { id: 'screen', label: 'Screen', description: 'Displays words, pictures, and learning activities.' },
        { id: 'keyboard', label: 'Keyboard', description: 'Lets a learner enter letters, numbers, and symbols.' },
        { id: 'mouse', label: 'Mouse or touchpad', description: 'Moves the pointer and selects items.' },
        { id: 'solar-battery', label: 'Solar battery unit', description: 'Stores electrical energy for the lab.' },
      ],
      list: [
        'Look for the part that displays information.',
        'Look for the part used to type.',
        'Identify the unit that stores energy for later use.',
      ],
      inputKind: 'text',
      inputLabel: 'Describe one hardware part',
      inputPlaceholder: 'Name the part and its role',
      inputMaxLength: 180,
    },
  },
  {
    sceneId: 'ken-cbc-g8-computing.block-code-trace-library-counter-001',
    componentId: 'block-code-trace',
    prompt: 'Trace a block sequence that counts books added to a classroom library.',
    props: {
      title: 'Classroom library counter',
      instructions: 'Follow the block descriptions in order, keep track of the changing count, and record what you notice.',
      items: [
        { id: 'start-count', label: 'Start with a count', description: 'The shelf begins with 2 books.' },
        { id: 'repeat-add', label: 'Repeat an action', description: 'The same book-counting action happens three times.' },
        { id: 'add-book', label: 'Add one book', description: 'Increase the count by one whenever a book is placed on the shelf.' },
        { id: 'show-count', label: 'Show the count', description: 'Display the count after the repeated action finishes.' },
      ],
      list: [
        'Read each block description from top to bottom.',
        'Track how the count changes after each repeated action.',
        'Explain in words what the repeat block does.',
      ],
      inputKind: 'numeric',
      inputLabel: 'Record the final count',
      inputPlaceholder: 'Enter a number',
    },
  },
  {
    sceneId: 'ken-cbc-g9-life-skills.digital-citizenship-scenario-class-group-001',
    componentId: 'digital-citizenship-scenario',
    prompt: 'Choose a safe and respectful response when an unfamiliar image appears in a class group.',
    props: {
      title: 'A thoughtful class-group response',
      instructions: 'Read the situation, choose a response, and explain how it protects people and supports respectful communication.',
      body: 'A learner in a school class group receives an image from an unfamiliar account. The image asks for personal details and encourages everyone to forward it quickly.',
      options: [
        { id: 'pause-check', label: 'Pause and check', description: 'Do not forward it; ask a trusted teacher or adult to help check the message.' },
        { id: 'protect-privacy', label: 'Protect privacy', description: 'Keep personal details private and remind classmates not to share theirs.' },
        { id: 'report-block', label: 'Report and block', description: 'Use the group or device safety tools if the message is unwanted or harmful.' },
        { id: 'send-on', label: 'Forward quickly', description: 'Share the image with more people before checking it.' },
      ],
      list: [
        'Look for a response that protects personal information.',
        'Consider who could help you check an unfamiliar message.',
        'Explain how your choice shows respect for classmates.',
      ],
      inputKind: 'choice',
    },
  },
];

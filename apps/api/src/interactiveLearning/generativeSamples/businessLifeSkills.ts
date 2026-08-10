import type { GenericSampleSceneInput } from '../genericSampleScene.js';

/** Learner-safe Kenyan business and life-skills samples for generic renderers. */
export const BUSINESS_LIFE_SKILLS_SAMPLES: readonly GenericSampleSceneInput[] = [
  {
    sceneId: 'ken-cbc-g1-business-life-skills.budget-planner-school-snack-001',
    componentId: 'budget-planner',
    prompt: 'Plan how to use a small amount of money for a healthy school snack.',
    props: {
      title: 'A small snack budget',
      instructions: 'Look at the snack choices and plan how you would spend carefully. Talk about your choice with a trusted adult or partner.',
      body: 'Imagine you have 20 shillings for a school snack. You may choose fruit, water, or another food available at your school.',
      options: [
        { id: 'banana-water', label: 'A banana and water', description: 'A simple snack and a drink.' },
        { id: 'fruit-only', label: 'Fruit only', description: 'Choose one fruit that fits your budget.' },
        { id: 'save-some', label: 'Save some money', description: 'Choose less now and keep some for another need.' },
      ],
      inputKind: 'choice',
      inputLabel: 'My spending plan',
    },
  },
  {
    sceneId: 'ken-cbc-g3-business-life-skills.accounting-ledger-school-garden-001',
    componentId: 'accounting-ledger',
    prompt: 'Record simple items received and used in a school garden project.',
    props: {
      title: 'School garden record',
      instructions: 'Read the garden notes and add a short record for each item. Use words or numbers that you can explain.',
      body: 'The class received 6 seed packets and used 2 packets in the garden. The remaining packets were stored safely.',
      table: {
        columns: ['Item', 'Received', 'Used', 'Note'],
        rows: [
          ['Seed packets', '6', '2', 'Stored the rest safely'],
          ['Watering cans', '2', '1', 'The other can is in the store'],
        ],
      },
      inputKind: 'text',
      inputLabel: 'One record I can explain',
      inputPlaceholder: 'Write an item and what happened',
      inputMaxLength: 100,
    },
  },
  {
    sceneId: 'ken-cbc-g2-business-life-skills.crop-life-cycle-maize-001',
    componentId: 'crop-life-cycle',
    prompt: 'Put the stages of a maize plant life cycle in an order that makes sense.',
    props: {
      title: 'From maize seed to cob',
      instructions: 'Arrange the stages and describe one change you notice as the maize grows.',
      items: [
        { id: 'seed', label: 'Seed in the soil' },
        { id: 'sprout', label: 'Small sprout' },
        { id: 'plant', label: 'Tall maize plant' },
        { id: 'cob', label: 'Maize cob with kernels' },
      ],
      inputKind: 'text',
      inputLabel: 'One change I notice',
      inputPlaceholder: 'Write a short observation',
      inputMaxLength: 100,
      presentation: {
        canvas: {
          label: 'Maize life-cycle picture area',
          description: 'A clear, labelled area for arranging the stages; the text cards remain available if the picture is not shown.',
        },
      },
    },
  },
  {
    sceneId: 'ken-cbc-g1-business-life-skills.nutrition-plate-builder-healthy-lunch-001',
    componentId: 'nutrition-plate-builder',
    prompt: 'Build a colourful plate for a healthy Kenyan lunch.',
    props: {
      title: 'A healthy lunch plate',
      instructions: 'Choose foods from different groups and describe how your plate has variety. Use foods that are familiar and available to your family.',
      items: [
        { id: 'ugali', label: 'Ugali', description: 'A staple food that gives energy.' },
        { id: 'beans', label: 'Beans', description: 'A food that helps the body grow.' },
        { id: 'sukuma-wiki', label: 'Sukuma wiki', description: 'A leafy vegetable.' },
        { id: 'mango', label: 'Mango', description: 'A fruit.' },
        { id: 'water', label: 'Clean water', description: 'A drink for the body.' },
      ],
      inputKind: 'choice',
      inputLabel: 'Food I would add next',
    },
  },
  {
    sceneId: 'ken-cbc-g1-business-life-skills.health-anatomy-diagram.body-parts-001',
    componentId: 'health-anatomy-diagram',
    prompt: 'Explore a simple body diagram and name parts that help us move and sense.',
    props: {
      title: 'My body helps me learn',
      instructions: 'Point to or select a body part, then describe one everyday job it helps you do. Do not share private health details.',
      body: 'Hands can hold a pencil, eyes can look at a book, ears can listen, and feet can help us walk.',
      items: [
        { id: 'eyes', label: 'Eyes', description: 'Help us see.' },
        { id: 'ears', label: 'Ears', description: 'Help us hear.' },
        { id: 'hands', label: 'Hands', description: 'Help us hold and make things.' },
        { id: 'feet', label: 'Feet', description: 'Help us stand and move.' },
      ],
      inputKind: 'choice',
      inputLabel: 'Body part I chose',
      presentation: {
        canvas: {
          label: 'Simple body diagram',
          description: 'A large, high-contrast diagram with text labels; the written descriptions are a complete fallback.',
        },
      },
    },
  },
  {
    sceneId: 'ken-cbc-g1-business-life-skills.safety-decision-scenario-road-crossing-001',
    componentId: 'safety-decision-scenario',
    prompt: 'Think about a safe way to cross a road near school.',
    props: {
      title: 'A safe journey home',
      instructions: 'Read the situation, choose a response, and explain who can help you stay safe. Never practise near moving traffic.',
      body: 'You are walking home from school and need to cross a busy road. A trusted adult or crossing area is nearby.',
      options: [
        { id: 'use-crossing', label: 'Use the crossing with help', description: 'Stop, look, listen, and cross with a trusted adult when possible.' },
        { id: 'wait-safely', label: 'Wait in a safe place', description: 'Stay away from the road edge until it is safe to cross.' },
        { id: 'ask-adult', label: 'Ask a trusted adult', description: 'Ask a teacher, caregiver, or other trusted adult for help.' },
      ],
      inputKind: 'choice',
      inputLabel: 'My safety choice',
    },
  },
  {
    sceneId: 'ken-cbc-g1-business-life-skills.pattern-composition-board.kitenge-shapes-001',
    componentId: 'pattern-composition-board',
    prompt: 'Make a repeating pattern using shapes inspired by colourful kitenge cloth.',
    props: {
      title: 'A repeating cloth pattern',
      instructions: 'Choose two or three shapes, place them in a repeating order, and tell someone how your pattern continues.',
      items: [
        { id: 'circle', label: 'Circle' },
        { id: 'triangle', label: 'Triangle' },
        { id: 'diamond', label: 'Diamond' },
      ],
      inputKind: 'none',
      presentation: {
        canvas: {
          label: 'Pattern board',
          description: 'A large, uncluttered board for arranging shapes; describe the pattern aloud if the board is unavailable.',
        },
      },
    },
  },
  {
    sceneId: 'ken-cbc-g1-business-life-skills.music-rhythm-grid.school-song-001',
    componentId: 'music-rhythm-grid',
    prompt: 'Make a short rhythm for a welcoming school song.',
    props: {
      title: 'Clap a school rhythm',
      instructions: 'Tap or clap a gentle pattern on the grid. You may also say the pattern aloud or use a quiet finger tap.',
      list: ['Clap', 'Clap', 'Rest', 'Clap', 'Rest', 'Clap'],
      inputKind: 'none',
      presentation: {
        canvas: {
          label: 'Rhythm grid',
          description: 'A high-contrast row of large rhythm spaces; the written pattern is a static fallback.',
        },
      },
    },
  },
  {
    sceneId: 'ken-cbc-g2-business-life-skills.drama-roleplay.market-greeting-001',
    componentId: 'drama-roleplay',
    prompt: 'Practise a respectful greeting between a customer and a market seller.',
    props: {
      title: 'A friendly market greeting',
      instructions: 'Choose a role or read both parts with a partner. Use a clear voice, listen carefully, and stop if anyone feels uncomfortable.',
      steps: [
        'Seller: Welcome. How may I help you?',
        'Customer: Please show me the bananas.',
        'Seller: Here they are. Thank you for asking politely.',
      ],
      options: [
        { id: 'seller', label: 'Seller' },
        { id: 'customer', label: 'Customer' },
        { id: 'reader', label: 'Reader or narrator' },
      ],
      inputKind: 'choice',
      inputLabel: 'Role I will try',
    },
  },
  {
    sceneId: 'ken-cbc-g2-business-life-skills.movement-sequence.safe-classroom-001',
    componentId: 'movement-sequence',
    prompt: 'Follow a gentle movement sequence that can be done safely beside your desk.',
    props: {
      title: 'Move and pause',
      instructions: 'Make space, move gently, and keep your own comfort in mind. You may watch, use smaller movements, or stop at any time.',
      steps: ['Stand or sit tall.', 'Reach both hands up if comfortable.', 'Circle the shoulders slowly.', 'Take one calm breath and pause.'],
      body: 'Static fallback: Read each step aloud and imagine or mime the movement without leaving your place.',
      inputKind: 'none',
      presentation: {
        canvas: {
          label: 'Movement sequence cards',
          description: 'Large step cards with simple words; the written sequence works without animation.',
        },
      },
    },
  },
  {
    sceneId: 'ken-cbc-g2-business-life-skills.emotion-regulation-checkin.calm-start-001',
    componentId: 'emotion-regulation-checkin',
    prompt: 'Notice how you feel and choose a safe way to get ready to learn.',
    props: {
      title: 'My calm learning check-in',
      instructions: 'Choose a word that fits how you feel now, then choose a helpful next step. You may keep your answer private and ask a trusted adult for support.',
      options: [
        { id: 'ready', label: 'Ready', description: 'I can begin a learning activity.' },
        { id: 'unsure', label: 'Unsure', description: 'I may need a quiet moment or a simple explanation.' },
        { id: 'need-support', label: 'Need support', description: 'I can tell a trusted adult that I need help.' },
      ],
      list: ['Take one slow breath.', 'Sip water if it is available.', 'Ask for a quiet space or kind help.'],
      inputKind: 'choice',
      inputLabel: 'My check-in',
    },
  },
  {
    sceneId: 'ken-cbc-g2-business-life-skills.lesson-flow.school-garden-project-001',
    componentId: 'lesson-flow',
    prompt: 'Follow a short lesson flow for planting and caring for a class seed.',
    props: {
      title: 'Our seed lesson',
      instructions: 'Move through the lesson steps in order. Work with a teacher or caregiver and wash hands after handling soil.',
      steps: ['Look at a dry seed.', 'Talk about what a seed needs.', 'Place a seed in prepared soil with help.', 'Draw or describe what you notice later.'],
      inputKind: 'none',
    },
  },
  {
    sceneId: 'ken-cbc-g2-business-life-skills.feedback-panel.team-garden-001',
    componentId: 'feedback-panel',
    prompt: 'Share kind, useful feedback after working with a partner in the school garden.',
    props: {
      title: 'Helpful partner feedback',
      instructions: 'Choose a sentence starter and complete it with something you noticed. Talk about the work, not a person’s worth.',
      options: [
        { id: 'liked', label: 'I liked...', description: 'Name one helpful part of the work.' },
        { id: 'noticed', label: 'I noticed...', description: 'Describe something you saw or heard.' },
        { id: 'next-time', label: 'Next time...', description: 'Suggest one small improvement kindly.' },
      ],
      inputKind: 'text',
      inputLabel: 'My feedback',
      inputPlaceholder: 'Complete one sentence starter',
      inputMaxLength: 120,
    },
  },
  {
    sceneId: 'ken-cbc-g3-business-life-skills.offline-content-fallback.school-shop-001',
    componentId: 'offline-content-fallback',
    prompt: 'Continue a simple school-shop activity when the learning device has no connection.',
    props: {
      title: 'Learning without a connection',
      instructions: 'Use the saved activity on the device or read the printed notes. Continue with a partner and ask a teacher if you need help.',
      body: 'Offline fallback: A class shop has 3 pencils, 2 exercise books, and 4 rulers. Draw or list the items, then describe one way to keep the shop record neat.',
      steps: ['Read the saved notes.', 'Draw or list the shop items.', 'Share one neat record with a partner.'],
      inputKind: 'text',
      inputLabel: 'My offline note',
      inputPlaceholder: 'Write one shop item or observation',
      inputMaxLength: 100,
      presentation: {
        canvas: {
          label: 'Saved offline activity',
          description: 'A readable text version remains available when images or network content cannot load.',
        },
      },
    },
  },
  {
    sceneId: 'ken-cbc-g3-business-life-skills.asset-reference.maize-tools-001',
    componentId: 'asset-reference',
    prompt: 'Look at the classroom picture or saved description of tools used to care for a maize crop.',
    props: {
      title: 'Tools for a maize garden',
      instructions: 'Select a tool and explain how it may be used safely. Use the text description if the picture is not available.',
      body: 'Static fallback: A watering can carries water, a hoe helps prepare soil with adult guidance, and a basket can carry harvested maize.',
      items: [
        { id: 'watering-can', label: 'Watering can', description: 'Carries water to plants.' },
        { id: 'hoe', label: 'Hoe', description: 'A tool used by an adult to prepare soil safely.' },
        { id: 'basket', label: 'Basket', description: 'Carries produce or garden items.' },
      ],
      inputKind: 'choice',
      inputLabel: 'Tool I chose',
      presentation: {
        canvas: {
          label: 'Saved garden-tool picture',
          description: 'A local, packaged picture may be shown here; the text labels and descriptions are the accessible fallback.',
        },
      },
    },
  },
  {
    sceneId: 'ken-cbc-g3-business-life-skills.evidence-capture.school-garden-observation-001',
    componentId: 'evidence-capture',
    prompt: 'Capture a short record of what you observed in a school or home garden.',
    props: {
      title: 'My garden observation',
      instructions: 'Write or dictate one observation from your activity. Do not include your full name, address, phone number, or another person\'s private information.',
      body: 'You can record a leaf colour, the condition of the soil, or a change you noticed. A drawing or spoken description is also useful.',
      list: ['What did you observe?', 'Where was the plant or object?', 'What question do you still have?'],
      inputKind: 'text',
      inputLabel: 'Observation record',
      inputPlaceholder: 'Write one short observation',
      inputMaxLength: 180,
      presentation: {
        canvas: {
          label: 'Observation note area',
          description: 'A simple text or drawing area for learner evidence; a spoken or paper note is an acceptable fallback.',
        },
      },
    },
  },
] as const satisfies readonly GenericSampleSceneInput[];

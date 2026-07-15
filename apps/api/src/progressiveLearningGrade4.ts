import type {
  LearningInteraction,
  LearningVisualSpec,
  ProgressiveLessonSeed,
  StepInput
} from './progressiveLearning.js';
import {
  serializeProgressiveClassifyAnswer,
  serializeProgressiveSequenceAnswer
} from './progressiveLearning.js';

type QuestionSeed = {
  prompt: string;
  options: string[];
  answer: string;
  hint: string;
  explanation: string;
  misconception: string;
  visual: LearningVisualSpec;
  supportText?: string;
  interaction?: LearningInteraction;
};

type ChapterSeed = Omit<ProgressiveLessonSeed, 'grade' | 'steps'> & {
  questions: QuestionSeed[];
};

const cards = (labels: string[], caption: string, layout: 'row' | 'grid' | 'stack' = 'grid'): LearningVisualSpec => ({
  kind: 'cards',
  layout,
  cards: labels.map((label, index) => ({
    id: `card-${index + 1}`,
    label,
    accent: (['blue', 'green', 'gold', 'coral', 'purple'] as const)[index % 5]
  })),
  caption
});

const sequence = (labels: string[], caption: string, activeIndex?: number): LearningVisualSpec => ({
  kind: 'sequence',
  steps: labels.map((label, index) => ({ id: `step-${index + 1}`, label })),
  activeIndex,
  caption
});

const scene = (
  setting: Extract<LearningVisualSpec, { kind: 'scene' }>['setting'],
  labels: string[],
  caption: string,
  highlightedIndex?: number
): LearningVisualSpec => ({
  kind: 'scene',
  setting,
  elements: labels.map((label, index) => ({
    id: `element-${index + 1}`,
    label,
    state: index === highlightedIndex ? 'highlighted' : 'normal'
  })),
  caption
});

const classify = (bucketLabels: string[], itemLabels: string[], caption: string): LearningVisualSpec => ({
  kind: 'classify',
  buckets: bucketLabels.map((label, index) => ({ id: `bucket-${index + 1}`, label })),
  items: itemLabels.map((label, index) => ({ id: `item-${index + 1}`, label, accent: 'neutral' })),
  caption
});

const numberLine = (
  min: number,
  max: number,
  markers: number[],
  caption: string,
  jump?: { from: number; to: number; label?: string }
): LearningVisualSpec => ({
  kind: 'number_line',
  min,
  max,
  markers: markers.map(value => ({ value })),
  jump,
  caption
});

type InteractionSeed = Pick<QuestionSeed, 'answer' | 'interaction' | 'options'>;

const buildSequence = (
  instruction: string,
  items: Array<{ id: string; label: string; detail?: string }>,
  correctOrder: string[]
): InteractionSeed => ({
  options: [],
  interaction: { kind: 'sequence_builder', instruction, items },
  answer: serializeProgressiveSequenceAnswer(correctOrder)
});

const sortIntoBuckets = (
  instruction: string,
  buckets: Array<{ id: string; label: string }>,
  items: Array<{ id: string; label: string; detail?: string }>,
  assignments: Record<string, string[]>
): InteractionSeed => ({
  options: [],
  interaction: { kind: 'bucket_sort', instruction, buckets, items },
  answer: serializeProgressiveClassifyAnswer(assignments)
});

function chapter(seed: ChapterSeed): ProgressiveLessonSeed {
  if (seed.questions.length !== 5) {
    throw new Error(`${seed.key} must contain exactly five learning steps.`);
  }
  const steps: StepInput[] = seed.questions.map((question, index) => ({
    phase: index < 2 ? 'guided' : 'checkpoint',
    prompt: question.prompt,
    supportText: question.supportText,
    options: question.options,
    interaction: question.interaction,
    visual: question.visual,
    hint: question.hint,
    successMessage: `You found it! ${question.explanation}`,
    answer: question.answer,
    misconception: question.misconception,
    incorrectMessage: `Let us look again. ${question.hint}`
  }));
  const { questions: _questions, ...lesson } = seed;
  return { ...lesson, grade: 'Grade 4', steps };
}

export const grade4LessonSeeds: ProgressiveLessonSeed[] = [
  chapter({
    key: 'math-g4-place-value', subjectId: 'math', subjectName: 'Mathematics', strand: 'Numbers', subStrand: 'Whole Numbers',
    title: 'Build big numbers', shortTitle: 'Place value', objective: 'Read, compose, compare, and round whole numbers up to 100,000.', minutes: 9,
    questions: [
      { prompt: 'Build 43,216 by tapping the place-value blocks from greatest place to smallest.', ...buildSequence('Tap each block in place-value order.', [{ id: 'pv-a', label: '200', detail: 'hundreds' }, { id: 'pv-b', label: '40,000', detail: 'ten-thousands' }, { id: 'pv-c', label: '6', detail: 'ones' }, { id: 'pv-d', label: '3,000', detail: 'thousands' }, { id: 'pv-e', label: '10', detail: 'tens' }], ['pv-b', 'pv-d', 'pv-a', 'pv-e', 'pv-c']), hint: 'Begin with the ten-thousands block, then move one place right at a time.', explanation: 'The blocks show 40,000 + 3,000 + 200 + 10 + 6, which builds 43,216.', misconception: 'PLACE_VALUE_POSITION', visual: cards(['ten-thousands', 'thousands', 'hundreds', 'tens', 'ones'], 'Fill the place-value machine from left to right.') },
      { prompt: 'Which digit has a value of 5,000 in 25,784?', options: ['5', '2', '7', '8'], answer: '5', hint: 'Find the thousands place, one step to the right of ten-thousands.', explanation: 'The 5 is in the thousands place, so its value is 5,000.', misconception: 'DIGIT_VS_VALUE', visual: cards(['2 ten-thousands', '5 thousands', '7 hundreds', '8 tens', '4 ones'], 'Each digit sits in a named place.', 'row') },
      { prompt: 'Which number is greatest?', options: ['36,490', '36,940', '35,999', '30,964'], answer: '36,940', hint: 'Compare from the left. If digits match, move one place right.', explanation: '36,940 and 36,490 match first, but 9 hundreds is greater than 4 hundreds.', misconception: 'NUMBER_COMPARISON', visual: classify(['Greater', 'Smaller'], ['36,490', '36,940', '35,999', '30,964'], 'Compare the digits from their highest place.') },
      { prompt: 'Round 47,638 to the nearest thousand.', options: ['48,000', '47,000', '47,600', '50,000'], answer: '48,000', hint: 'Look at the hundreds digit. Five or more makes the thousands digit grow by one.', explanation: 'The hundreds digit is 6, so 47,638 rounds up to 48,000.', misconception: 'ROUNDING_PLACE', visual: numberLine(47000, 48000, [47000, 47638, 48000], 'Compare the point with the two neighbouring thousands.') },
      { prompt: 'A library recorded 18,905 visits in Term 1 and 19,085 in Term 2. Which statement is true?', options: ['Term 2 had more visits', 'Term 1 had more visits', 'The totals are equal', 'The difference is 10,000'], answer: 'Term 2 had more visits', hint: 'Both start with 1 ten-thousand. Compare the thousands and then the hundreds.', explanation: '19,085 is greater than 18,905.', misconception: 'TRANSPOSED_DIGITS', visual: cards(['Term 1: 18,905', 'Term 2: 19,085'], 'Which attendance card shows the larger number?', 'row') }
    ]
  }),
  chapter({
    key: 'math-g4-multiply-divide', subjectId: 'math', subjectName: 'Mathematics', strand: 'Numbers', subStrand: 'Multiplication and Division',
    title: 'Mango market maths', shortTitle: 'Multiply & divide', objective: 'Use equal groups, multiplication, division, and remainders in familiar situations.', minutes: 10,
    questions: [
      { prompt: 'Four baskets hold 6 mangoes each. How many mangoes are there altogether?', options: ['24', '10', '20', '2'], answer: '24', hint: 'Add four equal groups of 6, or calculate 4 × 6.', explanation: 'Four groups of six make 24.', misconception: 'GROUPS_ADD_INSTEAD_MULTIPLY', visual: { kind: 'groups', object: 'mango', groups: 4, each: 6, total: 24, caption: 'Count four equal mango groups.' } },
      { prompt: 'Twenty-eight seedlings are shared equally among 7 learners. How many does each learner receive?', options: ['4', '21', '35', '3'], answer: '4', hint: 'Ask how many groups of 7 make 28, or divide 28 by 7.', explanation: '28 ÷ 7 = 4 seedlings per learner.', misconception: 'DIVISION_DIRECTION', visual: { kind: 'groups', object: 'seedling', groups: 7, each: 4, total: 28, caption: 'Every learner receives an equal group.' } },
      { prompt: 'A shop packs 9 pencils in each box. How many pencils are in 8 boxes?', options: ['72', '17', '64', '81'], answer: '72', hint: 'Use 8 × 9. You can calculate 8 × 10, then remove 8.', explanation: '80 − 8 = 72, so 8 × 9 = 72.', misconception: 'MULTIPLICATION_FACT', visual: cards(['8 boxes', '9 in each', '? altogether'], 'Connect the number of groups, group size, and total.', 'row') },
      { prompt: 'Thirty-seven oranges are packed in bags of 5. How many full bags and loose oranges are there?', options: ['7 bags and 2 loose', '6 bags and 7 loose', '8 bags and 3 loose', '7 bags and 5 loose'], answer: '7 bags and 2 loose', hint: 'Find the largest multiple of 5 that does not pass 37.', explanation: '7 × 5 = 35, leaving a remainder of 2.', misconception: 'REMAINDER_MEANING', visual: sequence(['Fill one bag with 5', 'Keep filling equal bags', 'Set aside what cannot fill a bag'], 'The remainder is what cannot fill another bag.') },
      { prompt: 'Which equation checks that 56 ÷ 8 = 7?', options: ['7 × 8 = 56', '56 − 8 = 7', '56 + 7 = 8', '8 ÷ 7 = 56'], answer: '7 × 8 = 56', hint: 'Multiplication is the inverse of division.', explanation: 'Multiplying the quotient by the divisor rebuilds 56.', misconception: 'INVERSE_OPERATION_CHECK', visual: { kind: 'balance', left: [{ object: 'basket', count: 8, label: 'equal groups' }], right: [{ object: 'mango', count: 56, label: 'total' }], balanced: true, caption: 'Use equal groups to rebuild the original total.' } }
    ]
  }),
  chapter({
    key: 'math-g4-fractions', subjectId: 'math', subjectName: 'Mathematics', strand: 'Numbers', subStrand: 'Fractions',
    title: 'Share the chapati', shortTitle: 'Fractions', objective: 'Recognize, compare, and combine fractions with related denominators.', minutes: 10,
    questions: [
      { prompt: 'A chapati is cut into 8 equal pieces. Amina eats 3 pieces. What fraction did she eat?', options: ['3/8', '8/3', '3/5', '1/8'], answer: '3/8', hint: 'The denominator counts all equal pieces; the numerator counts eaten pieces.', explanation: 'Amina ate 3 of 8 equal pieces, which is 3/8.', misconception: 'NUMERATOR_DENOMINATOR_SWAP', visual: cards(['eaten', 'eaten', 'eaten', 'left', 'left', 'left', 'left', 'left'], 'Three of the eight equal pieces are selected.') },
      { prompt: 'Which fraction is equivalent to 1/2?', options: ['2/4', '1/4', '3/4', '2/3'], answer: '2/4', hint: 'Imagine splitting each half into two equal smaller pieces.', explanation: 'One half covers the same amount as two fourths.', misconception: 'EQUIVALENT_FRACTION', visual: classify(['1/2', 'Not 1/2'], ['2/4', '1/4', '3/4', '2/3'], 'Match fractions that cover the same share.') },
      { prompt: 'Which fraction is greater?', options: ['3/4', '2/4', 'They are equal', 'Cannot tell'], answer: '3/4', hint: 'The denominators match, so compare how many fourths each fraction has.', explanation: 'Three fourths is one fourth more than two fourths.', misconception: 'SAME_DENOMINATOR_COMPARE', visual: cards(['■■■□  3/4', '■■□□  2/4'], 'Compare shaded parts of equal-size bars.', 'row') },
      { prompt: 'Wanjiku drank 2/8 of a jug in the morning and 3/8 later. How much did she drink altogether?', options: ['5/8', '5/16', '1/8', '6/8'], answer: '5/8', hint: 'The pieces are all eighths, so add only the numerators.', explanation: '2 eighths + 3 eighths = 5 eighths.', misconception: 'ADD_DENOMINATORS', visual: sequence(['Morning: 2 equal eighths', 'Later: 3 more eighths', 'Combine the shaded pieces'], 'Equal-size fraction pieces join without changing their denominator.') },
      { prompt: 'A 12-metre ribbon is cut into 4 equal parts. How long is one quarter?', options: ['3 m', '4 m', '8 m', '48 m'], answer: '3 m', hint: 'One quarter means divide the whole into 4 equal groups.', explanation: '12 ÷ 4 = 3 metres.', misconception: 'FRACTION_OF_QUANTITY', visual: numberLine(0, 12, [0, 3, 6, 9, 12], 'Four equal intervals make the 12-metre ribbon.') }
    ]
  }),

  chapter({
    key: 'english-g4-reading-clues', subjectId: 'english', subjectName: 'English', strand: 'Reading', subStrand: 'Comprehension',
    title: 'Reading detective', shortTitle: 'Reading clues', objective: 'Find main ideas, details, word meanings, sequence, and simple inferences in short texts.', minutes: 10,
    questions: [
      { supportText: 'Musa filled a tin with water every evening. Soon, the bean seedling grew new green leaves.', prompt: 'What is the main idea?', options: ['Musa cared for a seedling', 'The tin was expensive', 'Evenings are always green', 'Beans cannot grow'], answer: 'Musa cared for a seedling', hint: 'Choose the idea supported by both sentences.', explanation: 'Watering and new growth both tell how Musa cared for the plant.', misconception: 'MAIN_IDEA_DETAIL', visual: scene('garden', ['Musa with water', 'bean seedling', 'new leaves'], 'Look for the action repeated across the scene.', 1) },
      { supportText: 'The path was slippery after the rain, so Naliaka walked slowly.', prompt: 'Why did Naliaka walk slowly?', options: ['The path was slippery', 'She wanted more rain', 'The path was crowded', 'She lost her shoes'], answer: 'The path was slippery', hint: 'The word “so” links a cause to its result.', explanation: 'The slippery path caused Naliaka to slow down.', misconception: 'CAUSE_EFFECT', visual: sequence(['Rain falls', 'Path becomes slippery', 'Naliaka slows down'], 'Follow the cause-and-effect chain.') },
      { supportText: 'At sunrise, Kamau packed a flask, put on his boots, and joined his class at the bus.', prompt: 'Which action happened last?', options: ['He joined his class', 'He packed a flask', 'He put on his boots', 'The sun rose at night'], answer: 'He joined his class', hint: 'Read the actions in the order the author gives them.', explanation: 'Joining the class is the final action in the sentence.', misconception: 'EVENT_SEQUENCE', visual: sequence(['Pack flask', 'Put on boots', 'Join the class'], 'Trace the morning actions from first to last.', 2) },
      { supportText: 'The tiny puppy squeezed through the narrow gap.', prompt: 'What does “tiny” mean here?', options: ['Very small', 'Very noisy', 'Very hungry', 'Very fast'], answer: 'Very small', hint: 'Use the puppy fitting through a narrow gap as a clue.', explanation: 'A tiny puppy is small enough to fit through the narrow space.', misconception: 'CONTEXT_VOCABULARY', visual: cards(['tiny puppy', 'narrow gap', 'fits through'], 'The nearby clues reveal the word meaning.', 'row') },
      { supportText: 'Rehema saw the new learner sitting alone. She moved over and invited him into the game.', prompt: 'What can you infer about Rehema?', options: ['She is welcoming', 'She is careless', 'She dislikes games', 'She is afraid'], answer: 'She is welcoming', hint: 'A character’s actions can reveal a quality.', explanation: 'Inviting someone who is alone shows friendliness and care.', misconception: 'INFERENCE_WITHOUT_EVIDENCE', visual: scene('classroom', ['new learner alone', 'Rehema makes space', 'children play together'], 'Notice what Rehema does, not only what the text says.', 1) }
    ]
  }),
  chapter({
    key: 'english-g4-word-power', subjectId: 'english', subjectName: 'English', strand: 'Language Use', subStrand: 'Parts of Speech',
    title: 'Word power workshop', shortTitle: 'Word power', objective: 'Use nouns, pronouns, verbs, adjectives, and adverbs to build clear sentences.', minutes: 9,
    questions: [
      { prompt: 'Which word is the action verb in “The acrobat jumps gracefully”?', options: ['jumps', 'acrobat', 'gracefully', 'the'], answer: 'jumps', hint: 'Ask what the acrobat does.', explanation: 'Jumps names the action.', misconception: 'PART_OF_SPEECH_VERB', visual: classify(['Action', 'Person', 'How'], ['jumps', 'acrobat', 'gracefully'], 'Sort each word by the job it does.') },
      { prompt: 'Choose the best adjective: “We crossed the ____ bridge.”', options: ['narrow', 'carefully', 'crossed', 'they'], answer: 'narrow', hint: 'An adjective describes a noun such as bridge.', explanation: 'Narrow tells what kind of bridge it was.', misconception: 'ADJECTIVE_ADVERB', visual: cards(['wide bridge', 'narrow bridge', 'wooden bridge'], 'Adjectives add a clear picture to a noun.', 'row') },
      { prompt: 'Which pronoun can replace “Asha and Wanjiru”?', options: ['They', 'She', 'It', 'He'], answer: 'They', hint: 'The names refer to more than one person.', explanation: 'They replaces a plural group of people.', misconception: 'PRONOUN_NUMBER', visual: cards(['Asha + Wanjiru', '→', 'They'], 'Replace the names without changing the meaning.', 'row') },
      { prompt: 'Which sentence uses an adverb to tell how an action happened?', options: ['Otieno spoke politely.', 'The polite child spoke.', 'Otieno has a voice.', 'The child is Otieno.'], answer: 'Otieno spoke politely.', hint: 'Look for a word that describes the verb “spoke”.', explanation: 'Politely tells how Otieno spoke.', misconception: 'ADVERB_FUNCTION', visual: classify(['Who?', 'Action?', 'How?'], ['Otieno', 'spoke', 'politely'], 'Every word answers a different question.') },
      { prompt: 'Choose the sentence with correct subject–verb agreement.', options: ['The pupils are reading.', 'The pupils is reading.', 'The pupils am reading.', 'The pupils reads.'], answer: 'The pupils are reading.', hint: 'Pupils is plural, so it needs a plural helping verb.', explanation: 'The plural subject “pupils” agrees with “are”.', misconception: 'SUBJECT_VERB_AGREEMENT', visual: cards(['one pupil → is', 'many pupils → are'], 'Match the number of the subject and verb.', 'row') }
    ]
  }),
  chapter({
    key: 'english-g4-writing-builder', subjectId: 'english', subjectName: 'English', strand: 'Writing', subStrand: 'Sentence and Paragraph Writing',
    title: 'Build a bright paragraph', shortTitle: 'Paragraph builder', objective: 'Punctuate, order, connect, and revise sentences into a focused paragraph.', minutes: 10,
    questions: [
      { prompt: 'Which sentence is punctuated correctly?', options: ['Where is my blue bag?', 'where is my blue bag.', 'Where is my blue bag,', 'Where is my blue bag!'], answer: 'Where is my blue bag?', hint: 'A sentence begins with a capital and a direct question ends with a question mark.', explanation: 'The capital letter and question mark are both correct.', misconception: 'QUESTION_PUNCTUATION', visual: cards(['Capital: Where', 'Question: ?'], 'Two marks help the reader hear the sentence.') },
      { prompt: 'Which sentence is the best topic sentence for a paragraph about saving water?', options: ['Our class saves water in several ways.', 'My shoes are black.', 'Yesterday was Tuesday.', 'A zebra has stripes.'], answer: 'Our class saves water in several ways.', hint: 'A topic sentence introduces the idea all other sentences will explain.', explanation: 'It clearly announces the paragraph’s focus: ways to save water.', misconception: 'TOPIC_SENTENCE', visual: cards(['Turn off taps', 'Collect rainwater', 'Use only what you need'], 'Find one sentence that can introduce every detail.') },
      { prompt: 'Build clear planting directions in the order a reader should follow them.', ...buildSequence('Tap the instruction blocks from first to last.', [{ id: 'write-a', label: 'Water gently' }, { id: 'write-b', label: 'Cover the seed' }, { id: 'write-c', label: 'Make a hole' }, { id: 'write-d', label: 'Place the seed' }], ['write-c', 'write-d', 'write-b', 'write-a']), hint: 'Imagine doing each action in the garden. The seed needs somewhere to go first.', explanation: 'Clear directions make a hole, place the seed, cover it, then water gently.', misconception: 'PROCEDURE_ORDER', visual: scene('garden', ['soil ready', 'seed', 'watering can'], 'Build instructions that another learner can follow.') },
      { prompt: 'Which word best joins the ideas? “The bell rang, ____ the learners entered class.”', options: ['so', 'but', 'or', 'because of'], answer: 'so', hint: 'The second event is the result of the first.', explanation: 'So connects a cause with its result.', misconception: 'CONJUNCTION_MEANING', visual: sequence(['Bell rings', 'so', 'Learners enter'], 'Choose a connector that makes the relationship clear.') },
      { prompt: 'Which revision removes repetition from “The small small goat ran ran home”?', options: ['The small goat ran home.', 'The small small goat ran home home.', 'Small goat goat ran home.', 'The goat small ran ran.'], answer: 'The small goat ran home.', hint: 'Keep each needed word once and preserve the original meaning.', explanation: 'The revised sentence is complete, clear, and has no repeated words.', misconception: 'EDITING_REPETITION', visual: classify(['Keep once', 'Remove repeat'], ['small small', 'ran ran', 'goat', 'home'], 'Edit by removing only unnecessary copies.') }
    ]
  }),

  chapter({
    key: 'science-g4-living-things', subjectId: 'science', subjectName: 'Science & Technology', strand: 'Living Things and Their Environment', subStrand: 'Plants and Animals',
    title: 'Life in the school garden', shortTitle: 'Living things', objective: 'Identify needs, life processes, adaptations, and simple food relationships of living things.', minutes: 10,
    questions: [
      { prompt: 'Which set contains only things a green plant needs to grow well?', options: ['Water, air, light and nutrients', 'Plastic, stones, paint and salt', 'Smoke, darkness, glue and sand', 'Music, glass, cloth and coins'], answer: 'Water, air, light and nutrients', hint: 'Think about what roots and leaves take in.', explanation: 'Plants use water, air, light, and soil nutrients for healthy growth.', misconception: 'PLANT_NEEDS', visual: scene('garden', ['sunlight', 'air', 'water', 'nutrient-rich soil', 'seedling'], 'Four resources support the growing seedling.', 4) },
      { prompt: 'Build the bean germination story from the resting seed to the young plant.', ...buildSequence('Tap each life stage from first to last.', [{ id: 'life-a', label: 'Young plant', detail: 'new leaves open' }, { id: 'life-b', label: 'Root appears', detail: 'root grows downward' }, { id: 'life-c', label: 'Dry seed', detail: 'seed is planted and watered' }, { id: 'life-d', label: 'Shoot appears', detail: 'shoot grows upward' }], ['life-c', 'life-b', 'life-d', 'life-a']), hint: 'Begin with the seed. The root appears before the shoot and leaves.', explanation: 'The seed germinates by growing a root, then a shoot, and becomes a young plant.', misconception: 'LIVING_PROCESS_SEQUENCE', visual: scene('garden', ['moist soil', 'sunlight', 'space to grow'], 'Use the garden clues to order the changes you would observe.') },
      { prompt: 'Why do fish have gills?', options: ['To take oxygen from water', 'To dig holes in soil', 'To keep their bodies warm', 'To make food from sunlight'], answer: 'To take oxygen from water', hint: 'An adaptation helps an organism survive in its habitat.', explanation: 'Gills allow fish to breathe oxygen dissolved in water.', misconception: 'ADAPTATION_PURPOSE', visual: scene('nature', ['pond water', 'fish', 'gills', 'water flowing past gills'], 'The body part matches the animal’s habitat.', 2) },
      { prompt: 'Which simple food chain is in the correct order?', options: ['grass → grasshopper → bird', 'bird → grass → grasshopper', 'grasshopper → bird → grass', 'bird → grasshopper → sunlight'], answer: 'grass → grasshopper → bird', hint: 'Begin with the producer that makes its own food.', explanation: 'Grass feeds the grasshopper, which can be eaten by the bird.', misconception: 'FOOD_CHAIN_ORDER', visual: sequence(['grass', 'grasshopper', 'bird'], 'Arrows show the direction food energy moves.') },
      { prompt: 'A plant kept in darkness becomes pale and weak. What is the best explanation?', options: ['It lacks light for making food', 'It has too much clean air', 'Its roots are becoming metal', 'Darkness adds too many nutrients'], answer: 'It lacks light for making food', hint: 'Leaves need light to make food.', explanation: 'Without enough light, the plant cannot make sufficient food.', misconception: 'PLANT_LIGHT_FUNCTION', visual: classify(['Sunny window', 'Dark cupboard'], ['green strong plant', 'pale weak plant'], 'Compare the plants after several days.') }
    ]
  }),
  chapter({
    key: 'science-g4-body-health', subjectId: 'science', subjectName: 'Science & Technology', strand: 'Human Body', subStrand: 'Health and Hygiene',
    title: 'Body defenders', shortTitle: 'Body & health', objective: 'Connect body organs, hygiene, food choices, and disease prevention to healthy routines.', minutes: 9,
    questions: [
      { prompt: 'Which organ pumps blood around the body?', options: ['Heart', 'Lungs', 'Stomach', 'Skin'], answer: 'Heart', hint: 'Feel the steady beat in your chest after light exercise.', explanation: 'The heart contracts to move blood through the body.', misconception: 'ORGAN_FUNCTION', visual: scene('classroom', ['body outline', 'heart in chest', 'blood moving'], 'Locate the pump near the centre of the chest.', 1) },
      { prompt: 'When should you wash your hands with soap?', options: ['Before eating and after using the toilet', 'Only when they look muddy', 'Once each month', 'Only after reading'], answer: 'Before eating and after using the toilet', hint: 'Choose times when germs could enter food or spread from waste.', explanation: 'These handwashing moments stop harmful germs from spreading.', misconception: 'HYGIENE_TIMING', visual: sequence(['wet hands', 'add soap', 'rub all surfaces', 'rinse', 'dry'], 'Good handwashing follows every step.') },
      { prompt: 'Which meal is the most balanced?', options: ['Ugali, beans and sukuma wiki', 'Sweets and soda', 'Only chips', 'Only tea'], answer: 'Ugali, beans and sukuma wiki', hint: 'A balanced meal combines energy food, body-building food, and protective food.', explanation: 'Ugali supplies energy, beans protein, and sukuma wiki vitamins and minerals.', misconception: 'BALANCED_MEAL', visual: classify(['Energy', 'Body-building', 'Protective'], ['ugali', 'beans', 'sukuma wiki'], 'Each food group contributes a different job.') },
      { prompt: 'Why should a cough be covered with a bent elbow?', options: ['To reduce droplets spreading', 'To make the cough louder', 'To warm the elbow', 'To stop breathing'], answer: 'To reduce droplets spreading', hint: 'Think about protecting people nearby from germs in the air.', explanation: 'The elbow traps many droplets and keeps them off the hands.', misconception: 'DISEASE_TRANSMISSION', visual: scene('classroom', ['learner coughs into elbow', 'droplets blocked', 'classmate protected'], 'A small action protects the whole group.', 0) },
      { prompt: 'After running, breathing and heartbeat become faster. Why?', options: ['Muscles need more oxygen and energy', 'The body has forgotten how to rest', 'Bones are shrinking', 'The stomach is making sound'], answer: 'Muscles need more oxygen and energy', hint: 'Active muscles work harder than resting muscles.', explanation: 'Faster breathing brings more oxygen and faster circulation delivers it.', misconception: 'EXERCISE_BODY_RESPONSE', visual: sequence(['muscles work', 'need more oxygen', 'breathing speeds up', 'heart pumps faster'], 'Trace how the body responds to exercise.') }
    ]
  }),
  chapter({
    key: 'science-g4-materials-forces', subjectId: 'science', subjectName: 'Science & Technology', strand: 'Physical Science', subStrand: 'Materials and Forces',
    title: 'Push, pull, and transform', shortTitle: 'Materials & forces', objective: 'Classify materials and predict how forces, heat, and simple circuits change what happens.', minutes: 10,
    questions: [
      { prompt: 'Which material is best for a transparent classroom window?', options: ['Glass', 'Wood', 'Cardboard', 'Clay'], answer: 'Glass', hint: 'Transparent means light can pass through clearly.', explanation: 'Clear glass lets light through and allows people to see outside.', misconception: 'MATERIAL_PROPERTY', visual: classify(['Transparent', 'Opaque'], ['glass', 'wood', 'cardboard', 'clay'], 'Sort materials by how they transmit light.') },
      { prompt: 'What force moves a wheelbarrow forward when you hold its handles and walk?', options: ['Push', 'Pull only', 'Magnetism', 'Heat'], answer: 'Push', hint: 'Your hands apply force away from your body through the handles.', explanation: 'Pushing the handles makes the wheelbarrow roll forward.', misconception: 'PUSH_PULL_DIRECTION', visual: scene('garden', ['learner', 'hands on handles', 'wheelbarrow moving forward'], 'Follow the direction of the applied force.', 1) },
      { prompt: 'Which change is reversible?', options: ['Ice melting and freezing again', 'Paper burning to ash', 'An egg cooking', 'Wood rotting'], answer: 'Ice melting and freezing again', hint: 'A reversible change can return to its starting material.', explanation: 'Water can freeze back into ice after melting.', misconception: 'REVERSIBLE_CHANGE', visual: sequence(['ice', 'melts', 'liquid water', 'freezes', 'ice'], 'The material returns to its first state.') },
      { prompt: 'A bulb in a simple circuit does not light. Which change is most likely to help?', options: ['Close the gap in the circuit', 'Remove the cell', 'Cut a wire', 'Use a plastic connector'], answer: 'Close the gap in the circuit', hint: 'Electric current needs one complete path.', explanation: 'Closing the gap completes the circuit so current can flow.', misconception: 'OPEN_CIRCUIT', visual: classify(['Complete path', 'Broken path'], ['cell–wire–bulb–wire', 'cell–gap–bulb'], 'Compare whether current has a continuous loop.') },
      { prompt: 'Which surface creates the most friction for a sliding toy car?', options: ['Rough doormat', 'Smooth tile', 'Polished desk', 'Wet glass'], answer: 'Rough doormat', hint: 'Rough surfaces catch and resist motion more strongly.', explanation: 'The doormat’s rough texture produces greater friction.', misconception: 'FRICTION_SURFACE', visual: cards(['rough doormat: short slide', 'smooth tile: long slide'], 'Compare how far the same car travels.', 'row') }
    ]
  }),

  chapter({
    key: 'kiswahili-g4-nomino', subjectId: 'kiswahili', subjectName: 'Kiswahili', strand: 'Matumizi ya Lugha', subStrand: 'Nomino na Viwakilishi',
    title: 'Hazina ya maneno', shortTitle: 'Nomino', objective: 'Kutambua na kutumia nomino, umoja na wingi, pamoja na viwakilishi katika sentensi.', minutes: 9,
    questions: [
      { prompt: 'Ni neno lipi linalotaja mtu?', options: ['mwalimu', 'andika', 'haraka', 'nyekundu'], answer: 'mwalimu', hint: 'Nomino hutaja mtu, mahali, kitu au mnyama.', explanation: '“Mwalimu” ni jina la mtu anayefundisha.', misconception: 'KISWAHILI_NOMINO', visual: classify(['Mtu', 'Kitendo', 'Jinsi', 'Sifa'], ['mwalimu', 'andika', 'haraka', 'nyekundu'], 'Panga maneno kulingana na kazi yake.') },
      { prompt: 'Wingi wa neno “mtoto” ni upi?', options: ['watoto', 'mitoto', 'matoto', 'vitoto'], answer: 'watoto', hint: 'Nomino nyingi za ngeli ya M-WA hubadilisha “m-” kuwa “wa-”.', explanation: 'Mtoto mmoja, watoto wengi.', misconception: 'KISWAHILI_UMOJA_WINGI', visual: cards(['mtoto mmoja', '→', 'watoto wengi'], 'Badili kutoka umoja hadi wingi.', 'row') },
      { prompt: 'Kiwakilishi kipi kinaweza kuchukua nafasi ya “Amina na Juma”?', options: ['wao', 'yeye', 'sisi', 'mimi'], answer: 'wao', hint: 'Majina yanataja watu wawili ambao si msemaji wala msikilizaji.', explanation: '“Wao” hutumiwa badala ya watu wengi wanaozungumziwa.', misconception: 'KISWAHILI_KIWAKILISHI', visual: cards(['Amina + Juma', '→', 'wao'], 'Tumia kiwakilishi bila kubadili maana.', 'row') },
      { prompt: 'Chagua sentensi yenye upatanisho sahihi.', options: ['Watoto wanacheza uwanjani.', 'Watoto anacheza uwanjani.', 'Watoto linacheza uwanjani.', 'Watoto kinacheza uwanjani.'], answer: 'Watoto wanacheza uwanjani.', hint: 'Kiambishi “wa-” katika watoto kinaafikiana na “wa-na-cheza”.', explanation: 'Nomino ya wingi “watoto” inaafikiana na kitenzi “wanacheza”.', misconception: 'KISWAHILI_UPATANISHO', visual: cards(['watoto', 'wa-na-cheza'], 'Linganisha kiambishi cha nomino na cha kitenzi.', 'row') },
      { prompt: 'Ni sentensi ipi ina nomino ya mahali?', options: ['Tulitembelea soko.', 'Asha aliimba vizuri.', 'Mpira ni mwekundu.', 'Watoto walikimbia.'], answer: 'Tulitembelea soko.', hint: 'Tafuta neno linalotaja mahali watu huenda.', explanation: '“Soko” ni jina la mahali pa kununua na kuuza bidhaa.', misconception: 'KISWAHILI_AINA_NOMINO', visual: scene('market', ['wauzaji', 'wanunuzi', 'soko'], 'Ni neno gani linataja mahali pote?', 2) }
    ]
  }),
  chapter({
    key: 'kiswahili-g4-vitenzi', subjectId: 'kiswahili', subjectName: 'Kiswahili', strand: 'Matumizi ya Lugha', subStrand: 'Vitenzi na Nyakati',
    title: 'Safari ya wakati', shortTitle: 'Vitenzi', objective: 'Kutumia vitenzi katika wakati uliopo, uliopita na ujao kwa usahihi.', minutes: 9,
    questions: [
      { prompt: 'Katika sentensi “Musa anapanda mti,” kitenzi ni kipi?', options: ['anapanda', 'Musa', 'mti', 'katika'], answer: 'anapanda', hint: 'Kitenzi huonyesha tendo linalofanywa.', explanation: '“Anapanda” ndilo tendo la Musa.', misconception: 'KISWAHILI_KITENZI', visual: classify(['Mtendaji', 'Tendo', 'Kitu'], ['Musa', 'anapanda', 'mti'], 'Tambua kazi ya kila neno.') },
      { prompt: 'Ni sentensi ipi iliyo katika wakati uliopita?', options: ['Jana tulisoma hadithi.', 'Leo tunasoma hadithi.', 'Kesho tutasoma hadithi.', 'Soma hadithi sasa.'], answer: 'Jana tulisoma hadithi.', hint: 'Kiambishi “-li-” huonyesha tendo lililofanyika zamani.', explanation: '“Tulisoma” linaonyesha kwamba tendo tayari lilitokea.', misconception: 'KISWAHILI_WAKATI', visual: sequence(['jana: tulisoma', 'leo: tunasoma', 'kesho: tutasoma'], 'Linganisha kiambishi na wakati.') },
      { prompt: 'Badili “Wao wanacheza” iwe wakati ujao.', options: ['Wao watacheza', 'Wao walicheza', 'Wao wamecheza', 'Wao hucheza'], answer: 'Wao watacheza', hint: 'Tumia kiambishi cha wakati ujao “-ta-”.', explanation: '“Watacheza” linaonyesha tendo litakalofanyika baadaye.', misconception: 'KISWAHILI_BADILI_WAKATI', visual: cards(['wa-na-cheza', 'badili -na- kuwa -ta-', 'wa-ta-cheza'], 'Badili kiambishi cha wakati pekee.') },
      { prompt: 'Kamilisha sentensi: “Kesho Neema ____ shangazi yake.”', options: ['atamtembelea', 'alimtembelea', 'anamtembelea jana', 'tembelea'], answer: 'atamtembelea', hint: 'Neno “kesho” linahitaji wakati ujao.', explanation: '“Atamtembelea” lina kiambishi “-ta-” cha wakati ujao.', misconception: 'KISWAHILI_KIELEZI_WAKATI', visual: scene('home', ['kalenda: kesho', 'Neema', 'nyumba ya shangazi'], 'Tukio litatokea lini?', 0) },
      { prompt: 'Panga vitenzi kuanzia wakati uliopita hadi wakati ujao.', ...buildSequence('Gusa kila kitenzi kwa mpangilio wa wakati.', [{ id: 'wakati-a', label: 'tutacheza', detail: 'baadaye' }, { id: 'wakati-b', label: 'tulicheza', detail: 'zamani' }, { id: 'wakati-c', label: 'tunacheza', detail: 'sasa' }], ['wakati-b', 'wakati-c', 'wakati-a']), hint: 'Anza na kiambishi “-li-”, fuata “-na-”, kisha “-ta-”.', explanation: '“Tulicheza, tunacheza, tutacheza” ni mpangilio wa zamani, sasa, halafu baadaye.', misconception: 'KISWAHILI_MPANGILIO_WAKATI', visual: sequence(['zamani', 'sasa', 'baadaye'], 'Fuata mshale wa wakati.') }
    ]
  }),
  chapter({
    key: 'kiswahili-g4-ufahamu', subjectId: 'kiswahili', subjectName: 'Kiswahili', strand: 'Kusoma', subStrand: 'Ufahamu',
    title: 'Upelelezi wa hadithi', shortTitle: 'Ufahamu', objective: 'Kutambua wazo kuu, maelezo, mpangilio, maana ya maneno na funzo katika kifungu kifupi.', minutes: 10,
    questions: [
      { supportText: 'Kila asubuhi, Zuri alijaza vyombo vya maji na kuwapa kuku chakula. Kuku wake walikua wenye afya.', prompt: 'Wazo kuu la kifungu ni lipi?', options: ['Zuri aliwatunza kuku wake', 'Vyombo vilikuwa vipya', 'Asubuhi ilikuwa baridi', 'Kuku hawahitaji maji'], answer: 'Zuri aliwatunza kuku wake', hint: 'Chagua wazo linalounganisha matendo yote ya Zuri.', explanation: 'Kuwapa maji na chakula kunaonyesha jinsi Zuri alivyowatunza kuku.', misconception: 'KISWAHILI_WAZO_KUU', visual: scene('home', ['Zuri', 'maji', 'chakula cha kuku', 'kuku wenye afya'], 'Matendo yote yanaeleza jambo gani?', 0) },
      { supportText: 'Mvua ilinyesha sana. Kwa hiyo, mto ulijaa maji.', prompt: 'Kwa nini mto ulijaa maji?', options: ['Mvua ilinyesha sana', 'Jua lilikuwa kali', 'Watu walipanda miti', 'Mto ulikuwa na samaki'], answer: 'Mvua ilinyesha sana', hint: 'Maneno “kwa hiyo” yanaonyesha matokeo ya jambo lililotangulia.', explanation: 'Mvua kubwa ndiyo iliyosababisha maji kuongezeka mtoni.', misconception: 'KISWAHILI_SABABU_MATOKEO', visual: sequence(['mvua nyingi', 'maji hukusanyika', 'mto hujaa'], 'Fuata sababu hadi matokeo.') },
      { supportText: 'Baraka alichimba shimo, akaweka mche, akafunika mizizi, kisha akamwagilia.', prompt: 'Baraka alifanya nini baada ya kuweka mche?', options: ['Alifunika mizizi', 'Alichimba shimo', 'Alimwagilia kwanza', 'Alivuna matunda'], answer: 'Alifunika mizizi', hint: 'Soma matendo kwa mpangilio yalivyoandikwa.', explanation: 'Kufunika mizizi ndilo tendo linalofuata kuweka mche.', misconception: 'KISWAHILI_MPANGILIO', visual: sequence(['chimba', 'weka mche', 'funika mizizi', 'mwagilia'], 'Tazama hatua inayofuata baada ya kuweka mche.', 2) },
      { supportText: 'Njia ilikuwa telezi, hivyo Achieng alitembea kwa tahadhari.', prompt: 'Neno “telezi” lina maana gani hapa?', options: ['Rahisi kuteleza', 'Yenye vumbi jingi', 'Fupi sana', 'Yenye watu wengi'], answer: 'Rahisi kuteleza', hint: 'Kitendo cha kutembea kwa tahadhari kinatoa dokezo.', explanation: 'Njia telezi inaweza kumfanya mtu aanguke kwa urahisi.', misconception: 'KISWAHILI_MAANA_MUKTADHA', visual: cards(['njia telezi', 'tembea polepole', 'epuka kuanguka'], 'Tumia matokeo kuelewa maana ya neno.', 'row') },
      { supportText: 'Kato alipata pochi uwanjani. Aliipeleka kwa mwalimu ili mwenyewe aipate.', prompt: 'Tunajifunza nini kutokana na kitendo cha Kato?', options: ['Kuwa mwaminifu', 'Kuficha vitu', 'Kukimbia haraka', 'Kuepuka walimu'], answer: 'Kuwa mwaminifu', hint: 'Fikiria sifa ya mtu anayerudisha kitu kisicho chake.', explanation: 'Kupeleka pochi kwa mwalimu kunaonyesha uaminifu.', misconception: 'KISWAHILI_FUNZO', visual: sequence(['Kato aona pochi', 'haichukui', 'anampa mwalimu', 'mwenyewe aipate'], 'Matendo yanaonyesha tabia gani?') }
    ]
  }),

  chapter({
    key: 'social-g4-map-skills', subjectId: 'social', subjectName: 'Social Studies', strand: 'People and Places', subStrand: 'Map Skills',
    title: 'Map explorer', shortTitle: 'Map skills', objective: 'Use cardinal directions, symbols, keys, scale ideas, and routes on simple local maps.', minutes: 10,
    questions: [
      { prompt: 'The clinic is east of the school. Which direction should you travel from the school?', options: ['East', 'West', 'North', 'South'], answer: 'East', hint: 'On a standard map, east is to the right.', explanation: 'Travelling east takes you from the school to the clinic.', misconception: 'CARDINAL_DIRECTION', visual: cards(['N ↑', 'W ←', 'school ●', '→ E clinic', 'S ↓'], 'Use the compass to follow the route.') },
      { prompt: 'Why does a map have a key?', options: ['To explain symbols', 'To show tomorrow’s weather', 'To make the paper heavier', 'To count every person'], answer: 'To explain symbols', hint: 'A key helps a reader translate small map pictures.', explanation: 'The map key tells what each colour or symbol represents.', misconception: 'MAP_KEY_FUNCTION', visual: classify(['Symbol', 'Meaning'], ['★ school', '+ clinic', 'blue line river'], 'Match each sign to the real feature.') },
      { prompt: 'A blue winding line on a map most commonly represents what?', options: ['A river', 'A school', 'A railway station', 'A market stall'], answer: 'A river', hint: 'Map colours and shapes often resemble the feature.', explanation: 'Blue is commonly used for water, and a winding line follows a river channel.', misconception: 'MAP_SYMBOL', visual: scene('community', ['school', 'road', 'blue winding river', 'bridge'], 'Identify the natural feature that crosses the route.', 2) },
      { prompt: 'Build the route from the bus stop to the library through the market.', ...buildSequence('Tap the route blocks from where you start to where you finish.', [{ id: 'route-a', label: 'Move east to the library' }, { id: 'route-b', label: 'Start at the bus stop' }, { id: 'route-c', label: 'Move north to the market' }], ['route-b', 'route-c', 'route-a']), hint: 'Start at the bus stop. Reach the market before turning east to the library.', explanation: 'The route starts at the bus stop, moves north to the market, then east to the library.', misconception: 'MAP_ROUTE_ORDER', visual: cards(['N ↑', 'W ←', '→ E', 'S ↓'], 'Use the compass while you build the route.', 'row') },
      { prompt: 'On a map, 1 cm represents 1 km. A path measures 4 cm. What real distance does it show?', options: ['4 km', '1 km', '5 km', '40 km'], answer: '4 km', hint: 'Each centimetre stands for one kilometre.', explanation: 'Four map centimetres represent four real kilometres.', misconception: 'SIMPLE_MAP_SCALE', visual: numberLine(0, 4, [0, 1, 2, 3, 4], 'Each map interval represents 1 kilometre.') }
    ]
  }),
  chapter({
    key: 'social-g4-kenya-home', subjectId: 'social', subjectName: 'Social Studies', strand: 'Natural and Built Environments', subStrand: 'Counties and Resources',
    title: 'Our Kenyan home', shortTitle: 'Kenya & resources', objective: 'Relate counties, physical features, livelihoods, resources, and conservation.', minutes: 10,
    questions: [
      { prompt: 'Kenya is divided into how many counties?', options: ['47', '8', '12', '100'], answer: '47', hint: 'Counties are the main units of devolved government in Kenya.', explanation: 'Kenya has 47 counties.', misconception: 'KENYA_COUNTIES', visual: cards(['Kenya', '47 counties', 'many communities'], 'Counties connect local services to people.', 'row') },
      { prompt: 'Which activity is most suitable in an area with fertile soil and reliable rainfall?', options: ['Crop farming', 'Deep-sea fishing', 'Salt mining only', 'Building an airport runway'], answer: 'Crop farming', hint: 'Crops need suitable soil and enough water.', explanation: 'Fertile soil and rainfall support healthy crop growth.', misconception: 'RESOURCE_LIVELIHOOD', visual: scene('nature', ['rain clouds', 'fertile field', 'maize crop', 'farmer'], 'Match the environment to a livelihood.', 2) },
      { prompt: 'Which is a renewable resource when managed well?', options: ['Trees', 'Coal', 'Petroleum', 'Metal ore'], answer: 'Trees', hint: 'A renewable resource can be replaced within a useful period.', explanation: 'Trees can be replanted and grown again when forests are managed responsibly.', misconception: 'RENEWABLE_RESOURCE', visual: classify(['Renewable', 'Non-renewable'], ['trees', 'coal', 'petroleum', 'metal ore'], 'Sort resources by whether people can replace them.') },
      { prompt: 'Why should communities protect riverbanks with vegetation?', options: ['To reduce soil erosion', 'To make rivers disappear', 'To increase litter', 'To block all rainfall'], answer: 'To reduce soil erosion', hint: 'Plant roots hold soil when water flows nearby.', explanation: 'Riverbank vegetation stabilizes soil and reduces it being washed away.', misconception: 'CONSERVATION_REASON', visual: classify(['Protected bank', 'Bare bank'], ['roots hold soil', 'soil washes into river'], 'Compare what happens during rain.') },
      { prompt: 'A family keeps cattle in a dry grassland area and moves them to find pasture. Which livelihood is this?', options: ['Pastoralism', 'Forestry', 'Manufacturing', 'Deep-sea trade'], answer: 'Pastoralism', hint: 'This livelihood centres on keeping livestock and finding water and pasture.', explanation: 'Pastoralists raise animals, often in drier regions suited to grazing.', misconception: 'LIVELIHOOD_DEFINITION', visual: scene('nature', ['dry grassland', 'cattle herd', 'pastoral family', 'water point'], 'The animals and landscape give clues to the livelihood.', 1) }
    ]
  }),
  chapter({
    key: 'social-g4-citizenship', subjectId: 'social', subjectName: 'Social Studies', strand: 'Citizenship', subStrand: 'Rights, Responsibilities and Culture',
    title: 'Community champions', shortTitle: 'Citizenship', objective: 'Apply rights, responsibilities, leadership, inclusion, and cultural respect in daily life.', minutes: 10,
    questions: [
      { prompt: 'Which is both a learner’s right and something adults should help provide?', options: ['Education', 'Bullying others', 'Damaging books', 'Skipping every lesson'], answer: 'Education', hint: 'A right supports a child’s well-being and development.', explanation: 'Every child has a right to education.', misconception: 'RIGHT_VS_WANT', visual: classify(['Right', 'Harmful action'], ['education', 'bullying', 'damaging books'], 'Separate protections from actions that hurt others.') },
      { prompt: 'Which action shows responsibility at school?', options: ['Returning a shared book on time', 'Writing on a classroom wall', 'Hiding another learner’s bag', 'Leaving taps running'], answer: 'Returning a shared book on time', hint: 'A responsibility cares for people and shared resources.', explanation: 'Returning the book lets everyone use it fairly.', misconception: 'RESPONSIBILITY', visual: scene('classroom', ['learner', 'borrowed book', 'library return desk'], 'A responsible choice protects a shared resource.', 2) },
      { prompt: 'During a class discussion, two groups suggest different games. What should a fair leader do?', options: ['Listen and help the class agree', 'Choose only a friend’s idea', 'Silence one group', 'Cancel every game'], answer: 'Listen and help the class agree', hint: 'Fair leadership considers different voices before a decision.', explanation: 'Listening and building agreement treats the groups respectfully.', misconception: 'FAIR_LEADERSHIP', visual: scene('classroom', ['group A idea', 'class leader listens', 'group B idea', 'shared decision'], 'The leader creates space for both groups.', 1) },
      { prompt: 'How can learners show respect for a community’s cultural celebration?', options: ['Ask politely and follow local guidance', 'Mock unfamiliar clothing', 'Interrupt every song', 'Take objects without permission'], answer: 'Ask politely and follow local guidance', hint: 'Respect means learning without insulting or taking over.', explanation: 'Polite questions and local guidance support respectful participation.', misconception: 'CULTURAL_RESPECT', visual: cards(['listen', 'ask', 'learn', 'participate respectfully'], 'Curiosity and courtesy can work together.') },
      { prompt: 'A ramp is added beside school steps. What value does this support?', options: ['Inclusion', 'Exclusion', 'Waste', 'Secrecy'], answer: 'Inclusion', hint: 'Think about who can now enter the building more easily.', explanation: 'A ramp helps learners and visitors with different mobility needs access the school.', misconception: 'INCLUSION_ACCESS', visual: classify(['Barrier', 'Access'], ['stairs only', 'ramp and stairs'], 'Good design gives more people a usable route.') }
    ]
  }),

  chapter({
    key: 'agriculture-g4-soil-water', subjectId: 'agriculture', subjectName: 'Agriculture & Nutrition', strand: 'Sustainable Agriculture', subStrand: 'Soil and Water Conservation',
    title: 'Soil saver mission', shortTitle: 'Soil & water', objective: 'Observe soil properties and choose practical ways to conserve soil and water.', minutes: 10,
    questions: [
      { prompt: 'Which soil particle feels sticky when wet and can be rolled into a ribbon?', options: ['Clay', 'Sand', 'Gravel', 'Dry leaves'], answer: 'Clay', hint: 'Very fine particles hold together strongly when wet.', explanation: 'Wet clay is sticky and moulds easily because its particles are very fine.', misconception: 'SOIL_TEXTURE', visual: classify(['Clay', 'Sand'], ['sticky ribbon', 'gritty loose grains'], 'Use touch clues to identify soil type.') },
      { prompt: 'Why is humus useful in garden soil?', options: ['It adds nutrients and helps hold water', 'It turns roots into plastic', 'It removes all air', 'It makes seeds unable to sprout'], answer: 'It adds nutrients and helps hold water', hint: 'Humus comes from decayed plant and animal material.', explanation: 'Humus improves soil fertility and water-holding ability.', misconception: 'HUMUS_FUNCTION', visual: sequence(['dry leaves', 'decompose', 'humus', 'healthier soil'], 'Natural material returns nutrients to soil.') },
      { prompt: 'Which practice best reduces soil erosion on a slope?', options: ['Planting grass strips across the slope', 'Leaving the soil bare', 'Making water flow straight downhill', 'Removing every plant'], answer: 'Planting grass strips across the slope', hint: 'Roots hold soil, and strips slow moving water.', explanation: 'Grass strips trap soil and reduce runoff speed.', misconception: 'EROSION_CONTROL', visual: classify(['Protected slope', 'Bare slope'], ['grass strips slow water', 'fast runoff carries soil'], 'Compare the slope during heavy rain.') },
      { prompt: 'Which is the safest way to water young seedlings?', options: ['Use a watering can gently near the roots', 'Blast them with a strong hose', 'Pour water on the leaves at midday only', 'Flood the whole path'], answer: 'Use a watering can gently near the roots', hint: 'Young roots need water without the soil being washed away.', explanation: 'Gentle watering at the root zone supplies moisture and protects the seedling.', misconception: 'WATERING_METHOD', visual: scene('garden', ['watering can', 'gentle droplets', 'seedling roots', 'moist soil'], 'Direct a small, steady flow where the plant needs it.', 2) },
      { prompt: 'A drum collects rain from a clean roof gutter. What is the main benefit?', options: ['Stores water for later use', 'Creates more soil erosion', 'Makes rain stop', 'Turns water into fuel'], answer: 'Stores water for later use', hint: 'Think about using rainfall after the rainy moment has passed.', explanation: 'Rainwater harvesting saves water for gardens or cleaning later.', misconception: 'RAINWATER_HARVESTING', visual: sequence(['rain on roof', 'gutter carries water', 'covered drum stores it', 'use later'], 'Follow each drop from the roof to storage.') }
    ]
  }),
  chapter({
    key: 'agriculture-g4-crops', subjectId: 'agriculture', subjectName: 'Agriculture & Nutrition', strand: 'Crop Production', subStrand: 'Growing and Caring for Crops',
    title: 'Seed to harvest', shortTitle: 'Growing crops', objective: 'Sequence crop-growing steps and make safe choices about seeds, weeds, pests, and harvest.', minutes: 10,
    questions: [
      { prompt: 'Which feature is most important when choosing seed for planting?', options: ['Healthy and undamaged', 'Broken and mouldy', 'Already rotten', 'Painted any colour'], answer: 'Healthy and undamaged', hint: 'A strong crop begins with a seed likely to germinate.', explanation: 'Healthy, mature, undamaged seed has a better chance of germinating.', misconception: 'SEED_SELECTION', visual: classify(['Plant', 'Do not plant'], ['full clean seed', 'mouldy seed', 'broken seed'], 'Inspect each seed before it goes into soil.') },
      { prompt: 'Build the practical journey for establishing and caring for a bean crop.', ...buildSequence('Tap the farm tasks from first to last.', [{ id: 'crop-a', label: 'Water gently' }, { id: 'crop-b', label: 'Prepare the soil' }, { id: 'crop-c', label: 'Weed and observe' }, { id: 'crop-d', label: 'Plant the seed' }], ['crop-b', 'crop-d', 'crop-a', 'crop-c']), hint: 'The seedbed must be ready before the seed is planted. Care continues after planting.', explanation: 'Prepare the soil, plant the seed, water it, then weed and observe as it grows.', misconception: 'CROP_SEQUENCE', visual: scene('garden', ['garden tools', 'bean seeds', 'watering can', 'young crop'], 'Plan the work from an empty seedbed to a cared-for crop.') },
      { prompt: 'Why are weeds removed from a crop garden?', options: ['They compete for water, light and nutrients', 'They make every crop grow faster', 'They create more space for pests', 'They turn soil into stone'], answer: 'They compete for water, light and nutrients', hint: 'Crops and weeds use many of the same resources.', explanation: 'Removing weeds leaves more essential resources for the crop.', misconception: 'WEED_EFFECT', visual: classify(['Crop with resources', 'Crop crowded by weeds'], ['more light and water', 'competition at roots'], 'Compare the resources available to each crop.') },
      { prompt: 'What should a learner do after finding unfamiliar insects damaging leaves?', options: ['Tell an adult or teacher and observe safely', 'Taste the insects', 'Spray any chemical alone', 'Carry them in a pocket'], answer: 'Tell an adult or teacher and observe safely', hint: 'Pest control should be identified and handled safely.', explanation: 'Adult guidance prevents unsafe contact and helps choose an appropriate response.', misconception: 'PEST_SAFETY', visual: scene('garden', ['damaged leaf', 'unfamiliar insect', 'learner observes', 'teacher assists'], 'Notice, step back, and ask for guidance.', 3) },
      { prompt: 'Which sign best shows that dry beans are ready to harvest?', options: ['Pods are dry and mature', 'The seed has just germinated', 'Flowers have only opened', 'Leaves are wet from watering'], answer: 'Pods are dry and mature', hint: 'Harvest occurs after the crop completes growth and the useful part matures.', explanation: 'Dry mature pods show the beans have developed for harvesting.', misconception: 'HARVEST_READINESS', visual: sequence(['seedling', 'flowering plant', 'green pods', 'dry mature pods'], 'Choose the final stage of the crop cycle.', 3) }
    ]
  }),
  chapter({
    key: 'agriculture-g4-food-health', subjectId: 'agriculture', subjectName: 'Agriculture & Nutrition', strand: 'Nutrition', subStrand: 'Food, Hygiene and Safety',
    title: 'Rainbow plate challenge', shortTitle: 'Food & health', objective: 'Build balanced meals and apply food hygiene, safe handling, and waste-reduction practices.', minutes: 10,
    questions: [
      { prompt: 'Which food is mainly body-building?', options: ['Beans', 'Sugar', 'Cooking oil', 'Sweets'], answer: 'Beans', hint: 'Body-building foods are rich in protein.', explanation: 'Beans provide protein for growth and tissue repair.', misconception: 'FOOD_GROUP', visual: classify(['Energy-giving', 'Body-building', 'Protective'], ['ugali', 'beans', 'orange'], 'Foods have different main jobs in the body.') },
      { prompt: 'Which lunch is the most balanced?', options: ['Rice, beans, cabbage and fruit', 'Soda and sweets', 'Only rice', 'Only cabbage'], answer: 'Rice, beans, cabbage and fruit', hint: 'Look for energy, body-building, and protective foods together.', explanation: 'The meal combines several food groups and varied nutrients.', misconception: 'BALANCED_PLATE', visual: cards(['rice: energy', 'beans: protein', 'cabbage: vitamins', 'fruit: vitamins'], 'A colourful plate brings different food jobs together.') },
      { prompt: 'What should happen before cutting a ripe tomato for a salad?', options: ['Wash hands, tomato and clean the knife', 'Place it on a dirty floor', 'Taste the knife', 'Leave hands unwashed'], answer: 'Wash hands, tomato and clean the knife', hint: 'Clean every surface that can transfer dirt or germs to ready-to-eat food.', explanation: 'Clean hands, produce, and tools reduce contamination.', misconception: 'FOOD_HYGIENE', visual: sequence(['wash hands', 'wash tomato', 'use clean knife and board', 'prepare salad'], 'Safe food preparation begins before cutting.') },
      { prompt: 'Milk smells sour and its container is swollen. What is the safest choice?', options: ['Do not drink it; tell an adult', 'Taste a full cup', 'Mix it with fresh milk', 'Hide the container'], answer: 'Do not drink it; tell an adult', hint: 'Changes in smell and packaging can signal spoilage.', explanation: 'Avoiding suspected spoiled food prevents food-borne illness.', misconception: 'SPOILED_FOOD_SAFETY', visual: classify(['Safe sign', 'Warning sign'], ['normal sealed milk', 'sour smell', 'swollen pack'], 'Use sight and smell clues without tasting.') },
      { prompt: 'How can a family reduce food waste after serving a meal?', options: ['Serve suitable portions and store safe leftovers', 'Throw edible food outside', 'Cook far more than needed every day', 'Leave leftovers uncovered overnight'], answer: 'Serve suitable portions and store safe leftovers', hint: 'Plan amounts and protect food that can be eaten later.', explanation: 'Right-sized portions and safe storage save food and money.', misconception: 'FOOD_WASTE', visual: sequence(['serve a suitable portion', 'cool leftovers safely', 'cover and store', 'use later'], 'Plan the food journey beyond one meal.') }
    ]
  }),

  chapter({
    key: 'creative-g4-colour', subjectId: 'creative_arts', subjectName: 'Creative Arts', strand: 'Visual Arts', subStrand: 'Colour and Picture Making',
    title: 'Colour laboratory', shortTitle: 'Colour', objective: 'Mix, contrast, and apply colour purposefully in original picture-making.', minutes: 9,
    questions: [
      { prompt: 'Which pair of primary colours mixes to make green?', options: ['Blue and yellow', 'Red and yellow', 'Red and blue', 'Black and white'], answer: 'Blue and yellow', hint: 'Imagine mixing sky-blue paint with sunny yellow paint.', explanation: 'Blue and yellow combine to make green.', misconception: 'COLOUR_MIXING', visual: cards(['blue', '+', 'yellow', '=', 'green'], 'Predict the new colour before mixing.', 'row') },
      { prompt: 'Which pair gives the strongest light–dark contrast?', options: ['White and black', 'Yellow and orange', 'Blue and purple', 'Pink and light red'], answer: 'White and black', hint: 'Contrast is strongest when values are far apart.', explanation: 'White is very light and black is very dark.', misconception: 'COLOUR_CONTRAST', visual: classify(['High contrast', 'Low contrast'], ['white + black', 'yellow + orange', 'blue + purple'], 'Compare how clearly each pair separates.') },
      { prompt: 'A poster warns drivers to stop. Which colour is the clearest familiar choice for the warning?', options: ['Red', 'Pale grey', 'Light cream', 'Soft beige'], answer: 'Red', hint: 'Choose a bold colour commonly linked with stopping and danger.', explanation: 'Red attracts attention and is widely used for stop warnings.', misconception: 'COLOUR_PURPOSE', visual: cards(['red: stop', 'yellow: caution', 'green: go'], 'Colour can carry a message before words are read.') },
      { prompt: 'How can an artist make a blue colour lighter without changing it to another hue?', options: ['Add a little white', 'Add black only', 'Add every colour', 'Remove all paint'], answer: 'Add a little white', hint: 'A tint is made by mixing a hue with white.', explanation: 'Adding white creates a lighter tint of blue.', misconception: 'TINT_SHADE', visual: sequence(['deep blue', 'add a little white', 'medium blue', 'add more white', 'pale blue'], 'Watch one hue become a range of tints.') },
      { prompt: 'Which plan creates a clear focal point in a market picture?', options: ['Use a bright colour on the main fruit basket', 'Make every object identical', 'Hide the main object behind the border', 'Leave the page blank'], answer: 'Use a bright colour on the main fruit basket', hint: 'A focal point is the place the artist wants viewers to notice first.', explanation: 'A bright accent draws attention to the main basket.', misconception: 'FOCAL_POINT', visual: scene('market', ['muted stalls', 'muted shoppers', 'bright fruit basket'], 'Which element catches your eye first?', 2) }
    ]
  }),
  chapter({
    key: 'creative-g4-pattern-craft', subjectId: 'creative_arts', subjectName: 'Creative Arts', strand: 'Visual Arts', subStrand: 'Pattern and Craft',
    title: 'Pattern makers', shortTitle: 'Pattern & craft', objective: 'Recognize, extend, plan, and safely construct repeating decorative patterns.', minutes: 10,
    questions: [
      { prompt: 'What comes next in the pattern: circle, triangle, circle, triangle, ____?', options: ['circle', 'square', 'star', 'triangle'], answer: 'circle', hint: 'Find the smallest unit that repeats.', explanation: 'The two-shape unit is circle–triangle, so circle starts it again.', misconception: 'REPEATING_PATTERN', visual: sequence(['●', '▲', '●', '▲', '?'], 'Track the repeating unit.') },
      { prompt: 'Which pattern has an ABC repeating unit?', options: ['red–blue–yellow–red–blue–yellow', 'red–blue–red–blue', 'red–red–red', 'red–blue–blue–red'], answer: 'red–blue–yellow–red–blue–yellow', hint: 'ABC uses three different parts in the same order.', explanation: 'Red, blue, yellow is a three-part unit repeated twice.', misconception: 'PATTERN_UNIT', visual: cards(['A red', 'B blue', 'C yellow', 'A red', 'B blue', 'C yellow'], 'Name the unit, then check that it repeats.', 'row') },
      { prompt: 'Which material is safest and most suitable for weaving a small classroom mat?', options: ['Paper strips', 'Broken glass', 'Sharp wire ends', 'Wet paint only'], answer: 'Paper strips', hint: 'Choose a flexible material without sharp edges.', explanation: 'Paper strips can pass over and under safely for practice weaving.', misconception: 'CRAFT_MATERIAL', visual: classify(['Suitable', 'Unsafe'], ['paper strips', 'broken glass', 'sharp wire'], 'Material choice is part of good craft design.') },
      { prompt: 'In simple weaving, what should happen after one strip goes over a strand?', options: ['It goes under the next strand', 'It stays above every strand', 'It is cut immediately', 'It is thrown away'], answer: 'It goes under the next strand', hint: 'Weaving alternates over and under.', explanation: 'Alternating over–under locks the strips into a woven surface.', misconception: 'WEAVING_SEQUENCE', visual: sequence(['over', 'under', 'over', 'under'], 'Follow the alternating pathway.') },
      { prompt: 'A border pattern ends unexpectedly. Which step should the artist take first?', options: ['Identify the repeating unit', 'Add random shapes', 'Erase the whole picture', 'Copy only the last shape forever'], answer: 'Identify the repeating unit', hint: 'You must know the rule before extending the pattern.', explanation: 'Finding the unit reveals which element should come next.', misconception: 'PATTERN_RULE', visual: cards(['leaf', 'dot', 'dot', 'leaf', 'dot', 'dot', '?'], 'Find the shortest group that repeats.') }
    ]
  }),
  chapter({
    key: 'creative-g4-music-performance', subjectId: 'creative_arts', subjectName: 'Creative Arts', strand: 'Performing Arts', subStrand: 'Rhythm, Music and Movement',
    title: 'Rhythm playground', shortTitle: 'Music & movement', objective: 'Recognize steady beat, rhythm patterns, dynamics, instrument families, and safe group performance.', minutes: 10,
    questions: [
      { prompt: 'Which action best helps a group keep a steady beat?', options: ['Clap evenly together', 'Clap at random speeds', 'Stop listening to others', 'Change tempo every second'], answer: 'Clap evenly together', hint: 'A steady beat repeats at regular time intervals.', explanation: 'Even synchronized claps create a pulse the group can follow.', misconception: 'STEADY_BEAT', visual: sequence(['CLAP', 'CLAP', 'CLAP', 'CLAP'], 'Keep equal space between every beat.') },
      { prompt: 'Build the movement rhythm CLAP | TAP | TURN | STAMP.', ...buildSequence('Tap one movement block for each beat space.', [{ id: 'beat-a', label: 'STAMP' }, { id: 'beat-b', label: 'TAP' }, { id: 'beat-c', label: 'CLAP' }, { id: 'beat-d', label: 'TURN' }], ['beat-c', 'beat-b', 'beat-d', 'beat-a']), hint: 'Read the written rhythm from left to right and give each movement one beat.', explanation: 'CLAP | TAP | TURN | STAMP fills the four beat spaces in the written order.', misconception: 'RHYTHM_BEAT_ORDER', visual: cards(['1', '2', '3', '4'], 'Fill every numbered beat space.', 'row') },
      { prompt: 'The symbol “p” in a simple music activity asks performers to play how?', options: ['Softly', 'Very loudly', 'Faster', 'Backward'], answer: 'Softly', hint: 'Dynamics tell how loud or soft music should sound.', explanation: 'Piano, marked p, means softly.', misconception: 'MUSIC_DYNAMICS', visual: classify(['Soft', 'Loud'], ['p', 'f'], 'Dynamics change the energy without changing the notes.') },
      { prompt: 'Which classroom instrument is played mainly by shaking?', options: ['Shaker', 'Drum', 'Recorder', 'Keyboard'], answer: 'Shaker', hint: 'Think about the motion that makes the instrument’s contents strike its sides.', explanation: 'A shaker sounds when it is moved back and forth.', misconception: 'INSTRUMENT_TECHNIQUE', visual: cards(['shaker: shake', 'drum: strike', 'recorder: blow'], 'Match each instrument to its playing action.') },
      { prompt: 'What is the best group-performance habit?', options: ['Watch the leader and listen to others', 'Play as loudly as possible', 'Ignore the agreed start', 'Block other performers'], answer: 'Watch the leader and listen to others', hint: 'Ensemble performance depends on shared timing and awareness.', explanation: 'Watching and listening helps the group begin, stay together, and finish cleanly.', misconception: 'ENSEMBLE_SKILL', visual: scene('studio', ['leader gives cue', 'performers watch', 'performers listen', 'group begins together'], 'A good ensemble shares attention.', 0) }
    ]
  }),

  chapter({
    key: 'religion-g4-values', subjectId: 'religious_education', subjectName: 'Religious Education', strand: 'Moral Values and Daily Living', subStrand: 'Values in Action',
    title: 'Everyday values quest', shortTitle: 'Values in action', objective: 'Recognize and apply honesty, compassion, fairness, forgiveness, and responsibility in daily choices.', minutes: 9,
    questions: [
      { prompt: 'Sort each playground choice by whether it builds trust or breaks trust.', ...sortIntoBuckets('Tap a choice, then tap the bucket where it belongs.', [{ id: 'trust', label: 'Builds trust' }, { id: 'harm', label: 'Breaks trust' }], [{ id: 'value-a', label: 'Return a lost pencil' }, { id: 'value-b', label: 'Hide a friend’s book' }, { id: 'value-c', label: 'Tell the truth about a mistake' }, { id: 'value-d', label: 'Blame someone else unfairly' }], { trust: ['value-a', 'value-c'], harm: ['value-b', 'value-d'] }), hint: 'Honest and caring choices make people feel safe. Hiding or blaming unfairly damages trust.', explanation: 'Returning property and telling the truth build trust; hiding and unfair blame break it.', misconception: 'VALUE_TRUST_DECISIONS', visual: scene('classroom', ['lost pencil', 'shared books', 'learners choosing what is right'], 'Notice how each decision affects other people.') },
      { prompt: 'A classmate falls during a game. Which response shows compassion?', options: ['Help them up and check they are safe', 'Laugh and walk away', 'Hide their shoes', 'Continue pushing them'], answer: 'Help them up and check they are safe', hint: 'Compassion notices another person’s pain and responds with care.', explanation: 'Offering safe help shows concern for the classmate.', misconception: 'VALUE_COMPASSION', visual: scene('classroom', ['classmate falls', 'learner offers help', 'teacher checks injury'], 'Care responds to another person’s need.', 1) },
      { prompt: 'Four learners need one shared book. Which choice is fairest?', options: ['Take turns using it for equal time', 'Let only the tallest learner use it', 'Hide it from everyone', 'Give it only to a friend'], answer: 'Take turns using it for equal time', hint: 'Fairness gives each learner a reasonable chance.', explanation: 'Equal turns share the limited resource justly.', misconception: 'VALUE_FAIRNESS', visual: sequence(['learner 1 reads', 'pass book', 'learner 2 reads', 'continue turns'], 'A fair plan lets everyone participate.') },
      { prompt: 'A friend apologizes sincerely after damaging your drawing. Which response helps restore peace?', options: ['Discuss it and forgive them', 'Plan revenge', 'Insult their family', 'Damage their work'], answer: 'Discuss it and forgive them', hint: 'Forgiveness does not ignore the harm; it helps repair the relationship.', explanation: 'Honest discussion and forgiveness can rebuild friendship.', misconception: 'VALUE_FORGIVENESS', visual: cards(['harm happened', 'apology', 'talk', 'forgive', 'repair trust'], 'Peace grows through a series of caring actions.') },
      { prompt: 'Why do many religious teachings encourage people to tell the truth?', options: ['Truthfulness builds trust', 'Truthfulness makes others afraid', 'Truthfulness stops learning', 'Truthfulness wastes time'], answer: 'Truthfulness builds trust', hint: 'Think about how relationships change when words can be believed.', explanation: 'People can depend on one another when they are truthful.', misconception: 'VALUE_REASON', visual: classify(['Builds trust', 'Breaks trust'], ['tell the truth', 'hide a harmful lie'], 'Choices shape how safely people relate to one another.') }
    ]
  }),
  chapter({
    key: 'religion-g4-worship-respect', subjectId: 'religious_education', subjectName: 'Religious Education', strand: 'Places and Practices of Worship', subStrand: 'Respect for Religious Diversity',
    title: 'Respectful explorer', shortTitle: 'Worship & respect', objective: 'Identify worship practices and show respectful curiosity toward Kenya’s diverse faith communities.', minutes: 10,
    questions: [
      { prompt: 'A church, mosque, and temple are all examples of what?', options: ['Places of worship', 'Weather stations', 'Sports grounds', 'Repair shops'], answer: 'Places of worship', hint: 'Different faith communities gather in these places for prayer and teaching.', explanation: 'Each building serves a community’s worship and religious learning.', misconception: 'PLACE_OF_WORSHIP', visual: cards(['church', 'mosque', 'temple'], 'Different buildings can serve a shared purpose.', 'row') },
      { prompt: 'What is prayer in many religious communities?', options: ['Communicating with God or the divine', 'Counting every desk', 'Drawing only maps', 'Winning a race'], answer: 'Communicating with God or the divine', hint: 'Prayer may include speaking, listening, thanks, or requests for guidance.', explanation: 'Prayer is a way believers communicate within their faith.', misconception: 'PRAYER_PURPOSE', visual: cards(['give thanks', 'seek guidance', 'listen quietly'], 'Prayer may include several respectful actions.') },
      { prompt: 'During a visit to a place of worship, people begin praying. What should a learner do?', options: ['Stay quiet and follow the host’s guidance', 'Shout questions across the room', 'Touch sacred objects without permission', 'Make fun of the practice'], answer: 'Stay quiet and follow the host’s guidance', hint: 'Respect protects worshippers from disturbance and helps visitors learn.', explanation: 'Quiet attention and local guidance show courtesy.', misconception: 'WORSHIP_CONDUCT', visual: sequence(['enter calmly', 'listen to host', 'observe quietly', 'ask politely later'], 'A respectful visit has a thoughtful rhythm.') },
      { prompt: 'Which choice shows religious tolerance in a diverse classroom?', options: ['Working kindly with learners of different faiths', 'Mocking another learner’s prayer', 'Forcing one greeting on everyone', 'Refusing to share a desk'], answer: 'Working kindly with learners of different faiths', hint: 'Tolerance means living and learning peacefully without demanding sameness.', explanation: 'Kind cooperation respects each learner’s dignity and beliefs.', misconception: 'RELIGIOUS_TOLERANCE', visual: scene('classroom', ['learner from faith A', 'shared project', 'learner from faith B', 'kind cooperation'], 'Difference does not prevent teamwork.', 1) },
      { prompt: 'Why should learners ask permission before photographing a religious ceremony?', options: ['The community may have rules about privacy and sacred moments', 'Every camera is broken', 'Photos always stop music', 'Permission makes the building taller'], answer: 'The community may have rules about privacy and sacred moments', hint: 'Respect includes consent, especially during meaningful practices.', explanation: 'Asking first honours people, privacy, and community guidance.', misconception: 'RELIGIOUS_CONSENT', visual: cards(['pause', 'ask permission', 'follow the answer'], 'Curiosity should travel with consent.', 'row') }
    ]
  }),
  chapter({
    key: 'religion-g4-service-stewardship', subjectId: 'religious_education', subjectName: 'Religious Education', strand: 'Faith and Community Life', subStrand: 'Service, Peace and Stewardship',
    title: 'Hands that help', shortTitle: 'Service & care', objective: 'Apply service, peacemaking, gratitude, and stewardship to school, home, and community situations.', minutes: 10,
    questions: [
      { prompt: 'Which action is an example of service at school?', options: ['Helping arrange books for everyone', 'Hiding classroom materials', 'Leaving litter on the floor', 'Refusing every group task'], answer: 'Helping arrange books for everyone', hint: 'Service uses time or effort to benefit other people.', explanation: 'Organizing shared books helps the whole learning community.', misconception: 'SERVICE_ACTION', visual: scene('classroom', ['mixed-up books', 'learner helps', 'organized shelf', 'class benefits'], 'Small helpful actions can serve many people.', 1) },
      { prompt: 'Two friends disagree over a ball. Which action best makes peace?', options: ['Listen to both and agree on turns', 'Encourage them to fight', 'Hide the ball forever', 'Choose a side without listening'], answer: 'Listen to both and agree on turns', hint: 'Peacemaking hears the problem and searches for a fair way forward.', explanation: 'Listening and taking turns address both learners’ needs.', misconception: 'PEACEMAKING', visual: sequence(['pause argument', 'listen to both', 'agree on turns', 'play peacefully'], 'Peace is built step by step.') },
      { prompt: 'What does stewardship of the environment mean?', options: ['Caring responsibly for the natural world', 'Using every resource wastefully', 'Cutting all young trees', 'Throwing rubbish into rivers'], answer: 'Caring responsibly for the natural world', hint: 'A steward looks after something valuable rather than wasting it.', explanation: 'Environmental stewardship protects creation and resources for others and the future.', misconception: 'STEWARDSHIP_MEANING', visual: classify(['Good stewardship', 'Harm'], ['plant tree', 'save water', 'litter river'], 'Sort actions by how they treat the environment.') },
      { prompt: 'A neighbour brings food to a family after an emergency. Which value is most visible?', options: ['Generosity', 'Selfishness', 'Boasting', 'Waste'], answer: 'Generosity', hint: 'The neighbour freely shares something useful in a time of need.', explanation: 'Giving food to support others shows generosity and compassion.', misconception: 'GENEROSITY_VALUE', visual: scene('community', ['family needs help', 'neighbour brings food', 'community support'], 'A gift becomes meaningful when it meets a real need.', 1) },
      { prompt: 'Which habit helps a learner practise gratitude?', options: ['Notice help and say thank you sincerely', 'Demand more without noticing others', 'Mock every gift', 'Claim all success alone'], answer: 'Notice help and say thank you sincerely', hint: 'Gratitude begins by recognizing a good thing or another person’s effort.', explanation: 'Sincere thanks acknowledges kindness and strengthens relationships.', misconception: 'GRATITUDE_PRACTICE', visual: cards(['notice', 'appreciate', 'say thank you', 'show care in return'], 'Gratitude moves from attention to action.') }
    ]
  }),

  chapter({
    key: 'ai-g4-digital-safety', subjectId: 'ai_education', subjectName: 'AI Education', strand: 'Digital Citizenship', subStrand: 'Privacy and Safety',
    title: 'Sungura’s safety shield', shortTitle: 'Digital safety', objective: 'Protect personal information, respond to unsafe content, and ask trusted adults for help.', minutes: 9,
    questions: [
      { prompt: 'Which detail should you never share with an AI tutor or stranger online?', options: ['Your password', 'A maths topic', 'A made-up story character', 'Your favourite colour'], answer: 'Your password', hint: 'Private login details can let another person enter your account.', explanation: 'Passwords must stay secret, even when a tool asks for them.', misconception: 'DIGITAL_PRIVATE_DATA', visual: classify(['Keep private', 'Safe learning topic'], ['password', 'home address', 'fractions question', 'story idea'], 'Sungura sorts secrets away from ordinary school topics.') },
      { prompt: 'An AI chat asks for your home address before explaining a science question. What should you do?', options: ['Do not share it; tell a trusted adult', 'Send the full address', 'Add your phone number too', 'Ask a friend to send theirs'], answer: 'Do not share it; tell a trusted adult', hint: 'The address is not needed to explain a school topic.', explanation: 'Stopping and telling a trusted adult protects your privacy.', misconception: 'UNNECESSARY_DATA_REQUEST', visual: sequence(['AI asks for address', 'pause', 'do not share', 'tell trusted adult'], 'Use the safety pause before responding.') },
      { prompt: 'Which password is safest?', options: ['A long unique phrase with mixed characters', '1234', 'password', 'your first name'], answer: 'A long unique phrase with mixed characters', hint: 'Strong passwords are long, hard to guess, and not reused.', explanation: 'Length and variety make a unique password harder to guess.', misconception: 'WEAK_PASSWORD', visual: cards(['1234: weak', 'name: weak', 'long unique phrase: strong'], 'Compare how easy each password would be to guess.') },
      { prompt: 'A generated picture makes you feel frightened or uncomfortable. What is the best next step?', options: ['Close it and tell a trusted adult', 'Keep opening it alone', 'Share it with the whole class', 'Enter more private details'], answer: 'Close it and tell a trusted adult', hint: 'You do not have to handle upsetting digital content alone.', explanation: 'Leaving the content and seeking help is a safe response.', misconception: 'UPSETTING_CONTENT_RESPONSE', visual: scene('computer_lab', ['uncomfortable content', 'learner closes screen', 'teacher helps'], 'Stop, step away, and get support.', 1) },
      { prompt: 'Why should a shared tablet be logged out after use?', options: ['To stop others accessing your account', 'To make the battery larger', 'To erase the internet', 'To improve the camera colour'], answer: 'To stop others accessing your account', hint: 'A shared device will be used by someone else next.', explanation: 'Logging out protects your work and account from unauthorized access.', misconception: 'SHARED_DEVICE_SECURITY', visual: sequence(['finish learning', 'save work', 'log out', 'next learner signs in'], 'End a shared-device session safely.') }
    ]
  }),
  chapter({
    key: 'ai-g4-good-prompts', subjectId: 'ai_education', subjectName: 'AI Education', strand: 'Working with AI', subStrand: 'Clear Instructions',
    title: 'Prompt builder', shortTitle: 'Good prompts', objective: 'Write clear, age-appropriate prompts with a goal, context, format, and useful follow-up.', minutes: 10,
    questions: [
      { prompt: 'Build a useful AI prompt for learning the water cycle.', ...buildSequence('Tap the prompt blocks in a clear reading order.', [{ id: 'prompt-a', label: 'using four steps.', detail: 'format' }, { id: 'prompt-b', label: 'Explain the water cycle', detail: 'learning goal' }, { id: 'prompt-c', label: 'for a Grade 4 learner', detail: 'audience' }], ['prompt-b', 'prompt-c', 'prompt-a']), hint: 'Start with the learning goal, name the learner level, then ask for the format.', explanation: 'The prompt clearly asks: Explain the water cycle for a Grade 4 learner using four steps.', misconception: 'VAGUE_PROMPT', visual: scene('computer_lab', ['learning goal', 'audience', 'response format'], 'A strong prompt combines three useful parts.') },
      { prompt: 'You want vocabulary practice. Which extra instruction would improve the prompt?', options: ['Give me five words with meanings and examples', 'Make it good', 'Know what I mean', 'Use anything'], answer: 'Give me five words with meanings and examples', hint: 'Specify the amount and the form of the response.', explanation: 'The instruction defines exactly what a useful practice set contains.', misconception: 'PROMPT_OUTPUT_FORMAT', visual: cards(['goal: vocabulary', 'amount: 5 words', 'format: meaning + example'], 'Build the prompt from three useful blocks.') },
      { prompt: 'An explanation is too difficult. What is the best follow-up?', options: ['Explain it again using simpler Grade 4 words and one example.', 'Wrong.', 'More.', 'I quit.'], answer: 'Explain it again using simpler Grade 4 words and one example.', hint: 'Tell the AI what was difficult and what would make it better.', explanation: 'The follow-up requests simpler language and a concrete example.', misconception: 'UNHELPFUL_FOLLOWUP', visual: sequence(['read answer', 'notice difficulty', 'ask for simpler words', 'request one example'], 'Improving an answer can take more than one turn.') },
      { prompt: 'Which prompt supports learning instead of copying homework?', options: ['Give me a hint for the first step, then let me try.', 'Complete my whole worksheet and hide that AI helped.', 'Give only final answers.', 'Pretend to be me.'], answer: 'Give me a hint for the first step, then let me try.', hint: 'Choose a prompt that keeps the learner thinking.', explanation: 'A small hint supports understanding while leaving the work to the learner.', misconception: 'AI_COPYING_VS_COACHING', visual: classify(['Coach me', 'Do it for me'], ['first-step hint', 'final answers', 'pretend to be me'], 'Mufasa rewards prompts that keep your brain in the game.') },
      { prompt: 'Which complete prompt is best for planning a fair science test?', options: ['Help me plan a Grade 4 test of which soil holds most water; include what to change, measure and keep the same.', 'Tell me soil.', 'Give experiment.', 'Make science easy.'], answer: 'Help me plan a Grade 4 test of which soil holds most water; include what to change, measure and keep the same.', hint: 'Look for a goal, grade level, and the parts of a fair test.', explanation: 'The prompt gives clear context and asks for the variables needed in an investigation.', misconception: 'PROMPT_MISSING_CONTEXT', visual: cards(['goal: compare soils', 'level: Grade 4', 'format: change / measure / keep same'], 'All three blocks guide a focused response.') }
    ]
  }),
  chapter({
    key: 'ai-g4-check-create', subjectId: 'ai_education', subjectName: 'AI Education', strand: 'Responsible AI', subStrand: 'Checking and Creating',
    title: 'Truth checker studio', shortTitle: 'Check & create', objective: 'Check AI outputs with trusted sources, spot limitations, and transform suggestions into original work.', minutes: 10,
    questions: [
      { prompt: 'An AI says Kenya has 48 counties. What should you do before using the claim?', options: ['Check a trusted current source', 'Believe it because it sounds confident', 'Share it immediately', 'Change it to 60'], answer: 'Check a trusted current source', hint: 'AI can produce confident-sounding mistakes.', explanation: 'A trusted source confirms that Kenya has 47 counties.', misconception: 'AI_CONFIDENCE_EQUALS_TRUTH', visual: sequence(['read AI claim', 'pause', 'check trusted source', 'correct your notes'], 'Verification turns a guess into reliable learning.') },
      { prompt: 'Which source is best for checking a fact about your school timetable?', options: ['The official timetable from school', 'A random generated story', 'An old game score', 'A stranger’s guess'], answer: 'The official timetable from school', hint: 'Use the source closest to and responsible for the information.', explanation: 'The school’s official timetable is authoritative for its own schedule.', misconception: 'SOURCE_AUTHORITY', visual: classify(['Trusted for timetable', 'Not evidence'], ['official school timetable', 'random story', 'stranger guess'], 'Match the question to the best source.') },
      { prompt: 'An AI gives two different answers to the same sum. What is the best response?', options: ['Work through the sum and check with another method', 'Choose the longer answer', 'Pick the first answer always', 'Stop learning maths'], answer: 'Work through the sum and check with another method', hint: 'Use your own reasoning and an independent check.', explanation: 'Calculating step by step reveals which answer, if either, is correct.', misconception: 'AI_AS_FINAL_AUTHORITY', visual: cards(['AI answer A', 'your working', 'AI answer B', 'independent check'], 'Your reasoning belongs at the centre of the decision.') },
      { prompt: 'AI suggests an opening for your story. What is responsible creative use?', options: ['Use it as inspiration, then write and revise in your own voice', 'Copy it without reading', 'Claim another writer’s story', 'Submit invented sources'], answer: 'Use it as inspiration, then write and revise in your own voice', hint: 'A creative tool should support, not replace, your thinking and authorship.', explanation: 'Transforming an idea through your own choices produces genuine learning and original work.', misconception: 'AI_CREATIVE_OWNERSHIP', visual: sequence(['AI offers idea', 'learner chooses', 'learner writes', 'learner revises', 'original story'], 'The learner remains the author at every important step.') },
      { prompt: 'A picture generator repeatedly shows only boys as engineers. What limitation might this reveal?', options: ['Bias in the patterns it learned', 'Proof that girls cannot be engineers', 'A broken screen colour', 'A faster internet connection'], answer: 'Bias in the patterns it learned', hint: 'AI outputs can reflect unfair patterns in training data.', explanation: 'Repeatedly excluding girls may show biased representation, not reality.', misconception: 'AI_BIAS', visual: classify(['Biased sample', 'Inclusive sample'], ['only boys shown', 'girls and boys shown in varied engineering roles'], 'Ask who is missing from the generated picture.') }
    ]
  })
];

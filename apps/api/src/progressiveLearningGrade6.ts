import {
  defineCurriculumChapters,
  type CurriculumChapterSource
} from './progressiveLearningCurriculum.js';
import { GRADE_6_WHOLE_NUMBERS_SCENE } from './interactiveLearning/grade6WholeNumbersScene.js';
import { GRADE_6_WHOLE_NUMBERS_RANK_SCENE } from './interactiveLearning/grade6WholeNumbersRankScene.js';
import { humanCellLessonSeeds } from './progressiveLearningGrade6HumanCell.js';

type Question = CurriculumChapterSource['questions'][number];

const SOURCE_ROOT = 'apps/api/data/books/KEN/CBC/G6';
const KICD_BOOK_COMMITS: Record<string, string> = {
  agriculture: '3d4ae610cd6f9e2dbfad2c0b7e917cf1cd7c1a39',
  'creative-arts': 'cc84b126e0794624fed9a8b58cdbcbd964590a15',
  english: '3d4ae610cd6f9e2dbfad2c0b7e917cf1cd7c1a39',
  kiswahili: '3d4ae610cd6f9e2dbfad2c0b7e917cf1cd7c1a39',
  mathematics: '3d4ae610cd6f9e2dbfad2c0b7e917cf1cd7c1a39',
  'science-and-technology': '3d4ae610cd6f9e2dbfad2c0b7e917cf1cd7c1a39',
  'social-studies': '3d4ae610cd6f9e2dbfad2c0b7e917cf1cd7c1a39'
};

const source = (slug: string, sourceSnapshotHash: string) => {
  const commit = KICD_BOOK_COMMITS[slug];
  if (!commit) throw new Error(`Missing immutable Grade 6 source commit for ${slug}`);
  return `git:${commit}:${SOURCE_ROOT}/${slug}/book-plan.json#sourceSnapshotHash=${sourceSnapshotHash}`;
};

const RELIGION_SOURCE =
  'git:ea1342bad94104c45a1ab9f8dfdbf8f38e92a2ed:apps/api/data/quiz-bank/KEN/CBC/questions/grade-6/religious_education.json#sha256=3e2470c43450d3c2b0f90c031134a284c80cd33b52bc21e7994c181f01a56c88';

const question = (
  prompt: string,
  options: [string, string, string, string],
  answer: string,
  explanation: string,
  hint: string,
  misconception: string,
  cognitiveLevel: Question['cognitiveLevel']
): Question => ({ prompt, options, answer, explanation, hint, misconception, cognitiveLevel });

const chapters: CurriculumChapterSource[] = [
  // Agriculture & Nutrition
  {
    key: 'agriculture-g6-soil-erosion', subjectId: 'agriculture', subjectName: 'Agriculture & Nutrition', grade: 'Grade 6',
    strand: 'Conservation of Resources', subStrand: 'Controlling Soil Erosion',
    title: 'Rescue the Rainy Hillside', shortTitle: 'Erosion Rescue',
    objective: 'Describe common types of soil erosion, choose practical controls, and explain how vegetation protects a sloping garden.', minutes: 10,
    sourceRef: source('agriculture', '3e9fdd15ef9804bfca0bcdceaf5f50ebe9a8d517d9b7c55d53df719aa2924fd7'),
    visual: { setting: 'garden', elements: ['sloping school garden after rain', 'thin sheet of muddy runoff', 'grass strips across the slope', 'mulched vegetable bed'] },
    questions: [
      question('Which observation is the clearest sign of sheet erosion?', ['A thin layer of soil washed from a wide area', 'One deep channel cut through the garden', 'A heap of compost beside a bed', 'Earthworms moving under mulch'], 'A thin layer of soil washed from a wide area', 'Sheet erosion removes a shallow layer of soil across a broad exposed surface.', 'Look for soil loss that is wide and shallow rather than narrow and deep.', 'All moving soil is assumed to form a deep gully.', 'recall'),
      question('Why do grass strips planted across a slope reduce soil loss?', ['They slow runoff and hold soil with their roots', 'They make rain fall only uphill', 'They remove every drop of water', 'They loosen all soil before storms'], 'They slow runoff and hold soil with their roots', 'Grass stems slow moving water while roots bind soil particles in place.', 'Think about what stems do above ground and roots do below it.', 'Plants are treated as decoration rather than an erosion control.', 'understand'),
      question('Rainwater is carrying soil from a bare school garden. What should learners do first?', ['Cover the soil with mulch and plant across the slope', 'Sweep away the remaining topsoil', 'Dig channels straight downhill', 'Remove every plant near the bed'], 'Cover the soil with mulch and plant across the slope', 'Mulch protects the surface and cross-slope planting slows runoff before more soil is lost.', 'Choose an action that covers exposed soil and interrupts fast downhill water.', 'A downhill channel is mistaken for a safe way to drain runoff.', 'apply'),
      question('Plot A has bare rows running downhill. Plot B has mulch and grass strips across the slope. After equal rain, which evidence best supports Plot B?', ['Its runoff is clearer and less soil collects below', 'Its runoff is darker and faster', 'Its mulch floats into the road', 'Its soil forms a deeper channel'], 'Its runoff is clearer and less soil collects below', 'Less sediment in slower runoff shows that more topsoil stayed in Plot B.', 'Compare evidence about both the water and the soil left behind.', 'Any runoff is taken to mean the control failed.', 'analyse'),
      question('A path beside a garden is beginning to form small rills. Which combined plan is strongest?', ['Redirect footsteps, add cover, and place barriers across the slope', 'Widen the rills and remove nearby grass', 'Pour more water into the rills each day', 'Leave the soil bare until the rainy season ends'], 'Redirect footsteps, add cover, and place barriers across the slope', 'The plan tackles compaction, exposed soil, and runoff direction together.', 'Look for a plan that addresses several causes instead of only one symptom.', 'One quick barrier is assumed to solve every source of erosion.', 'analyse')
    ]
  },
  {
    key: 'agriculture-g6-water-seedbeds', subjectId: 'agriculture', subjectName: 'Agriculture & Nutrition', grade: 'Grade 6',
    strand: 'Conservation of Resources', subStrand: 'Conserving Water: Sunken Seedbeds and Shallow Pits',
    title: 'Build a Water-Wise Seedbed', shortTitle: 'Water-Wise Beds',
    objective: 'Identify moisture-conserving seedbeds, plan sunken beds and shallow pits, and justify safe watering and mulching choices.', minutes: 10,
    sourceRef: source('agriculture', '3e9fdd15ef9804bfca0bcdceaf5f50ebe9a8d517d9b7c55d53df719aa2924fd7'),
    visual: { setting: 'garden', elements: ['sunken seedbed below the path', 'shallow planting pits', 'dry-grass mulch', 'watering can used near sunset'] },
    questions: [
      question('Which seedbed shape is designed to hold rainwater in a dry area?', ['A shallow sunken bed', 'A high smooth mound', 'A concrete tabletop', 'A steep bare ridge'], 'A shallow sunken bed', 'A sunken bed collects water and gives it more time to soak into the soil.', 'Look for a shape where water settles instead of running away.', 'All seedbeds are assumed to conserve the same amount of moisture.', 'recall'),
      question('Why does mulch help seedlings during a hot week?', ['It reduces evaporation from the soil surface', 'It makes roots stop using water', 'It turns dry soil into a pond', 'It blocks every drop of rainfall'], 'It reduces evaporation from the soil surface', 'Mulch shades the soil and slows the loss of water vapour from its surface.', 'Focus on what shade and surface cover do to moisture loss.', 'Mulch is thought to create water rather than conserve it.', 'understand'),
      question('Learners have limited water for sukuma wiki seedlings. Which routine is most efficient?', ['Water gently near the roots in the cool evening', 'Splash the path at midday', 'Flood the bed until water runs away', 'Wet only the leaves during strong sunshine'], 'Water gently near the roots in the cool evening', 'Cool-time root watering reduces evaporation and places water where plants can absorb it.', 'Consider the time of day, the target, and how quickly water can escape.', 'Wet leaves are mistaken for well-watered roots.', 'apply'),
      question('Bed A is sunken and mulched; Bed B is raised, bare, and watered equally. Which result is most likely after two days?', ['Bed A stays moist longer', 'Bed B creates more water', 'Both beds must be equally moist', 'Bed A loses all water first'], 'Bed A stays moist longer', 'The sunken shape captures water while mulch slows evaporation, so moisture remains longer.', 'Combine the effect of the bed shape with the effect of its surface cover.', 'Only the amount poured is considered, not how water is retained.', 'analyse'),
      question('A sunken bed becomes waterlogged after heavy rain. What is the best adjustment?', ['Add a safe overflow channel while keeping mulch clear of stems', 'Make the bed much deeper without an outlet', 'Seal the soil with plastic sheets', 'Continue adding water every hour'], 'Add a safe overflow channel while keeping mulch clear of stems', 'An overflow prevents root damage while careful mulching still conserves moisture after drainage.', 'A strong plan must handle both excess water now and moisture loss later.', 'Water conservation is confused with keeping soil flooded.', 'analyse')
    ]
  },
  {
    key: 'agriculture-g6-wildlife-deterrents', subjectId: 'agriculture', subjectName: 'Agriculture & Nutrition', grade: 'Grade 6',
    strand: 'Conservation of Resources', subStrand: 'Conserving Wild Animals',
    title: 'Protect Crops, Protect Wildlife', shortTitle: 'Safe Deterrents',
    objective: 'Recognize humane wildlife deterrents, match them to farm risks, and design crop protection that does not injure wild animals.', minutes: 9,
    sourceRef: source('agriculture', '3e9fdd15ef9804bfca0bcdceaf5f50ebe9a8d517d9b7c55d53df719aa2924fd7'),
    visual: { setting: 'garden', elements: ['maize plot near a wildlife path', 'well-maintained fence', 'reflective tape and bells', 'covered poultry shelter at dusk'] },
    questions: [
      question('Which item is a humane physical deterrent for a small crop plot?', ['A visible well-maintained fence', 'A hidden wire snare', 'Poisoned fruit', 'An open pit on the path'], 'A visible well-maintained fence', 'A visible fence separates crops from animals without deliberately trapping or poisoning them.', 'Choose a barrier that prevents entry without causing injury.', 'Anything that stops an animal is assumed to be acceptable.', 'recall'),
      question('Why should farmers change the position of harmless visual deterrents sometimes?', ['Animals may become used to a fixed object', 'The crops need to learn the route', 'A moving object makes soil deeper', 'The fence will produce more rain'], 'Animals may become used to a fixed object', 'Changing a harmless deterrent can keep it noticeable when animals have adapted to its old position.', 'Think about how repeated exposure can change an animal response.', 'One deterrent is assumed to work forever without maintenance.', 'understand'),
      question('Monkeys visit a fruit garden in daylight. Which response is safest?', ['Harvest ripe fruit promptly and secure the boundary', 'Leave ripe fruit scattered outside', 'Set concealed traps in branches', 'Chase them toward a busy road'], 'Harvest ripe fruit promptly and secure the boundary', 'Removing easy food and improving the boundary reduces attraction without harming wildlife.', 'Reduce the reward and block access rather than injuring the animals.', 'Harmful chasing is mistaken for effective conservation.', 'apply'),
      question('A poultry house loses birds at night although a scarecrow stands in the field. What does the evidence suggest?', ['A secure night shelter is more relevant than the scarecrow', 'The birds need less shelter', 'The scarecrow must be placed indoors with the birds', 'All wildlife deterrents are useless'], 'A secure night shelter is more relevant than the scarecrow', 'The time and target show that strong housing is needed to protect poultry at night.', 'Match the control to when the loss happens and what is being protected.', 'A daytime field device is assumed to solve a night housing problem.', 'analyse'),
      question('Which plan best balances crop safety and wildlife conservation near a forest edge?', ['Use barriers, remove attractants, monitor visits, and seek wildlife guidance', 'Use poison whenever tracks appear', 'Block the community water source', 'Leave food waste beside the crop fence'], 'Use barriers, remove attractants, monitor visits, and seek wildlife guidance', 'Layered non-lethal controls and expert guidance reduce conflict while protecting animals and livelihoods.', 'Look for prevention, evidence gathering, and safe community support together.', 'A single dangerous action is treated as a complete conflict plan.', 'analyse')
    ]
  },

  // Creative Arts
  {
    key: 'creative-g6-string-instruments', subjectId: 'creative_arts', subjectName: 'Creative Arts', grade: 'Grade 6',
    strand: 'Creating and Executing', subStrand: 'String Musical Instruments and Drawing',
    title: 'Strings, Sound and Stippling', shortTitle: 'Strings & Dots',
    objective: 'Identify Kenyan string instruments, explain how their parts make sound, and plan a safe recycled model and stippled drawing.', minutes: 10,
    sourceRef: source('creative-arts', '68ba573259c1ad35609cbbaa04501432800b9444ae16b71a6b65c0096bd232d6'),
    visual: { setting: 'studio', elements: ['orutu-style fiddle and bow', 'recycled resonator materials', 'tight string over a bridge', 'stippled instrument drawing'] },
    questions: [
      question('Which part of a string instrument vibrates first to begin the sound?', ['The stretched string', 'The sound box before the string moves', 'The tuning peg on its own', 'The wooden bow stick'], 'The stretched string', 'A plucked or bowed string vibrates and starts the sound that the instrument amplifies.', 'Choose the part that is directly plucked or moved by a bow.', 'The decorated surface is assumed to create the musical vibration.', 'recall'),
      question('Why does a hollow resonator make a fiddle easier to hear?', ['It strengthens the vibrations moving through the air', 'It stops the string from moving', 'It changes every note into silence', 'It replaces the need for a string'], 'It strengthens the vibrations moving through the air', 'The resonator transfers and amplifies string vibrations so the sound reaches listeners more clearly.', 'Think about how a hollow body affects a small vibration.', 'The resonator is treated as decoration only.', 'understand'),
      question('A learner is making a model fiddle from recycled materials. Which choice is safest?', ['Use a smooth container and ask an adult to handle sharp holes', 'Cut jagged metal alone', 'Stretch wire toward the face', 'Use a cracked glass bottle'], 'Use a smooth container and ask an adult to handle sharp holes', 'Smooth materials and adult help for sharp tools reduce injury while preserving the design task.', 'Check the material edges and who should use piercing tools.', 'Recycled is assumed to mean automatically safe.', 'apply'),
      question('Dots are packed closely on the shaded side of an instrument drawing and spread apart on the lit side. What effect is created?', ['A change from dark value to light value', 'A louder musical note', 'A moving volleyball', 'A completely flat colour'], 'A change from dark value to light value', 'Dense stippling appears darker while wider spacing creates a lighter value.', 'Compare dot spacing on the shadow side and the light side.', 'More dots are confused with a larger object rather than darker value.', 'analyse'),
      question('Which exhibition plan best connects music, craft, and drawing?', ['Display the model, label its sound-making parts, and mount a stippled study', 'Hide the model and show only blank paper', 'Play a recording with no explanation or artwork', 'Mount sharp scraps where visitors can touch them'], 'Display the model, label its sound-making parts, and mount a stippled study', 'The plan demonstrates construction, musical understanding, and visual observation safely.', 'Look for evidence of all three skills and safe presentation.', 'A finished object alone is assumed to show every learning outcome.', 'analyse')
    ]
  },
  {
    key: 'creative-g6-painting-collage', subjectId: 'creative_arts', subjectName: 'Creative Arts', grade: 'Grade 6',
    strand: 'Creating and Executing', subStrand: 'Painting and Collage',
    title: 'Colour Lab Gallery', shortTitle: 'Colour & Collage',
    objective: 'Classify colour-wheel families, use brush strokes in a still life, and plan a neat mounted collage from safe local materials.', minutes: 10,
    sourceRef: source('creative-arts', '68ba573259c1ad35609cbbaa04501432800b9444ae16b71a6b65c0096bd232d6'),
    visual: { setting: 'studio', elements: ['colour wheel beside paint pots', 'banana and calabash still life', 'textured paper collage', 'finished picture in a mat mount'] },
    questions: [
      question('Which pair mixes to make the secondary colour green?', ['Blue and yellow', 'Red and blue', 'Red and yellow', 'Black and white'], 'Blue and yellow', 'Blue and yellow are primary colours that mix to produce green.', 'Recall the two primary colours found on either side of green.', 'A tint or shade mixture is confused with a secondary colour mixture.', 'recall'),
      question('Why should an artist vary brush direction when painting a woven basket?', ['The strokes can suggest its curved woven texture', 'The paint will turn into string', 'The basket will become a photograph', 'Every colour will disappear'], 'The strokes can suggest its curved woven texture', 'Brush direction can follow the form and surface pattern, helping viewers see texture and volume.', 'Imagine how woven lines travel around the curved object.', 'Brush strokes are treated as random marks with no visual purpose.', 'understand'),
      question('A collage needs the rough look of a sisal sack. Which material is most suitable?', ['A clean piece of coarse fibre', 'A leaking battery cover', 'A sharp rusty blade', 'Wet food waste'], 'A clean piece of coarse fibre', 'Clean coarse fibre provides the needed texture without introducing unsafe waste.', 'Match the visible texture while checking cleanliness and safety.', 'Any discarded material is assumed to be suitable for art.', 'apply'),
      question('A red tomato disappears against a red background in a still life. Which change creates clearer contrast?', ['Use a cooler green or blue-green background', 'Add more identical red behind it', 'Remove the outline and all shading', 'Cover the tomato with the background paint'], 'Use a cooler green or blue-green background', 'A contrasting cooler background separates the warm red object and strengthens the focal point.', 'Use the colour wheel to find a family that differs strongly from red.', 'More of the same colour is assumed to improve visibility.', 'analyse'),
      question('Which display plan gives a collage the most finished presentation?', ['Trim loose edges, centre it, and use an even mat border', 'Leave wet glue and torn pieces hanging', 'Fold the picture through its focal point', 'Cover the artwork with an oversized label'], 'Trim loose edges, centre it, and use an even mat border', 'Careful trimming, centring, and an even mount protect the work and guide attention to it.', 'Check neatness, balance, and whether the artwork remains visible.', 'A mount is treated as decoration that can hide the artwork.', 'analyse')
    ]
  },
  {
    key: 'creative-g6-volleyball', subjectId: 'creative_arts', subjectName: 'Creative Arts', grade: 'Grade 6',
    strand: 'Creating and Executing', subStrand: 'Volleyball',
    title: 'Serve, Dig, Rally!', shortTitle: 'Volleyball Rally',
    objective: 'Recognize under-arm service and digging technique, apply safe body positions, and improve a rally using observed evidence.', minutes: 9,
    sourceRef: source('creative-arts', '68ba573259c1ad35609cbbaa04501432800b9444ae16b71a6b65c0096bd232d6'),
    visual: { setting: 'community', elements: ['marked school volleyball court', 'learner holding ball below waist', 'receiver in low ready stance', 'net with clear safety space'] },
    questions: [
      question('Where is the ball held before an under-arm service?', ['Below the waist in front of the body', 'Behind the head with both elbows locked', 'Between the knees while sitting', 'On top of the net'], 'Below the waist in front of the body', 'An under-arm server holds the ball low and in front before swinging the other hand.', 'Picture the low-to-high swing used in this type of serve.', 'Under-arm service is confused with an over-arm throwing action.', 'recall'),
      question('Why does a receiver bend the knees before digging a low ball?', ['It creates a stable low position for control', 'It makes the net shorter', 'It stops teammates from moving', 'It guarantees the ball spins'], 'It creates a stable low position for control', 'Bent knees lower the body, improve balance, and help the learner move under the ball.', 'Think about balance and reaching a ball close to the ground.', 'Straight rigid legs are assumed to give better low-ball control.', 'understand'),
      question('A served ball is coming toward a learner’s forearms. What should the learner do?', ['Join the arms, face the platform to target, and lift with the legs', 'Swing one fist wildly at the ball', 'Catch the ball and run under the net', 'Turn away and lock the knees'], 'Join the arms, face the platform to target, and lift with the legs', 'A firm forearm platform and controlled leg lift direct the dig toward a teammate.', 'Build a flat platform and use the whole body rather than a wild arm swing.', 'The dig is treated as a punch made only with the hands.', 'apply'),
      question('Most serves land short of the net although contact is clean. Which adjustment should be tested?', ['A fuller forward swing with weight moving toward the target', 'Closing the eyes before contact', 'Holding the ball behind the back', 'Stepping farther away without more force'], 'A fuller forward swing with weight moving toward the target', 'Forward swing and weight transfer add controlled distance while preserving the contact point.', 'The evidence points to distance, so adjust how energy moves forward.', 'Accuracy and power problems are treated as unrelated to body movement.', 'analyse'),
      question('A team sends every first touch straight back over the net and loses control. Which plan should improve rallies?', ['Direct the first dig upward to a teammate before returning the ball', 'Kick every low ball', 'Stand together in one corner', 'Catch difficult balls during play'], 'Direct the first dig upward to a teammate before returning the ball', 'A controlled first pass creates time and position for a purposeful team return.', 'Use more than one team contact to build control.', 'The fastest possible return is assumed to be the best team strategy.', 'analyse')
    ]
  },

  // English
  {
    key: 'english-g6-listening-details', subjectId: 'english', subjectName: 'English', grade: 'Grade 6',
    strand: 'Listening and Speaking', subStrand: 'Listening for Meaning and Key Details',
    curriculumTopicCode: '13.1.1',
    title: 'The Listening Detective', shortTitle: 'Key Details',
    objective: 'Listen for a main message and supporting details, distinguish relevant evidence, and respond accurately to short oral narratives.', minutes: 10,
    sourceRef: source('english', 'f67332a19f648ebae149196a76bb80583ed6350f251508e439d52c5020d8221c'),
    visual: { setting: 'classroom', elements: ['learner telling a short community story', 'listeners facing the speaker', 'main-idea card', 'three evidence note cards'] },
    questions: [
      question('A speaker says, “The bridge flooded, so Akinyi used the longer hill road.” Which detail explains the route change?', ['The bridge flooded', 'Akinyi wore a sweater', 'The road had trees', 'The journey happened in Kenya'], 'The bridge flooded', 'The flooded bridge is the stated cause that made Akinyi choose another route.', 'Listen for the event linked to the change by the word so.', 'A vivid but unrelated detail is mistaken for the cause.', 'recall'),
      question('Why should a listener separate the main idea from minor details?', ['It helps the listener remember and respond to the central message', 'It makes every story shorter than one sentence', 'It removes the need to hear the speaker', 'It makes all details equally important'], 'It helps the listener remember and respond to the central message', 'Recognizing the central message organizes supporting details and leads to a relevant response.', 'Think about which information guides an accurate retelling.', 'Listening is treated as remembering every word without organizing meaning.', 'understand'),
      question('During an announcement, the teacher says the tree-planting starts at 9:00, groups meet by the gate, and each learner brings gloves. Which note is most useful?', ['9:00; meet at gate; bring gloves', 'The teacher likes trees', 'School gates are usually painted', 'Morning is before afternoon'], '9:00; meet at gate; bring gloves', 'The note captures the time, meeting place, and required item needed to act correctly.', 'Record the details a learner must use to join the activity.', 'Background knowledge is written instead of the announced instructions.', 'apply'),
      question('Two learners retell a safety talk. Njeri reports the hazard and the three safety steps; Musa remembers only a joke at the start. Whose notes better show meaning?', ['Njeri, because her notes preserve the purpose and actions', 'Musa, because jokes are always the main idea', 'Both, because every remembered detail has equal value', 'Neither, because listeners should never take notes'], 'Njeri, because her notes preserve the purpose and actions', 'Njeri captured the purpose and actionable support, while Musa retained an incidental detail.', 'Compare each set of notes with what the audience needed to learn.', 'One memorable detail is assumed to represent the whole message.', 'analyse'),
      question('A caller says, “Please bring the blue first-aid box, not the black toolbox.” What is the best response before acting?', ['Repeat the item and colour to confirm the instruction', 'Guess which box is nearest', 'Bring both without listening again', 'Change blue to green in the message'], 'Repeat the item and colour to confirm the instruction', 'Repeating the critical detail checks hearing and prevents a harmful mix-up.', 'Use a brief confirmation when two similar objects could be confused.', 'Fast action is valued more than confirming an important detail.', 'analyse')
    ]
  },
  {
    key: 'english-g6-word-classes', subjectId: 'english', subjectName: 'English', grade: 'Grade 6',
    strand: 'Grammar in Use', subStrand: 'Word Classes',
    curriculumTopicCode: '1.3.1',
    title: 'Words at Work', shortTitle: 'Word Classes',
    objective: 'Use determiners and prepositions accurately, explain the job each word performs, and revise ambiguous sentences for clarity.', minutes: 9,
    sourceRef: source('english', 'f67332a19f648ebae149196a76bb80583ed6350f251508e439d52c5020d8221c'),
    visual: { setting: 'market', elements: ['some mangoes in a basket', 'each customer holding a token', 'enough water beside the stall', 'box under the counter'] },
    questions: [
      question('Which word is the determiner in “Each learner carried a seedling”?', ['Each', 'learner', 'carried', 'seedling'], 'Each', 'Each comes before the singular noun and shows that every member is considered separately.', 'Find the word that tells how the noun group is counted.', 'The action word is mistaken for the quantity word.', 'recall'),
      question('What does the preposition under show in “The basket is under the table”?', ['The position of the basket relative to the table', 'The number of baskets', 'The action performed by the table', 'The colour of the basket'], 'The position of the basket relative to the table', 'Under expresses a spatial relationship between the basket and the table.', 'Ask what relationship the word creates between the two nouns.', 'A preposition is treated as a describing adjective.', 'understand'),
      question('A group has ten learners and ten gloves. Which sentence is most accurate?', ['There are enough gloves for each learner.', 'There is some glove for no learner.', 'There are a lot of glove under each.', 'There is each gloves between ten.'], 'There are enough gloves for each learner.', 'Enough correctly shows sufficient quantity, and each correctly distributes one to every learner.', 'Match the amount available with the number of people who need one.', 'Determiners are chosen without checking number or meaning.', 'apply'),
      question('The sentence “Put the cup by the basin” is unclear because there are two basins. Which revision is best?', ['Put the cup beside the blue basin.', 'Put the cup somewhere.', 'Cup basin put by.', 'Put each enough cup.'], 'Put the cup beside the blue basin.', 'The added preposition and identifying adjective make the intended position specific.', 'Choose a revision that removes uncertainty about location.', 'A grammatically complete sentence is assumed to be automatically precise.', 'analyse'),
      question('Which sentence uses both a determiner and a preposition logically?', ['Some books are on each desk.', 'On books are some desk.', 'Each are walking under.', 'Enough beside writes quickly.'], 'Some books are on each desk.', 'Some determines books, on shows position, and each determines desk in a meaningful sentence.', 'Check both the word jobs and whether the whole sentence makes sense.', 'Correct word labels are accepted even when the sentence relationship is illogical.', 'analyse')
    ]
  },
  {
    key: 'english-g6-fill-forms', subjectId: 'english', subjectName: 'English', grade: 'Grade 6',
    strand: 'Writing', subStrand: 'Filling Forms',
    curriculumTopicCode: '4.4.1',
    title: 'Form-Filling Mission', shortTitle: 'Accurate Forms',
    objective: 'Read form labels, enter accurate information in the correct fields, protect private details, and review a completed form before submission.', minutes: 10,
    sourceRef: source('english', 'f67332a19f648ebae149196a76bb80583ed6350f251508e439d52c5020d8221c'),
    visual: { setting: 'classroom', elements: ['school library membership form', 'clearly labelled blank fields', 'learner checking a source card', 'private details shield icon'] },
    questions: [
      question('On a form, which field asks for the day, month, and year a person was born?', ['Date of birth', 'Postal address', 'Signature', 'Favourite subject'], 'Date of birth', 'The date-of-birth field records the exact calendar date when the applicant was born.', 'Look for the label that asks for a personal date rather than a place or name.', 'The date of filling the form is confused with the birth date.', 'recall'),
      question('Why should names be copied exactly from the approved source document?', ['Exact spelling helps records match the correct person', 'Longer names always earn more marks', 'Capital letters hide every error', 'A nickname is required on all official forms'], 'Exact spelling helps records match the correct person', 'Accurate names prevent mismatched records and make later verification reliable.', 'Think about what happens when two records spell the same person differently.', 'Approximate spelling is assumed to be harmless in official records.', 'understand'),
      question('A library form asks for “Class/Grade.” What should a Grade 6 learner enter?', ['Grade 6', 'Twelve years old', 'Nairobi County', 'Library books'], 'Grade 6', 'The entry answers the field label directly by giving the learner’s current grade.', 'Match the information entered to the exact label of the field.', 'Related school information is entered without answering the requested field.', 'apply'),
      question('A form asks publicly for an account password even though it only registers a sports club. What should the learner do?', ['Leave it blank and ask a trusted adult why it is requested', 'Write the password clearly', 'Add a family password too', 'Post the form on social media'], 'Leave it blank and ask a trusted adult why it is requested', 'A password is unnecessary for club registration and should never be disclosed on a form.', 'Check whether the requested detail is necessary and safe to share.', 'Every labelled field is assumed to deserve an answer.', 'analyse'),
      question('Which final review catches the widest range of form errors?', ['Check labels, spelling, dates, required fields, and privacy', 'Check only the colour of the paper', 'Add information that was not requested', 'Replace accurate entries with guesses'], 'Check labels, spelling, dates, required fields, and privacy', 'A systematic review checks correctness, completeness, placement, and safe handling of information.', 'Choose the review that tests several important qualities, not appearance alone.', 'Neat handwriting is treated as proof that all information is correct.', 'analyse')
    ]
  },

  // Kiswahili
  {
    key: 'kiswahili-g6-matamshi', subjectId: 'kiswahili', subjectName: 'Kiswahili', grade: 'Grade 6',
    strand: 'Kusikiliza na Kuzungumza', subStrand: 'Matamshi Bora d/nd, ch/sh, j/nj na g/ng',
    title: 'Klabu ya Matamshi Mahiri', shortTitle: 'Matamshi Bora',
    objective: 'Kutambua na kutamka silabi zenye d/nd, ch/sh, j/nj na g/ng kwa usahihi na kutumia vitanzandimi kuboresha ufasaha.', minutes: 10,
    sourceRef: source('kiswahili', '30735241fa33b169ae85b3d53c6a913fc9728486e6963561bfbaf6f58fa0f58d'),
    visual: { setting: 'classroom', elements: ['kadi za sauti d na nd', 'kadi za ch na sh', 'kadi za j, nj, g na ng', 'wanafunzi wakitamka kwa zamu'] },
    questions: [
      question('Ni neno lipi lina sauti nd mwanzoni?', ['ndizi', 'dawa', 'shati', 'gari'], 'ndizi', 'Neno ndizi huanza kwa mfuatano wa konsonanti n na d unaotoa sauti nd.', 'Sikiliza sauti mbili zinazotamkwa pamoja kabla ya irabu i.', 'Herufi d peke yake hudhaniwa kuwa sawa na sauti nd.', 'recall'),
      question('Kwa nini ni muhimu kutofautisha ch na sh katika matamshi?', ['Kubadilisha sauti kunaweza kubadilisha neno na maana', 'Sauti zote mbili huandikwa kwa herufi moja', 'Tofauti hiyo hutumika katika hesabu pekee', 'Matamshi hayana uhusiano na maana'], 'Kubadilisha sauti kunaweza kubadilisha neno na maana', 'Matamshi sahihi humsaidia msikilizaji kutambua neno na kuelewa maana iliyokusudiwa.', 'Fikiria kama msikilizaji atasikia neno lilelile sauti ikibadilishwa.', 'Ujumbe hudhaniwa kubaki wazi hata sauti muhimu ikikosewa.', 'understand'),
      question('Mwanafunzi anatamka “gombe” badala ya “ngombe.” Afanye nini ili ajirekebishe?', ['Aanze kwa sauti ng kisha aunganishe na ombe', 'Aondoe n kabisa katika kila jaribio', 'Abadilishe neno kuwa shati', 'Atamke kwa haraka zaidi bila kusikiliza'], 'Aanze kwa sauti ng kisha aunganishe na ombe', 'Kutenga sauti ng na kisha kuiunganisha na sehemu iliyobaki husaidia kujenga tamko sahihi.', 'Gawa neno katika sauti ya mwanzo na sehemu inayofuata.', 'Kurudia kosa kwa kasi hudhaniwa kuboresha matamshi.', 'apply'),
      question('Katika kitanzandimi, msikilizaji hasikii tofauti kati ya jembe na njembo. Ni njia ipi bora ya mazoezi?', ['Tamka polepole, rekodi, sikiliza, kisha ongeza kasi', 'Paza sauti bila kubadili ulimi', 'Ondoa maneno yote yenye j na nj', 'Badilisha mpangilio kila mara bila kusikiliza'], 'Tamka polepole, rekodi, sikiliza, kisha ongeza kasi', 'Mazoezi ya polepole yenye kujisikiliza huonyesha tofauti kabla ya kujenga kasi na ufasaha.', 'Chagua utaratibu unaotoa nafasi ya kutambua na kurekebisha tofauti.', 'Kasi hudhaniwa kuwa muhimu kuliko usahihi wa sauti.', 'analyse'),
      question('Ni mpango upi unaonyesha tathmini nzuri ya matamshi ya kikundi?', ['Tumia orodha ya sauti, sikiliza kila mmoja, na toa mrejesho maalumu', 'Sema kila mtu amefaulu bila kusikiliza', 'Pima urefu wa maneno pekee', 'Chagua mshindi kwa sauti kubwa zaidi'], 'Tumia orodha ya sauti, sikiliza kila mmoja, na toa mrejesho maalumu', 'Vigezo vya sauti lengwa na mrejesho maalumu huonyesha kilichofaulu na kinachohitaji mazoezi.', 'Tafuta ushahidi wa kusikiliza, kigezo, na hatua ya kuboresha.', 'Sauti kubwa hudhaniwa kuwa sawa na matamshi sahihi.', 'analyse')
    ]
  },
  {
    key: 'kiswahili-g6-maamkuzi', subjectId: 'kiswahili', subjectName: 'Kiswahili', grade: 'Grade 6',
    strand: 'Kusikiliza na Kuzungumza', subStrand: 'Maamkuzi na Maagano',
    title: 'Salamu kwa Kila Wakati', shortTitle: 'Maamkuzi',
    objective: 'Kuchagua maamkuzi na maagano yanayofaa kwa wakati, uhusiano na mazingira na kuigiza mazungumzo ya heshima.', minutes: 9,
    sourceRef: source('kiswahili', '30735241fa33b169ae85b3d53c6a913fc9728486e6963561bfbaf6f58fa0f58d'),
    visual: { setting: 'community', elements: ['mwanafunzi akimsalimu mwalimu asubuhi', 'marafiki wakikutana sokoni', 'familia ikiagana jioni', 'mgeni akikaribishwa nyumbani'] },
    questions: [
      question('Ni maamkuzi yapi yanafaa unapokutana na mwalimu asubuhi?', ['Habari za asubuhi, mwalimu?', 'Lala salama, mwalimu.', 'Kwaheri ya kesho.', 'Hongera kwa usiku.'], 'Habari za asubuhi, mwalimu?', 'Maamkuzi hayo yanalingana na wakati wa asubuhi na yanaonyesha heshima kwa mwalimu.', 'Zingatia wakati wa siku na mtu anayesalimiwa.', 'Salamu huchaguliwa bila kuzingatia wakati.', 'recall'),
      question('Kwa nini maagano hutofautiana kulingana na mazingira?', ['Uhusiano, wakati na sababu ya kuondoka huathiri maneno yanayofaa', 'Kila mtu lazima atumie neno moja daima', 'Maagano hutumika wakati wa kula pekee', 'Maneno ya heshima hayategemei msikilizaji'], 'Uhusiano, wakati na sababu ya kuondoka huathiri maneno yanayofaa', 'Msemaji huchagua maagano yanayolingana na hali ili ujumbe uwe wazi na wa heshima.', 'Fikiria tofauti kati ya kuondoka darasani na kuagana kabla ya kulala.', 'Maneno yale yale hudhaniwa kufaa katika kila hali.', 'understand'),
      question('Unamtembelea nyanya na sasa unaondoka hadi wiki ijayo. Ni kauli ipi inayofaa?', ['Kwaheri nyanya, tutaonana wiki ijayo.', 'Lala salama, nitakuona darasani sasa.', 'Habari za asubuhi, ninaingia.', 'Pole kwa mtihani wako wa jana.'], 'Kwaheri nyanya, tutaonana wiki ijayo.', 'Kauli hiyo inaagana kwa heshima na kueleza wakati wa kukutana tena.', 'Chagua maneno yanayoonyesha kuondoka na uhusiano wa heshima.', 'Maamkuzi ya kukutana huchanganywa na maagano ya kuondoka.', 'apply'),
      question('Mwanafunzi anamwambia mgeni mkubwa “Sasa!” huku akiendelea kutazama simu. Tatizo kuu ni lipi?', ['Maneno na mwenendo havionyeshi heshima inayofaa', 'Salamu zote fupi ni makosa ya kisarufi', 'Simu hubadilisha wakati kuwa usiku', 'Mgeni hafai kusalimiwa kamwe'], 'Maneno na mwenendo havionyeshi heshima inayofaa', 'Heshima huonekana katika uchaguzi wa maneno, umakini na namna ya kumtazama msikilizaji.', 'Chunguza lugha iliyotumiwa pamoja na tabia ya mzungumzaji.', 'Neno pekee hutathminiwa bila kuangalia mwenendo na uhusiano.', 'analyse'),
      question('Ni uigizaji upi unaonyesha matumizi bora ya maamkuzi na maagano?', ['Wahusika wanazingatia wakati, uhusiano, majibu na lugha ya mwili', 'Wahusika wanatumia salamu moja katika kila tukio', 'Mhusika mmoja huzungumza bila kusikiliza majibu', 'Wote huondoka bila kuagana'], 'Wahusika wanazingatia wakati, uhusiano, majibu na lugha ya mwili', 'Mazungumzo halisi yanahitaji maneno yanayofaa, kujibizana na mwenendo wa heshima.', 'Tafuta vipengele vinavyofanya mazungumzo yawe kamili na yanayofaa hali.', 'Kukumbuka sentensi moja hudhaniwa kutosha kuonyesha umahiri.', 'analyse')
    ]
  },
  {
    key: 'kiswahili-g6-insha-masimulizi', subjectId: 'kiswahili', subjectName: 'Kiswahili', grade: 'Grade 6',
    strand: 'Kuandika', subStrand: 'Kuandika Insha za Masimulizi',
    title: 'Safari ya Hadithi', shortTitle: 'Insha Simulizi',
    objective: 'Kupanga mwanzo, matukio, kilele na mwisho wa insha ya masimulizi na kuhariri lugha ili simulizi liwe wazi na la kuvutia.', minutes: 10,
    sourceRef: source('kiswahili', '30735241fa33b169ae85b3d53c6a913fc9728486e6963561bfbaf6f58fa0f58d'),
    visual: { setting: 'community', elements: ['kadi ya mwanzo wa siku ya michezo', 'tatizo la mvua ghafla', 'wanafunzi wakitafuta suluhisho', 'sherehe ya mwisho baada ya mashindano'] },
    questions: [
      question('Sehemu ipi ya insha hutambulisha wahusika, mahali na hali ya mwanzo?', ['Mwanzo', 'Kilele', 'Mwisho', 'Sahihi ya mwandishi'], 'Mwanzo', 'Mwanzo huandaa msomaji kwa kumtambulisha kwa wahusika, mazingira na hali ya awali.', 'Tafuta sehemu inayomsaidia msomaji kuingia katika simulizi.', 'Kilele hudhaniwa kuwa lazima kiwe sentensi ya kwanza.', 'recall'),
      question('Kwa nini matukio ya insha yapangwe kwa mtiririko unaoeleweka?', ['Msomaji aweze kufuatilia sababu, matokeo na maendeleo ya simulizi', 'Kila aya iwe na maneno sawa', 'Mwisho uwe kabla ya mwanzo', 'Wahusika wasibadilike kamwe'], 'Msomaji aweze kufuatilia sababu, matokeo na maendeleo ya simulizi', 'Mtiririko huunganisha matukio na kusaidia msomaji kuelewa jinsi simulizi linavyoendelea.', 'Fikiria kinachotokea msomaji asipojua tukio lililotangulia.', 'Matukio ya kusisimua hudhaniwa kueleweka hata yakiwa bila mpangilio.', 'understand'),
      question('Baada ya sentensi “Mawingu meusi yalitanda uwanjani,” ni tukio lipi linafuata kwa mantiki?', ['Mvua ilianza na waamuzi wakasitisha mchezo.', 'Asubuhi iliyofuata ilianza wiki iliyopita.', 'Mchezaji alikula ramani ya uwanja.', 'Jua la usiku likakausha mvua kabla haijanyesha.'], 'Mvua ilianza na waamuzi wakasitisha mchezo.', 'Tukio la mvua na kusitishwa kwa mchezo linafuata dalili ya mawingu meusi kwa sababu na matokeo.', 'Chagua tukio linalokuzwa na dalili iliyotolewa.', 'Sentensi ya kushangaza huchaguliwa hata bila uhusiano wa kimantiki.', 'apply'),
      question('Insha ina matukio mazuri lakini kila aya huanza “Halafu.” Marekebisho gani yataboresha mtiririko?', ['Tumia viunganishi mbalimbali na aya kwa hatua tofauti za simulizi', 'Ondoa alama zote za uakifishaji', 'Rudia “Halafu” mara mbili zaidi', 'Changanya mwisho na mwanzo bila sababu'], 'Tumia viunganishi mbalimbali na aya kwa hatua tofauti za simulizi', 'Viunganishi na aya zilizochaguliwa kwa makusudi huonyesha muda, mabadiliko na uhusiano wa matukio.', 'Tafuta marekebisho yanayoleta utofauti na kuonyesha hatua za simulizi.', 'Kurudia kiunganishi kimoja hudhaniwa kuimarisha mtiririko.', 'analyse'),
      question('Ni hitimisho lipi linafaa zaidi kwa simulizi la timu iliyoshirikiana kuokoa miche shuleni?', ['Tulitazama miche ikisimama tena na kutambua nguvu ya kufanya kazi pamoja.', 'Miche ni mimea. Mwisho.', 'Ghafla hadithi ikaanza mara ya kwanza.', 'Hakuna aliyefanya lolote katika simulizi lote.'], 'Tulitazama miche ikisimama tena na kutambua nguvu ya kufanya kazi pamoja.', 'Hitimisho hilo linafunga tukio, linaonyesha matokeo na kuacha funzo linalotokana na simulizi.', 'Chagua mwisho unaohusiana na tukio na unaonyesha kilichobadilika.', 'Sentensi yoyote yenye neno mwisho hudhaniwa kuwa hitimisho bora.', 'analyse')
    ]
  },

  // Mathematics
  {
    key: 'math-g6-whole-numbers', subjectId: 'math', subjectName: 'Mathematics', grade: 'Grade 6',
    strand: 'Numbers', subStrand: 'Whole Numbers',
    title: 'Million-Number Control Room', shortTitle: 'Whole Numbers',
    objective: 'Read and compose whole numbers to millions, compare and round them, and use place value and square numbers in practical decisions.', minutes: 10,
    sourceRef: source('mathematics', '673e1a16d4e814e28603e9ffd18ea28abfe7dae760615c47f537ddef0e77509b'),
    visual: { setting: 'community', elements: ['county library count board', 'millions place-value chart', 'number cards in expanded form', 'rounding number line'] },
    questions: [
      question('What is the value of digit 7 in 3,742,815?', ['700,000', '70,000', '7,000', '7,000,000'], '700,000', 'The 7 is in the hundred-thousands place, so its total value is seven hundred thousand.', 'Name the place by moving left from the ones column one position at a time.', 'The digit name is confused with its value in the number.', 'recall'),
      question('Why does 4,050,090 have a zero in the hundred-thousands place?', ['The zero holds a place where there are no hundred-thousands', 'The zero removes every digit to its left', 'The number has no millions', 'Every zero means the number ends'], 'The zero holds a place where there are no hundred-thousands', 'A zero placeholder keeps the other digits in their correct place-value columns.', 'Imagine removing that zero and check whether the other digits would shift.', 'A zero inside a number is assumed to have no structural role.', 'understand'),
      question('A county recorded 895,420 tree seedlings. Rounded to the nearest hundred thousand, what is the count?', ['900,000', '800,000', '895,000', '1,000,000'], '900,000', 'The ten-thousands digit is 9, so 895,420 rounds up from eight hundred thousand to nine hundred thousand.', 'Check the digit immediately to the right of the hundred-thousands place.', 'Rounding is done at the thousands digit instead of the requested place.', 'apply'),
      question('Which ordering is correct from smallest to largest?', ['1,089,500; 1,098,050; 1,098,500; 1,809,500', '1,809,500; 1,098,500; 1,098,050; 1,089,500', '1,098,500; 1,089,500; 1,809,500; 1,098,050', '1,089,500; 1,809,500; 1,098,050; 1,098,500'], '1,089,500; 1,098,050; 1,098,500; 1,809,500', 'Comparing digits from the millions place rightward gives this increasing order.', 'Compare the leftmost unequal digit in each pair before looking farther right.', 'Numbers with the same digits are ordered by visual appearance instead of place.', 'analyse'),
      question('A square display has 64 tiles arranged in equal rows and columns. Which claim is supported?', ['It can form 8 rows of 8 because 8 squared is 64', 'It must form 6 rows of 4', 'It can form 64 rows of 64 with the same tiles', 'Its side length is 32 tiles'], 'It can form 8 rows of 8 because 8 squared is 64', 'A square array has equal side counts, and eight multiplied by eight equals sixty-four.', 'Find one number that multiplies by itself to make the total.', 'Any factor pair is assumed to describe a square array.', 'analyse')
    ]
  },
  {
    key: 'math-g6-multiplication', subjectId: 'math', subjectName: 'Mathematics', grade: 'Grade 6',
    strand: 'Numbers', subStrand: 'Multiplication',
    title: 'Market Crate Multiplier', shortTitle: 'Multiplication',
    objective: 'Multiply up to four-digit numbers by two-digit numbers, estimate products, explain partial products, and use patterns to check answers.', minutes: 10,
    sourceRef: source('mathematics', '673e1a16d4e814e28603e9ffd18ea28abfe7dae760615c47f537ddef0e77509b'),
    visual: { setting: 'market', elements: ['24 produce crates', '1,236 items per delivery list', 'partial-products board', 'rounded estimate card'] },
    questions: [
      question('What is 312 multiplied by 20?', ['6,240', '624', '3,320', '62,400'], '6,240', 'Multiplying by twenty means multiply by two and then by ten: 312 × 2 × 10 = 6,240.', 'Use the factor two tens rather than treating twenty as two.', 'The zero in 20 is ignored after multiplication.', 'recall'),
      question('Why is 2,413 × 18 equal to 2,413 × 10 plus 2,413 × 8?', ['Eighteen is decomposed into ten and eight', 'Multiplication always changes to subtraction', 'The digits 1 and 8 are separate answers', 'Every product must contain eighteen zeros'], 'Eighteen is decomposed into ten and eight', 'The distributive property breaks eighteen into place-value parts whose products can be added.', 'Rewrite the two-digit factor as a sum of tens and ones.', 'The digits of a factor are multiplied independently without place value.', 'understand'),
      question('A printer makes 1,245 worksheets for each of 16 learning centres. How many worksheets are made?', ['19,920', '17,430', '7,470', '20,820'], '19,920', 'The partial products are 1,245 × 10 = 12,450 and 1,245 × 6 = 7,470, totaling 19,920.', 'Split sixteen into ten and six, then combine the two products.', 'Only one digit of the two-digit factor is used.', 'apply'),
      question('A learner calculates 3,982 × 21 as 8,362. Which estimate most clearly reveals an error?', ['4,000 × 20 is about 80,000', '4,000 + 20 is about 4,020', '3,982 rounds to 4', '21 is close to 2'], '4,000 × 20 is about 80,000', 'An estimate near eighty thousand shows that eight thousand is far too small for the product.', 'Round both factors to friendly numbers and compare the size of the result.', 'An exact-looking written answer is trusted without checking magnitude.', 'analyse'),
      question('The pattern is 25, 50, 100, 200. Which rule and next term fit all steps?', ['Multiply by 2; next is 400', 'Add 25; next is 225', 'Multiply by 4; next is 800', 'Subtract 25; next is 175'], 'Multiply by 2; next is 400', 'Each term is twice the previous term, so two hundred doubled gives four hundred.', 'Test the same operation between every pair, not only the first pair.', 'A rule that fits one step is accepted without checking the full pattern.', 'analyse')
    ]
  },
  {
    key: 'math-g6-division', subjectId: 'math', subjectName: 'Mathematics', grade: 'Grade 6',
    strand: 'Numbers', subStrand: 'Division',
    title: 'Fair-Share Dispatch', shortTitle: 'Division',
    objective: 'Divide up to three-digit numbers in real situations, interpret remainders, verify quotients, and choose solutions that fit the context.', minutes: 10,
    sourceRef: source('mathematics', '673e1a16d4e814e28603e9ffd18ea28abfe7dae760615c47f537ddef0e77509b'),
    visual: { setting: 'garden', elements: ['864 seedlings on a dispatch card', '24 school garden teams', 'equal seedling trays', 'remainder and check board'] },
    questions: [
      question('What is 720 divided by 9?', ['80', '8', '90', '79'], '80', 'Nine groups of eighty make seven hundred twenty, so the quotient is eighty.', 'Use a multiplication fact that rebuilds seven hundred twenty from nine groups.', 'A zero in the dividend is dropped before dividing.', 'recall'),
      question('Why can multiplication check a division answer?', ['Divisor multiplied by quotient rebuilds the dividend when there is no remainder', 'Multiplication always makes the answer smaller', 'The divisor and quotient must be identical', 'Division and addition use the same sign'], 'Divisor multiplied by quotient rebuilds the dividend when there is no remainder', 'Multiplication reverses equal grouping and can reconstruct the original total.', 'Think about joining all equal groups after they have been shared.', 'A repeated operation is used instead of the inverse relationship.', 'understand'),
      question('There are 864 seedlings for 24 teams. How many seedlings should each team receive equally?', ['36', '34', '40', '46'], '36', 'Since 24 × 36 = 864, each of the twenty-four teams receives thirty-six seedlings.', 'Test how many groups of twenty-four rebuild the total.', 'The two digits of the divisor are divided separately.', 'apply'),
      question('One hundred learners travel in vans that hold 12 learners each. What is the useful interpretation of 100 ÷ 12?', ['Nine vans are needed because eight are full and four learners remain', 'Eight vans are enough because the remainder is ignored', 'Four vans are needed because the remainder is four', 'Twelve vans must each carry one learner'], 'Nine vans are needed because eight are full and four learners remain', 'Eight vans carry ninety-six learners, and another van is required for the remaining four.', 'Decide what the remainder means when every learner needs a seat.', 'The remainder is discarded even when people still need transport.', 'analyse'),
      question('A learner says 945 ÷ 27 = 35. Which check proves the claim?', ['27 × 35 = 945', '945 − 35 = 27', '35 × 35 = 945', '945 + 27 = 35'], '27 × 35 = 945', 'Multiplying the proposed quotient by the divisor exactly rebuilds the dividend.', 'Use the inverse operation with the two numbers that define the groups.', 'A subtraction involving the same numbers is assumed to verify division.', 'analyse')
    ]
  },

  // Science & Technology
  {
    key: 'science-g6-fungi', subjectId: 'science', subjectName: 'Science & Technology', grade: 'Grade 6',
    strand: 'Living Things and their Environment', subStrand: 'Fungi',
    title: 'Fungi Field Lab', shortTitle: 'Fungi',
    objective: 'Identify common fungi safely, distinguish their roles, explain decomposition, and use observations rather than unsafe handling to classify specimens.', minutes: 10,
    sourceRef: source('science-and-technology', 'ef7ed721124f14ebb739b8967b0bd4a711f837a2f44642f697dacc782f06e7c7'),
    visual: { setting: 'nature', elements: ['mushrooms growing on a fallen log', 'sealed mouldy bread sample', 'compost with decomposing leaves', 'learner observation card and handwashing point'] },
    questions: [
      question('Which organism is a fungus?', ['A mushroom', 'A bean seedling', 'A grasshopper', 'A tilapia'], 'A mushroom', 'A mushroom is the visible fruiting body produced by certain fungi.', 'Choose the organism that is neither a green plant nor an animal.', 'Every living thing growing from soil is assumed to be a plant.', 'recall'),
      question('Why are many fungi important in a compost heap?', ['They break down dead material and recycle nutrients', 'They turn every leaf into plastic', 'They stop all organisms from feeding', 'They create sunlight underground'], 'They break down dead material and recycle nutrients', 'Decomposer fungi digest dead organic matter and return nutrients to the soil system.', 'Think about what happens to dead leaves as compost matures.', 'Decomposition is treated as simple disappearance with no nutrient cycle.', 'understand'),
      question('Learners find an unknown mushroom in the school compound. What is the safest investigation step?', ['Observe and record it without tasting or touching it', 'Taste a small piece to identify it', 'Rub it on the face to test colour', 'Put it into a classmate’s lunch'], 'Observe and record it without tasting or touching it', 'Unknown fungi may be harmful, so safe observation uses sight, records, and adult guidance.', 'Choose a method that gathers evidence without direct exposure.', 'A natural specimen is assumed to be safe to handle or eat.', 'apply'),
      question('Bread kept warm and damp grows mould faster than bread kept dry and cool. What conclusion does this evidence support?', ['Warm damp conditions favour mould growth', 'Dry cool conditions create more mould', 'Bread changes into a green plant', 'Mould grows only in bright sunlight'], 'Warm damp conditions favour mould growth', 'The controlled comparison links greater mould growth with the warm, moist condition.', 'Compare the condition that changed with the amount of mould observed.', 'A coincidental feature is named without comparing the two conditions.', 'analyse'),
      question('A farmer sees both mushrooms on rotting wood and a fungal disease on tomatoes. Which claim is most accurate?', ['Fungi can be useful decomposers or harmful parasites depending on the species', 'All fungi always help crops', 'All fungi must be destroyed everywhere', 'Mushrooms and crop disease are green plants'], 'Fungi can be useful decomposers or harmful parasites depending on the species', 'Different fungi occupy different roles, so evidence and identification matter before action.', 'Use both observations rather than making one rule from only one example.', 'One harmful fungus is used to judge every fungus.', 'analyse')
    ]
  },
  {
    key: 'science-g6-circulatory-system', subjectId: 'science', subjectName: 'Science & Technology', grade: 'Grade 6',
    strand: 'Living Things and their Environment', subStrand: 'Human Circulatory System',
    title: 'Pulse Route Challenge', shortTitle: 'Circulation',
    objective: 'Identify the main circulatory parts, explain their functions, trace blood flow, and use pulse evidence to reason about exercise and heart health.', minutes: 10,
    sourceRef: source('science-and-technology', 'ef7ed721124f14ebb739b8967b0bd4a711f837a2f44642f697dacc782f06e7c7'),
    visual: { setting: 'community', elements: ['learner checking wrist pulse', 'heart pumping blood', 'lungs exchanging gases', 'arteries, capillaries and veins linking the body'] },
    questions: [
      question('Which organ pumps blood around the body?', ['The heart', 'The stomach', 'The skin', 'The bladder'], 'The heart', 'The heart contracts repeatedly to push blood through vessels around the body.', 'Choose the muscular organ whose beat can be felt as a pulse.', 'Any internal organ is assumed to move blood.', 'recall'),
      question('Why are capillaries very narrow and spread through body tissues?', ['They allow exchange close to individual cells', 'They store all blood outside the body', 'They prevent blood from reaching organs', 'They replace the lungs during breathing'], 'They allow exchange close to individual cells', 'Thin widespread capillaries bring blood close enough for gases, nutrients, and wastes to exchange.', 'Think about the distance between blood and the cells it serves.', 'Large vessels and tiny exchange vessels are treated as having identical jobs.', 'understand'),
      question('After a short run, a learner measures a faster pulse. What is the best explanation?', ['The heart pumps faster to deliver more oxygen to working muscles', 'The heart has stopped moving blood', 'The muscles no longer need energy', 'The pulse is made by food in the stomach'], 'The heart pumps faster to deliver more oxygen to working muscles', 'Exercise raises muscle demand, so circulation speeds up to deliver oxygen and remove wastes.', 'Connect working muscles with their increased need for oxygen and nutrients.', 'A faster pulse is automatically treated as evidence of disease.', 'apply'),
      question('A pulse investigation changes both exercise time and exercise type for each learner. Why is the comparison weak?', ['More than one important variable changed', 'Pulse can never be counted', 'Exercise has no effect on the body', 'Every learner must get the same pulse'], 'More than one important variable changed', 'Changing multiple factors makes it unclear which one caused a pulse difference.', 'Ask whether the test changes one factor while keeping the others comparable.', 'Any set of measurements is assumed to form a fair investigation.', 'analyse'),
      question('Which plan best supports circulatory health?', ['Regular activity, balanced food, clean air, rest, and avoiding tobacco', 'No movement and meals made only of sugar', 'Sharing unprescribed medicine during exercise', 'Breathing smoke to strengthen the lungs'], 'Regular activity, balanced food, clean air, rest, and avoiding tobacco', 'The combined habits support the heart and vessels while reducing preventable health risks.', 'Look for a balanced long-term plan rather than one unsafe shortcut.', 'One habit is treated as enough to cancel several harmful choices.', 'analyse')
    ]
  },
  {
    key: 'science-g6-matter-state', subjectId: 'science', subjectName: 'Science & Technology', grade: 'Grade 6',
    strand: 'Matter', subStrand: 'Change of Matter State',
    title: 'Matter Change Studio', shortTitle: 'Changing Matter',
    objective: 'Name melting, freezing, evaporation and condensation, relate them to heating and cooling, and analyse safe everyday changes of state.', minutes: 10,
    sourceRef: source('science-and-technology', 'ef7ed721124f14ebb739b8967b0bd4a711f837a2f44642f697dacc782f06e7c7'),
    visual: { setting: 'home', elements: ['ice melting in a metal bowl', 'water vapour above a supervised pot', 'droplets on a cool lid', 'wax cooling safely in a mould'] },
    questions: [
      question('What is the change from a solid to a liquid called?', ['Melting', 'Freezing', 'Condensation', 'Evaporation'], 'Melting', 'Melting happens when a solid gains enough thermal energy to become a liquid.', 'Think about what happens to ice when it receives heat.', 'Melting and dissolving are treated as the same process.', 'recall'),
      question('Why do water droplets form on the underside of a cool lid above warm water?', ['Water vapour cools and condenses into liquid', 'The lid creates new water from metal', 'Liquid water changes directly into rock', 'Cold air destroys all water vapour'], 'Water vapour cools and condenses into liquid', 'Cooling causes water vapour to lose energy and form visible liquid droplets.', 'Follow the invisible water vapour as it touches the cooler surface.', 'Droplets are assumed to leak through solid metal.', 'understand'),
      question('A wet school uniform must dry safely. Which condition will usually speed evaporation?', ['Hang it spread out in moving warm air', 'Fold it tightly in a sealed bag', 'Place it in a dark water bucket', 'Cover every wet surface with plastic'], 'Hang it spread out in moving warm air', 'A larger exposed area and moving warm air carry away water vapour more quickly.', 'Consider surface area, airflow, and warmth together.', 'Only strong direct heat is assumed to dry water.', 'apply'),
      question('Two equal ice cubes are placed in shade: one on metal and one on dry cloth. The metal cube melts first. What does the evidence suggest?', ['Metal transfers heat to the ice faster than cloth', 'Cloth creates colder fire', 'The metal cube started as steam', 'Ice melts only when touched'], 'Metal transfers heat to the ice faster than cloth', 'With equal cubes and location, faster melting supports better heat transfer through metal.', 'Compare the material beneath each cube while holding the other conditions steady.', 'The result is explained without identifying the changed material.', 'analyse'),
      question('Which candle-making plan best combines a change of state with safety?', ['An adult heats wax gently, learners keep distance, and wax cools in a stable mould', 'Learners hold wax over an open flame', 'Hot wax is poured into moving hands', 'A sealed container is heated until pressure rises'], 'An adult heats wax gently, learners keep distance, and wax cools in a stable mould', 'Controlled melting and cooling demonstrate state change without exposing learners to flame or hot wax.', 'Look for supervision, controlled heating, distance, and a stable cooling step.', 'Completing the product is valued more than managing heat hazards.', 'analyse')
    ]
  },

  // Social Studies
  {
    key: 'social-g6-eastern-africa-position', subjectId: 'social', subjectName: 'Social Studies', grade: 'Grade 6',
    strand: 'Natural and the Built Environments', subStrand: 'Position and Size of Countries in Eastern Africa',
    title: 'Eastern Africa Map Mission', shortTitle: 'Map Position',
    objective: 'Locate Eastern African countries, use latitude and longitude, compare position and represented size, and explain the value of regional unity.', minutes: 10,
    sourceRef: source('social-studies', '1c4b0aaf69971994d9e9668a9ae6480dc5597d2f0e1640494d6d5653c694796e'),
    visual: { setting: 'community', elements: ['Eastern Africa outline map', 'Equator and longitude grid', 'country label cards', 'Indian Ocean coastline and scale bar'] },
    questions: [
      question('Which imaginary line runs east to west through Kenya?', ['The Equator', 'The Prime Meridian', 'The International Date Line', 'The Arctic Circle'], 'The Equator', 'The Equator is zero degrees latitude and crosses Kenya from west to east.', 'Choose the zero-degree line of latitude rather than a line of longitude.', 'All major global reference lines are assumed to cross Kenya.', 'recall'),
      question('Why are latitude and longitude useful on an Eastern Africa map?', ['They provide a shared grid for locating places precisely', 'They show the population of every village', 'They make all countries the same size', 'They replace the need for a map key'], 'They provide a shared grid for locating places precisely', 'Latitude and longitude coordinates describe position using reference lines understood across maps.', 'Think about how two numbers can identify a position on a grid.', 'Coordinates are treated as labels for size rather than location.', 'understand'),
      question('A map point lies south of the Equator and beside the Indian Ocean. Which clues should a learner use first?', ['Hemisphere and coastline position', 'Flag colour and national anthem', 'Class timetable and rainfall today', 'Road surface and school uniform'], 'Hemisphere and coastline position', 'The point description gives relative latitude and a coastal reference, so those are the relevant map clues.', 'Use only the evidence supplied about direction and a physical boundary.', 'Unrelated cultural details are used instead of spatial evidence.', 'apply'),
      question('Country A covers 4 grid squares and Country B covers 12 equal grid squares on the same map. What can be concluded from the map?', ['Country B is represented as about three times the area of Country A', 'Country A must have three times the population', 'Country B is exactly twelve kilometres wide', 'Country A must lie north of Country B'], 'Country B is represented as about three times the area of Country A', 'Equal-area grid squares support an approximate three-to-one comparison of represented area, not population or position.', 'Compare the number of equal squares while limiting the claim to area.', 'Map area is used to infer population or direction without evidence.', 'analyse'),
      question('Which class project best promotes Eastern African unity while respecting national identities?', ['Teams compare shared resources and local differences using accurate maps', 'Learners rank people by country and mock the last group', 'The class erases all borders and labels without discussion', 'Only one country is allowed to contribute examples'], 'Teams compare shared resources and local differences using accurate maps', 'Collaborative comparison can reveal interdependence while respecting the distinct people and places represented.', 'Look for cooperation, evidence, and respect together.', 'Unity is confused with denying meaningful differences.', 'analyse')
    ]
  },
  {
    key: 'social-g6-physical-features', subjectId: 'social', subjectName: 'Social Studies', grade: 'Grade 6',
    strand: 'Natural and the Built Environments', subStrand: 'Main Physical Features in Eastern Africa',
    title: 'Landform Explorer', shortTitle: 'Physical Features',
    objective: 'Identify major Eastern African physical features, relate selected features to formation processes, label maps, and justify local conservation.', minutes: 10,
    sourceRef: source('social-studies', '1c4b0aaf69971994d9e9668a9ae6480dc5597d2f0e1640494d6d5653c694796e'),
    visual: { setting: 'nature', elements: ['Great Rift Valley escarpment', 'Mount Kenya highland', 'Lake Victoria shoreline', 'Indian Ocean coastal plain'] },
    questions: [
      question('Which physical feature is a large natural body of inland water?', ['A lake', 'A plateau', 'A valley', 'A mountain'], 'A lake', 'A lake is an inland depression filled with water and surrounded mainly by land.', 'Choose the feature defined by water rather than height or slope.', 'Every large visible surface feature is classified as land.', 'recall'),
      question('How did faulting help form much of the Great Rift Valley?', ['Blocks of crust moved along fractures, leaving a lowered section', 'Ocean waves piled sand into a mountain chain', 'A river painted a line across flat ground', 'People dug the entire valley by hand'], 'Blocks of crust moved along fractures, leaving a lowered section', 'Movement along faults raised and lowered crustal blocks, producing steep sides and a long valley floor.', 'Focus on movement of the Earth crust along breaks.', 'The rift is explained only by surface erosion.', 'understand'),
      question('A learner labels Mount Kenya in the Indian Ocean on a map. What correction is needed?', ['Move it to the central highland area of Kenya', 'Move it west of Lake Victoria', 'Place it on the Equator in the Atlantic Ocean', 'Remove it because it is not a physical feature'], 'Move it to the central highland area of Kenya', 'Mount Kenya is an inland highland feature in central Kenya, not an ocean feature.', 'Use the country outline and distinguish inland relief from the coastline.', 'A familiar name is placed without checking the feature type or location.', 'apply'),
      question('A steep hillside loses vegetation and muddy water enters a lake below. Which link is best supported?', ['Vegetation loss increased erosion and sediment entering the lake', 'The lake caused all hillside plants to disappear instantly', 'Muddy water proves the hill became a volcano', 'The sediment shows no connection between land and water'], 'Vegetation loss increased erosion and sediment entering the lake', 'Without plant cover, runoff carries more soil downslope and can deposit it in connected water bodies.', 'Trace material from the changed slope to the water below.', 'Land and water features are analysed as completely separate systems.', 'analyse'),
      question('Which plan best conserves a popular waterfall and supports the nearby community?', ['Protect vegetation, mark safe paths, manage waste, and involve local guides', 'Clear every tree for a larger parking area', 'Let visitors climb unstable cliffs without rules', 'Dump litter downstream after each visit'], 'Protect vegetation, mark safe paths, manage waste, and involve local guides', 'The plan protects the feature, improves visitor safety, reduces pollution, and includes local livelihoods.', 'Choose the plan that balances environmental, safety, and community needs.', 'Conservation is treated as excluding people rather than managing use responsibly.', 'analyse')
    ]
  },
  {
    key: 'social-g6-climatic-regions', subjectId: 'social', subjectName: 'Social Studies', grade: 'Grade 6',
    strand: 'Natural and the Built Environments', subStrand: 'Climatic Regions in Eastern Africa',
    title: 'Climate Clue Quest', shortTitle: 'Climate Regions',
    objective: 'Identify broad Eastern African climatic regions, interpret temperature and rainfall clues, and connect climate with livelihoods and adaptation.', minutes: 10,
    sourceRef: source('social-studies', '1c4b0aaf69971994d9e9668a9ae6480dc5597d2f0e1640494d6d5653c694796e'),
    visual: { setting: 'nature', elements: ['cool wet highland tea farm', 'hot humid coastal settlement', 'dry pastoral lowland', 'rainy Lake Victoria fishing community'] },
    questions: [
      question('Which description best matches an arid climate?', ['Very low and unreliable rainfall', 'Heavy rain in every month everywhere', 'Permanent snow at sea level', 'Exactly equal day and night temperatures'], 'Very low and unreliable rainfall', 'Arid regions receive little, often unreliable rainfall and experience frequent water shortage.', 'Look for the defining pattern of limited moisture.', 'Hot weather alone is assumed to define aridity.', 'recall'),
      question('Why are many highland areas cooler than nearby lowlands?', ['Air temperature generally decreases as altitude increases', 'Highlands are always farther from the Sun', 'Rocks on hills cannot absorb energy', 'Rainfall turns every mountain into ice'], 'Air temperature generally decreases as altitude increases', 'Higher altitude commonly brings lower air temperature even when places have similar latitude.', 'Compare elevation while keeping the wider region similar.', 'Latitude is used as the only possible cause of temperature difference.', 'understand'),
      question('A place is hot, humid, and receives seasonal ocean-influenced rainfall. Which region is the strongest match?', ['The coastal region', 'A dry inland desert', 'A very high mountain summit', 'A polar ice sheet'], 'The coastal region', 'Warm ocean air supports humidity and seasonal rainfall along much of the Eastern African coast.', 'Use the combination of heat, moisture, and nearby ocean influence.', 'One climate clue is used while ignoring the others.', 'apply'),
      question('Rainfall records show three dry years in a pastoral area. Which adaptation is most sustainable?', ['Protect water points, manage grazing, and keep drought-tolerant livestock', 'Graze every patch continuously until bare', 'Block all shared migration routes without discussion', 'Depend on one shallow pond with no maintenance'], 'Protect water points, manage grazing, and keep drought-tolerant livestock', 'The combined plan reduces pressure on pasture and water while fitting recurrent dry conditions.', 'Look for a response that protects resources across more than one season.', 'A short-term use of all available resources is mistaken for resilience.', 'analyse'),
      question('Two towns share latitude, but Town H is high and wet while Town L is low and dry. What is the best conclusion?', ['Altitude and relief can modify climate within the same latitude', 'Latitude never affects climate anywhere', 'Both towns must have identical farming', 'The rainfall records must be false'], 'Altitude and relief can modify climate within the same latitude', 'Elevation and terrain influence temperature and rainfall, so latitude alone cannot explain local climate.', 'Identify the geographic factor that differs between the towns.', 'One climate control is treated as sufficient to predict every place.', 'analyse')
    ]
  },

  // Religious Education — provisional pluralistic coverage from the stored Grade 6 QuizBank.
  {
    key: 'religion-g6-honesty-integrity', subjectId: 'religious_education', subjectName: 'Religious Education', grade: 'Grade 6',
    strand: 'Moral Values and Character Formation', subStrand: 'Honesty and Integrity',
    title: 'The Integrity Compass', shortTitle: 'Honesty',
    objective: 'Recognize honest choices, explain how truth builds trust, and resolve school and community dilemmas with integrity and accountability.', minutes: 9,
    sourceRef: RELIGION_SOURCE,
    visual: { setting: 'classroom', elements: ['lost pencil beside a desk', 'learner returning it to the owner', 'group project record sheet', 'trusted adult listening'] },
    questions: [
      question('Which action shows honesty?', ['Returning a lost pencil to its owner', 'Hiding a classmate’s book', 'Claiming work copied from a friend', 'Changing a score secretly'], 'Returning a lost pencil to its owner', 'Returning property to the person who owns it is a clear honest action.', 'Choose the action that respects both truth and another person’s property.', 'Honesty is reduced to spoken words and not connected to actions.', 'recall'),
      question('Why does telling the truth after a mistake help rebuild trust?', ['It allows people to understand the problem and repair it', 'It makes the mistake disappear without action', 'It guarantees nobody feels disappointed', 'It transfers responsibility to someone else'], 'It allows people to understand the problem and repair it', 'Truthful accountability gives others reliable information and opens a path to correcting harm.', 'Think about what people need to know before a problem can be fixed.', 'Admitting a mistake is assumed to remove the need to make amends.', 'understand'),
      question('A shopkeeper gives a learner too much change. What should the learner do?', ['Return the extra money and explain the error', 'Keep it because the shopkeeper did not notice', 'Share it quickly so it cannot be returned', 'Blame the next customer'], 'Return the extra money and explain the error', 'Returning the extra change respects ownership and corrects the transaction fairly.', 'Check who rightfully owns the extra amount.', 'An unnoticed error is assumed to create permission to keep property.', 'apply'),
      question('A group report lists Kamau as doing all the work, but every member contributed. What correction is fairest?', ['Record each member’s actual contribution', 'Keep the false record to save time', 'Remove every name from the report', 'Give credit only to the group leader'], 'Record each member’s actual contribution', 'An accurate record demonstrates integrity and recognizes each learner’s real effort.', 'Compare the written claim with the evidence of who did the work.', 'Giving one person credit is mistaken for efficient leadership.', 'analyse'),
      question('A message online makes a serious claim about a classmate but provides no evidence. Which response shows integrity?', ['Do not forward it; check facts and tell a trusted adult if harm is possible', 'Forward it before anyone else', 'Add a more dramatic detail', 'Treat popularity as proof'], 'Do not forward it; check facts and tell a trusted adult if harm is possible', 'Integrity requires resisting unsupported claims, preventing harm, and seeking responsible help.', 'Separate evidence from gossip and consider the effect of sharing.', 'Speed and popularity are treated as substitutes for truth.', 'analyse')
    ]
  },
  {
    key: 'religion-g6-family-respect', subjectId: 'religious_education', subjectName: 'Religious Education', grade: 'Grade 6',
    strand: 'Family and Community Life', subStrand: 'Respect in the Family',
    title: 'Respect Starts at Home', shortTitle: 'Family Respect',
    objective: 'Identify respectful family behaviour, listen across differences, share responsibilities fairly, and choose peaceful responses to household conflict.', minutes: 10,
    sourceRef: RELIGION_SOURCE,
    visual: { setting: 'home', elements: ['family planning household tasks', 'older and younger members taking turns', 'learner listening before responding', 'shared table after a peaceful agreement'] },
    questions: [
      question('Which action shows respect during a family conversation?', ['Listening without interrupting', 'Mocking the speaker', 'Walking away while someone asks for help', 'Shouting over every answer'], 'Listening without interrupting', 'Attentive listening gives the speaker dignity and helps everyone understand the message.', 'Choose the action that creates space for another person to be heard.', 'Respect is confused with silent agreement rather than attentive conduct.', 'recall'),
      question('Why can respectful disagreement strengthen a family?', ['People can share different views while protecting their relationship', 'One person always wins every decision', 'All differences are hidden forever', 'No one needs to listen after disagreeing'], 'People can share different views while protecting their relationship', 'Respectful words and listening allow a family to solve problems without attacking personal dignity.', 'Separate disagreement about an idea from disrespect toward a person.', 'Respect is assumed to require identical opinions.', 'understand'),
      question('Two siblings both need a shared study lamp. What is the most respectful plan?', ['Agree on fair study times and adjust for urgent work', 'Let the older child keep it every day', 'Hide the lamp from both learners', 'Break the lamp to end the disagreement'], 'Agree on fair study times and adjust for urgent work', 'A discussed schedule recognizes both needs and uses the limited resource fairly.', 'Look for a solution that includes both voices and the real need.', 'Authority or force is mistaken for fair family problem-solving.', 'apply'),
      question('A learner completes chores but insults younger siblings while doing them. What does this show?', ['Responsibility without respectful treatment is incomplete', 'Chores make insulting words acceptable', 'Only the finished task matters', 'Younger family members do not deserve respect'], 'Responsibility without respectful treatment is incomplete', 'Respect includes both useful action and the way people are treated during that action.', 'Evaluate the task and the relationships affected by the behaviour.', 'Completing a duty is assumed to excuse harmful conduct.', 'analyse'),
      question('Which response best handles a repeated household disagreement?', ['Pause, let each person explain, agree on a workable step, and review it later', 'Repeat the loudest demand until others stop speaking', 'Bring unrelated past mistakes into the argument', 'Refuse every possible compromise'], 'Pause, let each person explain, agree on a workable step, and review it later', 'The process lowers tension, gathers perspectives, produces an action, and allows later improvement.', 'Choose the response with listening, decision, and follow-up.', 'A quick forced ending is treated as lasting peace.', 'analyse')
    ]
  },
  {
    key: 'religion-g6-worship-diversity', subjectId: 'religious_education', subjectName: 'Religious Education', grade: 'Grade 6',
    strand: 'Places and Forms of Worship', subStrand: 'Respectful Worship Across Traditions',
    title: 'Respectful Places Explorer', shortTitle: 'Worship & Respect',
    objective: 'Recognize places of worship represented in the stored course, observe shared respect principles, and behave safely during diverse community visits.', minutes: 10,
    sourceRef: RELIGION_SOURCE,
    visual: { setting: 'community', elements: ['church on a community map', 'mosque on a community map', 'Hindu temple on a community map', 'learners following a host’s visitor guidance'] },
    questions: [
      question('Which place is commonly used for Muslim worship?', ['A mosque', 'A church', 'A Hindu temple', 'A county stadium'], 'A mosque', 'A mosque is a place where Muslims gather for prayer and religious community life.', 'Match the place name with the faith community that uses it.', 'All places of worship are assumed to have the same name.', 'recall'),
      question('Why should visitors follow local guidance in a place of worship?', ['Practices about dress, movement, and sacred spaces may differ', 'Visitors must copy every belief they observe', 'Questions are forbidden in every tradition', 'All buildings use one universal visitor rule'], 'Practices about dress, movement, and sacred spaces may differ', 'Following host guidance respects the community while allowing a visitor to learn without disruption.', 'Think about how respectful behaviour can adapt without judging beliefs.', 'Respect is confused with pretending every tradition follows identical practices.', 'understand'),
      question('A class enters a place of worship while a ceremony is taking place. What should learners do?', ['Stay quiet and follow the host teacher’s directions', 'Photograph people without permission', 'Touch sacred objects to test them', 'Compare the ceremony loudly with a sports match'], 'Stay quiet and follow the host teacher’s directions', 'Quiet attention and trusted guidance protect worshippers from interruption and keep the visit safe.', 'Choose conduct that preserves the purpose of the gathering.', 'Curiosity is assumed to permit interruption or touching.', 'apply'),
      question('A display labels one tradition “normal” and the others “strange.” What is the central problem?', ['The labels rank communities instead of describing them respectfully', 'The display contains too many colours', 'Every tradition must use the same building shape', 'Learners should never study community diversity'], 'The labels rank communities instead of describing them respectfully', 'Neutral accurate language supports learning, while ranking labels create unfair bias and disrespect.', 'Check whether the words describe evidence or judge people’s dignity.', 'A familiar viewpoint is treated as a neutral standard for everyone.', 'analyse'),
      question('Which project best compares places of worship respectfully?', ['Use approved images, neutral facts, community consent, and shared visitor principles', 'Copy private ceremonies without permission', 'Rank faiths by building size', 'Invent beliefs to make the poster exciting'], 'Use approved images, neutral facts, community consent, and shared visitor principles', 'Consent, accurate neutral description, and common respect principles make the comparison safe and educational.', 'Look for accuracy, permission, and equal dignity in the same plan.', 'A colourful product is valued more than consent and factual care.', 'analyse')
    ]
  }
];

export const grade6LessonSeeds = [
  ...defineCurriculumChapters(chapters).map(lesson => {
  if (lesson.key !== 'math-g6-whole-numbers') return lesson;

  const [opening, second, third, ordering, fifth] = lesson.steps;
  return {
    ...lesson,
    steps: [
      {
        ...opening,
        options: [],
        interaction: undefined,
        componentScene: GRADE_6_WHOLE_NUMBERS_SCENE,
        answer: '700,000'
      },
      second,
      third,
      {
        ...ordering,
        options: [],
        interaction: undefined,
        componentScene: GRADE_6_WHOLE_NUMBERS_RANK_SCENE,
        answer: 'sequence:number-7420>number-18305>number-51090>number-99999'
      },
      fifth
    ]
  };
  }),
  ...humanCellLessonSeeds,
];

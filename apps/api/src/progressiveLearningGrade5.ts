import {
  defineCurriculumChapters,
  type CurriculumChapterSource
} from './progressiveLearningCurriculum.js';

type Question = CurriculumChapterSource['questions'][number];

const KICD_BOOK_COMMIT = '6137466e47741d72cba1d5feebb02995605e8cc5';
const QUIZ_BANK_COMMIT = 'ea1342bad94104c45a1ab9f8dfdbf8f38e92a2ed';

const source = (slug: string) =>
  `git:${KICD_BOOK_COMMIT}:apps/api/data/books/KEN/CBC/G5/${slug}/book-plan.json`;

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
    key: 'agriculture-g5-soil-conservation',
    subjectId: 'agriculture',
    subjectName: 'Agriculture & Nutrition',
    grade: 'Grade 5',
    strand: 'Conservation of Resources',
    subStrand: 'Soil Conservation',
    title: 'Feed the Soil, Grow the Garden',
    shortTitle: 'Soil Savers',
    objective: 'Choose safe organic materials, plan an organic-waste pit, and explain how decomposed plant remains improve garden soil.',
    minutes: 10,
    sourceRef: source('agriculture'),
    visual: {
      setting: 'garden',
      elements: ['school compost pit', 'dry leaves and vegetable peelings', 'healthy sukuma wiki bed', 'gloves and handwashing point']
    },
    questions: [
      question(
        'Which material is suitable for an organic-waste pit that will improve soil?',
        ['Dry bean leaves', 'Broken glass', 'Used batteries', 'Plastic wrappers'],
        'Dry bean leaves',
        'Plant remains break down into organic matter that can improve soil structure and fertility.',
        'Look for a material that came from a plant and can rot safely.',
        'A learner may think every kind of household waste belongs in a compost pit.',
        'recall'
      ),
      question(
        'Why should plastic and glass be removed before plant remains are put into a compost pit?',
        ['They do not decompose and may cause harm', 'They make the pit too fertile', 'They turn into clean water', 'They make leaves decompose instantly'],
        'They do not decompose and may cause harm',
        'Plastic does not rot into compost, and broken glass can injure people working near the pit.',
        'Think about what can rot and what could cut someone handling the waste.',
        'A learner may assume mixing more kinds of waste always makes better compost.',
        'understand'
      ),
      question(
        'A school has a shaded corner away from the kitchen door and a low place that floods after rain. Where should learners place a compost pit?',
        ['In the shaded, well-drained corner', 'In the flooded low place', 'Across the classroom doorway', 'Inside the drinking-water store'],
        'In the shaded, well-drained corner',
        'A safe compost site should drain well and stay away from busy paths, food areas, and water sources.',
        'Check drainage, safety, and distance from places where food or water is handled.',
        'A learner may choose the wettest place because compost needs some moisture.',
        'apply'
      ),
      question(
        'Two garden beds receive equal water. Bed A has mixed compost and crumbly soil; Bed B has hard, pale soil. Which evidence best shows compost helped Bed A?',
        ['Its soil holds some moisture and plants grow evenly', 'Its soil contains more plastic pieces', 'Water stands on it for several days', 'Its seedlings become yellow and weak'],
        'Its soil holds some moisture and plants grow evenly',
        'Crumbly soil, useful moisture retention, and healthy growth are evidence that organic matter improved the bed.',
        'Use observations about both the soil and the plants, not colour alone.',
        'A learner may treat waterlogging as proof that soil holds water well.',
        'analyse'
      ),
      question(
        'Which plan is safest and most useful for improving a school garden with plant remains?',
        ['Sort the waste, layer plant matter, keep it moist, and wash hands after handling it', 'Burn all plant remains beside seedlings', 'Bury batteries together with leaves', 'Pile mixed rubbish beside the water tank'],
        'Sort the waste, layer plant matter, keep it moist, and wash hands after handling it',
        'Sorting, layering, controlled moisture, and hygiene form a safe process for making useful organic matter.',
        'Test the plan for safe materials, helpful decomposition, and clean handling.',
        'A learner may focus only on making waste disappear instead of improving soil safely.',
        'analyse'
      )
    ]
  },
  {
    key: 'agriculture-g5-water-conservation',
    subjectId: 'agriculture',
    subjectName: 'Agriculture & Nutrition',
    grade: 'Grade 5',
    strand: 'Conservation of Resources',
    subStrand: 'Water Conservation',
    title: 'Make Every Drop Count',
    shortTitle: 'Water Wise',
    objective: 'Compare practical water-saving methods and choose responsible ways to keep a household or school garden productive.',
    minutes: 9,
    sourceRef: source('agriculture'),
    visual: {
      setting: 'garden',
      elements: ['mulched vegetable bed', 'uncovered dry soil', 'watering can aimed at roots', 'covered rainwater container']
    },
    questions: [
      question(
        'Which practice helps soil keep water for longer?',
        ['Covering the soil with dry grass mulch', 'Removing all ground cover', 'Watering the footpath at midday', 'Leaving a tap running'],
        'Covering the soil with dry grass mulch',
        'Mulch shades the soil and slows evaporation, so more water remains available to plant roots.',
        'Look for the choice that covers the soil and reduces direct heat.',
        'A learner may think bare soil absorbs and stores the most water.',
        'recall'
      ),
      question(
        'Why is early-morning watering usually better than watering at noon?',
        ['Less water is lost quickly through evaporation', 'Plants cannot absorb water in daylight', 'Morning water contains extra nutrients', 'Noon water always burns plant roots'],
        'Less water is lost quickly through evaporation',
        'Cooler morning conditions reduce rapid evaporation and give water time to soak towards roots.',
        'Compare how quickly water disappears in cool and hot conditions.',
        'A learner may believe the time changes the nutrients inside the water.',
        'understand'
      ),
      question(
        'A family has one jerrican for its kitchen garden. Which action uses it most efficiently?',
        ['Water near each plant root and add mulch', 'Pour it over the whole compound', 'Spray the leaves during the hottest hour', 'Leave the container open until evening'],
        'Water near each plant root and add mulch',
        'Targeting roots reduces wasted water, while mulch slows evaporation from the damp soil.',
        'Choose the action that puts water where plants take it up and keeps it there.',
        'A learner may think wetting the largest area gives plants the most water.',
        'apply'
      ),
      question(
        'Equal beds are watered with one litre each. The mulched bed stays damp for two days; the bare bed dries in one day. What does the comparison show?',
        ['Mulch reduced water loss from the soil', 'Mulch doubled the amount of water added', 'Bare soil created more rainfall', 'Both beds conserved water equally'],
        'Mulch reduced water loss from the soil',
        'Because both beds received equal water, the longer damp period is evidence that mulch reduced water loss.',
        'Keep the amount of water constant and compare the time each bed stays damp.',
        'A learner may overlook the equal starting amounts and claim one bed received more water.',
        'analyse'
      ),
      question(
        'Which school plan combines the strongest water-conservation choices?',
        ['Repair leaks, collect rain safely, mulch beds, and water roots in cool hours', 'Water paths daily and leave tanks uncovered', 'Remove shade and water only at noon', 'Let taps drip so birds can drink'],
        'Repair leaks, collect rain safely, mulch beds, and water roots in cool hours',
        'The plan prevents avoidable loss, stores water safely, and uses each watering session efficiently.',
        'Look for a plan that conserves water during collection, storage, and garden use.',
        'A learner may select one helpful action while ignoring waste elsewhere in the plan.',
        'analyse'
      )
    ]
  },
  {
    key: 'agriculture-g5-wildlife-conservation',
    subjectId: 'agriculture',
    subjectName: 'Agriculture & Nutrition',
    grade: 'Grade 5',
    strand: 'Conservation of Resources',
    subStrand: 'Conserving Wild Animals',
    title: 'Protect Crops, Respect Wildlife',
    shortTitle: 'Wild Neighbours',
    objective: 'Evaluate humane ways of reducing crop damage while protecting people, property, and wild animals living near farms.',
    minutes: 9,
    sourceRef: source('agriculture'),
    visual: {
      setting: 'garden',
      elements: ['maize plot at the shamba edge', 'bright tape and net barrier', 'bird perched beyond the crop', 'adult-guided safe observation point']
    },
    questions: [
      question(
        'Which method can repel birds from seedlings without injuring them?',
        ['Moving reflective ribbons above the bed', 'Putting poison in the soil', 'Setting sharp traps among seedlings', 'Throwing stones at every bird'],
        'Moving reflective ribbons above the bed',
        'Moving reflective material can discourage birds while avoiding injury to wildlife and learners.',
        'Choose a method that changes what animals see or hear without causing harm.',
        'A learner may think crop protection must injure the animal causing damage.',
        'recall'
      ),
      question(
        'Why is securing rubbish and harvested food useful near a wildlife area?',
        ['It removes smells and easy food that attract animals', 'It teaches animals to open containers', 'It makes crops ripen immediately', 'It replaces every other farm barrier'],
        'It removes smells and easy food that attract animals',
        'Secure storage reduces food rewards that may repeatedly draw wild animals close to homes or gardens.',
        'Think about what makes an animal return to the same place for food.',
        'A learner may believe animals visit farms only because they are aggressive.',
        'understand'
      ),
      question(
        'Monkeys enter a garden through one overhanging branch. What is the safest learner action?',
        ['Tell an adult and strengthen the barrier at that entry point', 'Climb after the monkeys alone', 'Chase them onto a busy road', 'Leave ripe food beside the classroom'],
        'Tell an adult and strengthen the barrier at that entry point',
        'Adult-guided prevention at the entry point reduces crop access without dangerous contact or harm.',
        'Avoid direct contact and solve the access problem with responsible adult help.',
        'A learner may try to prove bravery by approaching a wild animal.',
        'apply'
      ),
      question(
        'A net stops birds but also traps them. A second net is clearly visible, tight, and checked daily. Which design better supports conservation?',
        ['The visible, tight, regularly checked net', 'The loose net that traps birds', 'Both designs because crops matter more', 'Neither design because gardens cannot be protected'],
        'The visible, tight, regularly checked net',
        'A visible, maintained barrier can protect crops while reducing the risk of wildlife becoming entangled.',
        'Compare both crop protection and the chance that an animal will be harmed.',
        'A learner may judge a barrier only by whether it stops an animal.',
        'analyse'
      ),
      question(
        'Which plan best helps a school live safely with wild animals near its garden?',
        ['Map entry points, remove attractants, use humane barriers, and report risky animals to adults', 'Feed animals beside the garden every day', 'Use hidden snares and never inspect them', 'Send learners to chase animals at night'],
        'Map entry points, remove attractants, use humane barriers, and report risky animals to adults',
        'The plan combines prevention, safe monitoring, humane protection, and responsible adult response.',
        'A strong plan prevents attraction, blocks entry safely, and avoids learner contact.',
        'A learner may choose a quick reaction instead of a safe prevention plan.',
        'analyse'
      )
    ]
  },
  // Creative Arts
  {
    key: 'creative-g5-wind-instruments',
    subjectId: 'creative_arts',
    subjectName: 'Creative Arts',
    grade: 'Grade 5',
    strand: 'Creating and Executing',
    subStrand: 'Wind Musical Instruments',
    title: 'Draw How a Wind Instrument Sings',
    shortTitle: 'Air to Music',
    objective: 'Identify parts of a simple Kenyan wind instrument and connect careful drawing, airflow, tuning, construction, and care.',
    minutes: 10,
    sourceRef: source('creative-arts'),
    visual: {
      setting: 'studio',
      elements: ['locally made flute', 'mouthpiece and air path', 'finger holes', 'labelled learner drawing']
    },
    questions: [
      question(
        'Which part does a player blow across or into to begin making sound?',
        ['Mouthpiece or blowing edge', 'Carrying strap', 'Decoration band', 'Storage bag'],
        'Mouthpiece or blowing edge',
        'Air entering at the mouthpiece or blowing edge begins the vibration that produces sound.',
        'Find the part where the player first directs moving air.',
        'A learner may choose the most colourful part instead of the sound-making part.',
        'recall'
      ),
      question(
        'How do finger holes help many simple flutes change pitch?',
        ['Covering holes changes the vibrating air-column length', 'They make the instrument heavier', 'They store extra breath for later', 'They stop all air from entering'],
        'Covering holes changes the vibrating air-column length',
        'Opening and closing holes changes the effective air-column length, producing different pitches.',
        'Think about what changes inside the tube when a hole is covered.',
        'A learner may think pitch changes only because the player blows harder.',
        'understand'
      ),
      question(
        'A drawing should help a group make the same simple wind instrument. What should it include?',
        ['A clear outline, labelled parts, and hole positions', 'Only a bright background pattern', 'The player’s name without the instrument', 'A title with no measurements or labels'],
        'A clear outline, labelled parts, and hole positions',
        'A useful construction drawing communicates shape, important parts, and where features should be placed.',
        'Choose details another learner could follow during safe construction.',
        'A learner may treat a design drawing as decoration rather than a practical guide.',
        'apply'
      ),
      question(
        'Instrument A has uneven holes and leaks air; Instrument B has smooth, evenly planned holes and a sealed tube. Which is more likely to give controlled notes?',
        ['Instrument B', 'Instrument A', 'Both must sound identical', 'Neither can ever make sound'],
        'Instrument B',
        'Evenly planned holes and a sound tube make airflow and pitch changes easier to control.',
        'Compare features that guide air consistently and allow holes to seal properly.',
        'A learner may think rough construction cannot affect the sound.',
        'analyse'
      ),
      question(
        'Which routine best cares for a shared wind instrument after supervised practice?',
        ['Clean it as instructed, let it dry, and store it safely', 'Share it without cleaning between players', 'Leave it outdoors in rain', 'Push sharp objects through every hole'],
        'Clean it as instructed, let it dry, and store it safely',
        'Hygienic cleaning, drying, and safe storage protect both the instrument and the people who use it.',
        'Check the routine for hygiene, moisture control, and protection from damage.',
        'A learner may focus on storage while forgetting safe cleaning and drying.',
        'analyse'
      )
    ]
  },
  {
    key: 'creative-g5-football',
    subjectId: 'creative_arts',
    subjectName: 'Creative Arts',
    grade: 'Grade 5',
    strand: 'Creating and Executing',
    subStrand: 'Football',
    title: 'Make the Pitch, Master the Ball',
    shortTitle: 'Football Flow',
    objective: 'Apply safe kicking, stopping, and dribbling skills while creating useful papier-mâché marking cones for enjoyable play.',
    minutes: 10,
    sourceRef: source('creative-arts'),
    visual: {
      setting: 'community',
      elements: ['school football pitch', 'papier-mâché cones', 'ball close to a learner’s feet', 'team safety boundary']
    },
    questions: [
      question(
        'Which football skill brings a moving ball under control?',
        ['Stopping or trapping', 'Heading away from the ball', 'Standing outside the pitch', 'Drawing a scoreboard'],
        'Stopping or trapping',
        'Stopping or trapping cushions the moving ball so the player can control the next action.',
        'Look for the skill that reduces the ball’s movement near the player.',
        'A learner may confuse controlling the ball with immediately kicking it farther away.',
        'recall'
      ),
      question(
        'Why should a player use small touches while dribbling through close cones?',
        ['Small touches keep the ball close enough to steer', 'Small touches make the pitch shorter', 'They remove the need to look ahead', 'They allow the player to hold the ball'],
        'Small touches keep the ball close enough to steer',
        'Gentle, frequent touches keep the ball within reach and make direction changes easier.',
        'Think about how far the ball should travel before the next touch.',
        'A learner may believe the strongest kick always shows the best dribbling.',
        'understand'
      ),
      question(
        'Amina is making a hollow papier-mâché cone. Which safe sequence should she follow?',
        ['Layer pasted paper on a mould, dry it, remove it, then paint it', 'Paint wet paper, kick it, then add paste', 'Wrap wire around her hand and run', 'Soak the finished cone and use it immediately'],
        'Layer pasted paper on a mould, dry it, remove it, then paint it',
        'Layering on a mould, thorough drying, careful removal, and finishing produce a usable lightweight cone.',
        'Order the steps so the cone gains shape and dries before it is decorated.',
        'A learner may decorate before the papier-mâché structure has formed and dried.',
        'apply'
      ),
      question(
        'On a narrow practice lane, Otieno kicks the ball far ahead each time. What change will improve his control most?',
        ['Use softer touches with both feet and look up between touches', 'Kick even harder at every cone', 'Close his eyes while turning', 'Pick up the ball whenever it rolls away'],
        'Use softer touches with both feet and look up between touches',
        'Softer touches keep the ball close, while looking up helps the player notice cones, space, and teammates.',
        'Identify why the ball escapes and how the player can still observe the space ahead.',
        'A learner may solve poor control by moving faster instead of changing touch strength.',
        'analyse'
      ),
      question(
        'Which activity plan combines creativity, football learning, and safety?',
        ['Make visible cones, inspect the field, warm up, then practise in spaced lanes', 'Use sharp metal markers and skip the warm-up', 'Play among desks with a heavy ball', 'Make wet cones and place them on a road'],
        'Make visible cones, inspect the field, warm up, then practise in spaced lanes',
        'Visible learner-made equipment, a checked field, warm-up, and safe spacing support both art-making and movement.',
        'Test the whole plan for safe materials, safe space, and purposeful skill practice.',
        'A learner may choose a creative plan without checking whether play can happen safely.',
        'analyse'
      )
    ]
  },
  {
    key: 'creative-g5-rhythm',
    subjectId: 'creative_arts',
    subjectName: 'Creative Arts',
    grade: 'Grade 5',
    strand: 'Creating and Executing',
    subStrand: 'Rhythm',
    title: 'Catch, Build, and Perform the Beat',
    shortTitle: 'Rhythm Makers',
    objective: 'Interpret and create rhythmic patterns through clapping, movement, and safe percussion while keeping a steady shared pulse.',
    minutes: 9,
    sourceRef: source('creative-arts'),
    visual: {
      setting: 'studio',
      elements: ['four-beat timeline', 'clap and step symbols', 'Kenyan hand drum', 'group pulse marker']
    },
    questions: [
      question(
        'What is the steady underlying pulse in music commonly called?',
        ['Beat', 'Costume', 'Stage', 'Colour'],
        'Beat',
        'The beat is the regular pulse that helps performers keep their timing together.',
        'Think of the pulse you can tap evenly while a song continues.',
        'A learner may call every sound in a pattern the steady beat.',
        'recall'
      ),
      question(
        'How can a pattern contain different rhythms while the group keeps one beat?',
        ['Sounds can vary in length while everyone follows the same pulse', 'Every sound must be equally loud', 'The pulse stops whenever someone claps twice', 'Each performer must use a different speed'],
        'Sounds can vary in length while everyone follows the same pulse',
        'Rhythm arranges long, short, sounded, and silent moments over a steady underlying pulse.',
        'Separate the regular counting pulse from the sound pattern placed on it.',
        'A learner may think beat and rhythm mean exactly the same pattern.',
        'understand'
      ),
      question(
        'A four-beat pattern is clap, clap, rest, stomp. What should happen on beat three?',
        ['Keep silent while feeling the pulse', 'Add two quick claps', 'Stop counting completely', 'Begin the pattern at beat one again'],
        'Keep silent while feeling the pulse',
        'A rest is silent, but the performer continues feeling and counting the beat before the stomp.',
        'Follow all four pulse positions, including the one without a sound.',
        'A learner may skip the rest and make beat four happen too early.',
        'apply'
      ),
      question(
        'One group speeds up after every loud drum sound. Which adjustment will best steady the performance?',
        ['Keep a quiet count and rehearse with an even pulse', 'Make every drum sound louder', 'Remove all rests from the pattern', 'Let each performer choose a tempo'],
        'Keep a quiet count and rehearse with an even pulse',
        'An internal or softly counted pulse prevents accents and loud sounds from changing the tempo.',
        'Find a timing reference that stays unchanged when the volume changes.',
        'A learner may confuse a louder accent with a faster beat.',
        'analyse'
      ),
      question(
        'Which rhythm plan best suggests rain changing from drops to a downpour?',
        ['Begin with spaced finger taps, add quicker claps, then layer a steady drum', 'Use one unchanging silence throughout', 'Start and stop at random without a pulse', 'Repeat one loud clap with no change'],
        'Begin with spaced finger taps, add quicker claps, then layer a steady drum',
        'The changing density and layered sounds create a clear rhythmic journey while the steady drum holds the pulse.',
        'Match the sound texture to the changing rain while preserving organised timing.',
        'A learner may choose random noise because rain can sound irregular.',
        'analyse'
      )
    ]
  },
  // English
  {
    key: 'english-g5-listening-speaking',
    subjectId: 'english',
    subjectName: 'English',
    grade: 'Grade 5',
    strand: 'Listening and Speaking',
    subStrand: 'Listening and Speaking',
    title: 'Hear the Sound, Shape the Sentence',
    shortTitle: 'Sound Spotter',
    objective: 'Recognise the /ʌ/ sound in familiar words and use theme vocabulary clearly in meaningful spoken sentences.',
    minutes: 9,
    sourceRef: source('english'),
    visual: {
      setting: 'classroom',
      elements: ['sun picture card', 'school bus card', 'cup on a desk', 'word-and-sound speech bubbles']
    },
    questions: [
      question(
        'Which word contains the /ʌ/ sound heard in sun?',
        ['Cup', 'Seat', 'Moon', 'Rain'],
        'Cup',
        'Cup and sun share the short /ʌ/ vowel sound, even though they use different surrounding consonants.',
        'Say each word slowly and compare its middle sound with the middle of sun.',
        'A learner may match words by their first letter instead of their vowel sound.',
        'recall'
      ),
      question(
        'Why do bus and book not have the same middle sound?',
        ['The letter u in bus and the oo in book represent different sounds', 'Words of different lengths cannot rhyme', 'Every double letter is silent', 'The first consonants decide the vowel sound'],
        'The letter u in bus and the oo in book represent different sounds',
        'Bus uses /ʌ/, while book has a different vowel sound; spelling patterns do not guarantee the same sound.',
        'Listen to the middle of each word rather than counting its letters.',
        'A learner may assume similar-looking letters always produce the same sound.',
        'understand'
      ),
      question(
        'Which sentence uses the theme words clearly and naturally?',
        ['The pupils rushed to the bus under the hot sun.', 'The sun bus under pupils rushed.', 'Hot the to rushed under.', 'Pupils bus sun because under.'],
        'The pupils rushed to the bus under the hot sun.',
        'The sentence places the vocabulary in a complete, meaningful order that a listener can follow.',
        'Look for a sentence with a clear subject, action, and complete idea.',
        'A learner may treat a group of theme words as a sentence even when the order has no meaning.',
        'apply'
      ),
      question(
        'A speaker says, “The cub sat in the cart,” but wants three /ʌ/ words. Which revision works?',
        ['The cub sat in the sun with a cup.', 'The cat slept near the moon.', 'The hen sat on the seat.', 'The goat ran in the rain.'],
        'The cub sat in the sun with a cup.',
        'Cub, sun, and cup all contain /ʌ/, so the revision meets the sound goal and remains meaningful.',
        'Count words with the target middle sound, then check that the sentence makes sense.',
        'A learner may count every short word as an example of /ʌ/.',
        'analyse'
      ),
      question(
        'Which practice plan best improves both pronunciation and clear speaking?',
        ['Listen to a model, repeat target words, use them in a sentence, then self-check', 'Copy spellings without saying any word', 'Speak as fast as possible once', 'Memorise one word and avoid sentences'],
        'Listen to a model, repeat target words, use them in a sentence, then self-check',
        'Listening, focused repetition, meaningful use, and reflection connect accurate sounds with effective communication.',
        'Choose a plan that includes hearing, practising, using, and checking language.',
        'A learner may repeat isolated words accurately but never transfer them into communication.',
        'analyse'
      )
    ]
  },
  {
    key: 'english-g5-demonstratives',
    subjectId: 'english',
    subjectName: 'English',
    grade: 'Grade 5',
    strand: 'Grammar in Use',
    subStrand: 'Identifying Objects That Are Near or Far',
    title: 'This, That, These, Those',
    shortTitle: 'Near or Far',
    objective: 'Select and use demonstrative determiners accurately by combining distance with whether a noun is singular or plural.',
    minutes: 9,
    sourceRef: source('english'),
    visual: {
      setting: 'market',
      elements: ['one mango held nearby', 'several bananas on a near tray', 'one basket across the stall', 'several pumpkins at the far wall']
    },
    questions: [
      question(
        'Which demonstrative points to one object that is near the speaker?',
        ['This', 'These', 'That', 'Those'],
        'This',
        'This is used before a singular noun when the object is close to the speaker.',
        'Check both clues: one object and a short distance from the speaker.',
        'A learner may consider distance but forget whether the noun is singular.',
        'recall'
      ),
      question(
        'Why does “those books” refer to more than one book at a distance?',
        ['Those marks both plural number and distance', 'Books is singular after those', 'Those can only refer to people', 'Distance is shown by the verb'],
        'Those marks both plural number and distance',
        'Those pairs with a plural noun and normally points to people or things away from the speaker.',
        'Separate the two grammar clues: how many objects and how far away.',
        'A learner may think demonstratives express only distance and not number.',
        'understand'
      ),
      question(
        'At a market stall, Wanjiku holds one orange. Which sentence should she say?',
        ['This orange is ripe.', 'These orange is ripe.', 'Those orange are ripe.', 'That oranges is ripe.'],
        'This orange is ripe.',
        'This agrees with the one nearby orange, and the singular verb is matches the singular noun.',
        'Match a near singular object with its demonstrative and verb.',
        'A learner may choose these because the orange is close, while missing the singular noun.',
        'apply'
      ),
      question(
        'A learner points across the room and says, “These two charts are helpful.” What is the best correction?',
        ['Those two charts are helpful.', 'This two charts are helpful.', 'That two charts is helpful.', 'Those two chart are helpful.'],
        'Those two charts are helpful.',
        'Those matches the plural noun charts and shows that the charts are far from the speaker.',
        'Keep the plural form, then change the demonstrative to show greater distance.',
        'A learner may correct the distance but create disagreement between determiner, noun, and verb.',
        'analyse'
      ),
      question(
        'Which pair of captions is fully accurate for a photo with one near drum and three far shakers?',
        ['This drum; those shakers', 'These drum; that shakers', 'That drum; these shakers', 'Those drum; this shakers'],
        'This drum; those shakers',
        'This fits one nearby drum, while those fits several shakers shown farther away.',
        'Test each caption for number first, then for distance.',
        'A learner may apply one demonstrative rule correctly but ignore the other object.',
        'analyse'
      )
    ]
  },
  {
    key: 'english-g5-pronunciation-vocabulary',
    subjectId: 'english',
    subjectName: 'English',
    grade: 'Grade 5',
    strand: 'Listening and Speaking',
    subStrand: 'Pronunciation and Vocabulary',
    title: 'Listen for the Big Idea',
    shortTitle: 'Word to Meaning',
    objective: 'Use clear pronunciation and context vocabulary to identify a spoken message’s main idea and construct meaningful sentences.',
    minutes: 10,
    sourceRef: source('english'),
    visual: {
      setting: 'community',
      elements: ['tree-planting announcement', 'speaker facing attentive learners', 'seedlings and watering cans', 'main-idea message card']
    },
    questions: [
      question(
        'What is the main idea of a message?',
        ['The most important point the speaker wants listeners to understand', 'Every single word in alphabetical order', 'The speaker’s loudest sound only', 'A detail unrelated to the topic'],
        'The most important point the speaker wants listeners to understand',
        'The main idea summarises the central message, while details explain or support it.',
        'Ask what one point connects most of the information in the message.',
        'A learner may choose one memorable detail instead of the whole message.',
        'recall'
      ),
      question(
        'A message mentions seedlings, holes, watering, and shade. Why does “tree planting” fit as its main idea?',
        ['All the details support that one activity', 'It is the shortest phrase available', 'It repeats the final word only', 'It names the person speaking'],
        'All the details support that one activity',
        'A strong main idea accounts for the important details rather than matching only one sentence.',
        'Check whether each listed detail belongs naturally under the same idea.',
        'A learner may choose a broad topic without testing it against the details.',
        'understand'
      ),
      question(
        'Which sentence uses conservation vocabulary clearly?',
        ['Our class planted indigenous trees to protect the riverbank.', 'Protect riverbank class indigenous the.', 'Trees because conservation quickly.', 'Our class protect planted yesterday trees.'],
        'Our class planted indigenous trees to protect the riverbank.',
        'The sentence uses the theme words in a grammatical order and makes their relationship clear.',
        'Look for a complete idea with a doer, action, and purpose.',
        'A learner may include relevant vocabulary but ignore sentence meaning and grammar.',
        'apply'
      ),
      question(
        'Message: “Bring a labelled bottle on Friday. We will reuse it as a seedling pot.” Which heading captures the main idea best?',
        ['Preparing for a bottle-reuse planting activity', 'Why Friday is the longest day', 'How to buy a glass window', 'A history of every type of seed'],
        'Preparing for a bottle-reuse planting activity',
        'The heading combines the required item, the reuse purpose, and the planned planting activity.',
        'Choose the heading that accounts for both what learners bring and why.',
        'A learner may select a heading based on one word while missing the action and purpose.',
        'analyse'
      ),
      question(
        'A speaker pronounces key words unclearly and adds many unrelated details. Which revision will help listeners most?',
        ['Practise key words, state one main point, and keep only supporting details', 'Speak faster and add more topics', 'Whisper the main point once at the end', 'Replace every familiar word with a difficult one'],
        'Practise key words, state one main point, and keep only supporting details',
        'Clear key words and focused details make the central message easier to hear and remember.',
        'Improve both how the message sounds and how its ideas are organised.',
        'A learner may fix pronunciation alone while leaving the message unfocused.',
        'analyse'
      )
    ]
  },
  // Kiswahili
  {
    key: 'kiswahili-g5-matamshi-bora',
    subjectId: 'kiswahili',
    subjectName: 'Kiswahili',
    grade: 'Grade 5',
    strand: 'Kusikiliza na Kuzungumza',
    subStrand: 'Matamshi Bora: Sauti f/v, s/z, l/r na th/dh',
    title: 'Sikiliza, Tofautisha, Tamka',
    shortTitle: 'Sauti Karibu',
    objective: 'Kutambua na kutamka sauti zinazokaribiana f/v, s/z, l/r na th/dh, kisha kuzitumia katika vitanzandimi vyenye maana.',
    minutes: 10,
    sourceRef: source('kiswahili'),
    visual: {
      setting: 'classroom',
      elements: ['kadi za silabi fa na va', 'viputo vya maneno saa na zaa', 'alama za ulimi na midomo', 'mstari wa kitanzandimi']
    },
    questions: [
      question(
        'Ni neno lipi linaanza kwa sauti /v/?',
        ['vua', 'fua', 'suka', 'ruka'],
        'vua',
        'Neno “vua” huanza kwa sauti /v/, ilhali “fua” huanza kwa sauti /f/.',
        'Tamka kila neno polepole na usikilize sauti ya kwanza.',
        'Mwanafunzi anaweza kuchanganya /f/ na /v/ kwa sababu zinatamkiwa karibu mdomoni.',
        'recall'
      ),
      question(
        'Kwa nini ni muhimu kutofautisha “saa” na “zaa” wakati wa kuzungumza?',
        ['Kubadilisha /s/ kuwa /z/ hubadilisha maana ya neno', 'Maneno yote mawili yana maana sawa', 'Sauti ya kwanza haiathiri ujumbe', 'Kila neno la Kiswahili huanza kwa /s/'],
        'Kubadilisha /s/ kuwa /z/ hubadilisha maana ya neno',
        'Sauti moja ikibadilika inaweza kuunda neno jingine lenye maana tofauti kabisa.',
        'Linganisha maana ya kifaa cha kupima wakati na tendo la kuleta kiumbe duniani.',
        'Mwanafunzi anaweza kudhani matamshi tofauti hayabadilishi maana.',
        'understand'
      ),
      question(
        'Ni sentensi ipi imetumia neno sahihi kumaanisha kuondoa nguo?',
        ['Juma alivua koti baada ya jua kuchomoza.', 'Juma alifua koti kutoka mwilini.', 'Juma alisua koti baada ya jua.', 'Juma alirua koti kutoka mwilini.'],
        'Juma alivua koti baada ya jua kuchomoza.',
        'Kitenzi “vua” humaanisha kuondoa nguo, huku “fua” humaanisha kusafisha nguo.',
        'Chagua kitenzi kinacholingana na tendo la kuondoa koti mwilini.',
        'Mwanafunzi anaweza kuchagua “fua” kwa kutegemea kufanana kwa sauti pekee.',
        'apply'
      ),
      question(
        'Mwanafunzi alisema, “Dada alisoma halafu akala,” lakini /l/ yake ilisikika kama /r/. Mazoezi yapi yatamsaidia zaidi?',
        ['Kutamka jozi la/ra na li/ri polepole ndani ya maneno', 'Kupaza sauti bila kusikiliza', 'Kuondoa maneno yote yenye l', 'Kuandika sentensi bila kuitamka'],
        'Kutamka jozi la/ra na li/ri polepole ndani ya maneno',
        'Mazoezi ya jozi za silabi na maneno humsaidia mwanafunzi kuhisi na kusikia tofauti ya /l/ na /r/.',
        'Tafuta zoezi linalenga sauti zinazochanganywa na kutoa nafasi ya kujisahihisha.',
        'Mwanafunzi anaweza kudhani sauti kubwa hurekebisha mahali ulimi unapowekwa.',
        'analyse'
      ),
      question(
        'Ni mpango upi bora wa kutunga na kuwasilisha kitanzandimi cha sauti /th/ na /dh/?',
        ['Chagua maneno sahihi, tunga mstari wenye maana, anza polepole, kisha ongeza kasi', 'Changanya maneno yasiyo na maana na useme mara moja', 'Tumia /th/ pekee bila sentensi', 'Sema kwa kasi kabla ya kukagua matamshi'],
        'Chagua maneno sahihi, tunga mstari wenye maana, anza polepole, kisha ongeza kasi',
        'Kitanzandimi bora huwa na maneno lengwa, maana inayoeleweka, na mazoezi yanayotanguliza usahihi kabla ya kasi.',
        'Kagua uchaguzi wa maneno, maana ya mstari, na mpangilio wa mazoezi.',
        'Mwanafunzi anaweza kuthamini kasi kuliko matamshi sahihi na ujumbe.',
        'analyse'
      )
    ]
  },
  {
    key: 'kiswahili-g5-kusoma-ufahamu',
    subjectId: 'kiswahili',
    subjectName: 'Kiswahili',
    grade: 'Grade 5',
    strand: 'Kusoma',
    subStrand: 'Kusoma',
    title: 'Fungua Maana ya Kifungu',
    shortTitle: 'Soma na Elewa',
    objective: 'Kutumia msamiati lengwa, kufuatilia matukio na wahusika, kujibu maswali, na kutoa muhtasari sahihi wa kifungu.',
    minutes: 10,
    sourceRef: source('kiswahili'),
    visual: {
      setting: 'community',
      elements: ['kifungu kuhusu bustani ya shule', 'kadi za wahusika', 'mstari wa matukio', 'kisanduku cha muhtasari']
    },
    questions: [
      question(
        'Katika usomaji wa kifungu, msamiati lengwa ni nini?',
        ['Maneno muhimu yanayohusiana na mada', 'Nambari za kurasa pekee', 'Majina ya wachapishaji wote', 'Maneno yasiyotokea katika kifungu'],
        'Maneno muhimu yanayohusiana na mada',
        'Msamiati lengwa ni maneno muhimu ambayo humsaidia msomaji kuelewa na kuzungumzia mada ya kifungu.',
        'Fikiria maneno ambayo hurudiwa au yanahitajika kueleza mada.',
        'Mwanafunzi anaweza kudhani kila neno gumu ndilo msamiati lengwa.',
        'recall'
      ),
      question(
        'Kifungu kinasema, “Akinyi alikusanya miche, akaichunguza, kisha akaipanda.” Kwa nini neno “kisha” ni muhimu?',
        ['Linaonyesha tukio lililofuata', 'Linaonyesha jina la mhusika', 'Linafuta tukio la kwanza', 'Linaonyesha mahali pekee'],
        'Linaonyesha tukio lililofuata',
        'Kiunganishi “kisha” huonyesha mpangilio wa matukio na humsaidia msomaji kufuatilia hatua.',
        'Angalia uhusiano wa wakati kati ya kukusanya, kuchunguza na kupanda.',
        'Mwanafunzi anaweza kuona “kisha” kama neno la mapambo lisiloathiri mpangilio.',
        'understand'
      ),
      question(
        'Kifungu: “Mvua ilikosa kwa wiki mbili. Wanafunzi walitandika nyasi kavu kuzunguka miche.” Kwa nini walitandika nyasi?',
        ['Kupunguza upotevu wa maji kwenye udongo', 'Kuficha miche wasione', 'Kuongeza upepo kwenye mizizi', 'Kuzuia mvua yote kufika'],
        'Kupunguza upotevu wa maji kwenye udongo',
        'Ukosefu wa mvua ni dokezo; matandazo husaidia udongo kuhifadhi unyevu kwa muda mrefu.',
        'Unganisha tatizo lililotajwa na kazi ya nyasi kavu juu ya udongo.',
        'Mwanafunzi anaweza kujibu kwa maarifa ya jumla bila kutumia dokezo la kifungu.',
        'apply'
      ),
      question(
        'Matukio ni: (1) miche ikachanua, (2) darasa likapanda miche, (3) walimu wakagawa miche, (4) wanafunzi wakaitunza. Mpangilio sahihi ni upi?',
        ['3, 2, 4, 1', '1, 4, 2, 3', '2, 1, 3, 4', '4, 3, 1, 2'],
        '3, 2, 4, 1',
        'Miche hugawiwa kwanza, inapandwa, inatunzwa, na baadaye ndipo inachanua.',
        'Tumia uhusiano wa sababu na matokeo ili kupanga kila tukio.',
        'Mwanafunzi anaweza kupanga matukio kulingana na yalivyoorodheshwa badala ya mantiki ya hadithi.',
        'analyse'
      ),
      question(
        'Ni muhtasari upi bora wa hadithi kuhusu darasa lililopanda, likatunza, na hatimaye likagawa mboga kwa jikoni la shule?',
        ['Darasa lilishirikiana kukuza mboga zilizosaidia shule.', 'Kulikuwa na jiko na udongo wa rangi tofauti.', 'Mwanafunzi mmoja alipenda kumwagilia Jumatatu.', 'Mboga zina majani, mizizi na mashina.'],
        'Darasa lilishirikiana kukuza mboga zilizosaidia shule.',
        'Muhtasari huo unajumuisha wahusika, shughuli kuu, na matokeo bila kupotelea katika jambo dogo.',
        'Chagua sentensi inayounganisha mwanzo, tendo kuu na matokeo ya hadithi.',
        'Mwanafunzi anaweza kuchagua maelezo ya kweli lakini madogo badala ya wazo kuu.',
        'analyse'
      )
    ]
  },
  {
    key: 'kiswahili-g5-insha-wasifu',
    subjectId: 'kiswahili',
    subjectName: 'Kiswahili',
    grade: 'Grade 5',
    strand: 'Kuandika',
    subStrand: 'Kuandika Insha ya Wasifu',
    title: 'Andika Wasifu Unaomleta Mhusika Hai',
    shortTitle: 'Wasifu Bora',
    objective: 'Kutambua muundo wa insha ya wasifu na kuandika maelezo ya kweli, yaliyopangwa na yenye picha dhahiri kuhusu mhusika.',
    minutes: 10,
    sourceRef: source('kiswahili'),
    visual: {
      setting: 'home',
      elements: ['mwanafunzi akimhoji mlezi', 'kadi ya taarifa za mhusika', 'mpangilio wa mwanzo-kati-mwisho', 'daftari la rasimu']
    },
    questions: [
      question(
        'Insha ya wasifu hueleza nini hasa?',
        ['Maisha na sifa muhimu za mtu', 'Hatua za kupika chakula tu', 'Orodha ya bei sokoni', 'Mazungumzo yasiyo na mhusika'],
        'Maisha na sifa muhimu za mtu',
        'Wasifu humweleza mtu kupitia taarifa muhimu, matukio, kazi, sifa, na mchango wake.',
        'Tafuta aina ya uandishi inayomjenga mtu mmoja mbele ya msomaji.',
        'Mwanafunzi anaweza kuchanganya wasifu na insha ya maelekezo.',
        'recall'
      ),
      question(
        'Kwa nini taarifa za wasifu zinapaswa kupangwa kwa utaratibu?',
        ['Ili msomaji afuatilie maisha na mchango wa mhusika kwa urahisi', 'Ili sentensi zote ziwe na urefu sawa', 'Ili maelezo muhimu yafichwe', 'Ili kichwa kisiwepo'],
        'Ili msomaji afuatilie maisha na mchango wa mhusika kwa urahisi',
        'Mpangilio wa kimantiki huunganisha utambulisho, matukio, sifa, na mchango wa mhusika.',
        'Fikiria jinsi msomaji anavyotoka kumjua mhusika hadi kuelewa umuhimu wake.',
        'Mwanafunzi anaweza kukusanya ukweli sahihi lakini kuuweka bila mfuatano.',
        'understand'
      ),
      question(
        'Ni sentensi ipi inatoa picha dhahiri katika wasifu wa mkulima?',
        ['Kila alfajiri, Bi Auma hukagua miche na kugusa udongo kuona unyevu.', 'Bi Auma ni mtu wa mambo mengi sana.', 'Yeye hufanya vitu na kadhalika.', 'Mkulima yupo hapo kila mara labda.'],
        'Kila alfajiri, Bi Auma hukagua miche na kugusa udongo kuona unyevu.',
        'Sentensi hiyo hutumia tendo, wakati, na maelezo mahsusi kumsaidia msomaji kumwona mhusika akifanya kazi.',
        'Chagua sentensi yenye tendo linaloonekana na maelezo maalumu.',
        'Mwanafunzi anaweza kudhani sifa za jumla huleta picha dhahiri.',
        'apply'
      ),
      question(
        'Rasimu inaanza na tuzo ya mwaka huu, kisha utoto, jina, na kazi ya mhusika. Marekebisho yapi yana mantiki zaidi?',
        ['Anza kwa kumtambulisha, eleza historia na kazi, kisha mchango na tuzo', 'Ondoa jina la mhusika kabisa', 'Weka kila sentensi bila mpangilio', 'Rudia tuzo katika kila aya'],
        'Anza kwa kumtambulisha, eleza historia na kazi, kisha mchango na tuzo',
        'Mpangilio huo humpa msomaji msingi kabla ya kuonyesha ukuaji, kazi, mchango, na utambuzi wa mhusika.',
        'Panga taarifa kutoka utambulisho kwenda maelezo na matokeo muhimu.',
        'Mwanafunzi anaweza kuweka jambo la kusisimua kwanza bila kutoa muktadha unaohitajika.',
        'analyse'
      ),
      question(
        'Ni mpango upi bora kabla ya kuwasilisha wasifu wa kiongozi wa kikundi cha usafi?',
        ['Thibitisha taarifa, panga aya, ongeza maelezo mahsusi, kisha hariri lugha', 'Buni mafanikio yasiyotokea ili hadithi ivutie', 'Nakili wasifu wa mtu mwingine na ubadilishe jina', 'Tuma rasimu bila kusoma tena'],
        'Thibitisha taarifa, panga aya, ongeza maelezo mahsusi, kisha hariri lugha',
        'Wasifu bora huheshimu ukweli, huwa na muundo wazi, maelezo hai, na lugha iliyokaguliwa.',
        'Kagua uaminifu wa taarifa, muundo, ubunifu wa maelezo, na usahihi wa lugha.',
        'Mwanafunzi anaweza kudhani ubunifu katika wasifu unaruhusu kubuni ukweli.',
        'analyse'
      )
    ]
  },
  // Mathematics
  {
    key: 'math-g5-whole-numbers',
    subjectId: 'math',
    subjectName: 'Mathematics',
    grade: 'Grade 5',
    strand: 'Numbers',
    subStrand: 'Whole Numbers',
    title: 'Read the Story Inside Big Numbers',
    shortTitle: 'Big Numbers',
    objective: 'Use place value to read, write, order, and round whole numbers, then apply divisibility tests for 2, 5, and 10.',
    minutes: 10,
    sourceRef: source('mathematics'),
    visual: {
      setting: 'market',
      elements: ['six-column place-value board', 'market stock number cards', 'rounding number line', 'divisibility sorting gates']
    },
    questions: [
      question(
        'What is the total value of the digit 7 in 374,218?',
        ['70,000', '7,000', '700', '7'],
        '70,000',
        'The 7 is in the ten-thousands place, so its total value is seven groups of ten thousand.',
        'Locate the digit’s column before multiplying it by that place value.',
        'A learner may name the digit itself instead of its total value.',
        'recall'
      ),
      question(
        'Why is 406,050 read as “four hundred six thousand and fifty” rather than “four hundred sixty-six thousand and fifty”?',
        ['The zero in the ten-thousands place holds an empty place', 'Every zero adds sixty thousand', 'The final zero changes 6 into 66', 'Commas can be ignored when reading numbers'],
        'The zero in the ten-thousands place holds an empty place',
        'Place-holding zeros preserve each digit’s column; they do not create extra tens of thousands.',
        'Place the digits into hundred-thousands through ones columns and inspect the zeros.',
        'A learner may close up digits across a zero and accidentally change their place values.',
        'understand'
      ),
      question(
        'A library recorded 58,764 visits. What is this number rounded to the nearest thousand?',
        ['59,000', '58,000', '58,700', '60,000'],
        '59,000',
        'The hundreds digit is 7, so 58 thousand rounds up to 59 thousand.',
        'For nearest thousand, inspect the hundreds digit and decide whether to keep or increase.',
        'A learner may round using the tens digit instead of the hundreds digit.',
        'apply'
      ),
      question(
        'Which number is divisible by 2, 5, and 10?',
        ['43,120', '43,125', '43,122', '43,117'],
        '43,120',
        'A whole number ending in zero is divisible by 10 and therefore also divisible by both 2 and 5.',
        'Test the final digit against the rules for all three divisors.',
        'A learner may choose a number ending in 5, which is not divisible by 2 or 10.',
        'analyse'
      ),
      question(
        'Four county totals are 198,450; 198,405; 189,540; and 198,540. Which order is greatest to least?',
        ['198,540; 198,450; 198,405; 189,540', '198,405; 198,450; 198,540; 189,540', '189,540; 198,405; 198,450; 198,540', '198,540; 189,540; 198,450; 198,405'],
        '198,540; 198,450; 198,405; 189,540',
        'Compare digits from the greatest place left to right; the first differing digit determines the larger number.',
        'Align the place-value columns and compare from hundred-thousands towards ones.',
        'A learner may compare only the final three digits and ignore the thousands group.',
        'analyse'
      )
    ]
  },
  {
    key: 'math-g5-addition',
    subjectId: 'math',
    subjectName: 'Mathematics',
    grade: 'Grade 5',
    strand: 'Numbers',
    subStrand: 'Addition',
    title: 'Estimate, Regroup, Check the Total',
    shortTitle: 'Smart Sums',
    objective: 'Estimate and calculate sums of large whole numbers with and without regrouping, using place value and reasonableness checks.',
    minutes: 10,
    sourceRef: source('mathematics'),
    visual: {
      setting: 'market',
      elements: ['three produce-stock cards', 'place-value counters', 'estimate signboard', 'exact-total receipt']
    },
    questions: [
      question(
        'What is 240,000 + 130,000?',
        ['370,000', '360,000', '470,000', '37,000'],
        '370,000',
        'Adding 24 ten-thousands and 13 ten-thousands gives 37 ten-thousands, which is 370,000.',
        'Add matching place-value groups and keep the five zeros in the final total.',
        'A learner may add the leading digits but return the wrong number of place-value zeros.',
        'recall'
      ),
      question(
        'Why is 298,600 + 101,300 close to 400,000?',
        ['The addends round to about 300,000 and 100,000', 'Both addends are below 10,000', 'Addition always ends in zero', 'The hundreds digits must be ignored'],
        'The addends round to about 300,000 and 100,000',
        'Rounding each addend to a useful place gives a quick estimate of about 400,000.',
        'Round each number to its nearest hundred thousand before combining them.',
        'A learner may think an estimate is made by deleting digits without considering their values.',
        'understand'
      ),
      question(
        'A cooperative packed 276,845 kg of maize and 148,376 kg of beans. What was the total mass?',
        ['425,221 kg', '424,111 kg', '435,221 kg', '128,469 kg'],
        '425,221 kg',
        'Column addition with regrouping gives 276,845 + 148,376 = 425,221 kilograms.',
        'Align ones with ones, add from right to left, and record each regrouping carefully.',
        'A learner may add each column but forget to include a regrouped ten in the next column.',
        'apply'
      ),
      question(
        'A learner says 397,450 + 203,725 = 591,175. Which check reveals the error fastest?',
        ['Estimate 400,000 + 200,000 to get about 600,000', 'Count the commas in the answer', 'Check whether both numbers contain a 5', 'Subtract only the ones digits'],
        'Estimate 400,000 + 200,000 to get about 600,000',
        'The exact sum should be near 600,000; careful addition gives 601,175, so 591,175 is not reasonable.',
        'Use rounded addends to create a range in which a sensible total should lie.',
        'A learner may accept a neatly written exact-looking answer without testing its size.',
        'analyse'
      ),
      question(
        'Three schools collected 145,980, 236,475, and 117,545 bottle tops. Which statement is accurate?',
        ['The total is exactly 500,000', 'The total is exactly 490,000', 'The total is more than 600,000', 'The total is less than 400,000'],
        'The total is exactly 500,000',
        'Adding the first two gives 382,455; adding 117,545 completes an exact total of 500,000.',
        'Combine two numbers first, then look for place values that complete a round total.',
        'A learner may rely on rough estimation and miss that the quantities form an exact benchmark.',
        'analyse'
      )
    ]
  },
  {
    key: 'math-g5-subtraction',
    subjectId: 'math',
    subjectName: 'Mathematics',
    grade: 'Grade 5',
    strand: 'Numbers',
    subStrand: 'Subtraction',
    title: 'Regroup to Find What Remains',
    shortTitle: 'Clear Differences',
    objective: 'Subtract large whole numbers with and without regrouping, estimate differences, and diagnose errors using inverse operations.',
    minutes: 10,
    sourceRef: source('mathematics'),
    visual: {
      setting: 'community',
      elements: ['six-digit place-value mat', 'regroupable number blocks', 'community water-tank reading', 'addition check card']
    },
    questions: [
      question(
        'What is 650,000 − 120,000?',
        ['530,000', '520,000', '770,000', '53,000'],
        '530,000',
        'Sixty-five ten-thousands minus twelve ten-thousands leaves fifty-three ten-thousands, or 530,000.',
        'Subtract matching place-value groups and preserve the size of the number.',
        'A learner may subtract the leading digits but use too few zeros in the difference.',
        'recall'
      ),
      question(
        'Why must a hundred thousand be regrouped when subtracting 184,750 from 402,300?',
        ['The ten-thousands column starts with 0 and must subtract 8', 'The ones column contains two zeros', 'Every subtraction needs regrouping', 'The subtrahend is an even number'],
        'The ten-thousands column starts with 0 and must subtract 8',
        'Regrouping passes value across the zero columns so each place has enough units to subtract.',
        'Align both numbers and find the first column where the top digit is smaller.',
        'A learner may begin subtracting larger lower digits from smaller upper digits without regrouping.',
        'understand'
      ),
      question(
        'A water tank held 325,600 litres. The community used 178,945 litres. How many litres remained?',
        ['146,655 litres', '147,655 litres', '156,745 litres', '504,545 litres'],
        '146,655 litres',
        'Regrouping across the place-value columns gives 325,600 − 178,945 = 146,655 litres.',
        'Work from ones to hundred-thousands and recheck each borrowed value.',
        'A learner may lose a regrouping step when zeros occur in the minuend.',
        'apply'
      ),
      question(
        'Which estimate is most useful for checking 612,480 − 289,725?',
        ['600,000 − 300,000 ≈ 300,000', '600 − 300 ≈ 3', '700,000 − 100,000 ≈ 800,000', '612,000 + 290,000 ≈ 900,000'],
        '600,000 − 300,000 ≈ 300,000',
        'Rounding to nearby hundred-thousands gives a sensible benchmark near the exact difference of 322,755.',
        'Choose rounded values that stay close to both original numbers and keep the operation unchanged.',
        'A learner may change subtraction into addition or round so roughly that the check becomes misleading.',
        'analyse'
      ),
      question(
        'Musa calculated 500,000 − 267,890 = 242,110. Which inverse check proves the answer is wrong?',
        ['267,890 + 242,110 = 510,000, not 500,000', '500,000 + 267,890 is greater than 500,000', '242,110 is an even number', 'Both numbers contain zero'],
        '267,890 + 242,110 = 510,000, not 500,000',
        'A correct difference added to the subtrahend must reconstruct the minuend; the proposed answer reconstructs 510,000.',
        'Add the claimed remainder back to the amount removed and compare with the starting amount.',
        'A learner may check subtraction with an unrelated calculation instead of reversing the operation.',
        'analyse'
      )
    ]
  },
  // Science & Technology
  {
    key: 'science-g5-plant-classification',
    subjectId: 'science',
    subjectName: 'Science & Technology',
    grade: 'Grade 5',
    strand: 'Living Things and their Environment',
    subStrand: 'Classification of Plants',
    title: 'Read the Clues Plants Give Us',
    shortTitle: 'Plant Detectives',
    objective: 'Classify plants as flowering or non-flowering, relate flower parts to functions, and explain why flowers matter in nature.',
    minutes: 10,
    sourceRef: source('science-and-technology'),
    visual: {
      setting: 'nature',
      elements: ['flowering hibiscus', 'maize tassel and silk', 'fern fronds', 'labelled flower cross-section']
    },
    questions: [
      question(
        'Which plant structure is used to classify a plant as flowering?',
        ['A flower that supports seed production', 'A green leaf only', 'A root in soil', 'A flexible stem'],
        'A flower that supports seed production',
        'Flowering plants form flowers as reproductive structures, while non-flowering plants reproduce without flowers.',
        'Focus on the reproductive structure, not parts that most plants share.',
        'A learner may classify every green plant as flowering because it has leaves.',
        'recall'
      ),
      question(
        'Why can a maize plant be classified as flowering even though its flowers are not showy?',
        ['It produces tassels and silks that are flower structures', 'Every tall plant is flowering', 'Its leaves have parallel veins', 'It grows from soil'],
        'It produces tassels and silks that are flower structures',
        'Flowers vary in appearance; maize tassels and silks perform reproductive roles even without bright petals.',
        'Do not use colour alone; look for structures involved in reproduction.',
        'A learner may believe only large, colourful blossoms count as flowers.',
        'understand'
      ),
      question(
        'During a school walk, learners find a fern with spores under its fronds and no flowers. How should they classify it?',
        ['Non-flowering plant', 'Flowering plant', 'Not a plant', 'Flowering only in daylight'],
        'Non-flowering plant',
        'Ferns reproduce using spores rather than flowers and seeds, so they are non-flowering plants.',
        'Use the observed reproductive clue rather than the plant’s size or habitat.',
        'A learner may assume every land plant eventually forms a flower.',
        'apply'
      ),
      question(
        'A flower has damaged anthers but healthy petals and sepals. Which process is most directly affected?',
        ['Producing and releasing pollen', 'Holding the flower to the stem', 'Absorbing water from the soil', 'Making the plant’s leaves green'],
        'Producing and releasing pollen',
        'Anthers produce pollen, so damage to them can reduce the pollen available for reproduction.',
        'Match the damaged flower part to its special reproductive function.',
        'A learner may choose petals because they are the most visible flower part.',
        'analyse'
      ),
      question(
        'Which claim best explains why flowers are important in a school food garden?',
        ['They support pollination and the formation of many fruits and seeds', 'They replace the need for roots', 'They make every insect a pest', 'They stop plants needing sunlight'],
        'They support pollination and the formation of many fruits and seeds',
        'Flowers enable reproduction in flowering crops and provide resources for pollinators within the garden ecosystem.',
        'Connect flower function to what develops after successful pollination.',
        'A learner may value flowers only for beauty and miss their reproductive role.',
        'analyse'
      )
    ]
  },
  {
    key: 'science-g5-breathing-system',
    subjectId: 'science',
    subjectName: 'Science & Technology',
    grade: 'Grade 5',
    strand: 'Living Things and their Environment',
    subStrand: 'The Human Breathing System',
    title: 'Follow Every Breath',
    shortTitle: 'Breathing Journey',
    objective: 'Identify major breathing-system parts, trace airflow, interpret changes during exercise, and choose habits that support respiratory health.',
    minutes: 10,
    sourceRef: source('science-and-technology'),
    visual: {
      setting: 'classroom',
      elements: ['nose and windpipe pathway', 'pair of lungs', 'diaphragm movement arrows', 'learner counting breaths after jogging']
    },
    questions: [
      question(
        'Which organs contain the air sacs where gases are exchanged?',
        ['Lungs', 'Stomach', 'Kidneys', 'Bones'],
        'Lungs',
        'The lungs contain tiny air sacs that provide a large surface for oxygen and carbon dioxide exchange.',
        'Choose the paired organs in the chest that fill and empty with each breath.',
        'A learner may confuse breathing organs with organs that digest food.',
        'recall'
      ),
      question(
        'What happens when the diaphragm contracts during breathing in?',
        ['It moves down, giving the lungs more space to expand', 'It closes the windpipe completely', 'It pushes all air out of the nose', 'It stops the ribs from moving'],
        'It moves down, giving the lungs more space to expand',
        'A contracting diaphragm flattens and increases chest space, helping air move into the expanding lungs.',
        'Imagine how changing the space inside the chest changes airflow.',
        'A learner may think the diaphragm pumps air directly like a fan.',
        'understand'
      ),
      question(
        'After a safe one-minute jog, Njeri counts more breaths than when seated. What is the best explanation?',
        ['Working muscles need more oxygen and produce more carbon dioxide', 'Her lungs have permanently become smaller', 'Exercise removes all air from the body', 'Her heart has stopped moving blood'],
        'Working muscles need more oxygen and produce more carbon dioxide',
        'Breathing rate rises during activity to take in more oxygen and remove additional carbon dioxide.',
        'Connect increased muscle work with the body’s need to exchange gases faster.',
        'A learner may treat faster breathing after exercise as proof of permanent lung damage.',
        'apply'
      ),
      question(
        'Two classrooms are identical except one is smoky and poorly ventilated. Which observation most strongly supports improving its air quality?',
        ['More learners cough or feel eye irritation there', 'Its chalkboard is the same size', 'Both rooms have desks', 'The smoky room has a blue door'],
        'More learners cough or feel eye irritation there',
        'A repeated difference in breathing-related symptoms is relevant evidence that smoke and poor ventilation are harmful.',
        'Look for an observation linked to breathing and different between the rooms.',
        'A learner may select an obvious difference that has no relationship to respiratory health.',
        'analyse'
      ),
      question(
        'Which plan best supports a healthy breathing system at school?',
        ['Keep rooms ventilated, avoid smoke and dust, exercise safely, and report persistent symptoms', 'Burn rubbish beside open windows', 'Share medicine whenever someone coughs', 'Ignore breathing difficulty after activity'],
        'Keep rooms ventilated, avoid smoke and dust, exercise safely, and report persistent symptoms',
        'Clean air, safe activity, reduced irritants, and timely adult or health support protect respiratory wellbeing.',
        'Check the plan for prevention, healthy activity, and responsible help-seeking.',
        'A learner may focus on one habit while accepting unsafe smoke exposure or self-medication.',
        'analyse'
      )
    ]
  },
  {
    key: 'science-g5-mixtures-water',
    subjectId: 'science',
    subjectName: 'Science & Technology',
    grade: 'Grade 5',
    strand: 'Matter',
    subStrand: 'Mixtures and Water Safety',
    title: 'Separate Mixtures, Protect Water',
    shortTitle: 'Mixture Mission',
    objective: 'Classify mixtures, select safe separation methods, and connect water pollution, treatment steps, and protection of local sources.',
    minutes: 10,
    sourceRef: source('science-and-technology'),
    visual: {
      setting: 'classroom',
      elements: ['maize mixed with stones', 'flour sieve', 'muddy-water settling jar', 'covered safe-water container']
    },
    questions: [
      question(
        'Which mixture is heterogeneous because its parts can still be seen?',
        ['Dry beans mixed with maize grains', 'Salt fully dissolved in water', 'Sugar fully dissolved in tea', 'Clear air in a room'],
        'Dry beans mixed with maize grains',
        'Beans and maize remain visibly different and are not distributed as one uniform material.',
        'Look for a mixture whose components remain easy to distinguish.',
        'A learner may assume every mixture looks uniform after it is stirred.',
        'recall'
      ),
      question(
        'Why is sieving useful for separating flour from larger bran pieces?',
        ['The particles have different sizes', 'The materials have different colours', 'The sieve changes bran into flour', 'Flour is magnetic'],
        'The particles have different sizes',
        'Small flour particles pass through the mesh while larger bran pieces remain above it.',
        'Consider which property determines whether a particle passes through a mesh hole.',
        'A learner may choose a visible property that the method does not actually use.',
        'understand'
      ),
      question(
        'A mixture contains iron nails, dry maize, and small stones. Which first step is most efficient?',
        ['Use a magnet to remove the nails', 'Add sugar to the mixture', 'Boil all the materials', 'Pour the mixture into a river'],
        'Use a magnet to remove the nails',
        'Magnetism separates the iron nails cleanly before another method is chosen for maize and stones.',
        'Start with a property that belongs to only one component of the mixture.',
        'A learner may choose heat or water even when a simpler dry method works.',
        'apply'
      ),
      question(
        'Muddy water settles and is filtered through clean cloth. Why should learners not assume it is ready to drink?',
        ['Some disease-causing organisms may remain and approved treatment is still needed', 'Filtering always adds salt', 'Clear water never contains organisms', 'Settling turns water into juice'],
        'Some disease-causing organisms may remain and approved treatment is still needed',
        'Settling and filtration can remove visible particles but may not remove or kill harmful microorganisms.',
        'Distinguish water that looks clear from water confirmed safe for drinking.',
        'A learner may judge drinking safety only by colour and visible dirt.',
        'analyse'
      ),
      question(
        'Which community plan most effectively protects a stream used as a water source?',
        ['Keep waste and livestock away, protect vegetation, report pollution, and use approved treatment', 'Wash chemical containers in the stream', 'Dump rubbish downstream at night', 'Remove riverbank plants and leave soil bare'],
        'Keep waste and livestock away, protect vegetation, report pollution, and use approved treatment',
        'Preventing contamination, maintaining protective vegetation, responding to pollution, and treating water create several safety barriers.',
        'Choose a plan that protects the source and also handles water responsibly before use.',
        'A learner may rely only on treatment while allowing preventable pollution to continue.',
        'analyse'
      )
    ]
  },
  // Social Studies
  {
    key: 'social-g5-map-elements',
    subjectId: 'social',
    subjectName: 'Social Studies',
    grade: 'Grade 5',
    strand: 'Natural and Historic Built Environments',
    subStrand: 'Elements of a Map',
    title: 'Build a Map That Speaks Clearly',
    shortTitle: 'Map Makers',
    objective: 'Identify, draw, and interpret a map title, frame, scale, compass, and key in practical journeys and sketches.',
    minutes: 10,
    sourceRef: source('social-studies'),
    visual: {
      setting: 'community',
      elements: ['school-to-market sketch map', 'compass rose', 'symbol key', 'bar scale and map frame']
    },
    questions: [
      question(
        'Which map element explains what symbols such as a blue line or red cross mean?',
        ['Key', 'Frame', 'Title', 'Scale'],
        'Key',
        'A map key or legend links symbols and colours to the real features they represent.',
        'Look for the element that works like a small symbol dictionary.',
        'A learner may choose the title because it explains the map’s general topic.',
        'recall'
      ),
      question(
        'Why does a map need a scale?',
        ['To relate map distance to actual ground distance', 'To show which direction is north', 'To name every road', 'To decorate the map frame'],
        'To relate map distance to actual ground distance',
        'Scale lets a reader convert a measured map length into a real-world distance.',
        'Think about how a small page can represent a much larger place.',
        'A learner may confuse scale with the compass because both help plan a journey.',
        'understand'
      ),
      question(
        'On a map where 1 cm represents 2 km, a clinic is 4 cm from school. What is the ground distance?',
        ['8 km', '6 km', '4 km', '2 km'],
        '8 km',
        'Four map centimetres each represent two kilometres, so the actual distance is 4 × 2 = 8 kilometres.',
        'Use the scale once for every centimetre measured on the map.',
        'A learner may add the map length and scale value instead of multiplying them.',
        'apply'
      ),
      question(
        'A sketch shows three symbols but has no key. What problem will a new reader face?',
        ['The reader cannot reliably tell what the symbols represent', 'The reader cannot see the paper frame', 'The map automatically changes direction', 'Every distance becomes exactly one kilometre'],
        'The reader cannot reliably tell what the symbols represent',
        'Without a key, the meaning of symbols depends on guessing and the map cannot communicate features clearly.',
        'Ask which information is missing when unfamiliar symbols appear.',
        'A learner may believe common-looking symbols always have one universal meaning.',
        'analyse'
      ),
      question(
        'Which design makes a school safety map most useful to a visitor?',
        ['Clear title, neat frame, north arrow, consistent key, and usable scale', 'Many colours with no labels', 'A title and pictures but no directions', 'A scale copied from another map of a different area'],
        'Clear title, neat frame, north arrow, consistent key, and usable scale',
        'All five elements work together to identify the map, orient the reader, decode symbols, and judge distances.',
        'Evaluate whether a visitor can identify, orient, interpret, and measure from the map.',
        'A learner may value attractive decoration more than accurate map communication.',
        'analyse'
      )
    ]
  },
  {
    key: 'social-g5-location-kenya',
    subjectId: 'social',
    subjectName: 'Social Studies',
    grade: 'Grade 5',
    strand: 'Natural and Historic Built Environments',
    subStrand: 'Location, Position and Size of Kenya',
    title: 'Place Kenya Among Its Neighbours',
    shortTitle: 'Kenya on the Map',
    objective: 'Locate Kenya in Eastern Africa, describe neighbouring countries and the Indian Ocean using compass directions, and value cooperation.',
    minutes: 9,
    sourceRef: source('social-studies'),
    visual: {
      setting: 'community',
      elements: ['outline map of Kenya', 'five neighbouring countries', 'Indian Ocean coast', 'compass direction arrows']
    },
    questions: [
      question(
        'Which country lies directly south of Kenya?',
        ['Tanzania', 'Ethiopia', 'South Sudan', 'Somalia'],
        'Tanzania',
        'Tanzania shares Kenya’s southern border, while the other listed countries lie north or east.',
        'Use the compass and inspect the border below Kenya on a standard map.',
        'A learner may recall a neighbouring country without checking its direction.',
        'recall'
      ),
      question(
        'Why is the Indian Ocean important when describing Kenya’s position?',
        ['It forms Kenya’s south-eastern coastline', 'It surrounds Kenya on every side', 'It lies west of Lake Victoria', 'It separates Kenya from Tanzania by land'],
        'It forms Kenya’s south-eastern coastline',
        'The Indian Ocean provides a clear physical reference along Kenya’s south-eastern boundary.',
        'Find the large water body beside Kenya’s coastal counties and note its direction.',
        'A learner may describe Kenya as an island because it has an ocean coast.',
        'understand'
      ),
      question(
        'A traveller moves from Kenya into Uganda. In which general direction has the traveller moved?',
        ['West', 'East', 'North-east', 'South'],
        'West',
        'Uganda borders Kenya to the west, so crossing from Kenya into Uganda is generally westward.',
        'Place both countries on the same compass-oriented map before choosing.',
        'A learner may reverse the direction by imagining travel from Uganda to Kenya.',
        'apply'
      ),
      question(
        'A map labels Ethiopia south of Kenya and Tanzania north of Kenya. What is the best diagnosis?',
        ['The north-south positions of the two neighbours are reversed', 'Kenya has no northern neighbours', 'The Indian Ocean should replace both countries', 'The map needs only a brighter colour'],
        'The north-south positions of the two neighbours are reversed',
        'Ethiopia is north of Kenya and Tanzania is south, so the map has swapped their relative positions.',
        'Check each neighbour independently against the compass direction from Kenya.',
        'A learner may spot that the map is wrong but not identify the exact positional error.',
        'analyse'
      ),
      question(
        'Which example best shows how neighbouring countries benefit from good relations?',
        ['Cooperating on trade, transport, health, and shared environmental concerns', 'Closing every road between communities', 'Refusing to share weather warnings', 'Moving border labels to win an argument'],
        'Cooperating on trade, transport, health, and shared environmental concerns',
        'Respectful cooperation helps neighbouring countries handle movement, commerce, safety, and shared resources.',
        'Choose the option that solves cross-border needs through peaceful cooperation.',
        'A learner may think knowing map positions has no connection to responsible regional relationships.',
        'analyse'
      )
    ]
  },
  {
    key: 'social-g5-physical-features',
    subjectId: 'social',
    subjectName: 'Social Studies',
    grade: 'Grade 5',
    strand: 'Natural and Historic Built Environments',
    subStrand: 'Main Physical Features in Kenya',
    title: 'From Relief to River',
    shortTitle: 'Kenya’s Land',
    objective: 'Identify and locate major Kenyan relief and drainage features, classify them accurately, and connect their value with responsible care.',
    minutes: 10,
    sourceRef: source('social-studies'),
    visual: {
      setting: 'nature',
      elements: ['Mount Kenya relief symbol', 'Great Rift Valley', 'Lake Victoria shoreline', 'Tana River drainage line']
    },
    questions: [
      question(
        'Which feature is a drainage feature?',
        ['Tana River', 'Mount Kenya', 'Nyandarua Range', 'Great Rift Valley'],
        'Tana River',
        'Rivers, lakes, and oceans are drainage features because they form part of water systems.',
        'Choose the feature made mainly of flowing or collected surface water.',
        'A learner may group every natural feature together without distinguishing landform from water feature.',
        'recall'
      ),
      question(
        'Why is the Great Rift Valley classified as a relief feature?',
        ['It is a major shape and variation of the land surface', 'It is a river flowing to the ocean', 'It is built entirely by people', 'It measures daily rainfall'],
        'It is a major shape and variation of the land surface',
        'Relief describes the height, slope, and form of land, including valleys, mountains, and plateaus.',
        'Decide whether the feature describes land shape or a water system.',
        'A learner may hear “valley” and assume it is a drainage feature because water can flow through valleys.',
        'understand'
      ),
      question(
        'Where should Lake Victoria be placed on a map of Kenya?',
        ['Along Kenya’s western border area', 'At the Indian Ocean coast near Lamu', 'North-east of Somalia', 'On the summit of Mount Kenya'],
        'Along Kenya’s western border area',
        'Kenya shares part of Lake Victoria in the west with Uganda and Tanzania.',
        'Use neighbouring Uganda and Tanzania as location clues for the lake.',
        'A learner may place every large water body on the ocean coastline.',
        'apply'
      ),
      question(
        'A map key uses a triangle for mountains and a blue line for rivers. Which pairing follows the key?',
        ['Mount Kenya—triangle; Tana River—blue line', 'Mount Kenya—blue line; Tana River—triangle', 'Lake Victoria—triangle; Rift Valley—blue line', 'Indian Ocean—triangle; Mount Elgon—blue line'],
        'Mount Kenya—triangle; Tana River—blue line',
        'Mount Kenya is a relief feature shown with the mountain symbol, while Tana is a river shown as a blue line.',
        'Classify each named feature before applying the symbol rule.',
        'A learner may memorise symbols but attach them without identifying the feature type.',
        'analyse'
      ),
      question(
        'Which plan best values Kenya’s physical features while allowing responsible use?',
        ['Protect catchments, prevent dumping, follow safe trails, and support conservation', 'Clear all vegetation from steep slopes', 'Dispose of waste in rivers after visits', 'Build anywhere without studying erosion risk'],
        'Protect catchments, prevent dumping, follow safe trails, and support conservation',
        'Careful use protects water, soil, habitats, and visitor safety while preserving benefits for communities.',
        'Look for a plan that protects both relief and drainage features over time.',
        'A learner may value a feature only for immediate use and ignore long-term damage.',
        'analyse'
      )
    ]
  },
  // Religious Education is pluralistic and provisional because the stored system has no
  // Grade 5 KICD design source for a specific CRE, IRE, or HRE pathway.
  {
    key: 'religion-g5-purpose',
    subjectId: 'religious_education',
    subjectName: 'Religious Education',
    grade: 'Grade 5',
    strand: 'Foundations of Religious Education',
    subStrand: 'Purpose of Religious Education',
    title: 'Turn Values into Everyday Choices',
    shortTitle: 'Values in Action',
    objective: 'Connect Religious Education with responsible, caring, honest, and peaceful choices at school, at home, and in the community.',
    minutes: 9,
    sourceRef: `git:${QUIZ_BANK_COMMIT}:apps/api/data/quiz-bank/KEN/CBC/questions/grade-5/religious_education.json (provisional generic pathway; no stored Grade 5 KICD design source)`,
    visual: {
      setting: 'classroom',
      elements: ['shared class materials', 'learner returning a lost item', 'home responsibility chart', 'peaceful discussion circle']
    },
    questions: [
      question(
        'Which action best shows responsible living at school?',
        ['Returning a lost pencil case to its owner or teacher', 'Hiding shared books after class', 'Blaming another learner without evidence', 'Ignoring a spill in a busy doorway'],
        'Returning a lost pencil case to its owner or teacher',
        'Returning lost property demonstrates honesty, care for others, and responsibility for a safe community.',
        'Choose the action that respects another person and protects trust.',
        'A learner may think responsibility means avoiding involvement in other people’s problems.',
        'recall'
      ),
      question(
        'Why does Religious Education often use stories and teachings about values?',
        ['They help learners reflect on choices and their effects on others', 'They provide excuses to avoid duties', 'They make every person practise identically', 'They replace the need to think carefully'],
        'They help learners reflect on choices and their effects on others',
        'Stories and teachings can provide examples for examining character, consequences, relationships, and responsible action.',
        'Think about how an example can guide reflection without making the choice for you.',
        'A learner may treat values learning as memorising words rather than considering conduct.',
        'understand'
      ),
      question(
        'At home, Kamau notices that his younger sibling cannot reach the water container. Which response applies care and responsibility?',
        ['Help safely and show the sibling how to ask an adult when needed', 'Laugh and move the container farther away', 'Pretend not to notice', 'Spill the water to end the problem'],
        'Help safely and show the sibling how to ask an adult when needed',
        'Helpful, safe action responds to another person’s need while building responsible habits.',
        'Look for a choice that solves the need kindly without creating a new risk.',
        'A learner may confuse kindness with doing something unsafe or taking over every task.',
        'apply'
      ),
      question(
        'A class promises to care for shared books, but several are left in the rain. Which response best repairs both the harm and trust?',
        ['Dry and report the books, accept responsibility, and agree on a storage routine', 'Hide the damaged books', 'Accuse a learner without checking', 'Stop sharing books forever'],
        'Dry and report the books, accept responsibility, and agree on a storage routine',
        'Repairing damage, telling the truth, and improving the routine combine accountability with prevention.',
        'Choose a response that addresses the books, honesty, and future behaviour.',
        'A learner may think an apology alone is enough when practical repair is possible.',
        'analyse'
      ),
      question(
        'Which class project best turns values learning into responsible community action?',
        ['Identify a shared need, listen respectfully, plan safe service, act, and reflect', 'Choose a project without asking anyone affected', 'Compete to show which belief is best', 'Promise help but never assign tasks'],
        'Identify a shared need, listen respectfully, plan safe service, act, and reflect',
        'Responsible service begins with listening and combines thoughtful planning, action, cooperation, and reflection.',
        'Test the project for respect, real need, safety, action, and learning afterwards.',
        'A learner may focus on visible activity while ignoring whether the community wanted or benefited from it.',
        'analyse'
      )
    ]
  },
  {
    key: 'religion-g5-diversity',
    subjectId: 'religious_education',
    subjectName: 'Religious Education',
    grade: 'Grade 5',
    strand: 'Foundations of Religious Education',
    subStrand: 'Respect for Religious Diversity',
    title: 'Curiosity with Care',
    shortTitle: 'Respectful Dialogue',
    objective: 'Use respectful language to learn about religious diversity, compare practices fairly, and respond constructively to difference.',
    minutes: 10,
    sourceRef: `git:${QUIZ_BANK_COMMIT}:apps/api/data/quiz-bank/KEN/CBC/questions/grade-5/religious_education.json (provisional generic pathway; no stored Grade 5 KICD design source)`,
    visual: {
      setting: 'community',
      elements: ['neighbours greeting one another', 'church, mosque, and temple silhouettes', 'respectful question cards', 'shared community clean-up']
    },
    questions: [
      question(
        'Which phrase shows respect when asking about a religious practice?',
        ['Would you be comfortable explaining what this practice means to you?', 'Why do your people do that strange thing?', 'Prove that your practice is the best.', 'I already know what everyone in your group believes.'],
        'Would you be comfortable explaining what this practice means to you?',
        'The question asks permission, avoids judgement, and lets the person describe their own experience.',
        'Look for language that is curious, optional, and free from insulting labels.',
        'A learner may think any question is respectful simply because it seeks information.',
        'recall'
      ),
      question(
        'Why should learners avoid assuming that every member of one religion practises in exactly the same way?',
        ['People and communities may express a shared tradition in different ways', 'Religions have no teachings at all', 'Only adults can have beliefs', 'Differences make respectful learning impossible'],
        'People and communities may express a shared tradition in different ways',
        'Religious identity can include varied family, community, cultural, and personal expressions.',
        'Distinguish the name of a tradition from every individual person’s lived experience.',
        'A learner may turn one example into a claim about an entire group.',
        'understand'
      ),
      question(
        'A classmate is absent for an important religious observance. Which response is most respectful?',
        ['Share missed notes without mocking or demanding private details', 'Spread guesses about the observance', 'Hide the assignment as a joke', 'Say the absence cannot matter'],
        'Share missed notes without mocking or demanding private details',
        'Practical support and respect for privacy help a classmate participate without being singled out.',
        'Choose a response that supports learning and lets the classmate decide what to share.',
        'A learner may confuse curiosity with a right to another person’s private explanation.',
        'apply'
      ),
      question(
        'Two worship spaces use different symbols and layouts. Which comparison is fairest?',
        ['Describe each feature and ask what role it serves in that community', 'Call the unfamiliar space incorrect', 'Judge both only by building size', 'Assume similar colours have identical meanings'],
        'Describe each feature and ask what role it serves in that community',
        'Fair comparison uses accurate observation and community meaning without ranking unfamiliar practices.',
        'Separate neutral description from judgement, then seek meaning from reliable voices.',
        'A learner may believe comparing means choosing a winner rather than understanding similarities and differences.',
        'analyse'
      ),
      question(
        'A discussion becomes tense after a learner stereotypes a religious group. What should the class do next?',
        ['Pause, name the harmful generalisation, check reliable information, and restate ideas respectfully', 'Repeat the stereotype until everyone agrees', 'Ask the targeted learner to defend an entire group', 'End all future learning about diversity'],
        'Pause, name the harmful generalisation, check reliable information, and restate ideas respectfully',
        'A constructive response protects dignity, corrects the reasoning error, and restores respectful evidence-based discussion.',
        'Look for a response that addresses harm, accuracy, and how the conversation continues.',
        'A learner may stay silent to avoid conflict even when a respectful correction is needed.',
        'analyse'
      )
    ]
  },
  {
    key: 'religion-g5-sacred-texts',
    subjectId: 'religious_education',
    subjectName: 'Religious Education',
    grade: 'Grade 5',
    strand: 'Sacred Texts and Teachings',
    subStrand: 'Sacred Texts',
    title: 'Learn from Texts with Respect',
    shortTitle: 'Sacred Texts',
    objective: 'Identify selected sacred texts and demonstrate accurate, respectful, and pluralistic ways to discuss and handle them in learning settings.',
    minutes: 10,
    sourceRef: `git:${QUIZ_BANK_COMMIT}:apps/api/data/quiz-bank/KEN/CBC/questions/grade-5/religious_education.json (provisional generic pathway; no stored Grade 5 KICD design source)`,
    visual: {
      setting: 'classroom',
      elements: ['clean learning table', 'Bible, Qur’an, and Bhagavad Gita title cards', 'community guidance note', 'careful handling reminder']
    },
    questions: [
      question(
        'What makes a text sacred to a religious community?',
        ['The community regards it as carrying important religious teaching or revelation', 'It is always the largest book in a library', 'It must have the most colourful cover', 'It is used only for handwriting practice'],
        'The community regards it as carrying important religious teaching or revelation',
        'A sacred text has special religious authority or meaning within the community that values it.',
        'Focus on the text’s meaning and place within a faith community, not its appearance.',
        'A learner may identify importance by book size, age, or decoration alone.',
        'recall'
      ),
      question(
        'Why should a learner ask about local guidance before handling a sacred text?',
        ['Communities may have respectful practices for its use and care', 'Every book is too dangerous to touch', 'The learner must first agree with every teaching', 'Sacred texts cannot be studied in school'],
        'Communities may have respectful practices for its use and care',
        'Asking first recognises that communities can have particular expectations for cleanliness, placement, reading, or storage.',
        'Think about how respectful visitors learn the expectations of the people who value an item.',
        'A learner may use ordinary book habits without considering a community’s sacred-text etiquette.',
        'understand'
      ),
      question(
        'Which pairing is accurate?',
        ['Qur’an—Islam', 'Bible—Hinduism', 'Bhagavad Gita—Christianity', 'Torah—Buddhism'],
        'Qur’an—Islam',
        'The Qur’an is the sacred scripture of Islam; the other pairings connect texts with the wrong traditions.',
        'Recall which community reads the named text as its central scripture.',
        'A learner may recognise all the titles as religious but mix up their communities.',
        'apply'
      ),
      question(
        'A display labels one text “true” and the others “less important.” What is the best revision for a pluralistic class?',
        ['Describe each text’s name and significance to its own community without ranking them', 'Remove every text from the lesson', 'Keep the ranking but use smaller letters', 'Ask one learner to speak for all religions'],
        'Describe each text’s name and significance to its own community without ranking them',
        'A pluralistic lesson represents traditions accurately on their own terms and avoids asking the class to rank beliefs.',
        'Replace judgement with accurate identification and community-specific significance.',
        'A learner may think neutrality requires avoiding the topic rather than presenting it fairly.',
        'analyse'
      ),
      question(
        'Which inquiry plan best supports respectful learning about sacred texts?',
        ['Use reliable sources, ask permission, quote briefly in context, and compare without ranking', 'Handle every text without guidance', 'Use jokes as the main evidence', 'Copy a passage and claim all religions teach it identically'],
        'Use reliable sources, ask permission, quote briefly in context, and compare without ranking',
        'Reliable context, consent, careful use, and fair comparison protect both accuracy and respect.',
        'Check the plan for trustworthy evidence, community care, context, and balanced language.',
        'A learner may believe respectful intention is enough even when sources or comparisons are inaccurate.',
        'analyse'
      )
    ]
  }
];

export const grade5LessonSeeds = defineCurriculumChapters(chapters);

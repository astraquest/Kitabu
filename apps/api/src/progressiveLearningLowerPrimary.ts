import {
  defineCurriculumChapters,
  type CurriculumChapterSource,
  type CurriculumQuestionSource
} from './progressiveLearningCurriculum.js';

type LowerPrimaryGrade = 'Grade 1' | 'Grade 2' | 'Grade 3';
type Topic = readonly [
  slug: string,
  strand: string,
  subStrand: string,
  objective: string,
  practice: string,
  benefit: string,
  misconception: string
];

type SubjectCurriculum = {
  grade: LowerPrimaryGrade;
  subjectId: string;
  subjectName: string;
  sourceRef: string;
  setting: CurriculumChapterSource['visual']['setting'];
  topics: readonly Topic[];
};

const KICD_VOLUME_1 = 'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-1-curriculum-designs-September-2017.pdf';
const KICD_VOLUME_2 = 'https://kicd.ac.ke/wp-content/uploads/2017/10/volume-2-curriculum-designs-September-2017.pdf';
const KICD_VOLUME_3 = 'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-3-curriculum-designs-September-2017.pdf';
const KICD_VOLUME_4 = 'https://kicd.ac.ke/wp-content/uploads/2018/02/Volume-4-curriculum-designs-final-Dec-2017C-min.pdf';
const KICD_GRADE_ONE_ENVIRONMENTAL = 'https://kicd.ac.ke/wp-content/uploads/2024/03/Environmental-activities-for-Grade-1.pdf';

const curriculum: readonly SubjectCurriculum[] = [
  {
    grade: 'Grade 1', subjectId: 'english', subjectName: 'English', sourceRef: KICD_VOLUME_1, setting: 'classroom',
    topics: [
      ['attentive-listening', 'Listening and Speaking', 'Attentive Listening', 'Listen attentively during conversations, respond to simple one-directional instructions, and value attentive listening for effective communication.', 'Face the speaker, wait for a turn, and act on the instruction heard.', 'Careful listening helps a learner understand the message and respond correctly.', 'Talking over the speaker before the message is complete.'],
      ['pronunciation-vocabulary', 'Listening and Speaking', 'Pronunciation and Vocabulary', 'Distinguish familiar sounds in short words, complete simple words with the correct letter, pronounce them clearly, and use their meanings in familiar contexts.', 'Say the word slowly, listen for the missing sound, and choose the letter that completes the word.', 'Connecting sounds, letters and meanings prepares a learner to read and use new vocabulary.', 'Choosing a letter before listening to every sound in the word.'],
      ['language-structures', 'Listening and Speaking', 'Language Structures', 'Use greetings and the present-tense forms am, is and are to complete simple sentences about oneself, other people and familiar objects.', 'Read the whole sentence, identify who or what it is about, and choose the missing word that makes it sound right.', 'Simple sentence patterns help learners introduce people, describe objects and communicate politely.', 'Choosing a word without checking who or what the sentence is about.']
    ]
  },
  {
    grade: 'Grade 2', subjectId: 'english', subjectName: 'English', sourceRef: KICD_VOLUME_1, setting: 'classroom',
    topics: [
      ['attentive-listening', 'Listening and Speaking', 'Attentive Listening', 'Listen attentively, follow oral information and multi-step classroom directions, and respond appropriately in familiar contexts.', 'Listen to all the steps, repeat them in order, and then carry them out.', 'Remembering the sequence helps a learner complete every part of an oral direction.', 'Starting after the first step and ignoring the rest of the direction.'],
      ['pronunciation-vocabulary', 'Listening and Speaking', 'Pronunciation and Vocabulary', 'Articulate grade-appropriate sounds and use new vocabulary accurately when speaking about familiar people, places, and events.', 'Listen to the model word, pronounce every sound, and use the word in context.', 'Accurate sounds and contextual word use make a message clearer to a listener.', 'Repeating a new word without checking its sound or meaning.'],
      ['language-structures', 'Listening and Speaking', 'Language Structures', 'Construct meaningful sentences with appropriate word order and language patterns for effective oral communication.', 'Choose words that agree and place them in a complete, meaningful sentence.', 'Agreement and word order allow the listener to follow who did what.', 'Changing word order randomly because every arrangement is assumed to mean the same thing.']
    ]
  },
  {
    grade: 'Grade 3', subjectId: 'english', subjectName: 'English', sourceRef: KICD_VOLUME_1, setting: 'classroom',
    topics: [
      ['attentive-listening', 'Listening and Speaking', 'Attentive Listening', 'Listen for key ideas and details, follow oral directions, and respond relevantly and respectfully during conversations.', 'Listen for the main idea and supporting details before giving a relevant response.', 'Separating the main idea from details supports accurate understanding and respectful conversation.', 'Choosing one familiar word and treating it as the whole message.'],
      ['pronunciation-vocabulary', 'Listening and Speaking', 'Pronunciation and Vocabulary', 'Pronounce grade-appropriate words accurately and select vocabulary that fits familiar social and learning situations.', 'Compare the spoken word with a model and choose vocabulary that fits the situation.', 'Matching pronunciation and word choice to context makes communication precise.', 'Using the same vague word for every person, place, object, or action.'],
      ['language-structures', 'Listening and Speaking', 'Language Structures', 'Use increasingly varied sentence structures to organize thoughts and communicate experiences, needs, and feelings clearly.', 'Join related ideas with a suitable connecting word and check that the sentence remains clear.', 'Connected sentences show how ideas relate and help a listener follow a complete thought.', 'Joining unrelated ideas without checking whether the sentence still makes sense.']
    ]
  },
  {
    grade: 'Grade 1', subjectId: 'kiswahili', subjectName: 'Kiswahili', sourceRef: KICD_VOLUME_1, setting: 'classroom',
    topics: [
      ['maamkuzi', 'Karibu Darasani', 'Kusikiliza na Kuzungumza: Maamkuzi', 'Kutambua maneno ya maamkuzi, kuamkua na kuitikia salamu, na kuthamini umuhimu wa salamu katika mawasiliano.', 'Tumia salamu inayofaa na uitikie kwa heshima kulingana na hali.', 'Maamkuzi yanayofaa hujenga heshima na mawasiliano mazuri.', 'Kutumia salamu bila kusikiliza au kuitikia mwenzako.'],
      ['maagizo', 'Karibu Darasani', 'Kusikiliza na Kuzungumza: Maagizo', 'Kutambua, kutoa na kufuata maagizo mepesi yanayotumiwa darasani na kuthamini umuhimu wake katika maisha ya kila siku.', 'Sikiliza agizo lote, litaje tena, kisha ulitekeleze kwa usalama.', 'Kufuata agizo kwa mpangilio husaidia kazi kufanyika kwa usahihi.', 'Kuanza kutenda kabla ya kusikia agizo lote.'],
      ['msamiati', 'Karibu Darasani', 'Kusikiliza na Kuzungumza: Msamiati', 'Kutambua na kutumia majina ya vifaa vinavyopatikana darasani ili kuimarisha mawasiliano ya kila siku.', 'Taja kifaa cha darasani na utumie jina lake katika sentensi fupi.', 'Kutumia jina sahihi la kifaa hufanya ujumbe ueleweke wazi.', 'Kutumia neno moja lisilo maalum kutaja vifaa vyote.']
    ]
  },
  {
    grade: 'Grade 2', subjectId: 'kiswahili', subjectName: 'Kiswahili', sourceRef: KICD_VOLUME_1, setting: 'classroom',
    topics: [
      ['sauti-herufi', 'Shuleni', 'Sauti na Majina ya Herufi za Kiswahili', 'Kutambua na kutamka sauti na majina ya herufi za Kiswahili na kuzitumia kusoma na kuandika maneno rahisi.', 'Tamka sauti, tambua herufi yake, kisha iunganishe na silabi kusoma neno.', 'Kuunganisha sauti na herufi hujenga msingi wa kusoma na kuandika.', 'Kukariri jina la herufi bila kutambua sauti inayowakilishwa.'],
      ['maamkuzi-nyakati', 'Shuleni', 'Maamkuzi ya Nyakati za Siku', 'Kutambua na kutumia maamkuzi yanayofaa asubuhi, mchana na jioni katika mawasiliano ya heshima.', 'Chagua salamu inayolingana na wakati wa siku na uitikie kwa heshima.', 'Salamu inayolingana na wakati huonyesha uelewa na adabu.', 'Kutumia salamu ya usiku wakati wa asubuhi bila kuzingatia muktadha.'],
      ['msamiati-shuleni', 'Shuleni', 'Msamiati wa Shuleni', 'Kutambua, kusoma na kutumia msamiati unaohusiana na mazingira na vifaa vya shule katika sentensi.', 'Chagua neno sahihi la mazingira ya shule na ulitumie katika sentensi kamili.', 'Msamiati sahihi huwezesha kueleza watu, vifaa na shughuli za shule.', 'Kuchagua neno kwa kufanana kwa sauti bila kuangalia maana.']
    ]
  },
  {
    grade: 'Grade 3', subjectId: 'kiswahili', subjectName: 'Kiswahili', sourceRef: KICD_VOLUME_1, setting: 'garden',
    topics: [
      ['sauti-mbili', 'Shambani', 'Sauti Mbili Zinazotamkwa Pamoja', 'Kutambua, kutamka, kusoma na kuandika silabi na maneno yenye sauti mbili zinazotamkwa pamoja.', 'Tamka sauti zilizounganishwa, soma silabi, kisha tumia neno katika sentensi.', 'Mazoezi ya sauti zilizounganishwa huimarisha matamshi, usomaji na uandishi.', 'Kutenganisha sauti ambazo zinapaswa kutamkwa pamoja katika neno.'],
      ['msamiati-shambani', 'Shambani', 'Msamiati wa Shambani', 'Kutambua na kutumia msamiati wa shughuli na vifaa vya shambani katika maneno na sentensi sahihi.', 'Tambua kifaa au shughuli ya shambani na uieleze kwa neno na sentensi sahihi.', 'Msamiati maalum huwezesha kueleza kazi na vifaa vya shambani kwa usahihi.', 'Kuchanganya jina la kifaa na kazi inayofanywa na kifaa hicho.'],
      ['masimulizi', 'Shambani', 'Kusikiliza na Kuzungumza: Masimulizi', 'Kusikiliza masimulizi kwa makini, kutambua mawazo muhimu, kujibu maswali na kusimulia matukio kwa mpangilio.', 'Sikiliza mwanzo, kati na mwisho, kisha simulia matukio kwa mpangilio.', 'Mpangilio wa matukio husaidia msikilizaji kuelewa masimulizi.', 'Kusimulia matukio bila kuzingatia yalitokea lini.']
    ]
  },
  {
    grade: 'Grade 1', subjectId: 'math', subjectName: 'Mathematics', sourceRef: KICD_VOLUME_2, setting: 'classroom',
    topics: [
      ['number-concept', 'Numbers', 'Number Concept', 'Sort, match, order and make patterns with objects, recite number names to 50, and represent numbers 1-30 using concrete objects.', 'Count each object once, group by one visible attribute, and check the total.', 'One-to-one counting and clear grouping make number comparisons reliable.', 'Counting the same object twice when objects are moved.'],
      ['whole-numbers', 'Numbers', 'Whole Numbers', 'Count, read, write, compare and order whole numbers within the Grade 1 range using objects, symbols and number patterns.', 'Match a group of objects to its numeral and place numbers from least to greatest.', 'Connecting quantities, symbols and order builds a correct whole-number idea.', 'Choosing the longest-written numeral as the greatest number.'],
      ['addition', 'Numbers', 'Addition', 'Combine groups of objects and add whole numbers in familiar daily situations using concrete materials and number symbols.', 'Join the two groups, count every object once, and write the addition sentence.', 'Addition finds the new total after quantities are combined.', 'Counting only the second group after the groups are joined.']
    ]
  },
  {
    grade: 'Grade 2', subjectId: 'math', subjectName: 'Mathematics', sourceRef: KICD_VOLUME_2, setting: 'classroom',
    topics: [
      ['number-concept', 'Numbers', 'Number Concept', 'Read and represent numbers 1-100 using symbols, concrete objects and familiar groups in the environment.', 'Build the number with tens and ones, then match the model to its numeral.', 'Grouping in tens and ones makes numbers to one hundred easier to read and represent.', 'Treating every counter as a ten regardless of its group.'],
      ['whole-numbers', 'Numbers', 'Whole Numbers', 'Count forward and backward to 100, identify place value to hundreds, and complete number patterns using twos, fives and tens.', 'Find the pattern rule, apply the same step, and check the next two numbers.', 'A consistent rule explains every move in a number pattern.', 'Changing the size of the step whenever a number looks difficult.'],
      ['fractions', 'Numbers', 'Fractions', 'Recognize and represent halves and quarters by sharing familiar objects and shapes into equal parts.', 'Divide the whole into equal parts and name one part by the total number of parts.', 'Equal parts are essential because a fraction describes a fair share of one whole.', 'Calling unequal pieces halves because there are two pieces.']
    ]
  },
  {
    grade: 'Grade 3', subjectId: 'math', subjectName: 'Mathematics', sourceRef: KICD_VOLUME_2, setting: 'market',
    topics: [
      ['number-concept', 'Numbers', 'Number Concept', 'Read, represent and use Grade 3 numbers accurately in symbols, concrete models and familiar problem-solving contexts.', 'Represent the number with place-value groups and verify it by counting each group.', 'Place-value models show how the digits combine to make the whole number.', 'Reading each digit separately without considering its place.'],
      ['whole-numbers', 'Numbers', 'Whole Numbers', 'Use place value, number patterns, comparison and ordering to work confidently with whole numbers in daily situations.', 'Compare digits from the greatest place first and use the result to order the numbers.', 'The first unequal place determines which whole number is greater.', 'Comparing only the final digit of multi-digit numbers.'],
      ['fractions', 'Numbers', 'Fractions', 'Identify, compare and use common fractions as equal parts of objects, shapes and groups in practical situations.', 'Check that the whole is the same size and its parts are equal before comparing fractions.', 'A fair fraction comparison needs equal wholes and equal subdivisions.', 'Comparing fraction pieces from differently sized wholes without checking the whole.']
    ]
  },
  {
    grade: 'Grade 1', subjectId: 'environmental', subjectName: 'Environmental', sourceRef: KICD_GRADE_ONE_ENVIRONMENTAL, setting: 'nature',
    topics: [
      ['cleaning-my-body', 'Social Environment', 'Cleaning My Body', 'Identify materials used to clean the face, teeth, hands, feet and hair, practise cleaning these body parts, and value personal hygiene.', 'Name the body part, match it with a suitable cleaning material, and clean it without wasting water.', 'Recognising body parts and their cleaning materials supports safe daily hygiene.', 'Using one cleaning material for every body part without checking whether it is suitable.'],
      ['our-home', 'Social Environment', 'Our Home', 'Identify materials used to clean the home, describe common home accidents, and practise keeping the home clean and safe.', 'Match a cleaning material to its task and identify places or objects that may cause an accident.', 'A clean, orderly home reduces dirt and preventable accidents.', 'Playing near a dangerous object because it is familiar.'],
      ['family-needs', 'Social Environment', 'Family Needs', 'Identify basic family needs, classify food and shelter items, and select foods that support a healthy body.', 'Sort familiar pictures into food, clothing, shelter and other basic family needs.', 'Recognising family needs helps learners make healthy and responsible choices.', 'Treating every wanted item as a basic need.'],
      ['our-school', 'Social Environment', 'Our School', 'Identify physical features between home and school and practise personal safety while travelling to and from school.', 'Name familiar landmarks and choose a safe action for the journey to school.', 'Landmarks and safety rules help learners find their way and avoid danger.', 'Leaving the safe route to follow an unfamiliar shortcut.'],
      ['our-market', 'Social Environment', 'Our Market', 'Identify people and food items found in a market and group familiar foods as fruits or vegetables.', 'Observe market pictures, name familiar items, and sort fruits and vegetables.', 'Market activities connect food, people and community work.', 'Grouping every market item as food.'],
      ['weather-sky', 'Natural Environment', 'Weather and the Sky', 'Describe the sky during day and night, identify local weather conditions, and record simple weather observations.', 'Observe the sky safely and match the conditions to a clear weather symbol.', 'Regular observation helps learners recognise changes in the sky and weather.', 'Looking directly at the sun while observing the sky.'],
      ['soil', 'Natural Environment', 'Soil', 'Identify safe ways of playing and modelling with soil and develop curiosity through responsible exploration.', 'Use soil to make a simple model, tidy the area, and wash hands afterwards.', 'Safe soil play develops observation, creativity and responsibility.', 'Tasting soil or leaving dirty hands after the activity.'],
      ['sound', 'Natural Environment', 'Sound', 'Identify sounds in the environment, create sounds safely, and distinguish sounds that warn people of danger.', 'Listen to a sound, identify its source, and respond safely to warning sounds.', 'Recognising sounds helps learners enjoy their environment and notice danger.', 'Ignoring a warning sound because its source cannot be seen.'],
      ['water', 'Resources in Our Environment', 'Water', 'Identify nearby water sources and uses, conserve water at home and school, and value clean water sources.', 'Name a water source or use and choose an action that prevents waste.', 'Careful water use protects health and keeps the resource available.', 'Leaving a tap running because water seems plentiful.'],
      ['plants', 'Resources in Our Environment', 'Plants', 'Identify and draw the flower, leaves, stem and roots of familiar plants and practise caring for plants.', 'Observe a plant picture, name the indicated part, and water plants responsibly.', 'Knowing plant parts helps learners observe and care for living plants.', 'Pulling up healthy plants repeatedly to inspect their roots.'],
      ['animals', 'Resources in Our Environment', 'Animals', 'Identify familiar animals and their food and practise safe, caring ways to feed and water domestic animals.', 'Name the animal, match it to suitable food, and wash hands after caring for it.', 'Suitable food, clean water and gentle handling help animals stay healthy.', 'Giving every animal the same food without checking its needs.']
    ]
  },
  {
    grade: 'Grade 2', subjectId: 'environmental', subjectName: 'Environmental', sourceRef: KICD_VOLUME_2, setting: 'nature',
    topics: [
      ['weather', 'Environment and Its Resources', 'Weather', 'Describe weather conditions, respond safely, record conditions with symbols, and interpret simple weather messages.', 'Observe the weather, choose the correct symbol, and select clothing or shelter that fits the condition.', 'Weather records help people communicate conditions and prepare safely.', 'Choosing a weather symbol from memory without observing the day.'],
      ['water', 'Environment and Its Resources', 'Water', 'Explain why water is stored, identify safe storage methods, and store water appropriately to prevent health risks.', 'Use a clean covered container and a clean method for drawing stored water.', 'Covering and handling stored water safely reduces contamination.', 'Leaving the storage container open so the water can breathe.'],
      ['soil', 'Environment and Its Resources', 'Soil', 'Explore soil properties and uses and practise responsible ways of caring for soil in the local environment.', 'Compare samples by colour and feel, match each to a suitable use, and return soil responsibly.', 'Soil properties affect how it can be used and why it needs protection.', 'Assuming every soil sample has exactly the same properties and uses.']
    ]
  },
  {
    grade: 'Grade 3', subjectId: 'environmental', subjectName: 'Environmental', sourceRef: KICD_VOLUME_2, setting: 'nature',
    topics: [
      ['weather', 'Environment and Its Resources', 'Weather', 'Observe, record and interpret changing weather conditions and select safe responses for people and the environment.', 'Record conditions at the same times and use the pattern to explain a safe response.', 'Consistent records reveal weather changes more reliably than one observation.', 'Claiming a weekly pattern from a single observation.'],
      ['water', 'Environment and Its Resources', 'Water', 'Identify water sources and conservation practices and explain how to protect water from waste and contamination.', 'Protect the source, use a clean covered container, and take only the water needed.', 'Source protection, clean handling and conservation keep water useful for more people.', 'Throwing waste near a water source because flowing water will carry it away.'],
      ['soil', 'Environment and Its Resources', 'Soil', 'Compare soil characteristics, explain useful roles of soil, and apply practical ways of conserving it.', 'Compare samples fairly and keep soil covered with plants or mulch where erosion is likely.', 'Vegetation and mulch reduce direct impact and help soil stay in place.', 'Removing all plant cover before heavy rain.']
    ]
  },
  {
    grade: 'Grade 1', subjectId: 'cre', subjectName: 'CRE', sourceRef: KICD_VOLUME_3, setting: 'home',
    topics: [
      ['self-awareness', 'Creation', 'Self-Awareness', 'Recognize oneself as uniquely created in the image of God, use one\'s name for identity, and appreciate personal worth.', 'Say your name confidently and identify one good ability for which you are thankful.', 'Christian self-awareness supports gratitude, dignity and respect for every person.', 'Comparing people to decide that only one person is valuable.'],
      ['my-family', 'Creation', 'My Family', 'Identify family members, appreciate the family as part of God\'s plan, and show love, respect and responsibility at home.', 'Name family members and choose a loving, respectful way to help at home.', 'Love and responsibility strengthen relationships and peaceful family life.', 'Demanding help from others while refusing every family responsibility.'],
      ['creation-plants', 'Creation', 'Creation of Plants', 'Recognize God as creator of plants, identify familiar plants, and demonstrate care and appreciation for creation.', 'Identify a familiar plant and care for it with suitable water and protection.', 'Caring for plants shows gratitude and helps living things and people thrive.', 'Damaging a plant for fun because another plant can replace it.']
    ]
  },
  {
    grade: 'Grade 2', subjectId: 'cre', subjectName: 'CRE', sourceRef: KICD_VOLUME_3, setting: 'home',
    topics: [
      ['self-awareness', 'Creation', 'Self-Awareness', 'Appreciate personal gifts and abilities as part of God\'s creation and use them responsibly in daily life.', 'Identify a personal gift and use it to help rather than belittle another person.', 'Responsible use of gifts builds confidence, service and respect for others.', 'Using a strength to make another learner feel unimportant.'],
      ['my-family', 'Creation', 'My Family', 'Recognize family relationships and practise love, obedience, sharing and responsibility for harmonious living.', 'Listen to a responsible instruction, share fairly, and complete an age-appropriate duty.', 'Christian values help family members trust and care for one another.', 'Obeying only when a reward is promised.'],
      ['creation-world', 'Creation', 'Creation of the World', 'Describe selected parts of the creation story and show responsibility in caring for living and non-living things.', 'Retell the selected creation events in order and choose one practical care action.', 'Understanding creation should lead to gratitude and responsible stewardship.', 'Retelling the story while deliberately wasting or damaging resources.']
    ]
  },
  {
    grade: 'Grade 3', subjectId: 'cre', subjectName: 'CRE', sourceRef: KICD_VOLUME_3, setting: 'community',
    topics: [
      ['self-awareness', 'Creation', 'Self-Awareness', 'Appreciate being created in God\'s image, manage thoughts and feelings, and make choices that reflect Christian values.', 'Name the feeling, pause, and choose a respectful action that does not harm another person.', 'Self-control helps thoughts and feelings lead to loving and responsible choices.', 'Treating every strong feeling as permission to hurt someone.'],
      ['my-family', 'Creation', 'My Family', 'Identify nuclear and extended family relationships, draw a family tree, and respect responsible family leadership.', 'Place family members correctly on a simple family tree and explain one relationship.', 'A family tree makes relationships and generations easier to understand.', 'Placing people randomly because every family relationship is identical.'],
      ['adam-eve', 'Creation', 'Adam and Eve', 'Retell the creation and disobedience of Adam and Eve and explain why obedience supports good relationships at home and school.', 'Retell the key events in order and connect the consequence to a responsible choice today.', 'The story helps learners consider how choices, obedience and consequences are connected.', 'Naming the consequence without considering the choice that led to it.']
    ]
  },
  {
    grade: 'Grade 1', subjectId: 'ire', subjectName: 'IRE', sourceRef: KICD_VOLUME_3, setting: 'classroom',
    topics: [
      ['arabic-alphabet', 'Qur\'an', 'Arabic Alphabet', 'Pronounce and identify Arabic letters, read simple Arabic words, and write letters from right to left as readiness for Qur\'an recitation.', 'Listen to the letter sound, identify its shape, and practise writing from right to left.', 'Connecting sound, shape and writing direction builds readiness for Qur\'an reading.', 'Writing Arabic letters from left to right without following the model.'],
      ['selected-surah', 'Qur\'an', 'Selected Surah', 'Recite selected short Surah accurately, state their simple meaning, and appreciate using their teachings in daily life.', 'Listen to a correct model, recite in short sections, and describe one teaching.', 'Careful recitation and understanding help the learner apply Qur\'anic guidance.', 'Rushing through memorized sounds without listening for accurate articulation.'],
      ['belief-allah', 'Pillars of Iman', 'Belief in Allah', 'Recognize Allah as the Creator and demonstrate love, gratitude and care for His creation.', 'Name a sign of creation, express gratitude to Allah, and care for it responsibly.', 'Gratitude is shown through words, worship and responsible care for creation.', 'Claiming gratitude while deliberately damaging living things.']
    ]
  },
  {
    grade: 'Grade 2', subjectId: 'ire', subjectName: 'IRE', sourceRef: KICD_VOLUME_3, setting: 'classroom',
    topics: [
      ['arabic-alphabet', 'Qur\'an', 'Arabic Alphabet', 'Join and pronounce Arabic letters accurately in simple words to strengthen readiness for Qur\'an reading and writing.', 'Compare letter forms, join them correctly, and read the completed word aloud.', 'Recognizing how forms join supports accurate word reading and writing.', 'Joining letters without checking how their shapes change in a word.'],
      ['selected-surah', 'Qur\'an', 'Selected Surah', 'Recite selected Surah accurately, explain age-appropriate teachings, and apply them in familiar situations.', 'Recite from a correct model and choose a daily action that matches the teaching.', 'Application connects accurate recitation to Islamic character and conduct.', 'Reciting correctly but choosing conduct that opposes the teaching.'],
      ['books-prophets', 'Pillars of Iman', 'Belief in Allah\'s Books and Prophets', 'Name selected revealed books and prophets and show respect for the guidance Allah gave through them.', 'Match selected books and prophets carefully and state why divine guidance matters.', 'Correct identification supports respectful understanding of revelation and prophethood.', 'Guessing every book-prophet match from the first letter of a name.']
    ]
  },
  {
    grade: 'Grade 3', subjectId: 'ire', subjectName: 'IRE', sourceRef: KICD_VOLUME_3, setting: 'community',
    topics: [
      ['selected-surah', 'Qur\'an', 'Selected Surah', 'Recite selected Surah accurately, describe their key teachings, and demonstrate those teachings in daily choices.', 'Recite accurately, explain the central teaching, and select conduct that demonstrates it.', 'Understanding and conduct show that recitation has informed daily life.', 'Explaining a teaching correctly but deliberately choosing its opposite.'],
      ['angels-books', 'Pillars of Iman', 'Belief in Allah\'s Angels and Books', 'Describe the role of Allah\'s angels and revealed books at an age-appropriate level and appreciate divine guidance.', 'Sort accurate statements about angels and revealed books and explain the role of guidance.', 'Careful classification prevents different articles of faith from being confused.', 'Assigning human needs and limitations to angels.'],
      ['early-life-prophet', 'Siirah', 'Early Life of Prophet Muhammad', 'Retell selected events from the early life of Prophet Muhammad and identify values that learners can practise.', 'Place selected events in order and connect one demonstrated value to a daily action.', 'A chronological account helps learners understand how values appear in real choices.', 'Memorizing names without connecting events to their sequence or values.']
    ]
  },
  {
    grade: 'Grade 1', subjectId: 'hygiene_nutrition', subjectName: 'Hygiene and Nutrition', sourceRef: KICD_VOLUME_2, setting: 'home',
    topics: [
      ['healthy-habits', 'Health Practices', 'Healthy Habits', 'Identify and practise habits that prevent illness and promote the wellbeing of self and others.', 'Wash hands at the right times, use safe water, eat well, rest, and stay active.', 'Consistent healthy habits reduce infection risk and support growth and wellbeing.', 'Washing hands with water only for a moment after using the toilet.'],
      ['care-teeth', 'Health Practices', 'Care of the Teeth', 'Identify materials and steps for cleaning teeth and practise regular oral care to keep teeth healthy.', 'Brush every tooth gently with a suitable brush and toothpaste at the recommended times.', 'Regular thorough brushing removes food remains and helps prevent tooth problems.', 'Brushing only the front teeth because they are the visible ones.'],
      ['medicine', 'Health Practices', 'Use of Medicine', 'Recognize that medicine should be used only with guidance from a responsible adult and handled and stored safely.', 'Tell a responsible adult and take only medicine they give according to its instructions.', 'Adult guidance and correct instructions reduce the risk of harmful medicine use.', 'Taking a friend\'s medicine because the symptoms appear similar.']
    ]
  },
  {
    grade: 'Grade 2', subjectId: 'hygiene_nutrition', subjectName: 'Hygiene and Nutrition', sourceRef: KICD_VOLUME_2, setting: 'home',
    topics: [
      ['good-health', 'Health Practices', 'Importance of Good Health', 'Explain and practise health habits that support physical wellbeing, cleanliness, safe eating, rest and activity.', 'Balance cleanliness, nutritious food, safe water, rest and physical activity each day.', 'Several consistent habits work together to support energy, growth and illness prevention.', 'Depending on one healthy habit while ignoring all the others.'],
      ['oral-hygiene', 'Health Practices', 'Oral Hygiene', 'Identify habits that promote or damage healthy teeth and maintain a regular record of responsible tooth care.', 'Brush thoroughly, limit sugary snacks, and record the morning and evening routine.', 'A routine record helps a learner notice whether protective habits are consistent.', 'Recording that brushing happened when it was skipped.'],
      ['rooms-equipment', 'Health Practices', 'Use of Rooms and Household Equipment', 'Identify common rooms and equipment in a home and use age-appropriate household items safely and responsibly.', 'Match equipment to its proper room and use it only in the safe, intended way.', 'Correct placement and use reduce accidents and keep household work organized.', 'Playing with sharp or electrical equipment without an adult.']
    ]
  },
  {
    grade: 'Grade 3', subjectId: 'hygiene_nutrition', subjectName: 'Hygiene and Nutrition', sourceRef: KICD_VOLUME_2, setting: 'classroom',
    topics: [
      ['healthy-habits', 'Health Practices', 'Healthy Habits', 'Select, explain and consistently practise healthy habits that promote personal and community wellbeing.', 'Choose a balanced daily routine and explain how each habit protects self or others.', 'Explaining the purpose of habits helps learners apply them in changing situations.', 'Following a habit only when an adult is watching.'],
      ['oral-hygiene', 'Health Practices', 'Oral Hygiene', 'Identify common oral-health problems and apply safe preventive habits and adult-supported responses.', 'Notice a problem, tell a responsible adult, continue safe cleaning, and seek appropriate care.', 'Early adult-supported action can prevent a small oral problem from becoming worse.', 'Hiding persistent tooth pain and stopping all brushing.'],
      ['clean-classroom', 'Health Practices', 'Cleaning the Classroom', 'Identify safe cleaning materials and demonstrate responsible steps for keeping the classroom clean and healthy.', 'Open the room safely, remove litter, clean surfaces with suitable tools, and wash hands.', 'An ordered cleaning routine reduces dust, waste and germs without creating new hazards.', 'Raising dry dust near other learners and leaving cleaning tools on the floor.']
    ]
  },
  {
    grade: 'Grade 1', subjectId: 'creative_activities', subjectName: 'Creative Activities', sourceRef: KICD_VOLUME_4, setting: 'studio',
    topics: [
      ['walking', 'Basic Movement Skills', 'Locomotor Skill: Walking', 'Perform walking in different directions, pathways and levels while observing rules for balance, coordination and safety.', 'Walk with awareness of space, follow the marked pathway, and stop safely on the signal.', 'Controlled movement and space awareness protect the learner and nearby classmates.', 'Changing direction suddenly without checking the space.'],
      ['line', 'Drawing', 'Line', 'Identify and draw straight, curved, wavy and zigzag lines and appreciate one\'s own and others\' artwork.', 'Observe a line in the environment and draw its type and direction with control.', 'Observation and controlled marks help a drawing communicate shape and movement.', 'Calling every line straight because it has two ends.'],
      ['songs', 'Performing', 'Songs', 'Identify and sing simple songs in unison, keep a steady beat, and observe proper etiquette for the national anthem.', 'Listen for the starting pitch, sing with the group, and keep the beat by clapping softly.', 'Listening and keeping a shared beat help a group sing together.', 'Singing as loudly as possible without listening to the group.']
    ]
  },
  {
    grade: 'Grade 2', subjectId: 'creative_activities', subjectName: 'Creative Activities', sourceRef: KICD_VOLUME_4, setting: 'studio',
    topics: [
      ['hopping', 'Basic Movement Skills', 'Locomotor Skill: Hopping', 'Perform hopping in varied directions and pathways with balance, coordination, safe play and respect for rules.', 'Balance on one foot, hop into clear space, land softly, and follow the game signal.', 'A controlled take-off and landing improve balance and reduce collisions.', 'Hopping into another learner\'s pathway without checking.'],
      ['forms', 'Drawing', 'Forms', 'Identify simple forms and suitable tools and draw forms from the physical or digital environment for self-expression.', 'Observe the visible sides of a simple object and use lines and shading to show its form.', 'Careful observation helps a flat drawing suggest a three-dimensional object.', 'Drawing only the object name instead of observing its shape.'],
      ['songs', 'Performing', 'Songs', 'Sing age-appropriate songs accurately in unison and simple rounds and perform the first two national-anthem verses with proper etiquette.', 'Listen to the entry, keep the assigned part, and maintain steady pitch and rhythm.', 'Holding an assigned part allows different voices in a round to fit together.', 'Following whichever group is loudest and abandoning the assigned part.']
    ]
  },
  {
    grade: 'Grade 3', subjectId: 'creative_activities', subjectName: 'Creative Activities', sourceRef: KICD_VOLUME_4, setting: 'studio',
    topics: [
      ['skipping', 'Basic Movement Skills', 'Locomotor Skill: Skipping', 'Perform skipping in varied directions, pathways and levels with coordination, endurance, safe play and teamwork.', 'Step and hop in rhythm, keep a safe distance, and change direction only when space is clear.', 'Rhythm, coordination and awareness make skipping controlled and safe.', 'Moving faster than control allows in a crowded pathway.'],
      ['animal-forms', 'Drawing', 'Animal Forms', 'Observe and draw simple animal forms using appropriate tools and discuss and appreciate completed artwork.', 'Observe the animal\'s main body shapes, arrange them proportionally, and add defining details.', 'Starting with large forms helps the parts fit together into a recognizable animal.', 'Drawing tiny details before placing the main body forms.'],
      ['songs', 'Performing', 'Songs', 'Sing varied songs with accurate pitch, rhythm and expression, sustain a part in a round, and observe national-anthem etiquette.', 'Warm up, listen to the group, sustain the assigned part, and apply suitable expression.', 'Vocal preparation and attentive ensemble singing support accuracy and expressive communication.', 'Ignoring pitch and rhythm because expression alone is assumed to be enough.']
    ]
  }
];

const optionTuple = (answer: string, ...distractors: [string, string, string]): [string, string, string, string] =>
  [answer, ...distractors];

function question(
  prompt: string,
  options: [string, string, string, string],
  answer: string,
  explanation: string,
  hint: string,
  misconception: string,
  cognitiveLevel: CurriculumQuestionSource['cognitiveLevel']
): CurriculumQuestionSource {
  return { prompt, options, answer, explanation, hint, misconception, cognitiveLevel };
}

const GRADE_ONE_ENGLISH_CHALLENGES: Record<string, readonly CurriculumQuestionSource[]> = {
  'attentive-listening': [
    question(
      'Teacher says, “Point to the door.” What should you do?',
      optionTuple('Point to the door.', 'Clap your hands.', 'Open your bag.', 'Close your eyes.'),
      'Point to the door.',
      'Pointing to the door follows the one instruction that was given.',
      'Listen for the action word and the object named in the instruction.',
      'The learner may act on a familiar classroom object instead of the instruction heard.',
      'recall'
    ),
    question(
      'Amina is speaking. What should Kamau do?',
      optionTuple('Listen and wait for his turn.', 'Speak at the same time.', 'Turn his back.', 'Walk away.'),
      'Listen and wait for his turn.',
      'Waiting quietly and facing the speaker shows attentive listening and respect.',
      'Choose the action that helps Kamau hear the complete message.',
      'The learner may confuse joining the conversation with interrupting the speaker.',
      'understand'
    ),
    question(
      'Teacher says, “Stand up.” Which action matches?',
      optionTuple('Stand up.', 'Sit down.', 'Clap twice.', 'Open a book.'),
      'Stand up.',
      'Standing up is the direct action named in the instruction.',
      'Find the choice that repeats the action word you heard.',
      'The learner may choose a common classroom action that was not requested.',
      'recall'
    ),
    question(
      'You hear, “Touch your head.” What should you touch?',
      optionTuple('Your head.', 'Your shoe.', 'Your desk.', 'Your book.'),
      'Your head.',
      'The instruction names the head, so touching it shows the message was understood.',
      'Listen for the body part named at the end of the instruction.',
      'The learner may respond before hearing the object named in the instruction.',
      'understand'
    ),
    question(
      'Which learner is listening well?',
      optionTuple('The learner looking at the speaker.', 'The learner interrupting.', 'The learner playing with a bag.', 'The learner walking away.'),
      'The learner looking at the speaker.',
      'Looking at the speaker and staying ready to respond are signs of attentive listening.',
      'Choose the learner whose body is ready to receive the message.',
      'The learner may focus only on being quiet without attending to the speaker.',
      'apply'
    )
  ],
  'pronunciation-vocabulary': [
    {
      ...question(
        'Which letter completes CH _ IR?',
        optionTuple('A', 'E', 'I', 'O'),
        'A',
        'The letter A completes CH-A-IR, making the word CHAIR.',
        'Look at the picture, say chair slowly, and listen for the missing sound.',
        'The learner may choose a vowel without connecting the picture to the spoken word.',
        'apply'
      ),
      visual: { kind: 'picture_word', object: 'chair', wordPattern: 'CH _ IR', caption: 'chair' }
    },
    {
      ...question(
        'Which letter completes C _ T?',
        optionTuple('A', 'E', 'I', 'U'),
        'A',
        'The letter A completes C-A-T, making the word CAT.',
        'Look at the picture, say cat slowly, and listen for the middle sound.',
        'The learner may choose a vowel by its name instead of its sound in the word.',
        'apply'
      ),
      visual: { kind: 'picture_word', object: 'cat', wordPattern: 'C _ T', caption: 'cat' }
    },
    {
      ...question(
        'Which letter completes S _ N?',
        optionTuple('U', 'A', 'E', 'I'),
        'U',
        'The letter U completes S-U-N, making the word SUN.',
        'Look at the picture, say sun slowly, and listen for the middle sound.',
        'The learner may use a familiar vowel without checking the complete word.',
        'apply'
      ),
      visual: { kind: 'picture_word', object: 'sun', wordPattern: 'S _ N', caption: 'sun' }
    },
    {
      ...question(
        'Which letter completes P _ N?',
        optionTuple('E', 'A', 'I', 'O'),
        'E',
        'The letter E completes P-E-N, making the word PEN.',
        'Look at the picture, say pen slowly, and listen for the middle sound.',
        'The learner may confuse the short E sound with another vowel sound.',
        'apply'
      ),
      visual: { kind: 'picture_word', object: 'pen', wordPattern: 'P _ N', caption: 'pen' }
    },
    {
      ...question(
        'Which letters complete B __ K?',
        optionTuple('OO', 'EE', 'AI', 'OU'),
        'OO',
        'The letters OO complete B-OO-K, making the word BOOK.',
        'Look at the picture, say book, and listen to the sound between B and K.',
        'The learner may select a familiar letter pair without sounding out the pictured word.',
        'apply'
      ),
      visual: { kind: 'picture_word', object: 'book', wordPattern: 'B __ K', caption: 'book' }
    }
  ],
  'language-structures': [
    question(
      'Complete the sentence: I __ Amina.',
      optionTuple('am', 'is', 'are', 'be'),
      'am',
      'We use am after I, so the complete sentence is “I am Amina.”',
      'Read the first word. The word I works with am.',
      'The learner may use is after I because both words describe one person.',
      'apply'
    ),
    question(
      'Complete the sentence: This __ a book.',
      optionTuple('is', 'am', 'are', 'be'),
      'is',
      'We use is for one object, so the sentence is “This is a book.”',
      'The sentence points to one book, so choose the word for one thing.',
      'The learner may use are without checking that only one object is named.',
      'apply'
    ),
    question(
      'Complete the sentence: We __ happy.',
      optionTuple('are', 'is', 'am', 'be'),
      'are',
      'We use are after we, so the complete sentence is “We are happy.”',
      'The word we means more than one person and works with are.',
      'The learner may use is without noticing that we refers to a group.',
      'apply'
    ),
    question(
      'Asha is my sister. __ is kind.',
      optionTuple('She', 'He', 'It', 'We'),
      'She',
      'She replaces the name of a girl or woman, so it correctly refers to Asha.',
      'Find the pronoun that can replace the name Asha.',
      'The learner may choose a pronoun without connecting it to the person named.',
      'understand'
    ),
    question(
      'Complete the greeting: Good __!',
      optionTuple('morning', 'book', 'chair', 'pencil'),
      'morning',
      '“Good morning” is a polite greeting used early in the day.',
      'Choose the word that makes a familiar greeting.',
      'The learner may select a familiar classroom word that does not complete the greeting.',
      'apply'
    )
  ]
};

const GRADE_ONE_KISWAHILI_CHALLENGES: Record<string, readonly CurriculumQuestionSource[]> = {
  maamkuzi: [
    question(
      'Asubuhi?',
      optionTuple('Habari za asubuhi', 'Habari za jioni', 'Usiku mwema', 'Kwaheri'),
      'Habari za asubuhi',
      'Habari za asubuhi ni salamu inayofaa wakati wa asubuhi.',
      'Fikiria wakati jua linapochomoza.',
      'Mwanafunzi anaweza kuchagua salamu ya wakati tofauti.',
      'recall'
    ),
    question(
      'Ukiambiwa: Habari?',
      optionTuple('Nzuri', 'Kwaheri', 'Samahani', 'Tafadhali'),
      'Nzuri',
      'Nzuri ni jibu rahisi la salamu Habari.',
      'Chagua jibu la salamu.',
      'Mwanafunzi anaweza kuchagua neno la adabu ambalo si jibu la salamu.',
      'understand'
    ),
    question(
      'Mchana?',
      optionTuple('Habari za mchana', 'Habari za asubuhi', 'Usiku mwema', 'Kwaheri'),
      'Habari za mchana',
      'Habari za mchana ni salamu inayofaa wakati wa mchana.',
      'Chagua salamu yenye neno mchana.',
      'Mwanafunzi anaweza kuchanganya mchana na asubuhi.',
      'recall'
    ),
    question(
      'Jioni?',
      optionTuple('Habari za jioni', 'Habari za mchana', 'Habari za asubuhi', 'Asante'),
      'Habari za jioni',
      'Habari za jioni ni salamu inayofaa wakati wa jioni.',
      'Chagua salamu yenye neno jioni.',
      'Mwanafunzi anaweza kuchagua salamu ya wakati tofauti.',
      'recall'
    ),
    question(
      'Ukiondoka?',
      optionTuple('Kwaheri', 'Karibu', 'Habari', 'Tafadhali'),
      'Kwaheri',
      'Kwaheri husemwa watu wanapoagana.',
      'Chagua neno la kuagana.',
      'Mwanafunzi anaweza kuchagua salamu ya kukutana badala ya kuagana.',
      'apply'
    )
  ],
  maagizo: [
    question(
      'Mwalimu: Simama.',
      optionTuple('Simama', 'Keti', 'Fungua kitabu', 'Piga makofi'),
      'Simama',
      'Simama ni tendo lililotajwa na mwalimu.',
      'Sikiliza tendo lililotajwa.',
      'Mwanafunzi anaweza kufanya tendo la kawaida ambalo halikuagizwa.',
      'recall'
    ),
    question(
      'Mwalimu: Keti.',
      optionTuple('Keti', 'Simama', 'Funga mlango', 'Gusa kichwa'),
      'Keti',
      'Keti ni tendo lililotajwa na mwalimu.',
      'Chagua tendo linalofanana na agizo.',
      'Mwanafunzi anaweza kuchanganya keti na simama.',
      'recall'
    ),
    question(
      'Mwalimu: Fungua kitabu.',
      optionTuple('Fungua kitabu', 'Funga kitabu', 'Fungua mlango', 'Keti'),
      'Fungua kitabu',
      'Kufungua kitabu kunafuata agizo lote.',
      'Sikiliza tendo na kitu kilichotajwa.',
      'Mwanafunzi anaweza kusikia fungua lakini achague kitu tofauti.',
      'understand'
    ),
    question(
      'Mwalimu: Piga makofi.',
      optionTuple('Piga makofi', 'Keti', 'Soma kitabu', 'Funga mlango'),
      'Piga makofi',
      'Kupiga makofi ni tendo lililoagizwa.',
      'Chagua tendo la kutumia mikono.',
      'Mwanafunzi anaweza kuchagua tendo ambalo halikutajwa.',
      'understand'
    ),
    question(
      'Mwalimu: Funga mlango.',
      optionTuple('Funga mlango', 'Fungua mlango', 'Gusa kichwa', 'Simama'),
      'Funga mlango',
      'Kufunga mlango kunafuata agizo kwa usahihi.',
      'Sikiliza maneno funga na mlango.',
      'Mwanafunzi anaweza kuchanganya funga na fungua.',
      'apply'
    )
  ],
  msamiati: [
    {
      ...question(
        'Jaza herufi: K _ TI',
        optionTuple('I', 'A', 'E', 'O'),
        'I',
        'Herufi I inakamilisha neno KITI.',
        'Tazama picha, sema kiti polepole, kisha sikiliza sauti inayokosekana.',
        'Mwanafunzi anaweza kuchagua irabu bila kutaja kitu kilicho kwenye picha.',
        'apply'
      ),
      visual: { kind: 'picture_word', object: 'chair', wordPattern: 'K _ TI', caption: 'kiti' }
    },
    {
      ...question(
        'Jaza herufi: KITA _ U',
        optionTuple('B', 'P', 'D', 'T'),
        'B',
        'Herufi B inakamilisha neno KITABU.',
        'Tazama picha na useme kitabu kwa sauti.',
        'Mwanafunzi anaweza kuchanganya sauti B na P.',
        'apply'
      ),
      visual: { kind: 'picture_word', object: 'book', wordPattern: 'KITA _ U', caption: 'kitabu' }
    },
    {
      ...question(
        'Jaza herufi: KALA _ U',
        optionTuple('M', 'N', 'L', 'K'),
        'M',
        'Herufi M inakamilisha neno KALAMU.',
        'Tazama picha na useme kalamu polepole.',
        'Mwanafunzi anaweza kuchagua konsonanti isiyolingana na sauti ya neno.',
        'apply'
      ),
      visual: { kind: 'picture_word', object: 'pen', wordPattern: 'KALA _ U', caption: 'kalamu' }
    },
    {
      ...question(
        'Jaza herufi: ME _ A',
        optionTuple('Z', 'S', 'C', 'J'),
        'Z',
        'Herufi Z inakamilisha neno MEZA.',
        'Tazama picha na useme meza polepole.',
        'Mwanafunzi anaweza kuchanganya herufi zenye sauti zinazokaribiana.',
        'apply'
      ),
      visual: { kind: 'picture_word', object: 'table', wordPattern: 'ME _ A', caption: 'meza' }
    },
    {
      ...question(
        'Jaza herufi: PEN _ ELI',
        optionTuple('S', 'Z', 'C', 'J'),
        'S',
        'Herufi S inakamilisha neno PENSELI.',
        'Tazama picha na useme penseli polepole.',
        'Mwanafunzi anaweza kuchagua herufi kabla ya kutamka neno lote.',
        'apply'
      ),
      visual: { kind: 'picture_word', object: 'pencil', wordPattern: 'PEN _ ELI', caption: 'penseli' }
    }
  ]
};

const GRADE_ONE_ENVIRONMENTAL_PICTURE_CHALLENGES: Record<
  string,
  readonly CurriculumQuestionSource[]
> = {
  'cleaning-my-body': [
    {
      ...question('It has eyes and a nose. What is it?', optionTuple('Face', 'Hand', 'Foot', 'Hair'), 'Face', 'The picture shows a face with eyes, a nose and a mouth.', 'Look at the eyes, nose and mouth.', 'The learner may name one feature instead of the whole face.', 'recall'),
      visual: { kind: 'picture_choice', object: 'face', caption: 'a face' }
    },
    {
      ...question('These help us bite. What are they?', optionTuple('Teeth', 'Hair', 'Hand', 'Foot'), 'Teeth', 'The picture shows the teeth found inside a mouth.', 'Look carefully inside the open mouth.', 'The learner may name the mouth instead of the teeth shown inside it.', 'recall'),
      visual: { kind: 'picture_choice', object: 'teeth', caption: 'teeth' }
    },
    {
      ...question('It has fingers. What is it?', optionTuple('Hand', 'Foot', 'Face', 'Hair'), 'Hand', 'The picture shows a hand with fingers and a palm.', 'Look carefully at the fingers in the picture.', 'The learner may confuse the hand with the foot.', 'recall'),
      visual: { kind: 'picture_choice', object: 'hand', caption: 'a hand' }
    },
    {
      ...question('It has toes. What is it?', optionTuple('Foot', 'Hand', 'Teeth', 'Face'), 'Foot', 'The picture shows a foot with toes at the front.', 'Look carefully at the toes in the picture.', 'The learner may confuse the foot with the hand.', 'recall'),
      visual: { kind: 'picture_choice', object: 'foot', caption: 'a foot' }
    },
    {
      ...question('It grows on your head. What is it?', optionTuple('Hair', 'Teeth', 'Hand', 'Foot'), 'Hair', 'The picture shows hair growing on top of a head.', 'Look carefully at the top of the head.', 'The learner may name the whole head instead of the hair.', 'recall'),
      visual: { kind: 'picture_choice', object: 'hair', caption: 'hair' }
    }
  ],
  plants: [
    {
      ...question('It is colourful. Which part is it?', optionTuple('Flower', 'Leaf', 'Stem', 'Roots'), 'Flower', 'The colourful plant part in the picture is a flower.', 'Look at the colourful part of the plant.', 'The learner may confuse the flower with a leaf.', 'recall'),
      visual: { kind: 'picture_choice', object: 'flower', caption: 'a flower' }
    },
    {
      ...question('It is flat and green. Which part is it?', optionTuple('Leaf', 'Flower', 'Stem', 'Roots'), 'Leaf', 'The flat green plant part in the picture is a leaf.', 'Look at the flat green plant part.', 'The learner may confuse the leaf with the stem.', 'recall'),
      visual: { kind: 'picture_choice', object: 'leaf', caption: 'a leaf' }
    },
    {
      ...question('It holds the plant up. Which part is it?', optionTuple('Stem', 'Roots', 'Leaf', 'Flower'), 'Stem', 'The upright plant part in the picture is the stem.', 'Look at the upright part that holds leaves.', 'The learner may confuse the stem with the roots.', 'recall'),
      visual: { kind: 'picture_choice', object: 'stem', caption: 'a stem' }
    },
    {
      ...question('It grows below the soil. Which part is it?', optionTuple('Roots', 'Stem', 'Flower', 'Leaf'), 'Roots', 'The branching plant parts below the soil are roots.', 'Look at the branching part below the soil.', 'The learner may confuse roots with the stem above the soil.', 'recall'),
      visual: { kind: 'picture_choice', object: 'roots', caption: 'plant roots' }
    },
    {
      ...question('Which part takes in water from soil?', optionTuple('Roots', 'Flower', 'Leaf', 'Stem'), 'Roots', 'Roots take in water from the soil and hold the plant firmly.', 'Look at the plant part growing below the soil.', 'The learner may choose a visible part above the soil instead of the roots.', 'understand'),
      visual: { kind: 'picture_choice', object: 'roots', caption: 'plant roots below soil' }
    }
  ],
  animals: [
    {
      ...question('What does this goat eat?', optionTuple('Grass', 'Fish', 'Meat', 'Sweets'), 'Grass', 'A goat eats grass and other plants.', 'Choose the food that grows from the soil.', 'The learner may choose familiar human food instead of suitable animal food.', 'understand'),
      visual: { kind: 'picture_choice', object: 'goat', caption: 'a goat' }
    },
    {
      ...question('What does this chicken eat?', optionTuple('Seeds', 'Meat', 'Sweets', 'Soap'), 'Seeds', 'A chicken eats seeds and other suitable foods.', 'Think about food a chicken pecks from the ground.', 'The learner may choose an unsafe item instead of animal food.', 'understand'),
      visual: { kind: 'picture_choice', object: 'chicken', caption: 'a chicken' }
    },
    {
      ...question('What does this cat eat?', optionTuple('Fish', 'Grass', 'Leaves', 'Soil'), 'Fish', 'A cat can eat fish as suitable food.', 'Choose the animal food from water.', 'The learner may match every animal with grass.', 'understand'),
      visual: { kind: 'picture_choice', object: 'cat', caption: 'a cat' }
    },
    {
      ...question('What does this giraffe eat?', optionTuple('Leaves', 'Fish', 'Meat', 'Sweets'), 'Leaves', 'A giraffe eats leaves from plants.', 'Think about the food it reaches with its long neck.', 'The learner may choose meat because the giraffe is a large animal.', 'understand'),
      visual: { kind: 'picture_choice', object: 'giraffe', caption: 'a giraffe' }
    },
    {
      ...question('What does this lion eat?', optionTuple('Meat', 'Grass', 'Seeds', 'Leaves'), 'Meat', 'A lion eats meat from other animals as its natural food.', 'Choose the food eaten by this hunting animal.', 'The learner may choose plants because other pictured animals eat them.', 'understand'),
      visual: { kind: 'picture_choice', object: 'lion', caption: 'a lion' }
    }
  ]
};

type ArithmeticSample = {
  answer: number;
  distractors: [number, number, number];
  leftOperand: number;
  operator: '+' | '-' | '×' | '÷';
  rightOperand: number;
};

const ARITHMETIC_SAMPLES: Record<LowerPrimaryGrade, readonly ArithmeticSample[]> = {
  'Grade 1': [
    { leftOperand: 6, operator: '+', rightOperand: 3, answer: 9, distractors: [8, 10, 7] },
    { leftOperand: 10, operator: '-', rightOperand: 4, answer: 6, distractors: [5, 7, 8] },
    { leftOperand: 7, operator: '+', rightOperand: 5, answer: 12, distractors: [11, 13, 10] },
    { leftOperand: 13, operator: '-', rightOperand: 6, answer: 7, distractors: [6, 8, 9] },
    { leftOperand: 9, operator: '+', rightOperand: 8, answer: 17, distractors: [16, 18, 15] }
  ],
  'Grade 2': [
    { leftOperand: 14, operator: '-', rightOperand: 6, answer: 8, distractors: [7, 9, 6] },
    { leftOperand: 7, operator: '+', rightOperand: 8, answer: 15, distractors: [14, 16, 13] },
    { leftOperand: 16, operator: '-', rightOperand: 9, answer: 7, distractors: [6, 8, 9] },
    { leftOperand: 5, operator: '×', rightOperand: 3, answer: 15, distractors: [8, 12, 18] },
    { leftOperand: 18, operator: '÷', rightOperand: 3, answer: 6, distractors: [5, 7, 9] }
  ],
  'Grade 3': [
    { leftOperand: 4, operator: '×', rightOperand: 6, answer: 24, distractors: [20, 22, 28] },
    { leftOperand: 27, operator: '÷', rightOperand: 3, answer: 9, distractors: [6, 8, 12] },
    { leftOperand: 35, operator: '-', rightOperand: 17, answer: 18, distractors: [16, 17, 19] },
    { leftOperand: 16, operator: '+', rightOperand: 29, answer: 45, distractors: [43, 44, 46] },
    { leftOperand: 7, operator: '×', rightOperand: 8, answer: 56, distractors: [48, 54, 64] }
  ]
};

function arithmeticQuestion(sample: ArithmeticSample): CurriculumQuestionSource {
  const expression = `${sample.leftOperand} ${sample.operator} ${sample.rightOperand}`;
  return {
    prompt: `What is ${expression}?`,
    options: optionTuple(String(sample.answer), ...sample.distractors.map(String) as [string, string, string]),
    answer: String(sample.answer),
    explanation: `${expression} = ${sample.answer}. The operation and number facts give the required total.`,
    hint: 'Use counters, equal groups, or a number line, then check the operation one step at a time.',
    misconception: 'The learner may choose a nearby number without carrying out the operation.',
    cognitiveLevel: 'apply',
    visual: {
      kind: 'arithmetic',
      leftOperand: sample.leftOperand,
      operator: sample.operator,
      rightOperand: sample.rightOperand,
      caption: 'Work out the number sentence, then choose the answer that matches your calculation.'
    }
  };
}

function questionsFor(grade: LowerPrimaryGrade, subjectId: string, subjectName: string, topic: Topic): CurriculumQuestionSource[] {
  const [slug, , subStrand, , practice, benefit, misconception] = topic;
  if (grade === 'Grade 1' && subjectId === 'english') {
    return [...GRADE_ONE_ENGLISH_CHALLENGES[slug]];
  }
  if (grade === 'Grade 1' && subjectId === 'kiswahili') {
    return [...GRADE_ONE_KISWAHILI_CHALLENGES[slug]];
  }
  if (
    grade === 'Grade 1' &&
    subjectId === 'environmental' &&
    GRADE_ONE_ENVIRONMENTAL_PICTURE_CHALLENGES[slug]
  ) {
    return [...GRADE_ONE_ENVIRONMENTAL_PICTURE_CHALLENGES[slug]];
  }
  if (subjectId === 'math' && slug === 'number-concept') {
    return ARITHMETIC_SAMPLES[grade].map(arithmeticQuestion);
  }
  const plan = `${practice} Then explain the result using what was observed.`;
  const openingQuestion = question(
    `Which action best demonstrates ${subStrand} in ${subjectName}?`,
    optionTuple(practice, misconception, 'Skip the activity and copy an answer without checking.', 'Choose an unrelated action because it looks easier.'),
    practice,
    `${practice} This directly practises the knowledge or skill named in the KICD outcome.`,
    `Look for the choice that lets the ${grade} learner actively show the target skill.`,
    `The learner may confuse ${misconception.toLocaleLowerCase('en-KE')} with a successful strategy.`,
    'recall'
  );
  return [
    openingQuestion,
    question(
      `Why is the recommended ${subStrand} practice useful?`,
      optionTuple(benefit, 'It guarantees success without any practice.', 'It removes the need to listen, observe or check.', 'It makes every other idea automatically incorrect.'),
      benefit,
      benefit,
      'Choose the reason that connects the activity to learning, safety, understanding or responsible action.',
      'A learner may choose an absolute claim instead of a realistic learning benefit.',
      'understand'
    ),
    question(
      `A ${grade} learner is beginning ${subStrand}. What should the learner do first?`,
      optionTuple(practice, 'Wait for another learner to do every part of the task.', misconception, 'Select an answer before reading or observing the task.'),
      practice,
      `The first action should engage the learner in the actual outcome. ${benefit}`,
      'Find the choice that is active, safe, connected to the topic, and possible for the learner to check.',
      `The learner may begin with ${misconception.toLocaleLowerCase('en-KE')} instead of the target action.`,
      'apply'
    ),
    question(
      `Which approach is most likely to cause a mistake while learning ${subStrand}?`,
      optionTuple(misconception, practice, 'Ask a clear question when support is needed.', 'Check the result against the instruction or evidence.'),
      misconception,
      `${misconception} This breaks an important condition of the learning outcome and should be corrected.`,
      'Identify the choice that ignores accuracy, safety, sequence, evidence or respectful conduct.',
      'A learner may mistake a responsible checking strategy for the error.',
      'analyse'
    ),
    question(
      `Which plan best shows understanding of ${subStrand}?`,
      optionTuple(plan, `${misconception} Then stop without checking.`, 'Memorize one word and avoid the practical activity.', 'Copy a classmate and give no explanation or evidence.'),
      plan,
      `${plan} The plan combines active practice with an explanation that makes learning visible.`,
      'The strongest plan includes the target action and a way to explain or check what happened.',
      'A learner may treat task completion without reasoning as full understanding.',
      'analyse'
    )
  ];
}

const chapters: CurriculumChapterSource[] = curriculum.flatMap(subject =>
  subject.topics.map((topic, index) => {
    const [slug, strand, subStrand, objective, practice] = topic;
    const gradeNumber = subject.grade.slice(-1);
    return {
      key: `${subject.subjectId}-g${gradeNumber}-${slug}`,
      lessonVersion:
        subject.grade === 'Grade 1' && subject.subjectId === 'english'
          ? 3
          : subject.grade === 'Grade 1' && subject.subjectId === 'kiswahili'
            ? 2
            : subject.grade === 'Grade 1' && subject.subjectId === 'environmental'
              ? 2
            : undefined,
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      grade: subject.grade,
      strand,
      subStrand,
      title: subStrand,
      shortTitle: subStrand.length <= 28 ? subStrand : `${subStrand.slice(0, 25).trim()}...`,
      objective,
      minutes: index === 1 ? 9 : 10,
      sourceRef: `${subject.sourceRef}#${encodeURIComponent(subject.grade)}-${encodeURIComponent(subStrand)}`,
      visual: {
        setting: subject.setting,
        elements: [practice, `${subStrand} activity materials`, 'learner explanation and check']
      },
      questions: questionsFor(subject.grade, subject.subjectId, subject.subjectName, topic)
    } satisfies CurriculumChapterSource;
  })
);

export const lowerPrimaryLessonSeeds = defineCurriculumChapters(chapters);

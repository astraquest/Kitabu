import {
  defineCurriculumChapters,
  type CurriculumChapterSource
} from './progressiveLearningCurriculum.js';

type CognitiveLevel = CurriculumChapterSource['questions'][number]['cognitiveLevel'];
type QuestionSeed = {
  prompt: string;
  options: [string, string, string, string];
  answer: string;
  explanation: string;
  cognitiveLevel: CognitiveLevel;
};

type ChapterMeta = Omit<CurriculumChapterSource, 'questions'>;

const QUIZ_BANK_COMMIT = 'ea1342bad94104c45a1ab9f8dfdbf8f38e92a2ed';
const source = (subjectId: string, questionRange: string) =>
  `git:${QUIZ_BANK_COMMIT}:apps/api/data/quiz-bank/KEN/CBC/questions/grade-8/${subjectId}.json#questions-${questionRange}`;

const hints: Record<CognitiveLevel, string> = {
  recall: 'Recall the key meaning from this topic, then remove choices borrowed from unrelated ideas.',
  understand: 'Look for the choice that explains the relationship, not one that merely repeats a familiar word.',
  apply: 'Identify the goal and every constraint in the situation before testing each possible action.',
  analyse: 'Compare every clue with every option; the strongest answer must account for all the evidence.'
};

const chapterStrategies: Record<string, string> = {
  'g8-agriculture-soil-conservation': 'Trace how rain moves down a slope, then compare which measure slows water, holds soil, or keeps the surface covered.',
  'g8-agriculture-water-harvesting': 'Follow the collection chain from roof to gutter to covered storage, checking each point for leaks or contamination.',
  'g8-agriculture-kitchen-gardening': 'Match each garden decision to a plant need: suitable space, light, drainage, nutrients, water, and regular observation.',
  'g8-business-financial-goals': 'Turn the target amount and deadline into smaller saving steps, then test whether the plan fits the money available.',
  'g8-business-income': 'Separate total value received from costs and profit, and check that the source creates value honestly.',
  'g8-business-budgeting': 'Add every planned use of money, compare the total with income, and protect needs and saving before wants.',
  'g8-creative-roles': 'Link the evidence to a cultural, social, educational, health, or economic role instead of choosing a decorative detail.',
  'g8-creative-components': 'Name the function of each creative or sports component before matching it to the activity where it belongs.',
  'g8-creative-drawing-painting': 'Look for the choice that deliberately changes scale, placement, tone, or complementary colour to guide the viewer.',
  'g8-english-listening-comprehension': 'Separate the speaker’s main message from supporting details, then identify the action the listener is expected to take.',
  'g8-english-active-listening': 'Look for verbal and non-verbal cues that show attention, invite clarification, and preserve the speaker’s meaning.',
  'g8-english-tone-mood': 'Combine the speaker’s words, voice, punctuation, and situation; no single clue should carry the whole inference.',
  'g8-science-elements-compounds': 'Count the types of atoms and inspect how they are bonded before deciding whether the model is an element, molecule, or compound.',
  'g8-science-physical-chemical-changes': 'Ask whether a new substance forms, whether the change reverses easily, and how particle spacing or motion changes.',
  'g8-science-classes-fire': 'Identify the burning fuel first, match it to its fire class, then choose a safe action that removes heat, fuel, or oxygen without approaching danger.',
  'g8-kiswahili-ufahamu-kusikiliza': 'Tenganisha ujumbe mkuu na maelezo yanayounga mkono, kisha utambue hatua anayotakiwa kuchukua msikilizaji.',
  'g8-kiswahili-usikilizaji-makini': 'Tafuta ishara za maneno na za mwili zinazoonyesha umakini, heshima, ufafanuzi na uelewa sahihi.',
  'g8-kiswahili-matamshi': 'Tamka neno polepole, ligawanye kwa mapigo ya silabi, kisha linganisha sauti zinazokaribiana.',
  'g8-life-strengths-growth': 'Use specific evidence from actions or feedback to separate an established strength from a skill that still needs practice.',
  'g8-life-personal-habits': 'Trace the cue, routine, and result of the habit, then change one practical part of the loop and plan a review.',
  'g8-life-values-choices': 'Name the value at stake, compare likely consequences for everyone involved, and choose an action that protects dignity and safety.',
  'g8-math-integers': 'Mark the starting value and direction on a number line; treat a negative change and subtracting a negative as different operations.',
  'g8-math-fractions': 'Build equivalent fractions with a common denominator, follow operation order, and simplify only after the calculation is complete.',
  'g8-math-decimals': 'Align place values, inspect the next digit when rounding, and count decimal moves carefully when using standard form.',
  'g8-pretech-fire-safety': 'Identify the ignition source and fuel, then prioritise alarm, isolation if safe, evacuation, and a responsible adult over improvised firefighting.',
  'g8-pretech-data-safety': 'Protect confidentiality, integrity, and recovery by checking access, strong authentication, approved backups, and suspicious activity.',
  'g8-pretech-plane-geometry': 'Choose the instrument for the required measurement, keep construction points fixed, and verify dimensions before darkening lines.',
  'g8-religion-purpose': 'Connect the scenario to responsible conduct, reflection, service, and respect without assuming one learner’s faith tradition.',
  'g8-religion-core-values': 'Identify the value at stake, compare the consequences for every person affected, and choose the action that treats people consistently and with dignity.',
  'g8-religion-diversity': 'Choose language and plans that include different traditions fairly, seek consent, and avoid ranking or stereotyping beliefs.',
  'g8-social-inquiry': 'Build the inquiry from a focused question through ethical evidence collection, corroboration, analysis, and a supported conclusion.',
  'g8-social-sources': 'Check who created the source, why, when, and with what evidence, then corroborate important claims independently.',
  'g8-social-map-scale': 'Measure the map distance in the stated unit, apply the scale to every unit, then convert and check whether the result is realistic.'
};

function q(
  prompt: string,
  options: [string, string, string, string],
  answer: string,
  explanation: string,
  cognitiveLevel: CognitiveLevel
): QuestionSeed {
  return { prompt, options, answer, explanation, cognitiveLevel };
}

function chapter(meta: ChapterMeta, questions: QuestionSeed[]): CurriculumChapterSource {
  const strategy = chapterStrategies[meta.key];
  if (!strategy) throw new Error(`Missing Grade 8 coaching strategy for ${meta.key}`);
  return {
    ...meta,
    questions: questions.map((question, index) => ({
      ...question,
      hint: `${strategy} ${hints[question.cognitiveLevel]}`,
      misconception: `${meta.key.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}_${index + 1}_${question.cognitiveLevel.toUpperCase()}`
    }))
  };
}

const chapters: CurriculumChapterSource[] = [
  chapter({
    key: 'g8-agriculture-soil-conservation', subjectId: 'agriculture', subjectName: 'Agriculture', grade: 'Grade 8',
    strand: 'Conservation of Resources', subStrand: 'Soil Conservation Measures', title: 'Protect the Soil, Protect the Harvest', shortTitle: 'Soil Conservation',
    objective: 'Compare soil conservation measures and select practical ways to reduce runoff and erosion in Kenyan farms and school gardens.',
    minutes: 10, sourceRef: source('agriculture', '1-8'),
    visual: { setting: 'garden', elements: ['contour strips', 'stone line', 'grassed waterway', 'runoff arrows'] }
  }, [
    q('Which soil conservation method uses alternating strips of crops to slow runoff on a slope?', ['Strip cropping', 'Terracing the entire slope into level steps', 'Mulching every bed with one continuous cover', 'Planting one grassed waterway at the lowest point'], 'Strip cropping', 'Strip cropping places different crops in strips so that runoff loses speed and carries away less soil.', 'recall'),
    q('Why are stone lines placed across, rather than down, a cultivated slope?', ['They slow runoff and trap soil', 'They make water flow faster', 'They remove all soil organisms', 'They replace every crop'], 'They slow runoff and trap soil', 'Lines across the slope interrupt flowing water, allowing carried soil to settle.', 'understand'),
    q('Runoff channels are forming beside a school garden after heavy rain. Which response is most suitable?', ['Establish a grassed waterway', 'Clear all ground cover', 'Dig channels straight downhill', 'Burn crop residues'], 'Establish a grassed waterway', 'A grassed waterway guides runoff safely while roots protect the channel from erosion.', 'apply'),
    q('Which pair both slows runoff and can add organic matter as it decays?', ['Trash lines and mulching', 'Bare soil and burning', 'Deep channels and sweeping', 'Plastic sheets and quarrying'], 'Trash lines and mulching', 'Plant residues protect the surface, slow moving water and eventually return organic matter to soil.', 'analyse'),
    q('A steep plot has little stone but plenty of crop residue and grass. Which plan best uses available resources?', ['Lay trash lines on contours and plant grass strips', 'Leave the slope bare until rain ends', 'Pile residue at the bottom only', 'Plough straight down the slope'], 'Lay trash lines on contours and plant grass strips', 'Contour trash lines and grass strips use local materials to slow runoff at several points on the slope.', 'analyse')
  ]),
  chapter({
    key: 'g8-agriculture-water-harvesting', subjectId: 'agriculture', subjectName: 'Agriculture', grade: 'Grade 8',
    strand: 'Conservation of Resources', subStrand: 'Water Harvesting and Storage', title: 'Catch Every Useful Drop', shortTitle: 'Water Harvesting',
    objective: 'Design safe rainwater collection and storage choices that conserve water and reduce contamination in homes and schools.',
    minutes: 9, sourceRef: source('agriculture', '9-16'),
    visual: { setting: 'classroom', elements: ['roof catchment', 'gutter', 'covered tank', 'clean tap'] }
  } as ChapterMeta, [
    q('Which item is most suitable for storing harvested rainwater for domestic use at school?', ['A covered clean tank', 'A leaking basin', 'An open dirty pit', 'A torn sack'], 'A covered clean tank', 'A clean covered tank reduces contamination and water loss, making harvested water safer for use.', 'recall'),
    q('What is the main job of a gutter in a roof-harvesting system?', ['Direct roof runoff to storage', 'Purify water by boiling it', 'Measure daily water use', 'Pump groundwater uphill'], 'Direct roof runoff to storage', 'Gutters collect rain from a roof and guide it toward a downpipe and storage container.', 'understand'),
    q('Before the rainy season, which maintenance action most improves stored-water quality?', ['Clean the roof, gutters and tank inlet', 'Leave the tank lid open', 'Disconnect the downpipe', 'Store tools inside the tank'], 'Clean the roof, gutters and tank inlet', 'Cleaning collection surfaces and the inlet reduces dirt entering the water system.', 'apply'),
    q('A tank fills but loses water overnight. What should learners investigate first?', ['Leaks at the tank, tap and pipe joints', 'The colour of classroom walls', 'The number of garden beds', 'The length of the school bell'], 'Leaks at the tank, tap and pipe joints', 'Checking all likely escape points directly tests why stored water is being lost.', 'analyse'),
    q('Which plan best provides cleaning water during dry days while protecting safety?', ['Collect roof water in a covered labelled tank and inspect it regularly', 'Keep water in open tins beside a path', 'Mix harvested water with workshop waste', 'Allow anyone to dip dirty cups into storage'], 'Collect roof water in a covered labelled tank and inspect it regularly', 'Covered, maintained storage conserves water and limits contamination during later use.', 'analyse')
  ]),
  chapter({
    key: 'g8-agriculture-kitchen-gardening', subjectId: 'agriculture', subjectName: 'Agriculture', grade: 'Grade 8',
    strand: 'Food Production Processes', subStrand: 'Kitchen and Backyard Gardening', title: 'Grow Food in Small Spaces', shortTitle: 'Kitchen Gardens',
    objective: 'Plan and care for productive kitchen or backyard gardens using available space, safe practices and locally suitable crops.',
    minutes: 10, sourceRef: source('agriculture', '17-24'),
    visual: { setting: 'home', elements: ['sack garden', 'sukuma wiki', 'watering can', 'compost mulch'] }
  }, [
    q('What is one main role of a kitchen garden at home?', ['Providing vegetables, herbs, or spices near the house', 'Serving only as an ornamental flower display', 'Storing tools where crops would otherwise grow', 'Disposing household wastewater without treatment'], 'Providing vegetables, herbs, or spices near the house', 'A kitchen garden supports food production by growing useful crops close to where meals are prepared.', 'recall'),
    q('Why do drainage holes matter in a container garden?', ['They prevent roots sitting in excess water', 'They stop every insect entering', 'They replace regular watering', 'They make soil unnecessary'], 'They prevent roots sitting in excess water', 'Drainage lets extra water escape so roots still receive air and are less likely to rot.', 'understand'),
    q('A household has a sunny balcony but no open soil. How can it grow sukuma wiki?', ['Use sacks or containers with soil and drainage', 'Plant seedlings in a closed cupboard', 'Wait until it owns a large farm', 'Grow plants in sealed plastic bags'], 'Use sacks or containers with soil and drainage', 'Container or sack gardening uses vertical or limited space while providing soil, light and drainage.', 'apply'),
    q('Leaves are yellowing and the soil is waterlogged. Which change best addresses the evidence?', ['Improve drainage and reduce excess watering', 'Add water every hour', 'Move plants into darkness', 'Remove every drainage hole'], 'Improve drainage and reduce excess watering', 'Waterlogging and yellowing point to poor root aeration, so drainage and watering frequency should be corrected.', 'analyse'),
    q('Which weekly plan best supports a healthy, affordable kitchen garden?', ['Check moisture, weed, inspect pests and add safe compost when needed', 'Spray unlabelled chemicals daily', 'Harvest every seedling immediately', 'Ignore weeds until they cover crops'], 'Check moisture, weed, inspect pests and add safe compost when needed', 'Regular observation and proportionate care conserve resources while supporting plant health.', 'analyse')
  ]),

  chapter({
    key: 'g8-business-financial-goals', subjectId: 'business_studies', subjectName: 'Business Studies', grade: 'Grade 8',
    strand: 'Business and Money Management', subStrand: 'Financial Goals', title: 'Turn a Wish into a Money Plan', shortTitle: 'Financial Goals',
    objective: 'Set specific, realistic financial goals and build simple saving plans that fit a learner’s available resources and priorities.',
    minutes: 9, sourceRef: source('business_studies', '1-8'),
    visual: { setting: 'home', elements: ['goal card', 'savings jar', 'calendar', 'progress tracker'] }
  }, [
    q('Which statement best describes a financial goal?', ['A money target a person plans to achieve within a period', 'Any item bought without thinking', 'A rumour about market prices', 'A receipt kept after shopping'], 'A money target a person plans to achieve within a period', 'A financial goal gives direction for earning, saving, spending, or investing money within a set time.', 'recall'),
    q('Why should a useful savings goal include a deadline?', ['It helps calculate and track regular progress', 'It makes the item cost nothing', 'It guarantees unlimited income', 'It removes every unexpected expense'], 'It helps calculate and track regular progress', 'A time frame turns a target amount into smaller periodic steps that can be monitored.', 'understand'),
    q('A learner wants KSh 600 for an atlas in three months. What monthly target fits the goal?', ['KSh 200', 'KSh 100', 'KSh 300', 'KSh 600'], 'KSh 200', 'Dividing KSh 600 by three months gives a regular target of KSh 200 per month.', 'apply'),
    q('A learner can save KSh 100 monthly but sets a KSh 2,000 one-month goal. What is the clearest weakness?', ['The goal is not realistic for the available money and time', 'The goal names an amount', 'The learner plans to save', 'The goal uses Kenyan shillings'], 'The goal is not realistic for the available money and time', 'A sound goal must be achievable within the stated time using resources the learner can reasonably access.', 'analyse'),
    q('Which revision best protects a school-shoes goal after the price rises?', ['Extend the deadline or increase the planned saving transparently', 'Borrow secretly with no repayment plan', 'Stop tracking the goal', 'Spend the savings on unrelated wants'], 'Extend the deadline or increase the planned saving transparently', 'Adjusting amount or time keeps the goal measurable and realistic without abandoning the priority.', 'analyse')
  ]),
  chapter({
    key: 'g8-business-income', subjectId: 'business_studies', subjectName: 'Business Studies', grade: 'Grade 8',
    strand: 'Business and Money Management', subStrand: 'Income', title: 'Where Income Comes From', shortTitle: 'Income',
    objective: 'Distinguish ethical sources of income and evaluate how talents, labour and small enterprises can create value responsibly.',
    minutes: 9, sourceRef: source('business_studies', '9-17'),
    visual: { setting: 'market', elements: ['service poster', 'vegetable stall', 'payment record', 'skills toolkit'] }
  }, [
    q('What is income?', ['Money or value received from work, business, property, or other sources', 'The total number of goods on a shelf', "A shop's signboard", 'A list of prices without sales'], 'Money or value received from work, business, property, or other sources', 'Income is what a person or business receives and can use for spending, saving, or investment.', 'recall'),
    q('Why is payment for repairing a bicycle described as earned income?', ['It is received after providing a useful skill and service', 'It comes from finding lost money', 'It is printed on a price label', 'It requires no work or value'], 'It is received after providing a useful skill and service', 'Earned income results from labour, skill, goods or services supplied to another person.', 'understand'),
    q('How can a learner use drawing talent to earn income ethically?', ['Create original agreed posters and deliver them as promised', "Copy an artist's logo and sell it secretly", 'Collect payment for work never done', 'Make false claims about classmates'], 'Create original agreed posters and deliver them as promised', 'Original work, honest terms and reliable delivery turn talent into responsible income.', 'apply'),
    q('A snack project receives KSh 1,200 but spent KSh 800 on ingredients. Which amount is income received, not profit?', ['KSh 1,200', 'KSh 800', 'KSh 400', 'KSh 2,000'], 'KSh 1,200', 'Income is the total received; the KSh 400 difference is the surplus after the stated cost.', 'analyse'),
    q('Which plan best develops baking into a sustainable income skill?', ['Practise hygiene, record costs, improve recipes and use customer feedback', 'Guess prices and ignore ingredient costs', 'Handle food without washing hands', 'Promise more orders than can be delivered'], 'Practise hygiene, record costs, improve recipes and use customer feedback', 'Skill, safety, costing and feedback work together to create trustworthy value for customers.', 'analyse')
  ]),
  chapter({
    key: 'g8-business-budgeting', subjectId: 'business_studies', subjectName: 'Business Studies', grade: 'Grade 8',
    strand: 'Business and Money Management', subStrand: 'Budgeting and Spending', title: 'Give Every Shilling a Job', shortTitle: 'Budgeting',
    objective: 'Prepare balanced personal budgets, prioritise needs and evaluate spending decisions using income, saving and remaining-balance evidence.',
    minutes: 10, sourceRef: source('business_studies', '18-26'),
    visual: { setting: 'market', elements: ['income envelope', 'needs list', 'savings line', 'balance counter'] }
  }, [
    q('What is budgeting?', ['Planning expected income and how it will be spent or saved', 'Buying goods without checking money available', 'Copying prices from a poster only', 'Keeping products on a shelf'], 'Planning expected income and how it will be spent or saved', 'A budget guides how money will be allocated before it is used.', 'recall'),
    q('Why should needs usually come before wants when money is limited?', ['Needs protect essential wellbeing and responsibilities', 'Wants are always illegal', 'Needs never cost money', 'Wants automatically increase income'], 'Needs protect essential wellbeing and responsibilities', 'Prioritising needs helps ensure essentials such as safe travel, food or learning materials are covered first.', 'understand'),
    q('A learner has KSh 500, saves KSh 200, spends KSh 150 on lunch and KSh 100 on stationery. What remains?', ['KSh 50', 'KSh 100', 'KSh 150', 'KSh 200'], 'KSh 50', 'The planned uses total KSh 450, leaving KSh 50 from the KSh 500 available.', 'apply'),
    q('A budget totals KSh 900 but expected income is KSh 750. What must happen before spending?', ['Reduce or postpone KSh 150 of planned spending', 'Pretend income is KSh 900', 'Ignore the difference', 'Add an unplanned want'], 'Reduce or postpone KSh 150 of planned spending', 'A balanced plan cannot allocate more than available income without an explicit, responsible funding decision.', 'analyse'),
    q('Which choice shows wise spending on a school bag?', ['Compare need, durability, price and available budget', 'Buy the highest price without checking quality', 'Spend savings before comparing options', 'Choose only because an influencer likes it'], 'Compare need, durability, price and available budget', 'Wise spending weighs value and priorities against the money actually available.', 'analyse')
  ]),

  chapter({
    key: 'g8-creative-roles', subjectId: 'creative_arts', subjectName: 'Creative Arts and Sports', grade: 'Grade 8',
    strand: 'Foundations of Creative Arts and Sports', subStrand: 'Roles of Creative Arts and Sports', title: 'Creativity That Moves a Community', shortTitle: 'Creative Roles',
    objective: 'Explain and evaluate the social, cultural, educational and economic roles of creative arts and sports in Kenyan communities.',
    minutes: 9, sourceRef: source('creative_arts_sports', '1-6'),
    visual: { setting: 'community', elements: ['community mural', 'dance stage', 'sports field', 'craft stall'] }
  }, [
    q('Which option best describes a social role of Creative Arts and Sports in society?', ['Building unity through shared performances and games', 'Replacing all school subjects', 'Stopping learners from using teamwork', 'Making communities forget their traditions'], 'Building unity through shared performances and games', 'Creative Arts and Sports can bring people together through shared cultural, artistic, and physical activities.', 'recall'),
    q('How can a community festival support both culture and livelihoods?', ['It can share traditions while creating work for performers and makers', 'It removes the need for safe planning', 'It makes every artwork identical', 'It excludes all local audiences'], 'It can share traditions while creating work for performers and makers', 'Performances and crafts can preserve cultural expression while generating ethical income and services.', 'understand'),
    q('A school wants an arts-and-sports project about river care. Which product best communicates the message?', ['A learner-made mural, verse and fair-play relay linked by one theme', 'An empty noticeboard', 'A copied logo with no permission', 'A match with no rules or reflection'], 'A learner-made mural, verse and fair-play relay linked by one theme', 'Combining original visual, spoken and physical expression can reach different audiences around one civic purpose.', 'apply'),
    q('A craft fair earns money but uses copied designs and unsafe waste. Which roles are being undermined?', ['Ethical economic value and responsible cultural expression', 'Only running speed', 'Only pitch accuracy', 'Only score keeping'], 'Ethical economic value and responsible cultural expression', 'Economic success does not excuse harm, plagiarism or disrespect for cultural ownership.', 'analyse'),
    q('Which evidence best shows a sports programme has a social impact?', ['More inclusive teamwork and respectful participation across groups', 'A brighter colour on one poster', 'A longer equipment list alone', 'One player keeping every turn'], 'More inclusive teamwork and respectful participation across groups', 'Observable inclusion, cooperation and respect directly support the social role of sport.', 'analyse')
  ]),
  chapter({
    key: 'g8-creative-components', subjectId: 'creative_arts', subjectName: 'Creative Arts and Sports', grade: 'Grade 8',
    strand: 'Foundations of Creative Arts and Sports', subStrand: 'Components of Creative Arts and Sports', title: 'A Toolkit for Making and Moving', shortTitle: 'Creative Components',
    objective: 'Recognise and connect core components of verse, music, visual art, physical fitness and games through practical comparisons.',
    minutes: 10, sourceRef: source('creative_arts_sports', '7-13'),
    visual: { setting: 'studio', elements: ['verse cards', 'bass staff', 'colour wheel', 'agility cones'] }
  }, [
    q('Which set lists elements of verse studied in Grade 8 Creative Arts and Sports?', ['Character, theme, and setting', 'Overhead pass, pivoting, and marking', 'Stencil, dye, and fabric', 'Serve, volley, and net'], 'Character, theme, and setting', 'Verse can be discussed through elements such as character, theme, and setting.', 'recall'),
    q('Which activity mainly develops physical endurance?', ['Jogging steadily for several minutes', 'Changing direction once between two cones', 'Holding one pose for a photograph', 'Drawing a border on paper'], 'Jogging steadily for several minutes', 'Endurance is the capacity to continue sustained physical activity without tiring quickly.', 'understand'),
    q('A learner must demonstrate agility. Which cone task is most suitable?', ['Change direction quickly through a safe zigzag course', 'Walk in one straight line very slowly', 'Sit and name every cone colour', 'Carry all cones at once'], 'Change direction quickly through a safe zigzag course', 'Agility combines quick, controlled changes of direction with balance.', 'apply'),
    q('Which pairing correctly connects a component to its function?', ['Bass staff — writes lower-pitched notes', 'Colour wheel — records race times', 'Agility cones — show musical pitch', 'Verse setting — measures heart rate'], 'Bass staff — writes lower-pitched notes', 'The bass staff represents lower pitches; the other pairings mix unrelated creative or sport tools.', 'analyse'),
    q('A performance combines a spoken verse, changing rhythm and coordinated movement. What makes the pieces coherent?', ['A shared theme supported by timing and expressive choices', 'Every performer using a different topic', 'Removing rehearsal and cues', 'Ignoring the audience and space'], 'A shared theme supported by timing and expressive choices', 'Theme, rhythm, movement and delivery can reinforce one another to communicate a unified idea.', 'analyse')
  ]),
  chapter({
    key: 'g8-creative-drawing-painting', subjectId: 'creative_arts', subjectName: 'Creative Arts and Sports', grade: 'Grade 8',
    strand: 'Creating and Performing in Creative Arts and Sports', subStrand: 'Drawing and Painting', title: 'Make the Main Idea Stand Out', shortTitle: 'Drawing and Painting',
    objective: 'Use dominance, complementary colour, placement and contrast to plan, create and evaluate a purposeful visual composition.',
    minutes: 10, sourceRef: source('creative_arts_sports', '14-20'),
    visual: { setting: 'studio', elements: ['still-life bottles', 'colour wheel', 'focal-point frame', 'paint palette'] }
  }, [
    q('In a picture, what does dominance mainly mean?', ['The part that attracts most attention', 'The number of players on a court', 'The speed of a middle distance race', 'The loudness of a recorder note'], 'The part that attracts most attention', 'Dominance is the visual emphasis that makes one area or object stand out in a composition.', 'recall'),
    q('Why do complementary colours create strong contrast?', ['They sit opposite each other on the colour wheel', 'They are always the same hue', 'They remove every focal point', 'They can only be used in black and white'], 'They sit opposite each other on the colour wheel', 'Opposite colour-wheel positions, such as red and green, create a vivid visual difference.', 'understand'),
    q('How can a learner make one bottle dominate a still life?', ['Make it larger and place it near the centre of interest', 'Hide it behind all other objects', 'Make every object identical', 'Remove all tonal and colour contrast'], 'Make it larger and place it near the centre of interest', 'Relative size, placement and contrast direct the viewer toward the intended focal object.', 'apply'),
    q('A bright orange cup is surrounded by blue cloth. Which design principle most directly makes the cup stand out?', ['Complementary colour contrast', 'Identical repetition only', 'Random cropping', 'Lack of emphasis'], 'Complementary colour contrast', 'Blue and orange are complementary, so their contrast strengthens dominance around the cup.', 'analyse'),
    q('A poster has five equally large, equally bright headings. What change creates clearer dominance?', ['Choose one main heading and strengthen its size or contrast', 'Add five more equal headings', 'Make all text smaller and identical', 'Place every element at the same point'], 'Choose one main heading and strengthen its size or contrast', 'A deliberate difference in scale or contrast establishes visual hierarchy and a clear entry point.', 'analyse')
  ]),

  chapter({
    key: 'g8-english-listening-comprehension', subjectId: 'english', subjectName: 'English', grade: 'Grade 8',
    strand: 'Listening and Speaking', subStrand: 'Listening Comprehension', title: 'Catch the Message That Matters', shortTitle: 'Listening Comprehension',
    objective: 'Identify key messages, supporting details and required actions in spoken announcements, reports and short conversations.',
    minutes: 9, sourceRef: source('english', '1'),
    visual: { setting: 'classroom', elements: ['school speaker', 'key-message card', 'detail notes', 'action checklist'] }
  }, [
    q('In a school announcement, what is the main purpose of listening for the key message?', ['To understand the most important information', 'To count every word the speaker says', "To copy the speaker's accent", 'To interrupt with questions immediately'], 'To understand the most important information', 'The key message tells the listener what the announcement is mainly about and what action may be needed.', 'recall'),
    q('Which detail is most important in an announcement about a changed club meeting?', ['The new time and meeting place', 'The original time without the replacement', 'The club chairperson’s name without the change', 'A description of what happened at last week’s meeting'], 'The new time and meeting place', 'Useful supporting details explain what listeners must know or do after hearing the message.', 'understand'),
    q("You hear, 'The clean-up begins at 8 a.m.; bring gloves and meet at the gate.' What should you note?", ['Time, required item and meeting point', 'Only the word clean-up', "Only the speaker's volume", 'Every pause in the sentence'], 'Time, required item and meeting point', 'These three details directly determine how to take part correctly.', 'apply'),
    q('Two reports disagree about when a trip leaves. What is the best listening response?', ['Ask the authorised speaker to clarify the departure time', 'Choose whichever report was louder', 'Spread both times without checking', 'Ignore the trip instructions'], 'Ask the authorised speaker to clarify the departure time', 'Clarifying with a reliable source resolves conflicting spoken information responsibly.', 'analyse'),
    q('Which notes best separate a message from its support?', ['Main idea: water is restricted; details: days, times and permitted uses', 'Main idea: every word; details: none', 'Main idea: speaker is tall; details: water', 'Main idea: punctuation; details: handwriting'], 'Main idea: water is restricted; details: days, times and permitted uses', 'A concise main idea states the central update while details specify its practical meaning.', 'analyse')
  ]),
  chapter({
    key: 'g8-english-active-listening', subjectId: 'english', subjectName: 'English', grade: 'Grade 8',
    strand: 'Listening and Speaking', subStrand: 'Active Listening', title: 'Listen So Others Feel Heard', shortTitle: 'Active Listening',
    objective: 'Use attention, respectful body language, paraphrasing and relevant questions to improve understanding during spoken exchanges.',
    minutes: 9, sourceRef: source('english', '2'),
    visual: { setting: 'classroom', elements: ['discussion circle', 'speaker token', 'paraphrase card', 'question bubble'] }
  }, [
    q('Which behaviour shows active listening during a group discussion?', ['Facing the speaker and asking a relevant question', 'Talking to a friend while others speak', 'Leaving before the speaker finishes', 'Repeating unrelated jokes loudly'], 'Facing the speaker and asking a relevant question', 'Active listening uses attention, respectful body language, and relevant responses to show understanding.', 'recall'),
    q('Why is paraphrasing useful after a classmate explains an idea?', ['It checks whether the listener understood the intended meaning', 'It proves the listener can speak longer', 'It changes the idea without permission', 'It ends every discussion immediately'], 'It checks whether the listener understood the intended meaning', 'Restating an idea in fresh words lets the speaker confirm or correct the listener’s understanding.', 'understand'),
    q('A classmate says transport costs affect attendance. Which response is most active?', ['So you mean higher fares can make regular attendance harder?', 'That is boring; let us change topics.', 'I was not listening, but I disagree.', 'Transport has nothing to do with this discussion.'], 'So you mean higher fares can make regular attendance harder?', 'The response paraphrases the idea and invites confirmation without judging the speaker.', 'apply'),
    q('A learner maintains eye contact but repeatedly interrupts. What is missing from their active listening?', ['Patient turn-taking', 'A louder voice', 'More unrelated examples', 'Faster note copying'], 'Patient turn-taking', 'Attention signals are incomplete when the speaker is not allowed to finish their thought.', 'analyse'),
    q('Which group rule best balances listening and participation?', ['Listen fully, paraphrase fairly, then add a relevant point', 'Allow the quickest speaker every turn', 'Reject questions after anyone speaks', 'Require agreement before listening'], 'Listen fully, paraphrase fairly, then add a relevant point', 'The sequence makes space for understanding before response and supports respectful dialogue.', 'analyse')
  ]),
  chapter({
    key: 'g8-english-tone-mood', subjectId: 'english', subjectName: 'English', grade: 'Grade 8',
    strand: 'Listening and Speaking', subStrand: 'Tone and Mood', title: 'Hear the Feeling Between the Words', shortTitle: 'Tone and Mood',
    objective: 'Infer tone and mood from word choice, pace, pitch and context while distinguishing a speaker’s attitude from audience feeling.',
    minutes: 10, sourceRef: source('english', '3'),
    visual: { setting: 'classroom', elements: ['voice waveform', 'emotion cards', 'context clue', 'audience reaction'] }
  }, [
    q("A speaker says, 'Our class garden has finally produced vegetables!' with a bright voice. What mood is most likely shown?", ['Excitement', 'Fear', 'Boredom', 'Regret'], 'Excitement', "A bright voice and the word 'finally' suggest joy and satisfaction about the result.", 'recall'),
    q('What is the clearest difference between tone and mood?', ["Tone is the speaker's attitude; mood is the feeling created for the audience", 'Tone is written; mood is always spoken', 'Tone is volume only; mood is speed only', 'They are unrelated to language choices'], "Tone is the speaker's attitude; mood is the feeling created for the audience", 'Tone belongs to the voice or writer, while mood describes the emotional atmosphere experienced by listeners or readers.', 'understand'),
    q("A captain says, 'We can still recover if we stay focused,' slowly and firmly. Which tone fits best?", ['Determined', 'Mocking', 'Careless', 'Confused'], 'Determined', 'The hopeful condition, steady pace and firm delivery communicate resolve.', 'apply'),
    q("The words say 'What a perfect day,' but the speaker sighs after missing the bus. What does context suggest?", ['The tone is ironic or disappointed', 'The speaker is certainly celebrating', 'The mood must be fearless', 'The sentence has no tone'], 'The tone is ironic or disappointed', 'The sigh and missed bus contradict the literal praise, signalling irony or disappointment.', 'analyse'),
    q('Which evidence gives the strongest basis for inferring an anxious tone?', ['Rushed pace, repeated warnings and a trembling voice', 'One neutral noun on its own', 'A paragraph with no delivery cues', 'A brightly coloured notebook'], 'Rushed pace, repeated warnings and a trembling voice', 'Several consistent vocal and language clues support the inference more strongly than an unrelated detail.', 'analyse')
  ]),

  chapter({
    key: 'g8-science-elements-compounds', subjectId: 'integrated_science', subjectName: 'Integrated Science', grade: 'Grade 8',
    strand: 'Mixtures, Elements and Compounds', subStrand: 'Elements and Compounds', title: 'From Atoms to Compounds', shortTitle: 'Elements and Compounds',
    objective: 'Differentiate atoms, elements, compounds and mixtures using particle models, composition evidence and familiar material examples.',
    minutes: 10, sourceRef: source('integrated_science', '1-16'),
    visual: { setting: 'classroom', elements: ['atom models', 'element sample', 'compound molecule', 'mixture tray'] }
  }, [
    q('Which description best defines an atom in Grade 8 Integrated Science?', ['The smallest particle of an element that keeps its chemical identity', 'The smallest particle of a compound that keeps all compound properties', 'A group of two or more atoms chemically bonded together', 'A substance made by physically mixing several elements'], 'The smallest particle of an element that keeps its chemical identity', 'An atom is the smallest unit of an element that still has the properties of that element.', 'recall'),
    q('How does a compound differ from a mixture?', ['Its elements are chemically joined in a fixed ratio', 'Its parts can always be seen', 'It contains only one atom', 'It has no physical properties'], 'Its elements are chemically joined in a fixed ratio', 'Compounds form through chemical bonding in definite proportions; mixtures combine substances physically.', 'understand'),
    q('Which particle model represents an element?', ['Many identical single blue spheres', 'Blue-red pairs repeated together', 'Blue spheres mixed with red pairs', 'Four different unjoined sphere types'], 'Many identical single blue spheres', 'An element contains only one kind of atom, represented by identical particles.', 'apply'),
    q('Iron filings and sulfur can be separated with a magnet before heating. What does this show?', ['Before heating they form a mixture whose components keep properties', 'They are already a fixed compound', 'Sulfur has become iron', 'The magnet creates new atoms'], 'Before heating they form a mixture whose components keep properties', 'Physical separation works because the unreacted substances retain distinct properties in the mixture.', 'analyse'),
    q('A pure substance always contains carbon and oxygen in the same particle ratio. Which classification is best supported?', ['A compound', 'A variable mixture', 'A single unbonded element', 'A living cell'], 'A compound', 'Fixed composition with different chemically joined elements is evidence of a compound.', 'analyse')
  ]),
  chapter({
    key: 'g8-science-physical-chemical-changes', subjectId: 'integrated_science', subjectName: 'Integrated Science', grade: 'Grade 8',
    strand: 'Mixtures, Elements and Compounds', subStrand: 'Physical and chemical changes', title: 'Change Without Guessing', shortTitle: 'Physical and Chemical Change',
    objective: 'Use particle behaviour and observable evidence to distinguish physical changes from chemical changes and explain state transitions safely.',
    minutes: 10, sourceRef: source('integrated_science', '17-32'),
    visual: { setting: 'classroom', elements: ['ice beaker', 'particle diagrams', 'rusted nail', 'evidence chart'] }
  }, [
    q('How are particles arranged in a solid?', ['Closely packed and vibrating about fixed positions', 'Very far apart and moving freely in all directions', 'Moving with no attraction at all', 'Changing into new atoms every second'], 'Closely packed and vibrating about fixed positions', 'Particles in a solid are closely packed, have strong attraction, and mainly vibrate in fixed positions.', 'recall'),
    q('Why is melting ice a physical change?', ['The substance remains water while particle arrangement changes', 'A new element is produced', 'Every water particle disappears', 'Oxygen becomes hydrogen'], 'The substance remains water while particle arrangement changes', 'Melting changes state and particle movement but does not create a different substance.', 'understand'),
    q('Which observation most strongly suggests a chemical change?', ['A new gas forms and the original materials cannot be recovered easily', 'Ice changes into liquid water', 'Sugar dissolves in warm water', 'A metal sheet is bent'], 'A new gas forms and the original materials cannot be recovered easily', 'Unexpected gas formation and difficult reversal can indicate that new substances formed.', 'apply'),
    q('A nail gains reddish-brown material after weeks in damp air. How should this change be classified?', ['Chemical, because rust with new properties forms', 'Physical, because only its position changes', 'Physical, because iron remains shiny', 'Neither, because air cannot react'], 'Chemical, because rust with new properties forms', 'Rusting produces iron oxide, a new substance with properties different from iron.', 'analyse'),
    q('Salt raises water’s boiling point but can later be recovered by evaporation. What does the evidence support?', ['Dissolving was a physical change in a mixture', 'Salt became a new element', 'Water stopped being a substance', 'Boiling created living cells'], 'Dissolving was a physical change in a mixture', 'Changed boiling behaviour plus recoverability shows a mixture formed without a new chemical substance.', 'analyse')
  ]),
  chapter({
    key: 'g8-science-classes-fire', subjectId: 'integrated_science', subjectName: 'Integrated Science', grade: 'Grade 8',
    strand: 'Mixtures, Elements and Compounds', subStrand: 'Classes of fire', title: 'Read the Fire Before You Act', shortTitle: 'Classes of Fire',
    objective: 'Recognise the fire triangle and fire classes, then select safe responses without taking unsafe personal firefighting risks.',
    minutes: 10, sourceRef: source('integrated_science', '33-44'),
    visual: { setting: 'classroom', elements: ['fire triangle', 'class labels', 'alarm point', 'fire blanket'] }
  }, [
    q('Which example is a Class A fire?', ['Burning paper, wood, or cloth', 'Burning petrol in an open tray', 'Burning cooking oil in a pan', 'Arcing from live electrical equipment'], 'Burning paper, wood, or cloth', 'Class A fires involve ordinary solid materials such as paper, wood, and cloth.', 'recall'),
    q('Why can covering a very small pan fire with a fire blanket stop it?', ['The blanket limits oxygen reaching the fire', 'The blanket adds more fuel', 'It makes electricity flow faster', 'It turns oil into water'], 'The blanket limits oxygen reaching the fire', 'Smothering removes oxygen, one side of the fire triangle, when done by a trained adult.', 'understand'),
    q('A learner discovers smoke from a locked electrical store. What should the learner do first?', ['Raise the alarm, move to safety and alert a responsible adult', 'Open the door and pour water inside', 'Touch the wiring to find heat', 'Hide the smoke from others'], 'Raise the alarm, move to safety and alert a responsible adult', 'Learners should prioritise alarm, evacuation and trained help rather than entering a hazardous fire area.', 'apply'),
    q('Which situation is a Class B fire?', ['A petrol spill has ignited', 'A stack of exercise books is burning', 'A cotton curtain has caught fire', 'A wooden desk is smouldering'], 'A petrol spill has ignited', 'Class B fires involve flammable liquids such as petrol, while paper, cloth, and wood are Class A fuels.', 'analyse'),
    q('Paper is burning beside a petrol spill. Why is simply naming one fire class insufficient?', ['Different fuels create combined hazards requiring trained assessment', 'All fires use exactly the same response', 'Petrol cannot burn near paper', 'Fire classes describe flame colour only'], 'Different fuels create combined hazards requiring trained assessment', 'Multiple fuels can alter safe control methods, so evacuation and trained emergency response are essential.', 'analyse')
  ]),

  chapter({
    key: 'g8-kiswahili-ufahamu-kusikiliza', subjectId: 'kiswahili', subjectName: 'Kiswahili', grade: 'Grade 8',
    strand: 'Kusikiliza na Kuzungumza', subStrand: 'Ufahamu wa Kusikiliza', title: 'Nasa Ujumbe Muhimu', shortTitle: 'Ufahamu wa Kusikiliza',
    objective: 'Kutambua ujumbe mkuu, maelezo ya kuunga mkono na hatua inayohitajika katika matangazo na matini fupi za mdomo.',
    minutes: 9, sourceRef: source('kiswahili', '1'),
    visual: { setting: 'classroom', elements: ['tangazo la shule', 'kadi ya ujumbe', 'dondoo muhimu', 'orodha ya hatua'] }
  }, [
    q('Katika kusikiliza tangazo la shule, jambo gani humsaidia mwanafunzi kupata ujumbe mkuu?', ['Kutambua taarifa muhimu na kuacha maelezo madogo', 'Kuhesabu kila neno linalosemwa', 'Kukariri sauti ya mtangazaji pekee', 'Kumkatiza msemaji kabla hajamaliza'], 'Kutambua taarifa muhimu na kuacha maelezo madogo', 'Ujumbe mkuu ni wazo muhimu zaidi katika matini ya mdomo; maelezo mengine huunga mkono wazo hilo.', 'recall'),
    q('Kwa nini msikilizaji atenganishe ujumbe mkuu na maelezo ya ziada?', ['Ili aelewe kusudi na hatua muhimu kwa usahihi', 'Ili asisikie tarehe yoyote', 'Ili abadili mada ya msemaji', 'Ili ahesabu sentensi pekee'], 'Ili aelewe kusudi na hatua muhimu kwa usahihi', 'Kutenganisha mawazo husaidia msikilizaji kuhifadhi kiini bila kupoteza taarifa za lazima.', 'understand'),
    q("Tangazo linasema, 'Mkutano umehamishwa hadi Ijumaa saa nane katika maktaba.' Ni dondoo zipi muhimu?", ['Siku, saa na mahali', 'Rangi ya maktaba pekee', 'Urefu wa sentensi', 'Idadi ya silabi zote'], 'Siku, saa na mahali', 'Dondoo hizo ndizo humwezesha msikilizaji kuhudhuria mkutano uliobadilishwa.', 'apply'),
    q('Matangazo mawili yametaja nyakati tofauti za safari. Mwanafunzi afanye nini?', ['Aombe ufafanuzi kutoka kwa msemaji aliyeidhinishwa', 'Achague tangazo lenye sauti kubwa', 'Aeneze nyakati zote bila kuchunguza', 'Apuuze safari nzima'], 'Aombe ufafanuzi kutoka kwa msemaji aliyeidhinishwa', 'Ufafanuzi kutoka chanzo kinachoaminika hutatua mkanganyiko kwa uwajibikaji.', 'analyse'),
    q('Ni muhtasari upi unaotenganisha vizuri kiini na maelezo?', ['Kiini: maji yatapunguzwa; maelezo: siku, saa na matumizi yanayoruhusiwa', 'Kiini: kila neno; maelezo: hakuna', 'Kiini: sauti; maelezo: mavazi', 'Kiini: herufi; maelezo: kalamu'], 'Kiini: maji yatapunguzwa; maelezo: siku, saa na matumizi yanayoruhusiwa', 'Muhtasari mzuri hutaja jambo kuu kisha dondoo zinazolifanya lieleweke na kutekelezeka.', 'analyse')
  ]),
  chapter({
    key: 'g8-kiswahili-usikilizaji-makini', subjectId: 'kiswahili', subjectName: 'Kiswahili', grade: 'Grade 8',
    strand: 'Kusikiliza na Kuzungumza', subStrand: 'Usikilizaji Makini', title: 'Sikiliza, Elewa, Jibu', shortTitle: 'Usikilizaji Makini',
    objective: 'Kutumia umakini, ishara za heshima, ufafanuzi na maswali yanayohusiana na mada wakati wa mawasiliano ya mdomo.',
    minutes: 9, sourceRef: source('kiswahili', '2'),
    visual: { setting: 'classroom', elements: ['duara la mjadala', 'kadi ya zamu', 'dondoo za msemaji', 'swali la ufafanuzi'] }
  }, [
    q('Ni tabia ipi inaonyesha kuwa mwanafunzi anasikiliza kwa makini wakati wa majadiliano?', ['Kumtazama msemaji na kuuliza swali linalohusiana na mada', 'Kuzungumza na rafiki wakati wengine wanachangia', 'Kuondoka kabla ya hoja kumalizika', 'Kucheka kila hoja bila sababu'], 'Kumtazama msemaji na kuuliza swali linalohusiana na mada', 'Usikilizaji makini huhitaji umakini, heshima na majibu yanayohusiana na kinachosemwa.', 'recall'),
    q('Kueleza hoja ya msemaji kwa maneno yako mwenyewe kuna faida gani?', ['Huthibitisha kama umeelewa maana iliyokusudiwa', 'Humzuia msemaji kusahihisha wazo', 'Hubadilisha mada kuwa yako', 'Humaliza kila mjadala'], 'Huthibitisha kama umeelewa maana iliyokusudiwa', 'Kurudia maana kwa maneno mapya humpa msemaji nafasi ya kuthibitisha au kusahihisha ufahamu.', 'understand'),
    q("Mwenza anasema, 'Foleni ilichelewesha timu.' Jibu lipi linaonyesha usikilizaji makini?", ['Unamaanisha muda wa safari uliathiri maandalizi ya timu?', 'Sikukusikia lakini umekosea.', 'Tuzungumzie jambo lisilohusiana.', 'Usieleze sababu nyingine.'], 'Unamaanisha muda wa safari uliathiri maandalizi ya timu?', 'Jibu hilo linafafanua maana na kumruhusu msemaji kuthibitisha bila kubezwa.', 'apply'),
    q('Mwanafunzi anamtazama msemaji lakini anamkatiza mara kwa mara. Anakosa stadi ipi?', ['Kusubiri zamu kwa subira', 'Kuongeza sauti', 'Kubadili mada', 'Kuandika haraka'], 'Kusubiri zamu kwa subira', 'Ishara za macho hazitoshi iwapo msemaji hapewi nafasi ya kukamilisha hoja.', 'analyse'),
    q('Kanuni ipi ya kikundi inalinganisha kusikiliza na kuchangia?', ['Sikiliza hoja yote, fafanua maana, kisha ongeza hoja inayohusiana', 'Mzungumzaji wa haraka apewe zamu zote', 'Maswali yakatazwe baada ya hoja', 'Kila mtu alazimishwe kukubaliana'], 'Sikiliza hoja yote, fafanua maana, kisha ongeza hoja inayohusiana', 'Utaratibu huo hutanguliza ufahamu kabla ya jibu na kujenga mawasiliano ya heshima.', 'analyse')
  ]),
  chapter({
    key: 'g8-kiswahili-matamshi', subjectId: 'kiswahili', subjectName: 'Kiswahili', grade: 'Grade 8',
    strand: 'Kusikiliza na Kuzungumza', subStrand: 'Matamshi', title: 'Tamka kwa Uwazi', shortTitle: 'Matamshi',
    objective: 'Kutambua silabi na kutumia matamshi, mkazo na utenganishaji wa maneno unaofanya ujumbe wa Kiswahili ueleweke vizuri.',
    minutes: 9, sourceRef: source('kiswahili', '3'),
    visual: { setting: 'classroom', elements: ['kadi za silabi', 'alama ya mkazo', 'umbo la midomo', 'kipaza sauti'] }
  }, [
    q('Neno lipi lina silabi nne?', ['Maarifa', 'Shule', 'Meza', 'Kalamu'], 'Maarifa', 'Neno maarifa hutamkwa kwa silabi nne: ma-a-ri-fa; kutambua silabi husaidia matamshi sahihi.', 'recall'),
    q('Kwa nini kugawa neno katika silabi husaidia matamshi?', ['Huonyesha vipashio vya sauti vinavyotamkwa kwa mpangilio', 'Huondoa maana ya neno', 'Hufanya kila neno liwe silabi moja', 'Hubadilisha Kiswahili kuwa lugha nyingine'], 'Huonyesha vipashio vya sauti vinavyotamkwa kwa mpangilio', 'Silabi humwongoza mzungumzaji kutamka sehemu zote za neno bila kuzimeza.', 'understand'),
    q('Neno “mawasiliano” lina silabi zipi?', ['ma-wa-si-li-a-no', 'maw-asi-lia-no', 'ma-wa-sil-iano', 'm-a-w-a-s-i'], 'ma-wa-si-li-a-no', 'Kutenganisha vokali na konsonanti kwa mpangilio huo hutoa silabi sita zinazotamkika.', 'apply'),
    q('Msemaji anatamka maneno haraka hadi silabi za mwisho hazisikiki. Marekebisho yapi yanafaa?', ['Apunguze kasi na atamke kila silabi kwa uwazi', 'Aongeze kasi zaidi', 'Aache vokali zote', 'Anong’oneze bila kupumua'], 'Apunguze kasi na atamke kila silabi kwa uwazi', 'Kasi inayodhibitiwa na utamkaji kamili huongeza ufasaha na ufahamu wa msikilizaji.', 'analyse'),
    q('Ni mazoezi yapi bora kwa kuboresha matamshi ya neno jipya?', ['Lisikilize kutoka chanzo sahihi, ligawanye kwa silabi, litamke na ujirekodi', 'Likisie mara moja bila kusikiliza', 'Andika herufi zake bila kulitamka', 'Futa sehemu ngumu za neno'], 'Lisikilize kutoka chanzo sahihi, ligawanye kwa silabi, litamke na ujirekodi', 'Mfumo huo hutoa mfano, uchanganuzi, mazoezi na mrejesho wa kujisahihisha.', 'analyse')
  ]),

  chapter({
    key: 'g8-life-strengths-growth', subjectId: 'life_skills', subjectName: 'Life Skills Education', grade: 'Grade 8',
    strand: 'Self Awareness', subStrand: 'Personal Strengths and Growth Areas', title: 'Know Your Strengths, Grow on Purpose', shortTitle: 'Strengths and Growth',
    objective: 'Use honest self-reflection and feedback to recognise strengths, identify growth areas and choose achievable improvement steps.',
    minutes: 9, sourceRef: source('life_skills', '1'),
    visual: { setting: 'classroom', elements: ['strength cards', 'feedback note', 'growth ladder', 'reflection journal'] }
  }, [
    q('Which statement best shows self-awareness in a Grade 8 learner?', ['I understand my strengths and areas I need to improve.', 'I always wait for others to decide for me.', 'I hide all my mistakes from everyone.', 'I blame classmates whenever work is difficult.'], 'I understand my strengths and areas I need to improve.', 'Self-awareness means knowing your feelings, strengths, values, habits, and areas for growth.', 'recall'),
    q('Why is a growth area not the same as a permanent weakness?', ['Skills can improve through practice, strategy and feedback', 'Every difficulty disappears without effort', 'Only other people can cause growth', 'A learner must hide it forever'], 'Skills can improve through practice, strategy and feedback', 'A growth area names a current need and opens a path for deliberate improvement.', 'understand'),
    q('A learner explains ideas well but misses deadlines. Which goal is most useful?', ['Use a weekly planner and review due dates each afternoon', 'Stop contributing ideas', 'Promise never to make a mistake', 'Wait for friends to do every task'], 'Use a weekly planner and review due dates each afternoon', 'The goal builds a specific routine around the identified organisation need.', 'apply'),
    q('Self-ratings are high but teacher feedback repeatedly identifies incomplete work. What is the best response?', ['Compare evidence calmly and ask for one clear improvement target', 'Reject all feedback immediately', 'Assume marks are personal attacks', 'Hide unfinished work'], 'Compare evidence calmly and ask for one clear improvement target', 'Balanced self-awareness considers both personal perception and credible external evidence.', 'analyse'),
    q('Which reflection shows both confidence and openness to growth?', ['I contribute creative ideas, and I will practise checking details before submission', 'I am perfect and need no feedback', 'I cannot improve at anything', 'My group causes every problem'], 'I contribute creative ideas, and I will practise checking details before submission', 'It names a genuine strength and a practical next step without exaggeration or self-criticism.', 'analyse')
  ]),
  chapter({
    key: 'g8-life-personal-habits', subjectId: 'life_skills', subjectName: 'Life Skills Education', grade: 'Grade 8',
    strand: 'Self Awareness', subStrand: 'Personal Habits', title: 'Small Habits, Stronger Days', shortTitle: 'Personal Habits',
    objective: 'Examine how personal habits affect learning and relationships, then design realistic cues and routines for positive behaviour change.',
    minutes: 9, sourceRef: source('life_skills', '2'),
    visual: { setting: 'home', elements: ['habit loop', 'study timer', 'phone basket', 'progress calendar'] }
  }, [
    q('A learner notices they become impatient during group work. What is the most useful first response?', ['Accept the feeling and plan how to listen better.', 'Quit every group task immediately.', 'Shout so that others stop talking.', 'Pretend the habit does not exist.'], 'Accept the feeling and plan how to listen better.', 'Recognizing a habit gives the learner a chance to manage it and improve relationships.', 'recall'),
    q('Why does identifying a habit trigger help behaviour change?', ['It reveals when a routine starts so a different response can be planned', 'It makes consequences disappear', 'It proves habits never change', 'It removes personal responsibility'], 'It reveals when a routine starts so a different response can be planned', 'Recognising the cue creates an opportunity to replace the automatic action with a healthier routine.', 'understand'),
    q('A phone notification interrupts every study session. Which plan is most practical?', ['Silence and place the phone away during a timed study block', 'Answer every alert immediately', 'Stop studying altogether', 'Keep five apps open for focus'], 'Silence and place the phone away during a timed study block', 'Changing the cue and environment supports a focused routine without relying on willpower alone.', 'apply'),
    q('A learner studies late, feels tired, then skips morning preparation. What pattern should be addressed first?', ['The late-night routine that begins the cycle', 'The colour of the school bag', 'The classroom seating order', 'The breakfast plate design'], 'The late-night routine that begins the cycle', 'The evidence links late study to fatigue and missed preparation, so the earliest controllable cause is the best starting point.', 'analyse'),
    q('Which tracking method is most likely to produce honest improvement evidence?', ['Record the habit daily and review patterns weekly without hiding misses', 'Mark every day successful in advance', 'Track only when the habit goes well', 'Compare only with classmates'], 'Record the habit daily and review patterns weekly without hiding misses', 'Consistent, truthful records reveal patterns and allow the learner to adjust the plan.', 'analyse')
  ]),
  chapter({
    key: 'g8-life-values-choices', subjectId: 'life_skills', subjectName: 'Life Skills Education', grade: 'Grade 8',
    strand: 'Self Awareness', subStrand: 'Values and Choices', title: 'Let Values Guide the Choice', shortTitle: 'Values and Choices',
    objective: 'Connect personal and shared values to everyday decisions, consequences and respectful action when pressures or values conflict.',
    minutes: 9, sourceRef: source('life_skills', '3'),
    visual: { setting: 'community', elements: ['choice paths', 'values compass', 'consequence cards', 'trusted adult'] }
  }, [
    q('Which example shows a personal value guiding behavior?', ['Returning a lost pen because honesty matters to you', 'Copying homework because others are doing it', 'Keeping quiet when a friend is bullied', 'Skipping duties because they are tiring'], 'Returning a lost pen because honesty matters to you', 'Values are beliefs that guide choices, such as honesty, respect, responsibility, and fairness.', 'recall'),
    q('Why can values make a difficult decision clearer?', ['They provide principles for comparing choices and consequences', 'They guarantee no one will disagree', 'They remove every consequence', 'They make evidence unnecessary'], 'They provide principles for comparing choices and consequences', 'Values act as standards for judging whether an action matches the person one wants to be.', 'understand'),
    q('Friends pressure a learner to share a private photo. Which action best reflects respect and responsibility?', ['Refuse, protect the person’s privacy and seek help if needed', 'Share it only with a smaller group', 'Add a joke before forwarding it', 'Post it anonymously'], 'Refuse, protect the person’s privacy and seek help if needed', 'Consent, dignity and digital responsibility matter even when peers encourage harmful behaviour.', 'apply'),
    q('Loyalty to a friend conflicts with safety after the friend describes self-harm. What should guide the choice?', ['Seek immediate help from a trusted adult while staying supportive', 'Promise absolute secrecy', 'Ignore the statement as a joke', 'Post the story publicly'], 'Seek immediate help from a trusted adult while staying supportive', 'Protecting life and safety outweighs secrecy; trusted adult support is a caring, responsible response.', 'analyse'),
    q('Which decision process best handles two competing values?', ['Name the values, consider rights and consequences, seek trusted guidance, then act responsibly', 'Choose the fastest option without reflection', 'Follow the loudest person', 'Avoid the decision forever'], 'Name the values, consider rights and consequences, seek trusted guidance, then act responsibly', 'A structured process honours values while testing how each action may affect people and responsibilities.', 'analyse')
  ]),

  chapter({
    key: 'g8-math-integers', subjectId: 'math', subjectName: 'Mathematics', grade: 'Grade 8',
    strand: 'Numbers', subStrand: 'Integers', title: 'Navigate Above and Below Zero', shortTitle: 'Integers',
    objective: 'Represent, calculate and reason with positive and negative integers in number-line, temperature, elevation and financial contexts.',
    minutes: 10, sourceRef: source('mathematics', '1-6'),
    visual: { setting: 'classroom', elements: ['number line', 'zero marker', 'temperature card', 'elevation arrows'] }
  }, [
    q('Which integer represents 7 metres below sea level?', ['-7', '7', '0', '14'], '-7', 'Positions below sea level are represented by negative integers, so 7 metres below sea level is -7.', 'recall'),
    q('A learner starts at -3 and moves 8 steps right on a number line. Where do they land?', ['5', '-11', '11', '-5'], '5', 'Moving right adds eight: -3 + 8 = 5.', 'understand'),
    q('Work out 6 - (-9).', ['15', '-3', '3', '-15'], '15', 'Subtracting a negative is equivalent to adding the positive value, so 6 + 9 = 15.', 'apply'),
    q('The temperature changes from -2°C to 5°C. What is the increase?', ['7°C', '3°C', '-7°C', '5°C'], '7°C', 'The change is final minus initial: 5 - (-2) = 7°C.', 'analyse'),
    q('An account is at -KSh 450, receives KSh 700, then pays KSh 125. What is the balance?', ['KSh 125', 'KSh 375', '-KSh 125', 'KSh 1,275'], 'KSh 125', '-450 + 700 - 125 equals 125, so the account finishes above zero.', 'analyse')
  ]),
  chapter({
    key: 'g8-math-fractions', subjectId: 'math', subjectName: 'Mathematics', grade: 'Grade 8',
    strand: 'Numbers', subStrand: 'Fractions', title: 'Make Fractions Work Together', shortTitle: 'Fractions',
    objective: 'Carry out combined fraction operations accurately and apply equivalence, reciprocals and order of operations to real situations.',
    minutes: 10, sourceRef: source('mathematics', '7-12'),
    visual: { setting: 'market', elements: ['fraction strips', 'produce crate', 'recipe bowl', 'operation cards'] }
  }, [
    q('Work out 2/3 + 1/4.', ['11/12', '3/7', '5/7', '7/12'], '11/12', 'Using twelfths gives 8/12 + 3/12 = 11/12.', 'recall'),
    q('Why is 5/6 - 1/3 equal to 1/2?', ['1/3 is 2/6, so the difference is 3/6', 'The denominators are simply subtracted', '5 minus 1 is always the denominator', 'Both fractions round to one'], '1/3 is 2/6, so the difference is 3/6', 'Equivalent fractions create a common denominator: 5/6 - 2/6 = 3/6 = 1/2.', 'understand'),
    q('A class plants vegetables on 3/4 of a 28 m plot. How many metres are planted?', ['21 m', '24 m', '18 m', '14 m'], '21 m', 'Three quarters of 28 is 28 × 3/4 = 21.', 'apply'),
    q('Work out (1/2 + 3/4) - 1/4.', ['1', '1/2', '3/4', '1 1/2'], '1', 'The brackets give 5/4, then 5/4 - 1/4 = 4/4 = 1.', 'analyse'),
    q('A recipe uses 3/5 litre per batch. How many batches can be made from 9/10 litre?', ['1 1/2 batches', '2/3 batch', '3/2 litre left', '27/50 batch'], '1 1/2 batches', 'Dividing 9/10 by 3/5 gives 9/10 × 5/3 = 3/2, or one and a half batches.', 'analyse')
  ]),
  chapter({
    key: 'g8-math-decimals', subjectId: 'math', subjectName: 'Mathematics', grade: 'Grade 8',
    strand: 'Numbers', subStrand: 'Decimals', title: 'Decimals with Precision', shortTitle: 'Decimals',
    objective: 'Convert, round and calculate with terminating and recurring decimals while using standard form and correct operation order.',
    minutes: 10, sourceRef: source('mathematics', '13-18'),
    visual: { setting: 'market', elements: ['place-value grid', 'price labels', 'rounding lens', 'standard-form card'] }
  }, [
    q('Convert 3/8 into a decimal.', ['0.375', '0.38', '0.625', '0.75'], '0.375', 'Dividing 3 by 8 gives 0.375.', 'recall'),
    q('Which fraction equals the recurring decimal 0.666...?', ['2/3', '6/10', '1/6', '3/5'], '2/3', 'Two thirds has the recurring decimal representation 0.666... .', 'understand'),
    q('Round 45.678 to two decimal places.', ['45.68', '45.67', '45.70', '45.60'], '45.68', 'The third decimal digit is 8, so the hundredths digit rounds from 7 to 8.', 'apply'),
    q('Write 0.00456 in standard form.', ['4.56 × 10^-3', '4.56 × 10^3', '45.6 × 10^-3', '0.456 × 10^-3'], '4.56 × 10^-3', 'Moving the decimal three places right creates 4.56, so the power is negative three.', 'analyse'),
    q('Work out 3.4 + 2.15 × 2.', ['7.70', '11.10', '6.80', '5.55'], '7.70', 'Multiplication comes first: 2.15 × 2 = 4.30, then 3.4 + 4.30 = 7.70.', 'analyse')
  ]),

  chapter({
    key: 'g8-pretech-fire-safety', subjectId: 'pre_technical_studies', subjectName: 'Pre-Technical Studies', grade: 'Grade 8',
    strand: 'Foundations of Pre-Technical Studies', subStrand: 'Fire Safety', title: 'Workshop Fire Safety', shortTitle: 'Fire Safety',
    objective: 'Identify workshop fire hazards, explain prevention and choose safe alarm and evacuation actions without attempting unsafe interventions.',
    minutes: 10, sourceRef: source('pre_technical_studies', '1-7'),
    visual: { setting: 'studio', elements: ['overloaded socket', 'clear exit', 'alarm point', 'assembly sign'] }
  }, [
    q('Which item is a common cause of fire outbreaks in a school workshop?', ['An overloaded electrical socket', 'A correctly rated socket with one inspected tool', 'Fuel sealed in its approved store', 'An unplugged machine awaiting maintenance'], 'An overloaded electrical socket', 'Overloaded sockets can overheat and start fires, especially where cables or plugs are damaged.', 'recall'),
    q('Why should sawdust be cleared away from heat and sparks?', ['It is combustible and can help a fire spread', 'Its fine particles always smother sparks safely', 'It cools hot equipment by absorbing heat', 'A thick sawdust layer acts as a reliable firebreak'], 'It is combustible and can help a fire spread', 'Fine, dry wood particles ignite readily and increase the amount of fuel near a heat source.', 'understand'),
    q('A learner notices a frayed cable on a workshop machine. What should happen?', ['Switch off if safe, keep others away and report it to the responsible adult', 'Wrap it with wet cloth and continue', 'Pull the plug by the cable', 'Hide the damage until class ends'], 'Switch off if safe, keep others away and report it to the responsible adult', 'Isolating the hazard and reporting it prevents use until a competent person can inspect it.', 'apply'),
    q('A small flame appears near petrol and electrical equipment. Why should learners evacuate rather than improvise?', ['Multiple hazards can make an ordinary method deadly', 'Every extinguisher is identical', 'Petrol cannot spread fire', 'Electricity removes all heat'], 'Multiple hazards can make an ordinary method deadly', 'Fuel and live electricity require trained assessment; a wrong agent or close approach can worsen danger.', 'analyse'),
    q('Which workshop plan provides the strongest prevention evidence?', ['Routine cable checks, safe fuel storage, clear exits and practised alarms', 'One extinguisher hidden in a locked room', 'More sockets connected to one adapter', 'Sawdust stored beside a grinder'], 'Routine cable checks, safe fuel storage, clear exits and practised alarms', 'Layered controls reduce ignition, fuel exposure and evacuation delays before an incident occurs.', 'analyse')
  ]),
  chapter({
    key: 'g8-pretech-data-safety', subjectId: 'pre_technical_studies', subjectName: 'Pre-Technical Studies', grade: 'Grade 8',
    strand: 'Foundations of Pre-Technical Studies', subStrand: 'Data Safety', title: 'Protect the Project', shortTitle: 'Data Safety',
    objective: 'Recognise threats to electronic data and apply strong passwords, backups, updates and privacy choices to protect school project files.',
    minutes: 10, sourceRef: source('pre_technical_studies', '8-15'),
    visual: { setting: 'computer_lab', elements: ['project folder', 'password shield', 'backup drive', 'update badge'] }
  }, [
    q('In an electronic device, what is data?', ['Facts or values stored or processed by the device', 'Only the plastic case of the device', 'A tool for cutting metal', 'A type of drawing paper'], 'Facts or values stored or processed by the device', 'Data includes raw facts such as names, marks, pictures or numbers that a device stores or processes.', 'recall'),
    q('Why is a backup different from simply moving a file?', ['A backup keeps an extra recoverable copy in another safe location', 'A backup deletes the original', 'A backup is only a new file name', 'A backup makes malware harmless'], 'A backup keeps an extra recoverable copy in another safe location', 'Recovery requires an independent copy that remains available if the working file is lost or damaged.', 'understand'),
    q('Which password practice best protects a learner’s design files?', ['Use a long unique password and keep it private', 'Use password for every account', 'Post the password beside the monitor', 'Share it with the whole class'], 'Use a long unique password and keep it private', 'Length, uniqueness and secrecy reduce guessing and prevent one compromised account exposing others.', 'apply'),
    q('A file will not open after an unknown attachment was downloaded. What is the safest response?', ['Stop using the device and report it for authorised malware checks', 'Forward the attachment to classmates', 'Disable all security updates', 'Keep opening the file repeatedly'], 'Stop using the device and report it for authorised malware checks', 'Limiting further activity and seeking authorised support reduces spread and preserves evidence for recovery.', 'analyse'),
    q('Which plan best protects a term project from device loss and accidental deletion?', ['Keep versioned copies in two approved locations and test recovery', 'Keep one copy only on the desktop', 'Rename one file many times in the same folder', 'Send the password and file publicly'], 'Keep versioned copies in two approved locations and test recovery', 'Separate, approved copies plus a recovery check address both device failure and user error.', 'analyse')
  ]),
  chapter({
    key: 'g8-pretech-plane-geometry', subjectId: 'pre_technical_studies', subjectName: 'Pre-Technical Studies', grade: 'Grade 8',
    strand: 'Communication in Pre-Technical Studies', subStrand: 'Plane Geometry', title: 'Construct with Accuracy', shortTitle: 'Plane Geometry',
    objective: 'Select drawing instruments and construct accurate plane and combined shapes using safe layout, measurement and checking practices.',
    minutes: 10, sourceRef: source('pre_technical_studies', '16-21'),
    visual: { setting: 'studio', elements: ['drawing board', 'protractor', 'compass arcs', 'combined gate shape'] }
  }, [
    q('Which instrument is used to draw and measure angles of different sizes in plane geometry?', ['Protractor', 'Pair of compasses', 'Straight ruler', 'Set square with fixed angles'], 'Protractor', 'A protractor is a drawing instrument used to measure and draw angles accurately.', 'recall'),
    q('Why should the compass width remain fixed while drawing a circle?', ['Every point must stay the same radius from the centre', 'The circle needs four straight sides', 'The paper must rotate randomly', 'The centre should keep moving'], 'Every point must stay the same radius from the centre', 'A circle is the set of points at one constant distance from its centre.', 'understand'),
    q('Which tool pair is best for constructing a perpendicular bisector with intersecting arcs?', ['Ruler and pair of compasses', 'Ruler and protractor only', 'Set square and ruler only', 'Protractor and divider only'], 'Ruler and pair of compasses', 'Equal intersecting arcs locate points equidistant from the ends, and a ruler joins them.', 'apply'),
    q('A rectangle joined to a semicircle must be 80 mm wide. What controls the semicircle radius?', ['Half the shared 80 mm diameter, so 40 mm', 'The rectangle length only', 'Any random compass opening', 'The thickness of the pencil'], 'Half the shared 80 mm diameter, so 40 mm', 'The shared edge is the semicircle’s diameter, and a radius is half that distance.', 'analyse'),
    q('A constructed shape looks correct but measures differently at opposite sides. What check is best?', ['Recheck dimensions, parallel lines and construction points before darkening', 'Hide measurements with shading', 'Make every line thicker immediately', 'Change the title block only'], 'Recheck dimensions, parallel lines and construction points before darkening', 'Construction evidence should be verified while light guide lines can still be corrected accurately.', 'analyse')
  ]),

  chapter({
    key: 'g8-religion-purpose', subjectId: 'religious_education', subjectName: 'Religious Education', grade: 'Grade 8',
    strand: 'Foundations of Faith and Values', subStrand: 'Purpose of Religious Education', title: 'Belief, Values and Daily Life', shortTitle: 'Purpose of Religious Education',
    objective: 'Explain how studying religious traditions and values can support responsible choices, personal growth and peaceful shared citizenship.',
    minutes: 9, sourceRef: source('religious_education', '1'),
    visual: { setting: 'community', elements: ['values path', 'service hands', 'peace circle', 'reflection journal'] }
  }, [
    q('Which statement best explains the aim of Religious Education in Grade 8?', ['To connect religious teachings with responsible choices in daily life', 'To make learners ignore other subjects', 'To rank classmates by their faith', 'To avoid discussing values in school'], 'To connect religious teachings with responsible choices in daily life', 'Religious Education helps learners understand beliefs and apply values such as honesty, respect, service, and peace.', 'recall'),
    q('Why does Religious Education include learning about different traditions?', ['It builds understanding and respectful coexistence in a diverse society', 'It requires learners to abandon their identities', 'It proves one classmate is superior', 'It prevents values from being discussed'], 'It builds understanding and respectful coexistence in a diverse society', 'Knowledge can reduce harmful assumptions while allowing learners to hold and explain their own convictions respectfully.', 'understand'),
    q('A class studies teachings about caring for neighbours. Which project best connects learning to action?', ['Plan an inclusive, dignified service activity with community guidance', 'Photograph people without consent', 'Help only learners with identical beliefs', 'Use service to compete for praise'], 'Plan an inclusive, dignified service activity with community guidance', 'Responsible service protects dignity, listens to real needs and welcomes cooperation across difference.', 'apply'),
    q('A learner can recite a teaching about honesty but cheats in a test. What gap does this reveal?', ['Knowledge has not yet been applied to conduct', 'The teaching has no meaning', 'Cheating is a form of service', 'Memory automatically guarantees integrity'], 'Knowledge has not yet been applied to conduct', 'The purpose of values education includes translating understood principles into consistent choices.', 'analyse'),
    q('Which outcome best shows Religious Education supporting citizenship?', ['Learners reason ethically and cooperate respectfully across beliefs', 'Learners avoid everyone who differs', 'Learners memorise labels without understanding', 'Learners rank religions by class size'], 'Learners reason ethically and cooperate respectfully across beliefs', 'Ethical reasoning and respectful cooperation demonstrate personal growth and peaceful participation in shared life.', 'analyse')
  ]),
  chapter({
    key: 'g8-religion-core-values', subjectId: 'religious_education', subjectName: 'Religious Education', grade: 'Grade 8',
    strand: 'Foundations of Faith and Values', subStrand: 'Core Moral Values', title: 'Values Under Pressure', shortTitle: 'Core Moral Values',
    objective: 'Identify shared moral values and evaluate how integrity, compassion, justice and responsibility guide choices under real pressure.',
    minutes: 9, sourceRef: source('religious_education', '2'),
    visual: { setting: 'classroom', elements: ['integrity card', 'justice scales', 'compassion hands', 'decision paths'] }
  }, [
    q('Which value is most clearly shown when a learner speaks truthfully even when it is difficult?', ['Integrity', 'Envy', 'Carelessness', 'Selfishness'], 'Integrity', 'Integrity means being honest and morally upright even when there is pressure to do otherwise.', 'recall'),
    q('How does compassion differ from simply feeling sorry?', ['Compassion includes concern that can motivate respectful help', 'Compassion ignores another person’s dignity', 'Compassion always demands publicity', 'Compassion means agreeing with every choice'], 'Compassion includes concern that can motivate respectful help', 'Compassion recognises suffering and moves toward suitable, dignified support.', 'understand'),
    q('A shopkeeper gives too much change. Which response applies integrity?', ['Return the extra money and explain the mistake', 'Keep it because no one noticed', 'Share it so the choice seems fair', 'Blame another customer'], 'Return the extra money and explain the mistake', 'Integrity keeps conduct honest even when a dishonest choice could remain hidden.', 'apply'),
    q('A rule treats two learners differently for the same action. Which value most directly calls for review?', ['Justice', 'Popularity', 'Convenience', 'Silence'], 'Justice', 'Justice requires consistent, fair treatment and attention to relevant circumstances rather than favouritism.', 'analyse'),
    q('Which response best combines responsibility and compassion after causing harm?', ['Acknowledge the action, repair what can be repaired and change the behaviour', 'Offer an excuse and avoid the person', 'Demand immediate forgiveness', 'Hide the evidence and move on'], 'Acknowledge the action, repair what can be repaired and change the behaviour', 'Accountability addresses the harm while compassion respects the affected person and supports genuine change.', 'analyse')
  ]),
  chapter({
    key: 'g8-religion-diversity', subjectId: 'religious_education', subjectName: 'Religious Education', grade: 'Grade 8',
    strand: 'Foundations of Faith and Values', subStrand: 'Respect for Religious Diversity', title: 'Different Beliefs, Equal Dignity', shortTitle: 'Religious Diversity',
    objective: 'Practise accurate, respectful and inclusive responses to religious and non-religious diversity while protecting equal dignity and dialogue.',
    minutes: 10, sourceRef: source('religious_education', '3'),
    visual: { setting: 'community', elements: ['dialogue circle', 'shared project', 'belief cards', 'dignity banner'] }
  }, [
    q('What does religious tolerance mainly require from learners in a diverse classroom?', ['Respecting people whose beliefs and practices differ from theirs', 'Forcing everyone to worship in the same way', 'Laughing at unfamiliar religious customs', 'Refusing to work with learners from other faiths'], 'Respecting people whose beliefs and practices differ from theirs', 'Tolerance protects dignity and allows people of different beliefs to learn and work together peacefully.', 'recall'),
    q('Why is respectful curiosity better than making assumptions about a classmate’s faith?', ['It lets the person explain their own identity and practice accurately', 'It guarantees all beliefs are identical', 'It gives permission to debate every private choice', 'It makes consent unnecessary'], 'It lets the person explain their own identity and practice accurately', 'Asking appropriate, consent-aware questions avoids stereotypes and centres the person’s own account.', 'understand'),
    q('A group schedules an event during a member’s important observance. What is the best response?', ['Discuss needs respectfully and seek a reasonable inclusive arrangement', 'Mock the member for raising it', 'Exclude the member automatically', 'Cancel all future group work'], 'Discuss needs respectfully and seek a reasonable inclusive arrangement', 'Dialogue can protect participation and dignity while helping the group find a workable plan.', 'apply'),
    q('A poster says every member of one religion behaves the same way. What is the main problem?', ['It stereotypes a diverse group and ignores individual experience', 'It uses too few colours', 'It contains a title', 'It invites learners to read'], 'It stereotypes a diverse group and ignores individual experience', 'Religious communities contain varied cultures, interpretations and individuals, so sweeping claims are inaccurate and harmful.', 'analyse'),
    q('Which classroom agreement best supports principled disagreement?', ['Critique ideas with evidence while protecting every person’s dignity and freedom', 'Attack people instead of ideas', 'Allow only majority beliefs to speak', 'Require everyone to change beliefs'], 'Critique ideas with evidence while protecting every person’s dignity and freedom', 'Respect does not require agreement; it requires fair dialogue without coercion, ridicule or dehumanisation.', 'analyse')
  ]),

  chapter({
    key: 'g8-social-inquiry', subjectId: 'social', subjectName: 'Social Studies', grade: 'Grade 8',
    strand: 'Foundations of Social Studies', subStrand: 'Social Studies Inquiry', title: 'Investigate Your Community', shortTitle: 'Social Studies Inquiry',
    objective: 'Plan ethical community inquiries using focused questions, observation, interviews, mapping and evidence-based conclusions.',
    minutes: 10, sourceRef: source('social_studies', '1'),
    visual: { setting: 'community', elements: ['inquiry question', 'interview notes', 'observation map', 'evidence board'] }
  }, [
    q('Which activity best shows a Grade 8 learner using Social Studies inquiry skills?', ['Interviewing residents and mapping causes of water shortage', 'Copying answers without checking sources', 'Guessing facts about a county budget', 'Ignoring views from older community members'], 'Interviewing residents and mapping causes of water shortage', 'Social Studies inquiry uses observation, questioning, evidence and mapping to understand real community issues.', 'recall'),
    q('Why should an inquiry begin with a focused question?', ['It guides what evidence to collect and keeps the study manageable', 'It guarantees the preferred conclusion', 'It removes the need for consent', 'It makes every source equally reliable'], 'It guides what evidence to collect and keeps the study manageable', 'A clear question connects methods and evidence to a defined issue rather than gathering unrelated facts.', 'understand'),
    q('Learners want to study unsafe road crossings near school. Which first plan is most suitable?', ['Map crossing points, observe safely and interview road users with permission', 'Stand in traffic to take photos', 'Copy a report from another town', 'Ask only one friend and stop'], 'Map crossing points, observe safely and interview road users with permission', 'The plan combines location evidence and perspectives while protecting learner and participant safety.', 'apply'),
    q('Residents report water shortages, but supply records show normal delivery. What should investigators do?', ['Check timing, location and definitions using more evidence before concluding', 'Dismiss every resident account', 'Delete the supply records', 'Choose the source they prefer'], 'Check timing, location and definitions using more evidence before concluding', 'Apparent conflict may reflect distribution, timing or measurement differences that further evidence can resolve.', 'analyse'),
    q('Which conclusion is best supported after 18 of 20 observed crossings occur outside the marked area and interviews cite its poor location?', ['The marked crossing’s location may not match common pedestrian routes', 'All pedestrians dislike road rules', 'No crossing is ever useful', 'The road must be closed permanently'], 'The marked crossing’s location may not match common pedestrian routes', 'The conclusion stays close to the combined observation and interview evidence without overgeneralising.', 'analyse')
  ]),
  chapter({
    key: 'g8-social-sources', subjectId: 'social', subjectName: 'Social Studies', grade: 'Grade 8',
    strand: 'Foundations of Social Studies', subStrand: 'Sources of Information', title: 'Trust, but Check the Source', shortTitle: 'Sources of Information',
    objective: 'Evaluate primary and secondary sources for relevance, credibility, bias and corroboration when investigating society and environment.',
    minutes: 10, sourceRef: source('social_studies', '2'),
    visual: { setting: 'classroom', elements: ['interview transcript', 'county report', 'source checklist', 'comparison links'] }
  }, [
    q('Why should learners compare information from more than one source during a community study?', ['To improve accuracy and reduce bias', 'To make the report longer without purpose', 'To avoid asking useful questions', 'To choose only the easiest answer'], 'To improve accuracy and reduce bias', 'Comparing sources helps learners confirm facts and notice when one source gives an incomplete view.', 'recall'),
    q('What makes an interview a primary source for a study of a recent local event?', ['It gives a direct account from someone connected to the event', 'It is always perfectly accurate', 'It was printed in a textbook', 'It contains no personal viewpoint'], 'It gives a direct account from someone connected to the event', 'Primary sources provide firsthand evidence, though their claims still need context and checking.', 'understand'),
    q('A viral post claims a county market has closed. Which check is strongest?', ['Compare the official county notice, current observation and reports from traders', 'Count how many times the post was shared', 'Trust the brightest graphic', 'Forward it before checking'], 'Compare the official county notice, current observation and reports from traders', 'Independent official, observational and participant evidence can corroborate or challenge the claim.', 'apply'),
    q('A report is accurate about 2018 population but used to describe 2026 needs. Which criterion is weakest?', ['Currency or timeliness', 'Authority of the named statistics office', 'Relevance of population data to planning', 'Clarity of the stated measurement method'], 'Currency or timeliness', 'Information can have been accurate when produced yet no longer represent current conditions.', 'analyse'),
    q('Two credible sources give different totals because one counts households and the other people. What should a learner conclude?', ['The measures differ, so definitions must be aligned before comparison', 'One source must be dishonest', 'Both totals should be added', 'Definitions do not affect evidence'], 'The measures differ, so definitions must be aligned before comparison', 'Valid evidence can appear inconsistent when units or definitions differ; comparison requires matching measures.', 'analyse')
  ]),
  chapter({
    key: 'g8-social-map-scale', subjectId: 'social', subjectName: 'Social Studies', grade: 'Grade 8',
    strand: 'Map Work and Field Studies', subStrand: 'Map Scale', title: 'Shrink Distance, Keep Meaning', shortTitle: 'Map Scale',
    objective: 'Interpret statement, ratio and line scales to calculate map and ground distances and evaluate route representations accurately.',
    minutes: 10, sourceRef: source('social_studies', '3'),
    visual: { setting: 'community', elements: ['local map', 'scale bar', 'route string', 'distance calculation'] }
  }, [
    q('Which item on a map helps a learner calculate real ground distance?', ['Scale', 'Title', 'Frame', 'Colour of paper'], 'Scale', 'A map scale shows the relationship between distance on the map and distance on the ground.', 'recall'),
    q('What does the statement scale “1 cm represents 2 km” mean?', ['Every map centimetre equals 2 km on the ground', 'The map is 2 km wide', 'One kilometre equals 2 cm in every map', 'The route must be straight'], 'Every map centimetre equals 2 km on the ground', 'A statement scale directly relates a measured map length to its actual ground distance.', 'understand'),
    q('On a map, 1 cm represents 2 km. What ground distance does 6 cm represent?', ['12 km', '8 km', '3 km', '6 km'], '12 km', 'Six map centimetres multiplied by 2 km per centimetre gives 12 km.', 'apply'),
    q('A 15 km road measures 5 cm on a map. Which statement scale fits?', ['1 cm represents 3 km', '1 cm represents 5 km', '1 cm represents 10 km', '1 cm represents 75 km'], '1 cm represents 3 km', 'Dividing 15 km by 5 cm gives 3 km for each map centimetre.', 'analyse'),
    q('A curved path measures 8 cm with string on a 1:50,000 map. What is its ground distance?', ['4 km', '400 m', '40 km', '25 km'], '4 km', 'At 1:50,000, one centimetre equals 0.5 km; eight centimetres therefore represent 4 km.', 'analyse')
  ])
];

export const grade8LessonSeeds = defineCurriculumChapters(chapters);

import {
  defineCurriculumChapters,
  type CurriculumChapterSource
} from './progressiveLearningCurriculum.js';

type CurriculumQuestion = CurriculumChapterSource['questions'][number];
type CognitiveLevel = CurriculumQuestion['cognitiveLevel'];

const q = (
  prompt: string,
  options: [string, string, string, string],
  answer: string,
  explanation: string,
  hint: string,
  misconception: string,
  cognitiveLevel: CognitiveLevel
): CurriculumQuestion => ({ prompt, options, answer, explanation, hint, misconception, cognitiveLevel });

const QUIZ_BANK_COMMIT = 'ea1342bad94104c45a1ab9f8dfdbf8f38e92a2ed';
const source = (subjectId: string, questionRange: string) =>
  `git:${QUIZ_BANK_COMMIT}:apps/api/data/quiz-bank/KEN/CBC/questions/grade-7/${subjectId}.json#questions-${questionRange}`;

const chapters: CurriculumChapterSource[] = [
  {
    key: 'agriculture-g7-soil-pollution', subjectId: 'agriculture', subjectName: 'Agriculture', grade: 'Grade 7',
    strand: 'Conserving Agricultural Environment', subStrand: 'Soil Pollution Control',
    title: 'Rescue the school soil', shortTitle: 'Soil rescue',
    objective: 'Explain causes and signs of soil pollution, then choose safe farming and waste-disposal practices.', minutes: 10,
    sourceRef: source('agriculture', '1-9'),
    visual: { setting: 'garden', elements: ['school shamba', 'healthy soil bed', 'used chemical container', 'plastic litter', 'compost pit'] },
    questions: [
      q('Which farming activity can directly cause soil pollution when done carelessly?', ['Using too much artificial fertilizer', 'Mulching a vegetable bed', 'Planting an agroforestry tree', 'Watering seedlings early in the morning'], 'Using too much artificial fertilizer', 'Excess fertilizer can leave harmful chemicals in soil and harm soil organisms and crops.', 'Look for the activity that can add more chemicals than the soil can safely hold.', 'SOIL_POLLUTION_CAUSE', 'recall'),
      q('Why are plastic wastes a problem when dumped in cultivated soil?', ['They do not rot easily and can block air and water movement', 'They break down quickly and release useful nutrients', 'They improve drainage by keeping permanent gaps', 'They protect every root from pests'], 'They do not rot easily and can block air and water movement', 'Plastic remains for a long time and interferes with roots, water infiltration, and soil life.', 'Think about what happens to plastic after many seasons in the soil.', 'PLASTIC_DECOMPOSITION', 'understand'),
      q('A learner has finished using a farm chemical. What is the safest next step?', ['Follow the label and school disposal procedure', 'Reuse the container as a drinking cup', 'Pour the remainder onto bare soil', 'Leave the open container in the garden'], 'Follow the label and school disposal procedure', 'Following the approved procedure prevents poison residues from reaching people, animals, and soil.', 'The safest action keeps residues contained and follows expert instructions.', 'CHEMICAL_CONTAINER_SAFETY', 'apply'),
      q('One bed has few earthworms, weak seedlings, and chemical containers nearby. What is the strongest conclusion?', ['Unsafe chemical waste may be polluting the soil', 'The soil must have too much clean compost', 'Earthworms always leave healthy soil', 'The seedlings need plastic mixed into the bed'], 'Unsafe chemical waste may be polluting the soil', 'The nearby waste and changes in soil life are evidence of possible chemical pollution.', 'Connect the visible evidence to the nearby farming practice.', 'EVIDENCE_OF_POLLUTION', 'analyse'),
      q('Which school action plan would control soil pollution most effectively?', ['Use recommended chemical amounts, compost organic waste, and collect hazardous containers safely', 'Burn all waste beside crops and add extra pesticide', 'Bury plastics in every bed and leave chemical containers open', 'Remove mulch and pour wash water into the garden'], 'Use recommended chemical amounts, compost organic waste, and collect hazardous containers safely', 'The plan reduces pollution at its source and manages different wastes responsibly.', 'Choose the plan that prevents pollution instead of only hiding waste.', 'POLLUTION_CONTROL_PLAN', 'analyse')
    ]
  },
  {
    key: 'agriculture-g7-water-conservation', subjectId: 'agriculture', subjectName: 'Agriculture', grade: 'Grade 7',
    strand: 'Conserving Agricultural Environment', subStrand: 'Water Conservation Measures',
    title: 'Catch every raindrop', shortTitle: 'Save farm water',
    objective: 'Explain, select, and evaluate minimum-tillage and runoff-control measures for conserving farm water.', minutes: 10,
    sourceRef: source('agriculture', '10-21'),
    visual: { setting: 'garden', elements: ['sloping school farm', 'mulched bed', 'retention ditch', 'earth basin', 'rain cloud'] },
    questions: [
      q('Why is water conservation important in farming?', ['It keeps water available for crops for longer after rains', 'It increases runoff so fields drain immediately', 'It replaces the need to monitor soil moisture', 'It guarantees crops will grow without dry-season planning'], 'It keeps water available for crops for longer after rains', 'Conserved water supports crop growth during dry periods.', 'Think about what crops need after the rain has stopped.', 'WATER_CONSERVATION_PURPOSE', 'recall'),
      q('How does minimum tillage help soil retain water?', ['It reduces disturbance and moisture loss', 'It exposes every part of the soil to wind', 'It removes all protective plant cover', 'It makes runoff move faster downhill'], 'It reduces disturbance and moisture loss', 'Less disturbance protects soil structure and reduces evaporation.', 'Compare covered, settled soil with soil that is repeatedly turned and left bare.', 'MINIMUM_TILLAGE_MEANING', 'understand'),
      q('Where should a water-retention ditch be placed on a sloping school farm?', ['Across the slope to slow runoff', 'Straight down the slope to carry water quickly', 'Only along the lowest boundary after runoff has left the field', 'Around one plant while the rest of the slope remains bare'], 'Across the slope to slow runoff', 'A ditch across the slope slows water and gives it time to soak into soil.', 'Picture the direction rainwater moves and place a barrier across its path.', 'DITCH_ORIENTATION', 'apply'),
      q('After rain, one plot has mulch and contour ditches while another is bare. Which observation best shows the measures worked?', ['The protected plot has less runoff and moist soil', 'The bare plot loses more soil and is therefore healthier', 'Both plots must hold exactly the same water', 'The protected plot sends water downhill faster'], 'The protected plot has less runoff and moist soil', 'Reduced runoff and moist soil are direct evidence of effective conservation.', 'Look for an observation connected to slower water movement and infiltration.', 'CONSERVATION_EVIDENCE', 'analyse'),
      q('A school has little money and crop residues are available. Which first plan is most practical?', ['Leave safe residues as mulch and dig small basins across the slope', 'Buy machinery before covering any soil', 'Burn every residue and deepen the footpath downhill', 'Remove all vegetation before the next rain'], 'Leave safe residues as mulch and dig small basins across the slope', 'Mulch and small basins use local materials to reduce evaporation and runoff.', 'Choose a safe plan that matches the resources already available.', 'RESOURCE_AWARE_PLAN', 'analyse')
    ]
  },
  {
    key: 'agriculture-g7-agroforestry', subjectId: 'agriculture', subjectName: 'Agriculture', grade: 'Grade 7',
    strand: 'Conserving Agricultural Environment', subStrand: 'Agroforestry',
    title: 'Trees that help the farm', shortTitle: 'Agroforestry',
    objective: 'Identify useful agroforestry trees and plan how trees and crops can thrive together.', minutes: 9,
    sourceRef: source('agriculture', '22-31'),
    visual: { setting: 'garden', elements: ['crop rows', 'boundary trees', 'fodder tree', 'fruit tree', 'mulched soil'] },
    questions: [
      q('What is agroforestry?', ['Growing useful trees together with crops or pasture', 'Planting trees in a separate woodlot with no farm link', 'Growing annual crops on land where all trees are excluded', 'Keeping livestock in stalls without integrating trees or pasture'], 'Growing useful trees together with crops or pasture', 'Agroforestry combines trees with crops or pasture for production and conservation.', 'Look for the choice that deliberately combines trees with farming.', 'AGROFORESTRY_DEFINITION', 'recall'),
      q('Which characteristic makes a tree suitable for agroforestry?', ['It grows alongside crops and provides useful products', 'It kills every crop planted near it', 'It needs watering every hour', 'It has no value to soil, people, or animals'], 'It grows alongside crops and provides useful products', 'A suitable tree supports the farm without causing serious competition.', 'The best tree helps the system while leaving crops enough light, water, and space.', 'TREE_SUITABILITY', 'understand'),
      q('Learners want to reduce wind damage without shading the whole plot. Where should they plant suitable trees?', ['Along the windy boundary with sensible spacing', 'Densely through every crop row', 'In a pile at the centre of the field', 'Only inside the tool store'], 'Along the windy boundary with sensible spacing', 'A well-spaced boundary row can slow wind while limiting shade over crops.', 'Place the trees where they meet the wind before it crosses the crops.', 'TREE_PLACEMENT', 'apply'),
      q('A tree gives fodder but its dense shade weakens nearby maize. What is the best evaluation?', ['It is useful, but needs better spacing or pruning', 'It is perfect because only one benefit matters', 'All agroforestry trees should create dense shade', 'The maize proves trees never belong on farms'], 'It is useful, but needs better spacing or pruning', 'Good agroforestry balances tree benefits with crop needs.', 'Weigh both the benefit and the competition shown by the evidence.', 'AGROFORESTRY_TRADEOFF', 'analyse'),
      q('Which plan best establishes agroforestry in a school shamba?', ['Choose locally suitable multipurpose trees, plan spacing, plant safely, and maintain them', 'Plant unknown trees very close together and ignore them', 'Remove all crops so no combination remains', 'Select trees only by height and never check their effects'], 'Choose locally suitable multipurpose trees, plan spacing, plant safely, and maintain them', 'Successful agroforestry depends on suitable species, placement, establishment, and care.', 'Choose the plan that considers the whole system over time.', 'AGROFORESTRY_PLAN', 'analyse')
    ]
  },

  {
    key: 'business-g7-introduction', subjectId: 'business_studies', subjectName: 'Business Studies', grade: 'Grade 7',
    strand: 'Business and Money Management Skills', subStrand: 'Introduction to Business Studies',
    title: 'Business all around us', shortTitle: 'Meet business',
    objective: 'Relate Business Studies components to everyday decisions, enterprises, and career opportunities in Kenya.', minutes: 9,
    sourceRef: source('business_studies', '1-5'),
    visual: { setting: 'market', elements: ['school enterprise fair', 'vegetable kiosk', 'repair table', 'customer', 'record book'] },
    questions: [
      q('Which statement best describes Business Studies?', ['It examines how people organise resources, money, and enterprise', 'It studies buying and selling but excludes production and money management', 'It focuses only on recording cash after a sale', 'It is limited to naming shops and products'], 'It examines how people organise resources, money, and enterprise', 'Business Studies connects resources, money, enterprise, and responsible decisions.', 'Look for the choice broad enough to include production, exchange, and money management.', 'BUSINESS_SCOPE', 'recall'),
      q('Why is Business Studies useful in daily life?', ['It supports informed money and enterprise decisions', 'It guarantees every idea makes a profit', 'It removes the need for honesty', 'It makes planning unnecessary'], 'It supports informed money and enterprise decisions', 'Business knowledge helps people plan, compare choices, and use resources responsibly.', 'Choose a benefit based on better decisions rather than a promise of automatic success.', 'BUSINESS_IMPORTANCE', 'understand'),
      q('A learner enjoys repairing bicycles and keeping clear records. Which opportunity best uses both abilities?', ['Run a small supervised repair project with a service record', 'Hide broken parts and avoid customers', 'Spend project money without recording it', 'Choose an activity unrelated to either ability'], 'Run a small supervised repair project with a service record', 'The project combines a practical service with responsible business records.', 'Match both the practical talent and the organisation skill.', 'CAREER_SKILL_MATCH', 'apply'),
      q('A school club made good products but lost money because it never recorded costs. What does this show?', ['Production skill must be supported by money-management skill', 'Good products make records unnecessary', 'Losses prove enterprise has no value', 'The club should hide all transactions'], 'Production skill must be supported by money-management skill', 'A viable enterprise needs both a useful product and control of its costs.', 'Identify the missing business component that explains the result.', 'BUSINESS_COMPONENT_LINK', 'analyse'),
      q('Which plan best explores a Business Studies career?', ['Interview a practitioner, research required skills, and reflect on personal interests', 'Copy a job title without learning what it involves', 'Choose only by a rumour about income', 'Ignore training and ethical responsibilities'], 'Interview a practitioner, research required skills, and reflect on personal interests', 'Good career exploration combines evidence about work with honest self-reflection.', 'Choose a process that gathers reliable information before deciding.', 'CAREER_EXPLORATION', 'analyse')
    ]
  },
  {
    key: 'business-g7-money', subjectId: 'business_studies', subjectName: 'Business Studies', grade: 'Grade 7',
    strand: 'Business and Money Management Skills', subStrand: 'Money',
    title: 'Money with a mission', shortTitle: 'Using money',
    objective: 'Explain uses of money and apply safe, responsible checks when handling Kenyan currency.', minutes: 9,
    sourceRef: source('business_studies', '6-10'),
    visual: { setting: 'market', elements: ['fictional KES tokens', 'price labels', 'receipt', 'savings envelope', 'security-feature card'] },
    questions: [
      q('Which is a main use of money?', ['Paying for goods and services', 'Changing weather conditions', 'Making every resource unlimited', 'Replacing trust and records'], 'Paying for goods and services', 'Money is widely accepted in exchange for goods and services.', 'Think about what a buyer gives a seller to complete an exchange.', 'USE_OF_MONEY', 'recall'),
      q('Why does money make exchange easier than direct barter?', ['People can use a commonly accepted measure of value', 'Every item must have the same price', 'Buyers no longer need to compare choices', 'Money makes resources free'], 'People can use a commonly accepted measure of value', 'A shared measure lets people price and exchange different goods and services.', 'Focus on what buyers and sellers can both recognise and compare.', 'MONEY_AS_MEASURE', 'understand'),
      q('A learner receives change at a kiosk. What should they do before leaving?', ['Count it, check the receipt, and raise any error politely', 'Hide it without checking', 'Assume every amount is correct', 'Tear up the receipt immediately'], 'Count it, check the receipt, and raise any error politely', 'Checking change and records supports accurate, respectful transactions.', 'Use the available evidence to confirm the amount.', 'TRANSACTION_CHECK', 'apply'),
      q('Two payment choices have the same price, but one has no receipt or clear record. Which is safer?', ['The choice with a verifiable receipt or transaction record', 'The choice with no evidence at all', 'Either choice because records never matter', 'The choice that asks for a secret password'], 'The choice with a verifiable receipt or transaction record', 'A verifiable record helps confirm the payment and resolve mistakes.', 'Consider which option leaves trustworthy evidence of the exchange.', 'PAYMENT_RECORD', 'analyse'),
      q('A note or payment message seems suspicious. What is the most responsible response?', ['Pause and ask a trusted adult or authorised provider to verify it', 'Pass it quickly to another learner', 'Share account secrets to test it', 'Ignore every safety concern'], 'Pause and ask a trusted adult or authorised provider to verify it', 'Verification protects the learner without spreading a possible problem.', 'Choose the response that stops the transaction and uses a trusted verification path.', 'MONEY_SAFETY', 'analyse')
    ]
  },
  {
    key: 'business-g7-personal-goals', subjectId: 'business_studies', subjectName: 'Business Studies', grade: 'Grade 7',
    strand: 'Business and Money Management Skills', subStrand: 'Personal Goals',
    title: 'Build your goal ladder', shortTitle: 'Personal goals',
    objective: 'Set a clear personal goal, plan practical steps and resources, and review progress responsibly.', minutes: 9,
    sourceRef: source('business_studies', '11-15'),
    visual: { setting: 'classroom', elements: ['goal card', 'step ladder', 'calendar', 'support person', 'progress marker'] },
    questions: [
      q('What is a personal goal?', ['A result a person plans and works towards', 'A wish that never needs action', 'A rule for controlling other people', 'A result chosen only by strangers'], 'A result a person plans and works towards', 'A goal gives direction to purposeful action and review.', 'Look for a desired result connected to planning and effort.', 'GOAL_DEFINITION', 'recall'),
      q('Why should a goal include a clear time frame?', ['It helps plan steps and review progress', 'It guarantees success without effort', 'It prevents the goal from changing responsibly', 'It removes the need for resources'], 'It helps plan steps and review progress', 'A time frame makes progress measurable and supports timely adjustment.', 'Think about how a learner would know when to check progress.', 'GOAL_TIMEFRAME', 'understand'),
      q('Njeri wants to improve her reading fluency this term. Which first step is most useful?', ['Record a short reading, set regular practice times, and track improvement', 'Wait until the final day of term', 'Choose a goal unrelated to reading', 'Avoid feedback from anyone'], 'Record a short reading, set regular practice times, and track improvement', 'A baseline, scheduled practice, and evidence make the goal actionable.', 'Choose the step that creates both a plan and a way to measure change.', 'GOAL_ACTION_PLAN', 'apply'),
      q('A goal plan has daily tasks but no rest time or support. What is the best improvement?', ['Make the schedule realistic and identify someone who can help', 'Add more tasks to every day', 'Remove all progress checks', 'Hide the plan from trusted people'], 'Make the schedule realistic and identify someone who can help', 'Realistic pacing and appropriate support make a plan more sustainable.', 'Evaluate whether the learner can follow the plan safely over time.', 'GOAL_FEASIBILITY', 'analyse'),
      q('After two weeks, a learner has made little progress despite following the plan. What should happen next?', ['Review the evidence, identify the obstacle, and adjust the strategy', 'Pretend the goal is complete', 'Repeat the same plan without reflection', 'Blame another person without evidence'], 'Review the evidence, identify the obstacle, and adjust the strategy', 'Review helps a learner improve the plan while keeping the goal purposeful.', 'Use progress information to decide what needs to change.', 'GOAL_REVIEW', 'analyse')
    ]
  },

  {
    key: 'creative-arts-g7-introduction', subjectId: 'creative_arts', subjectName: 'Creative Arts & Sports', grade: 'Grade 7',
    strand: 'Foundations of Creative Arts and Sports', subStrand: 'Introduction to Creative Arts and Sports',
    title: 'Festival of many talents', shortTitle: 'Arts & sports',
    objective: 'Classify Creative Arts and Sports activities, explain their relationships, and plan a safe local-material collage.', minutes: 10,
    sourceRef: source('creative_arts_sports', '1-6'),
    visual: { setting: 'studio', elements: ['painting station', 'music stage', 'drama corner', 'sports field', 'recycled collage table'] },
    questions: [
      q('Which set contains only Creative Arts and Sports categories?', ['Visual arts, performing arts, music, and sports', 'Rainfall, rocks, crops, and taxes', 'Fractions, atoms, maps, and accounts', 'Roads, passwords, soil, and weather'], 'Visual arts, performing arts, music, and sports', 'The learning area brings artistic expression and physical performance together.', 'Look for activities involving making, performing, music, or movement.', 'CATEGORY_RECOGNITION', 'recall'),
      q('How can music and dance work together in a performance?', ['Rhythm can guide coordinated movement', 'Music makes movement impossible', 'Dance removes every beat', 'They cannot share a theme'], 'Rhythm can guide coordinated movement', 'Performers can use musical rhythm to time and shape movement.', 'Think about the shared pattern performers can hear and follow.', 'ARTS_RELATIONSHIP', 'understand'),
      q('A collage must show all four categories. Which plan meets the brief?', ['Use labelled images of painting, drama, drumming, and athletics', 'Use five pictures of only football', 'Leave every category unlabelled and hidden', 'Use unsafe broken glass as the main material'], 'Use labelled images of painting, drama, drumming, and athletics', 'The four images represent the categories clearly and safely.', 'Check that every required category is represented once.', 'COLLAGE_PLANNING', 'apply'),
      q('A group placed football under visual arts and a mural under sports. What should they revise?', ['Exchange the two cards so each matches its main category', 'Remove both activities because neither belongs', 'Keep them because categories have no meaning', 'Place every activity under music'], 'Exchange the two cards so each matches its main category', 'Football is mainly a sport, while mural-making is mainly visual art.', 'Identify the main form of participation in each activity.', 'CATEGORY_ANALYSIS', 'analyse'),
      q('Which feedback is most constructive after viewing the collage?', ['The categories are clear; enlarging the music label would improve readability', 'This is bad and no reason is needed', 'Remove everything because I prefer blue', 'The group should stop making art'], 'The categories are clear; enlarging the music label would improve readability', 'Constructive feedback names a strength and a specific improvement.', 'Choose feedback that is respectful, observable, and useful.', 'CONSTRUCTIVE_FEEDBACK', 'analyse')
    ]
  },
  {
    key: 'creative-arts-g7-components', subjectId: 'creative_arts', subjectName: 'Creative Arts & Sports', grade: 'Grade 7',
    strand: 'Foundations of Creative Arts and Sports', subStrand: 'Components of Creative Arts and Sports',
    title: 'Story, strength, and sound', shortTitle: 'Creative components',
    objective: 'Recognise story, fitness, and music components and combine them accurately in performance tasks.', minutes: 10,
    sourceRef: source('creative_arts_sports', '7-13'),
    visual: { setting: 'studio', elements: ['storyboard', 'coordination cones', 'strength station', 'treble staff', '2/4 rhythm cards'] },
    questions: [
      q('Which three are basic elements of a story?', ['Character, setting, and plot', 'Pitch, relay, and soil', 'Invoice, atom, and rainfall', 'Keyboard, fertilizer, and scale'], 'Character, setting, and plot', 'Characters act through a plot in a particular setting.', 'Think about who acts, where events happen, and what happens.', 'STORY_ELEMENTS', 'recall'),
      q('Which activity best demonstrates coordination?', ['Catching a moving ball while keeping balance', 'Sleeping through a warm-up', 'Holding a book without moving', 'Ignoring a signal during a game'], 'Catching a moving ball while keeping balance', 'Coordination lets body parts work together smoothly and accurately.', 'Look for an action requiring eyes, hands, and body position to work together.', 'COORDINATION_MEANING', 'understand'),
      q('Which exercise most directly develops muscular strength when performed safely?', ['Controlled body-weight squats with correct form', 'One slow blink', 'Whispering a story title', 'Drawing a treble clef'], 'Controlled body-weight squats with correct form', 'Controlled resistance makes muscles work and develop strength.', 'Choose the safe activity where muscles work against resistance.', 'STRENGTH_ACTIVITY', 'apply'),
      q('A 2/4 bar contains a minim and a crotchet. Why is it incorrect?', ['The notes total three crotchet beats instead of two', 'A minim has no beat value', 'A crotchet is always silent', 'The treble staff cannot show rhythm'], 'The notes total three crotchet beats instead of two', 'A minim is two beats and a crotchet one, so the bar is one beat too long.', 'Add the beat values and compare the total with the top number.', 'RHYTHM_BAR_ANALYSIS', 'analyse'),
      q('A learner writes a note on the second line of the treble staff. Which pitch should the label show?', ['G', 'E', 'F', 'C'], 'G', 'The treble-staff lines from the bottom begin E, G, B, D, F.', 'Count staff lines from the bottom rather than the spaces.', 'STAFF_PITCH', 'analyse')
    ]
  },
  {
    key: 'creative-arts-g7-drawing-painting', subjectId: 'creative_arts', subjectName: 'Creative Arts & Sports', grade: 'Grade 7',
    strand: 'Creating and Performing in Creative Arts and Sports', subStrand: 'Drawing and Painting',
    title: 'Paint depth into a scene', shortTitle: 'Drawing & painting',
    objective: 'Use balance, line, tone, and colour temperature to create and evaluate pictorial depth.', minutes: 10,
    sourceRef: source('creative_arts_sports', '14-20'),
    visual: { setting: 'studio', elements: ['Kenyan hillside sketch', 'balanced focal objects', 'tone strip', 'warm palette', 'cool palette'] },
    questions: [
      q('What does balance mean in a picture?', ['Visual weight feels deliberately arranged across the composition', 'Every object must be the same colour', 'The paper must stand on one edge', 'Only the centre may contain marks'], 'Visual weight feels deliberately arranged across the composition', 'Balance distributes visual interest so the composition feels stable and intentional.', 'Think about how size, colour, and position affect where the eye is drawn.', 'VISUAL_BALANCE', 'recall'),
      q('How does tone help a drawing look three-dimensional?', ['Light and dark values suggest form and shadow', 'It removes every visible edge', 'It makes all surfaces equally flat', 'It replaces observation with labels'], 'Light and dark values suggest form and shadow', 'Changes in value show how light falls across a form.', 'Imagine a round calabash with light on one side and shadow on the other.', 'TONE_AND_FORM', 'understand'),
      q('Which colour choice best makes a distant hill appear farther away?', ['Use cooler, lighter colours with less detail', 'Use the strongest warm colour and sharpest detail', 'Cover it with a black outline thicker than the foreground', 'Make it larger than every foreground object'], 'Use cooler, lighter colours with less detail', 'Cooler, lighter, less detailed shapes often appear more distant.', 'Compare atmospheric-looking distance with a bold foreground.', 'COLOUR_DISTANCE', 'apply'),
      q('A large red basket makes the right side feel heavy. Which revision best restores balance?', ['Add a smaller warm accent or stronger form on the left', 'Make the red basket larger', 'Erase the entire left side', 'Place every object on the right'], 'Add a smaller warm accent or stronger form on the left', 'A countering accent can redistribute visual attention without making both sides identical.', 'Balance visual weight; symmetry is only one possible solution.', 'COMPOSITION_REBALANCE', 'analyse'),
      q('Which critique best explains depth in a landscape?', ['Warm detailed crops advance while cool pale hills recede', 'The picture has paper and paint', 'Every line is the same length', 'The artist used a brush'], 'Warm detailed crops advance while cool pale hills recede', 'The critique connects visible choices in colour and detail to the effect of depth.', 'Choose the statement that uses evidence and names the visual effect.', 'ART_CRITIQUE', 'analyse')
    ]
  },

  {
    key: 'english-g7-polite-introductions', subjectId: 'english', subjectName: 'English', grade: 'Grade 7',
    strand: 'Listening and Speaking', subStrand: 'Polite Introductions',
    title: 'Make a warm introduction', shortTitle: 'Introductions',
    objective: 'Choose and build respectful introductions suited to formal and informal Kenyan settings.', minutes: 9,
    sourceRef: source('english', '1'),
    visual: { setting: 'classroom', elements: ['class teacher', 'visitor', 'new learner', 'name cards', 'greeting speech bubbles'] },
    questions: [
      q('Which expression is most suitable when introducing a visitor to your class teacher?', ['Excuse me, Madam, this is our visitor, Mr. Otieno.', 'Move aside, this person wants you.', 'Teacher, look at this stranger.', 'Here is someone; deal with him.'], 'Excuse me, Madam, this is our visitor, Mr. Otieno.', 'A polite introduction uses respectful language, names the person, and gives helpful information.', 'Look for a courteous opening and enough information for both people.', 'INTRODUCTION_POLITENESS', 'recall'),
      q('Why should an introduction normally include each person\'s name?', ['It helps both people know how to address one another', 'It makes every introduction formal', 'It prevents either person from speaking', 'It replaces the need for courtesy'], 'It helps both people know how to address one another', 'Names make the introduction clear and help the conversation begin respectfully.', 'Think about the information two people need before continuing the conversation.', 'INTRODUCTION_PURPOSE', 'understand'),
      q('A new learner joins your football practice. Which introduction best fits the informal setting?', ['Amani, this is our goalkeeper, Baraka. Baraka, Amani is joining us today.', 'Goalkeeper, a person has come.', 'Everyone, ignore the new learner.', 'Amani, stand there until someone guesses your name.'], 'Amani, this is our goalkeeper, Baraka. Baraka, Amani is joining us today.', 'It names both people and gives a useful connection in a friendly tone.', 'Choose language that is relaxed but still clear and respectful.', 'REGISTER_FOR_SETTING', 'apply'),
      q('“This is Wanjiku.” What would most improve this introduction at a science fair?', ['Add whom she is meeting and her role in the fair', 'Remove her name', 'Use a command instead of a greeting', 'Speak about her as if she is absent'], 'Add whom she is meeting and her role in the fair', 'Context helps both people understand why they are being introduced.', 'Identify the useful information missing after the name.', 'INTRODUCTION_CONTEXT', 'analyse'),
      q('Which introduction order is clearest for presenting a guest speaker?', ['Gain attention, greet respectfully, name the guest, state the guest\'s role', 'State the role, walk away, then whisper the name', 'Use no greeting, no name, and no context', 'Begin with a private joke and omit the guest\'s purpose'], 'Gain attention, greet respectfully, name the guest, state the guest\'s role', 'The sequence welcomes the audience and identifies the guest with relevant context.', 'Choose the order that moves from greeting to identity and purpose.', 'INTRODUCTION_SEQUENCE', 'analyse')
    ]
  },
  {
    key: 'english-g7-conversation-skills', subjectId: 'english', subjectName: 'English', grade: 'Grade 7',
    strand: 'Listening and Speaking', subStrand: 'Conversation Skills',
    title: 'Keep the conversation flowing', shortTitle: 'Turn-taking',
    objective: 'Use turn-taking, active listening, and relevant responses to sustain respectful group conversations.', minutes: 9,
    sourceRef: source('english', '2'),
    visual: { setting: 'classroom', elements: ['project table', 'four learners', 'speaker token', 'listening cues', 'idea cards'] },
    questions: [
      q('During a group discussion, which action shows good turn-taking?', ['Waiting for a speaker to finish before responding', 'Speaking louder whenever others begin', 'Interrupting to correct every sentence', 'Ignoring classmates who disagree'], 'Waiting for a speaker to finish before responding', 'Turn-taking helps speakers listen, respond thoughtfully, and keep a conversation respectful.', 'Choose the action that gives each speaker a fair chance to complete an idea.', 'TURN_TAKING', 'recall'),
      q('How does paraphrasing another speaker\'s idea support a conversation?', ['It checks understanding before adding a response', 'It changes the topic without warning', 'It proves only one person may speak', 'It replaces the need to listen'], 'It checks understanding before adding a response', 'Restating an idea briefly shows attention and reveals misunderstandings early.', 'Think about how a listener can confirm what was heard.', 'ACTIVE_LISTENING', 'understand'),
      q('Neema says the garden needs mulch. Which reply best moves the discussion forward?', ['I agree because mulch reduces moisture loss; could we collect dry grass safely?', 'That is your idea, so nobody else should speak.', 'Gardens are green. Next topic.', 'I did not listen, but your idea is wrong.'], 'I agree because mulch reduces moisture loss; could we collect dry grass safely?', 'The reply connects to Neema\'s point, gives a reason, and invites useful planning.', 'Choose a response that refers to the previous idea and adds something relevant.', 'RELEVANT_RESPONSE', 'apply'),
      q('One learner has spoken four times while another has not spoken. What should the facilitator do?', ['Invite the quiet learner and ask the group to share turns', 'End the discussion immediately', 'Let the same learner answer every question', 'Tell the quiet learner their ideas do not matter'], 'Invite the quiet learner and ask the group to share turns', 'Inclusive facilitation protects fair participation without silencing useful ideas.', 'Look for a respectful action that restores balance in participation.', 'DISCUSSION_INCLUSION', 'analyse'),
      q('Which sequence shows a strong group response?', ['Listen fully, paraphrase the point, add evidence, invite another view', 'Interrupt, dismiss the point, repeat yourself, leave', 'Plan your reply without listening, then change the topic', 'Agree with every statement without reasons'], 'Listen fully, paraphrase the point, add evidence, invite another view', 'The sequence combines active listening, relevant reasoning, and inclusion.', 'Choose the process that both understands and develops the discussion.', 'CONVERSATION_SEQUENCE', 'analyse')
    ]
  },
  {
    key: 'english-g7-polite-interruption', subjectId: 'english', subjectName: 'English', grade: 'Grade 7',
    strand: 'Listening and Speaking', subStrand: 'Polite Interruption',
    title: 'Enter a conversation kindly', shortTitle: 'Polite interruption',
    objective: 'Recognise when interruption is necessary and use courteous timing, words, and tone.', minutes: 9,
    sourceRef: source('english', '3'),
    visual: { setting: 'classroom', elements: ['debate speakers', 'raised hand', 'pause marker', 'courteous phrase cards', 'timer'] },
    questions: [
      q('Which sentence politely interrupts a speaker during debate practice?', ['May I add a point when you finish?', 'Stop talking now.', 'You are wrong, so sit down.', 'I will speak whether you like it or not.'], 'May I add a point when you finish?', 'A polite interruption asks permission and respects the current speaker.', 'Look for a phrase that waits for a suitable pause and requests a turn.', 'POLITE_PHRASE', 'recall'),
      q('Why is a natural pause usually the best time to enter a conversation?', ['It reduces disruption and lets the speaker complete an idea', 'It makes the new speaker more important', 'It proves listening is unnecessary', 'It guarantees everyone will agree'], 'It reduces disruption and lets the speaker complete an idea', 'Good timing protects the meaning of the current speaker\'s contribution.', 'Think about what happens to an idea when it is cut off halfway.', 'INTERRUPTION_TIMING', 'understand'),
      q('You notice a hot iron near a learner\'s hand while someone is explaining a task. What should you say?', ['Excuse me—please move your hand; the iron is hot.', 'I will mention it after the lesson.', 'Be quiet because nobody may interrupt.', 'Touch it first to check whether it is dangerous.'], 'Excuse me—please move your hand; the iron is hot.', 'An urgent safety warning should be immediate, clear, and courteous.', 'Safety changes how quickly you should speak, but not the need for clear respectful words.', 'URGENT_INTERRUPTION', 'apply'),
      q('“Excuse me, may I clarify the last point?” Why is this effective?', ['It signals courtesy, gives a purpose, and requests a turn', 'It attacks the speaker personally', 'It hides the reason for speaking', 'It changes the topic without permission'], 'It signals courtesy, gives a purpose, and requests a turn', 'The phrase helps the group understand why the interruption is useful.', 'Identify how each part prepares the current speaker and listeners.', 'INTERRUPTION_LANGUAGE', 'analyse'),
      q('A learner says “Sorry to interrupt” but uses a mocking tone and speaks over the presenter. What matters most?', ['Courteous words must be matched by respectful tone and timing', 'The words make every behaviour polite', 'Speaking louder proves confidence', 'Timing never affects communication'], 'Courteous words must be matched by respectful tone and timing', 'Politeness is communicated through words, voice, and behaviour together.', 'Compare the literal phrase with how it was delivered.', 'TONE_TIMING_MISMATCH', 'analyse')
    ]
  },

  {
    key: 'integrated-science-g7-introduction', subjectId: 'integrated_science', subjectName: 'Integrated Science', grade: 'Grade 7',
    strand: 'Scientific Investigation', subStrand: 'Introduction to Integrated Science',
    title: 'Science connects the world', shortTitle: 'Meet science',
    objective: 'Connect biology, chemistry, and physics to investigations, careers, and solutions in everyday life.', minutes: 10,
    sourceRef: source('integrated_science', '1-8'),
    visual: { setting: 'community', elements: ['school garden', 'cooking pot', 'bicycle repair', 'water sample', 'science notebook'] },
    questions: [
      q('Which three areas are commonly brought together in Integrated Science?', ['Biology, chemistry, and physics', 'History, poetry, and accounting', 'Music, drama, and football', 'Mapping, taxation, and trade'], 'Biology, chemistry, and physics', 'Integrated Science draws ideas and methods from the life, chemical, and physical sciences.', 'Look for three branches that investigate living things, matter, and energy.', 'SCIENCE_COMPONENTS', 'recall'),
      q('Why is testing water quality an integrated science problem?', ['It can involve organisms, dissolved substances, and physical measurements', 'It requires only the name of the river', 'It cannot use observation or measurement', 'It belongs only to creative writing'], 'It can involve organisms, dissolved substances, and physical measurements', 'One real problem can require knowledge from several science components.', 'Identify the biological, chemical, and physical evidence that may be present.', 'SCIENCE_INTEGRATION', 'understand'),
      q('A bicycle chain rusts after being left in rain. Which science ideas help explain the change?', ['Materials, water, air, and chemical change', 'Only plant reproduction', 'Only story structure', 'Only map direction'], 'Materials, water, air, and chemical change', 'Rusting connects material properties with a reaction involving water and oxygen.', 'Choose the ideas linked to the metal and its environment.', 'SCIENCE_APPLICATION', 'apply'),
      q('Learners want to know why one bean plot grows faster. Which question is most scientific?', ['How does the amount of water affect bean growth when other conditions are kept the same?', 'Which bean plot is the nicest?', 'Why must our favourite plot win?', 'Can we change every condition at once?'], 'How does the amount of water affect bean growth when other conditions are kept the same?', 'The question identifies a measurable factor and supports a fair investigation.', 'Look for a testable relationship with one changing factor.', 'TESTABLE_QUESTION', 'analyse'),
      q('Which career task best shows Integrated Science in action?', ['A food technologist tests safety, composition, and processing conditions', 'A person guesses food safety from packaging colour', 'A seller ignores storage temperature', 'A writer copies results without testing'], 'A food technologist tests safety, composition, and processing conditions', 'Food technology combines biological safety, chemistry, and physical processes.', 'Choose work that uses evidence from several science areas.', 'SCIENCE_CAREER', 'analyse')
    ]
  },
  {
    key: 'integrated-science-g7-laboratory-safety', subjectId: 'integrated_science', subjectName: 'Integrated Science', grade: 'Grade 7',
    strand: 'Scientific Investigation', subStrand: 'Laboratory Safety',
    title: 'Lab safety mission', shortTitle: 'Laboratory safety',
    objective: 'Identify laboratory hazards and select preventive, emergency, storage, and first-aid actions.', minutes: 10,
    sourceRef: source('integrated_science', '9-18'),
    visual: { setting: 'computer_lab', elements: ['science workbench', 'goggles', 'labelled chemical cupboard', 'small spill', 'broken glass container'] },
    questions: [
      q('Which protective equipment mainly shields the eyes during a laboratory investigation?', ['Safety goggles', 'Open sandals', 'Loose scarf', 'Exercise book'], 'Safety goggles', 'Safety goggles help block splashes and small particles from reaching the eyes.', 'Match the body part at risk to the equipment designed to cover it.', 'PPE_PURPOSE', 'recall'),
      q('Why must every chemical container have a clear label?', ['The contents and hazards must be identified before use', 'Labels make chemicals harmless', 'Any liquid can be used if its colour is known', 'Labels replace safe storage'], 'The contents and hazards must be identified before use', 'A clear label supports correct handling, storage, and emergency response.', 'Think about the decisions a learner cannot make from an unknown bottle.', 'CHEMICAL_LABEL', 'understand'),
      q('A glass test tube breaks on the floor. What should a learner do first?', ['Warn others and inform the teacher without touching the shards', 'Pick up the shards with bare hands', 'Kick the glass under a bench', 'Continue walking through the area'], 'Warn others and inform the teacher without touching the shards', 'The response isolates the hazard and gets trained supervision.', 'Choose the action that prevents another injury before cleanup begins.', 'BROKEN_GLASS_RESPONSE', 'apply'),
      q('A group heats a test tube pointed towards a classmate. What is wrong with the setup?', ['Hot liquid or vapour could be expelled towards the classmate', 'The tube is being held above a bench', 'Heating can never change a liquid', 'Classmates must always stand closer'], 'Hot liquid or vapour could be expelled towards the classmate', 'A heated test tube should point away from every person.', 'Imagine what could leave the open end when the contents become hot.', 'HEATING_HAZARD', 'analyse'),
      q('Which lab plan is safest?', ['Tie back long hair, clear the bench, read labels, wear PPE, and follow instructions', 'Taste unknown substances and work without supervision', 'Store chemicals in drink bottles and block the exit', 'Run between benches while carrying hot glass'], 'Tie back long hair, clear the bench, read labels, wear PPE, and follow instructions', 'The plan controls common hazards before and during practical work.', 'Choose the plan where several preventive actions work together.', 'LAB_SAFETY_PLAN', 'analyse')
    ]
  },
  {
    key: 'integrated-science-g7-basic-skills', subjectId: 'integrated_science', subjectName: 'Integrated Science', grade: 'Grade 7',
    strand: 'Scientific Investigation', subStrand: 'Basic Science Skills',
    title: 'Think like an investigator', shortTitle: 'Science skills',
    objective: 'Observe, predict, measure, plan a fair test, organise evidence, and draw a supported conclusion.', minutes: 10,
    sourceRef: source('integrated_science', '19-28'),
    visual: { setting: 'garden', elements: ['bean seedlings', 'measuring ruler', 'two watering cups', 'results table', 'conclusion card'] },
    questions: [
      q('Which statement is an observation rather than an opinion?', ['The seedling has four green leaves', 'The seedling is the most beautiful', 'This must be the best plant', 'Everyone should prefer this pot'], 'The seedling has four green leaves', 'An observation reports something that can be detected or measured.', 'Choose the statement another learner could check directly.', 'OBSERVATION_VS_OPINION', 'recall'),
      q('Why should a prediction include a reason?', ['The reason connects prior knowledge to the expected result', 'A reason guarantees the prediction is correct', 'Predictions should never be tested', 'Reasons remove the need for evidence'], 'The reason connects prior knowledge to the expected result', 'A reason makes the thinking testable and easier to evaluate against results.', 'Think about what explains why a result is expected.', 'PREDICTION_REASONING', 'understand'),
      q('Which tool and unit are suitable for measuring seedling height?', ['A ruler and centimetres', 'A balance and litres', 'A thermometer and kilograms', 'A stopwatch and degrees'], 'A ruler and centimetres', 'Length is measured with a ruler and can be recorded in centimetres.', 'Match the quantity—height—to a length tool and unit.', 'MEASUREMENT_MATCH', 'apply'),
      q('Two pots test the effect of water on growth. What must remain the same for a fair test?', ['Plant type, soil amount, light, and measuring time', 'The amount of water', 'Every condition must change', 'The recorded results'], 'Plant type, soil amount, light, and measuring time', 'Keeping other conditions constant isolates the effect of water amount.', 'Only the factor being investigated should differ.', 'FAIR_TEST_VARIABLES', 'analyse'),
      q('Pot A grew 6 cm and Pot B grew 2 cm under the stated fair-test conditions. Which conclusion is supported?', ['The water condition used for Pot A produced more growth in this test', 'All plants everywhere will grow exactly 6 cm', 'Water never affects growth', 'Pot B must be a different species'], 'The water condition used for Pot A produced more growth in this test', 'The conclusion matches the measured evidence without claiming more than the test shows.', 'Choose the claim limited to the actual pots, conditions, and results.', 'EVIDENCE_BASED_CONCLUSION', 'analyse')
    ]
  },

  {
    key: 'kiswahili-g7-kusikiliza-kujibu', subjectId: 'kiswahili', subjectName: 'Kiswahili', grade: 'Grade 7',
    strand: 'Kusikiliza na Kuzungumza', subStrand: 'Kusikiliza na Kujibu Mazungumzo',
    title: 'Sikiliza, elewa, jibu', shortTitle: 'Sikiliza na ujibu',
    objective: 'Kutambua hoja na maelezo katika mazungumzo na kutoa majibu yenye adabu yanayolingana na ujumbe.', minutes: 9,
    sourceRef: source('kiswahili', '1-2'),
    visual: { setting: 'classroom', elements: ['maktaba ya shule', 'wanafunzi wawili', 'kadi za hoja', 'ishara za usikivu', 'jibu la adabu'] },
    questions: [
      q('Ni kitendo kipi kinaonyesha kuwa mwanafunzi anasikiliza mazungumzo kwa makini?', ['Kumtazama msemaji na kufuatilia hoja zake', 'Kukatiza kila sentensi', 'Kuzungumza na jirani wakati wote', 'Kupuuza swali lililoulizwa'], 'Kumtazama msemaji na kufuatilia hoja zake', 'Usikivu makini huhitaji umakini kwa msemaji na ujumbe wake.', 'Chagua kitendo kinachomsaidia msikilizaji kuelewa ujumbe.', 'USIKIVU_MAKINI', 'recall'),
      q('Kwa nini ni muhimu kubainisha hoja kuu kabla ya kujibu?', ['Ili jibu lihusiane na ujumbe uliotolewa', 'Ili kubadilisha mada haraka', 'Ili msemaji asimalize maelezo', 'Ili jibu liwe refu bila sababu'], 'Ili jibu lihusiane na ujumbe uliotolewa', 'Hoja kuu humwelekeza msikilizaji kutoa jibu linalofaa.', 'Fikiria msingi ambao jibu bora linapaswa kuufuata.', 'HOJA_KUU', 'understand'),
      q('Msimamizi wa maktaba anasema, “Tafadhali rudisha kitabu Ijumaa.” Jibu lipi linafaa?', ['Asante kwa kunikumbusha; nitakirudisha Ijumaa.', 'Sikusikilizi na sitaki kujibu.', 'Kitabu hiki hakina rangi ninayoipenda.', 'Usiniambie chochote tena.'], 'Asante kwa kunikumbusha; nitakirudisha Ijumaa.', 'Jibu hilo linaonyesha adabu na kuthibitisha kuwa maelekezo yameeleweka.', 'Chagua jibu linalohusiana na tarehe na lenye heshima.', 'JIBU_LINALOFAA', 'apply'),
      q('Baada ya mazungumzo, Amina anaweza kutaja mada lakini si maelezo muhimu. Anapaswa kuboresha nini?', ['Kudondoa hoja kuu pamoja na mifano au maelezo yanayoiunga mkono', 'Kukisia ujumbe bila kusikiliza', 'Kukariri neno la kwanza pekee', 'Kukatiza kabla ya mifano kutolewa'], 'Kudondoa hoja kuu pamoja na mifano au maelezo yanayoiunga mkono', 'Uelewa kamili huhusisha mada na maelezo muhimu yanayoifafanua.', 'Tambua sehemu ya ujumbe ambayo bado haijakumbukwa.', 'MAELEZO_MUHIMU', 'analyse'),
      q('Jibu lipi linaonyesha usikivu na ombi la ufafanuzi?', ['Nimeelewa hatua ya kwanza; tafadhali eleza tena hatua ya pili.', 'Sikuelewa, kwa hiyo nitaondoka.', 'Rudia kila kitu kwa sababu sikusikiliza.', 'Maelezo yako hayana maana kwangu.'], 'Nimeelewa hatua ya kwanza; tafadhali eleza tena hatua ya pili.', 'Jibu linataja kilichoeleweka na kuomba ufafanuzi kwa adabu.', 'Chagua jibu linaloonyesha ushahidi wa kusikiliza kabla ya swali.', 'OMBI_LA_UFAFANUZI', 'analyse')
    ]
  },
  {
    key: 'kiswahili-g7-kushiriki-mazungumzo', subjectId: 'kiswahili', subjectName: 'Kiswahili', grade: 'Grade 7',
    strand: 'Kusikiliza na Kuzungumza', subStrand: 'Kushiriki Mazungumzo',
    title: 'Jadili kwa heshima', shortTitle: 'Shiriki mazungumzo',
    objective: 'Kutoa hoja wazi, kuheshimu zamu na maoni tofauti, na kuendeleza mazungumzo kwa ushahidi.', minutes: 9,
    sourceRef: source('kiswahili', '3'),
    visual: { setting: 'garden', elements: ['mradi wa bustani', 'wanafunzi wanne', 'kadi ya zamu', 'hoja na sababu', 'uamuzi wa kikundi'] },
    questions: [
      q('Ni tabia ipi inafaa wakati wa mazungumzo ya kikundi?', ['Kusubiri zamu na kusikiliza maoni ya wengine', 'Kusema kwa sauti kuliko kila mtu', 'Kudharau maoni tofauti', 'Kubadili mada kila mara'], 'Kusubiri zamu na kusikiliza maoni ya wengine', 'Kuheshimu zamu huwezesha kila mshiriki kutoa na kuelewa hoja.', 'Chagua tabia inayolinda nafasi ya kila mshiriki.', 'ZAMU_YA_KUZUNGUMZA', 'recall'),
      q('Kwa nini hoja inakuwa wazi zaidi inapokuwa na sababu?', ['Sababu huonyesha msingi wa maoni yaliyotolewa', 'Sababu hufanya kila maoni kuwa kweli', 'Sababu huzuia maswali yote', 'Sababu hubadilisha mada'], 'Sababu huonyesha msingi wa maoni yaliyotolewa', 'Msikilizaji anaweza kufuatilia na kutathmini hoja iliyo na sababu.', 'Fikiria taarifa inayojibu swali “kwa nini?”.', 'HOJA_NA_SABABU', 'understand'),
      q('Mwanafunzi anapendekeza matandazo bustanini. Jibu lipi linaendeleza mjadala?', ['Ninakubaliana kwa sababu hupunguza upotevu wa maji; tutayapata wapi?', 'Wazo hilo ni lako pekee.', 'Sitaki kusikia sababu.', 'Tuzungumzie mechi badala yake.'], 'Ninakubaliana kwa sababu hupunguza upotevu wa maji; tutayapata wapi?', 'Jibu linaunga mkono hoja kwa sababu na kuuliza swali linalohusiana.', 'Chagua jibu linaloongeza hoja badala ya kuikomesha.', 'KUENDELEZA_MJADALA', 'apply'),
      q('Watu wawili wanazungumza pekee katika kikundi cha watu sita. Kiongozi afanye nini?', ['Awaalike wengine watoe maoni na akumbushe kikundi kuhusu zamu', 'Awape hao wawili muda wote', 'Aumalize mjadala bila uamuzi', 'Awakataze waliotulia kuzungumza'], 'Awaalike wengine watoe maoni na akumbushe kikundi kuhusu zamu', 'Hatua hiyo inahimiza ushiriki wa haki na maoni mbalimbali.', 'Tafuta suluhisho linalopanua ushiriki bila kumdhalilisha mtu.', 'USHIRIKI_WA_HAKI', 'analyse'),
      q('Kauli ipi inakataa wazo kwa heshima?', ['Nina mtazamo tofauti kwa sababu gharama ni kubwa; je, tuna njia nafuu?', 'Wazo lako ni baya kabisa.', 'Nyamaza kwa sababu sikubaliani nawe.', 'Hakuna haja ya kueleza sababu.'], 'Nina mtazamo tofauti kwa sababu gharama ni kubwa; je, tuna njia nafuu?', 'Kauli inaheshimu mtu, inaeleza sababu, na inapendekeza uchunguzi zaidi.', 'Tofautisha kukosoa wazo kwa hoja na kumshambulia mtu.', 'KUTOFAUTIANA_KWA_HESHIMA', 'analyse')
    ]
  },
  {
    key: 'kiswahili-g7-miktadha', subjectId: 'kiswahili', subjectName: 'Kiswahili', grade: 'Grade 7',
    strand: 'Kusikiliza na Kuzungumza', subStrand: 'Miktadha ya Mazungumzo',
    title: 'Lugha inayolingana na mazingira', shortTitle: 'Muktadha',
    objective: 'Kuchagua msamiati, sauti na kiwango cha urasmi kulingana na hadhira, kusudi na mazingira.', minutes: 9,
    sourceRef: source('kiswahili', '4'),
    visual: { setting: 'community', elements: ['darasa', 'nyumbani', 'sokoni', 'hadhira tofauti', 'viputo vya mazungumzo'] },
    questions: [
      q('Muktadha katika mazungumzo unahusu nini?', ['Mazingira, hadhira na kusudi la mawasiliano', 'Idadi ya herufi katika neno pekee', 'Rangi ya karatasi pekee', 'Urefu wa msemaji'], 'Mazingira, hadhira na kusudi la mawasiliano', 'Muktadha husaidia kuamua namna inayofaa ya kutumia lugha.', 'Fikiria mahali, anayesikiliza, na sababu ya kuzungumza.', 'MAANA_YA_MUKTADHA', 'recall'),
      q('Kwa nini lugha ya mahojiano rasmi hutofautiana na mazungumzo ya rafiki?', ['Hadhira na kusudi huhitaji kiwango tofauti cha urasmi', 'Marafiki hawatumii maneno', 'Mahojiano hayahitaji heshima', 'Lugha rasmi haina maana'], 'Hadhira na kusudi huhitaji kiwango tofauti cha urasmi', 'Uhusiano na lengo la mawasiliano huathiri uteuzi wa lugha.', 'Linganisha watu wanaohusika na matokeo yanayotarajiwa.', 'KIWANGO_CHA_URASMI', 'understand'),
      q('Unataka kuuliza mkuu wa shule kuhusu mradi. Kauli ipi inafaa?', ['Samahani Mwalimu Mkuu, naomba ufafanuzi kuhusu ratiba ya mradi.', 'Wewe, niambie ratiba sasa.', 'Ratiba iko wapi, rafiki?', 'Sina haja ya kusalimia.'], 'Samahani Mwalimu Mkuu, naomba ufafanuzi kuhusu ratiba ya mradi.', 'Kauli hiyo ina heshima na inafaa kwa mazungumzo rasmi shuleni.', 'Chagua kauli inayolingana na cheo na kusudi la ombi.', 'LUGHA_RASMI', 'apply'),
      q('Kauli “Nipe hiyo sasa!” imetumiwa kwa mteja sokoni. Tatizo kuu ni lipi?', ['Sauti ya amri inaweza kukosa adabu katika huduma kwa mteja', 'Kauli ina maneno mengi sana', 'Soko haliruhusu Kiswahili', 'Mteja lazima atoe amri kwanza'], 'Sauti ya amri inaweza kukosa adabu katika huduma kwa mteja', 'Huduma nzuri huhitaji ombi au maelezo yenye heshima.', 'Tathmini uhusiano kati ya mhudumu, mteja, na sauti iliyotumiwa.', 'SAUTI_ISIYOFAA', 'analyse'),
      q('Ni marekebisho yapi yanayofaa zaidi kwa ujumbe wa kirafiki unaotumwa kama tangazo rasmi?', ['Ongeza salamu rasmi, maelezo kamili, tarehe na kusudi', 'Ondoa tarehe na jina la mtumaji', 'Tumia vifupisho visivyoeleweka zaidi', 'Acha ujumbe bila hadhira maalumu'], 'Ongeza salamu rasmi, maelezo kamili, tarehe na kusudi', 'Tangazo rasmi linahitaji uwazi, urasmi na taarifa muhimu.', 'Tambua vipengele ambavyo hadhira rasmi inahitaji ili kuelewa na kuchukua hatua.', 'KUBADILI_MUKTADHA', 'analyse')
    ]
  },

  {
    key: 'life-skills-g7-strengths-values', subjectId: 'life_skills', subjectName: 'Life Skills', grade: 'Grade 7',
    strand: 'Self Awareness', subStrand: 'Personal Strengths and Values',
    title: 'Discover your inner compass', shortTitle: 'Strengths & values',
    objective: 'Use evidence to recognise strengths, abilities, and values and apply them to responsible choices.', minutes: 9,
    sourceRef: source('life_skills', '1-3'),
    visual: { setting: 'classroom', elements: ['learner portfolio', 'teamwork photo', 'helping moment', 'creative project', 'value compass'] },
    questions: [
      q('Which statement describes a personal strength?', ['A quality or ability a person uses effectively', 'A rule that makes everyone identical', 'A task a person must never practise', 'A label chosen by strangers'], 'A quality or ability a person uses effectively', 'A strength is a positive quality or ability shown through action.', 'Look for something a learner can demonstrate and develop.', 'STRENGTH_DEFINITION', 'recall'),
      q('How is a value different from a skill?', ['A value guides choices, while a skill helps perform a task', 'A value is always physical, while a skill is secret', 'A skill never improves with practice', 'There is no difference in any situation'], 'A value guides choices, while a skill helps perform a task', 'Values influence what matters; skills influence how effectively something is done.', 'Compare honesty with drawing or coding.', 'VALUE_VS_SKILL', 'understand'),
      q('Kendi notices that she explains group tasks clearly and patiently. Which strength does the evidence show?', ['Supportive communication', 'Careless guessing', 'Avoiding teamwork', 'Refusing responsibility'], 'Supportive communication', 'Clear, patient explanations are evidence of communication that helps others.', 'Base the choice on what Kendi repeatedly does.', 'EVIDENCE_OF_STRENGTH', 'apply'),
      q('A learner values honesty but is urged to copy homework. Which response best follows the value?', ['Decline to copy and ask for help understanding the task', 'Copy only the hardest answers', 'Hide the copying from everyone', 'Blame a classmate in advance'], 'Decline to copy and ask for help understanding the task', 'The response protects honesty while seeking constructive support.', 'Choose an action consistent with the value and the purpose of learning.', 'VALUE_BASED_CHOICE', 'analyse'),
      q('A learner says, “I am bad at everything,” after one difficult match. What is the best evidence-based reply?', ['One result does not erase other strengths; review specific skills to practise', 'The statement must be true forever', 'Strengths never require practice', 'Comparing with everyone else is the only test'], 'One result does not erase other strengths; review specific skills to practise', 'Self-awareness uses specific evidence rather than a total judgement from one event.', 'Separate one performance from the learner\'s whole identity.', 'GLOBAL_SELF_JUDGEMENT', 'analyse')
    ]
  },
  {
    key: 'life-skills-g7-personal-growth', subjectId: 'life_skills', subjectName: 'Life Skills', grade: 'Grade 7',
    strand: 'Self Awareness', subStrand: 'Personal Growth',
    title: 'Chart your growth trail', shortTitle: 'Personal growth',
    objective: 'Reflect on a growth area and create a realistic goal, support, timeline, evidence, and review plan.', minutes: 10,
    sourceRef: source('life_skills', '4-and-100'),
    visual: { setting: 'nature', elements: ['starting point', 'goal flag', 'weekly milestones', 'support bridge', 'reflection journal'] },
    questions: [
      q('What is self-reflection?', ['Thinking honestly about experiences, choices, and learning', 'Judging yourself without evidence', 'Avoiding every difficult feeling', 'Repeating a habit without review'], 'Thinking honestly about experiences, choices, and learning', 'Self-reflection uses experience to understand progress and choose next steps.', 'Look for a process of looking back in order to learn.', 'SELF_REFLECTION', 'recall'),
      q('Why should a growth plan record a starting point?', ['It provides evidence for comparing later progress', 'It makes improvement impossible', 'It guarantees the final result', 'It removes the need for a goal'], 'It provides evidence for comparing later progress', 'A baseline helps a learner see what has changed.', 'Think about what two points are needed to measure movement.', 'GROWTH_BASELINE', 'understand'),
      q('Otieno wants to contribute more in class. Which action is a useful first milestone?', ['Prepare and ask one relevant question this week', 'Promise to answer every question perfectly tomorrow', 'Wait until the end of the year', 'Avoid recording any attempt'], 'Prepare and ask one relevant question this week', 'The milestone is specific, manageable, and observable.', 'Choose a small action the learner can complete and review soon.', 'GROWTH_MILESTONE', 'apply'),
      q('A plan says “improve soon” but has no action or evidence. What is missing?', ['Specific steps, a time frame, and a way to track progress', 'A more colourful title only', 'A promise to avoid support', 'A list of other people\'s weaknesses'], 'Specific steps, a time frame, and a way to track progress', 'A usable plan makes action and progress clear.', 'Ask how, by when, and how the learner will know.', 'INCOMPLETE_GROWTH_PLAN', 'analyse'),
      q('Which complete plan is strongest?', ['Practise a two-minute talk twice weekly, ask a teacher for feedback, record progress, and review after four weeks', 'Become confident with no practice date', 'Speak perfectly tomorrow without support', 'Compare yourself with friends every day'], 'Practise a two-minute talk twice weekly, ask a teacher for feedback, record progress, and review after four weeks', 'The plan combines action, support, evidence, timing, and review.', 'Choose the plan that can be followed and evaluated.', 'COMPLETE_GROWTH_PLAN', 'analyse')
    ]
  },
  {
    key: 'life-skills-g7-self-esteem', subjectId: 'life_skills', subjectName: 'Life Skills', grade: 'Grade 7',
    strand: 'Self Awareness', subStrand: 'Self Esteem',
    title: 'Speak to yourself like a coach', shortTitle: 'Self-esteem',
    objective: 'Practise realistic positive self-talk, confident communication, and help-seeking that strengthen self-esteem.', minutes: 9,
    sourceRef: source('life_skills', '5-and-8'),
    visual: { setting: 'classroom', elements: ['presentation space', 'thought cards', 'steady posture', 'trusted helper', 'small mascot coach'] },
    questions: [
      q('Which behaviour can strengthen healthy self-esteem?', ['Recognising effort and learning from mistakes', 'Pretending weaknesses do not exist', 'Insulting others to feel stronger', 'Avoiding every new task'], 'Recognising effort and learning from mistakes', 'Healthy self-esteem accepts both strengths and growth areas.', 'Choose a response that is honest, kind, and open to growth.', 'HEALTHY_SELF_ESTEEM', 'recall'),
      q('Why is “I cannot do this yet” more helpful than “I can never do this”?', ['It treats ability as something that can grow with support and practice', 'It guarantees the task will become easy', 'It hides every difficulty', 'It says practice has no value'], 'It treats ability as something that can grow with support and practice', 'The word “yet” leaves room for learning and planned effort.', 'Notice how each sentence imagines the future.', 'GROWTH_SELF_TALK', 'understand'),
      q('Before a presentation, which action shows calm confidence?', ['Breathe slowly, review key points, and begin at a clear pace', 'Mock another presenter', 'Read as fast as possible without looking up', 'Leave without asking for help'], 'Breathe slowly, review key points, and begin at a clear pace', 'Preparation and controlled breathing support confident communication.', 'Choose an action that steadies both body and message.', 'CONFIDENT_PRESENTATION', 'apply'),
      q('A friend gives respectful feedback about speaking too softly. What is the strongest response?', ['Thank them, test a louder voice, and ask whether it is clearer', 'Treat the feedback as a personal attack', 'Stop speaking in groups forever', 'Insist there is nothing to improve'], 'Thank them, test a louder voice, and ask whether it is clearer', 'Using specific feedback supports improvement without lowering self-worth.', 'Separate feedback about one skill from a judgement about the whole person.', 'FEEDBACK_AND_SELF_WORTH', 'analyse'),
      q('Which statement shows confidence without disrespect?', ['I can lead this part, and I would like to hear your ideas too.', 'Only my idea deserves attention.', 'I am better than everyone here.', 'I will agree even when I have evidence to add.'], 'I can lead this part, and I would like to hear your ideas too.', 'Healthy confidence expresses ability while respecting other people.', 'Look for a statement that values both self and group.', 'ASSERTIVENESS_VS_ARROGANCE', 'analyse')
    ]
  },

  {
    key: 'math-g7-whole-numbers', subjectId: 'math', subjectName: 'Mathematics', grade: 'Grade 7',
    strand: 'Numbers', subStrand: 'Whole Numbers',
    title: 'Decode giant numbers', shortTitle: 'Whole numbers',
    objective: 'Read, classify, round, and calculate with whole numbers using place value and correct operation order.', minutes: 10,
    sourceRef: source('mathematics', '1-8'),
    visual: { setting: 'classroom', elements: ['county library counter', 'place-value columns', 'rounding line', 'operation cards', 'factor grid'] },
    questions: [
      q('What is the place value of 7 in 5,742,816?', ['Hundred thousands', 'Ten thousands', 'Thousands', 'Millions'], 'Hundred thousands', 'The 7 is in the hundred-thousands column, so its value is 700,000.', 'Read the place-value columns from the ones digit towards the left.', 'PLACE_VALUE_POSITION', 'recall'),
      q('Which number is 6,030,409 written in words?', ['Six million thirty thousand four hundred nine', 'Six million three hundred thousand four hundred nine', 'Six hundred thousand thirty thousand four hundred nine', 'Sixty million thirty thousand four hundred nine'], 'Six million thirty thousand four hundred nine', 'The groups are 6 million, 30 thousand, and 409.', 'Separate the number into groups of three digits.', 'NUMBER_WORDS', 'understand'),
      q('Round 48,763 to the nearest thousand.', ['49,000', '48,000', '48,700', '50,000'], '49,000', 'The hundreds digit is 7, so the thousands digit rounds up.', 'Check the digit immediately to the right of the thousands place.', 'ROUNDING_PLACE', 'apply'),
      q('Which expression evaluates 8 + 6 × 4 correctly?', ['8 + 24 = 32', '14 × 4 = 56', '8 + 6 = 14', '48 + 4 = 52'], '8 + 24 = 32', 'Multiplication is completed before addition.', 'Apply the operation-order rule before calculating from left to right.', 'ORDER_OF_OPERATIONS', 'analyse'),
      q('A school bought 24 boxes with 36 pencils in each box. How many pencils were bought?', ['864', '720', '640', '96'], '864', 'Twenty-four equal groups of 36 give 24 × 36 = 864.', 'Break 36 into 30 and 6, multiply each by 24, then combine.', 'MULTIPLICATION_CONTEXT', 'analyse')
    ]
  },
  {
    key: 'math-g7-integers', subjectId: 'math', subjectName: 'Mathematics', grade: 'Grade 7',
    strand: 'Numbers', subStrand: 'Integers',
    title: 'Journey below zero', shortTitle: 'Integers',
    objective: 'Represent, compare, add, and multiply integers in number-line and real-life situations.', minutes: 10,
    sourceRef: source('mathematics', '9-12'),
    visual: { setting: 'nature', elements: ['vertical mountain trail', 'zero marker', 'negative levels', 'positive levels', 'movement arrows'] },
    questions: [
      q('Which integer is six units below zero?', ['-6', '6', '0', '-1'], '-6', 'Negative six is six equal steps below or left of zero.', 'A minus sign represents a position on the negative side of zero.', 'INTEGER_REPRESENTATION', 'recall'),
      q('Which integer is greater than -3 but less than 2?', ['0', '-5', '3', '2'], '0', 'Zero lies between -3 and 2 on the number line.', 'Place each option on a number line and check both boundaries.', 'INTEGER_ORDER', 'understand'),
      q('The morning temperature was -2 °C and rose by 9 °C. What was the new temperature?', ['7 °C', '-11 °C', '11 °C', '-7 °C'], '7 °C', 'Starting at -2 and moving 9 units upward lands at 7.', 'A rise means move towards greater numbers.', 'INTEGER_CHANGE', 'apply'),
      q('What is -4 × 7?', ['-28', '28', '-11', '11'], '-28', 'A negative integer multiplied by a positive integer gives a negative product.', 'First calculate 4 × 7, then apply the sign rule.', 'INTEGER_MULTIPLICATION', 'analyse'),
      q('A mobile-money record shows +KSh 500, -KSh 180, and -KSh 70. What is the net change?', ['+KSh 250', '+KSh 750', '-KSh 250', '+KSh 390'], '+KSh 250', 'The net change is 500 - 180 - 70 = 250.', 'Combine the two outflows before comparing them with the inflow.', 'INTEGER_NET_CHANGE', 'analyse')
    ]
  },
  {
    key: 'math-g7-fractions', subjectId: 'math', subjectName: 'Mathematics', grade: 'Grade 7',
    strand: 'Numbers', subStrand: 'Fractions',
    title: 'Build fractions that fit', shortTitle: 'Fractions',
    objective: 'Generate equivalents and add, subtract, and apply fractions with related and unlike denominators.', minutes: 10,
    sourceRef: source('mathematics', '13-17'),
    visual: { setting: 'home', elements: ['chapati fraction tiles', 'ribbon measure', 'equivalent bars', 'common-denominator grid', 'sharing plate'] },
    questions: [
      q('Which fraction is equivalent to 3/5?', ['9/15', '6/15', '12/15', '3/10'], '9/15', 'Multiplying numerator and denominator of 3/5 by 3 gives 9/15.', 'Apply the same non-zero multiplier to both parts.', 'EQUIVALENT_FRACTION', 'recall'),
      q('Why must 2/3 be renamed before adding it to 1/6?', ['The parts must be expressed in equal-sized units', 'The numerator must always equal the denominator', 'Thirds and sixths already have different whole sizes', 'Addition requires changing both fractions to whole numbers'], 'The parts must be expressed in equal-sized units', 'A common denominator makes the fractional units comparable and combinable.', 'You can only count pieces together when each piece has the same size.', 'COMMON_DENOMINATOR_REASON', 'understand'),
      q('What is 2/3 + 1/6?', ['5/6', '3/9', '1/2', '2/9'], '5/6', 'Two-thirds is 4/6, so 4/6 + 1/6 = 5/6.', 'Rename two-thirds in sixths before adding numerators.', 'FRACTION_ADDITION', 'apply'),
      q('A learner used 3/4 m of ribbon and then 2/3 m. What total length was used?', ['1 5/12 m', '1 1/7 m', '5/7 m', '1 1/12 m'], '1 5/12 m', 'Using twelfths gives 9/12 + 8/12 = 17/12 = 1 5/12.', 'Find the lowest common multiple of 4 and 3.', 'UNLIKE_DENOMINATORS', 'analyse'),
      q('A 35-seed packet uses 2/5 for Plot A. How many seeds remain?', ['21', '14', '7', '33'], '21', 'Two-fifths of 35 is 14, leaving 35 - 14 = 21.', 'Find the fraction used first, then subtract it from the whole packet.', 'FRACTION_REMAINDER', 'analyse')
    ]
  },

  {
    key: 'pre-technical-g7-introduction', subjectId: 'pre_technical_studies', subjectName: 'Pre-Technical Studies', grade: 'Grade 7',
    strand: 'Foundations of Pre-Technical Studies', subStrand: 'Introduction to Pre-Technical Studies',
    title: 'Enter the maker lab', shortTitle: 'Meet pre-technical',
    objective: 'Connect Pre-Technical Studies components with practical problem solving, daily life, and career pathways.', minutes: 9,
    sourceRef: source('pre_technical_studies', '1-5'),
    visual: { setting: 'computer_lab', elements: ['technical drawing board', 'computer station', 'hand-tool bench', 'design brief', 'career cards'] },
    questions: [
      q('What is a main purpose of Pre-Technical Studies?', ['Develop practical, design, digital, and problem-solving foundations', 'Replace all academic learning with one tool', 'Teach unsafe shortcuts in workshops', 'Memorise machine colours only'], 'Develop practical, design, digital, and problem-solving foundations', 'The learning area prepares learners to understand and solve practical technical problems.', 'Look for a purpose broad enough to include design, tools, and technology.', 'PRETECH_SCOPE', 'recall'),
      q('Why is technical drawing useful before making an object?', ['It communicates dimensions, shape, and construction ideas', 'It guarantees materials cannot be wasted', 'It removes the need to measure', 'It is only decoration'], 'It communicates dimensions, shape, and construction ideas', 'A drawing helps people plan and share a design before construction.', 'Think about the information a maker needs before cutting material.', 'DRAWING_PURPOSE', 'understand'),
      q('A classroom shelf wobbles. Which Pre-Technical approach is best?', ['Observe the problem, sketch a safe solution, select tools, and test under supervision', 'Hit it randomly until it stands', 'Ignore the wobble and add more load', 'Remove safety checks to save time'], 'Observe the problem, sketch a safe solution, select tools, and test under supervision', 'Technical problem solving follows evidence, planning, safe action, and evaluation.', 'Choose a process rather than an unplanned repair attempt.', 'TECHNICAL_PROBLEM_SOLVING', 'apply'),
      q('A learner enjoys precise drawing and planning spaces. Which pathway is most closely related?', ['Architecture or technical design', 'A job selected only because a friend chose it', 'A pathway with no drawing or planning', 'Any role without investigating its tasks'], 'Architecture or technical design', 'Those fields apply drawing, measurement, visualisation, and planning.', 'Match the learner\'s demonstrated interests to the work involved.', 'CAREER_PATHWAY', 'analyse'),
      q('Which project best combines digital and practical components?', ['Design a simple stool digitally, make a model, and evaluate its stability', 'Copy an image without measurements or testing', 'Use a tool with no plan or supervision', 'Write a title and skip the product'], 'Design a simple stool digitally, make a model, and evaluate its stability', 'The project connects digital design, practical making, and evidence-based evaluation.', 'Choose the project that moves from plan to model to test.', 'INTEGRATED_PRETECH_PROJECT', 'analyse')
    ]
  },
  {
    key: 'pre-technical-g7-safety', subjectId: 'pre_technical_studies', subjectName: 'Pre-Technical Studies', grade: 'Grade 7',
    strand: 'Foundations of Pre-Technical Studies', subStrand: 'Safety in the Immediate Environment',
    title: 'Spot the workshop hazard', shortTitle: 'Work safely',
    objective: 'Identify hazards, PPE, signs, movement rules, emergency actions, and basic first-aid priorities.', minutes: 10,
    sourceRef: source('pre_technical_studies', '6-14'),
    visual: { setting: 'computer_lab', elements: ['workshop bench', 'safety goggles', 'trailing cable', 'warning sign', 'first-aid point'] },
    questions: [
      q('Which item is personal protective equipment for the eyes?', ['Safety goggles', 'Loose necklace', 'Open sandal', 'Notebook'], 'Safety goggles', 'Safety goggles help protect the eyes from particles and splashes.', 'Match the hazard to equipment worn on the body.', 'PPE_IDENTIFICATION', 'recall'),
      q('Why should walkways remain clear during practical work?', ['Clear routes reduce trips and allow safe emergency movement', 'Tools work better when left on the floor', 'Learners should jump over cables', 'Clear routes make warning signs unnecessary'], 'Clear routes reduce trips and allow safe emergency movement', 'Good housekeeping prevents incidents and keeps exits usable.', 'Think about everyday movement and what happens during an emergency.', 'HOUSEKEEPING_PURPOSE', 'understand'),
      q('You see a trailing power cable across a walkway. What should you do?', ['Keep others away and report it so it can be secured safely', 'Pull it while equipment is running', 'Cover it with paper and say nothing', 'Step on it to hold it down'], 'Keep others away and report it so it can be secured safely', 'The response controls access and gets authorised help without adding electrical risk.', 'Do not handle an electrical hazard unless trained and authorised.', 'CABLE_HAZARD_RESPONSE', 'apply'),
      q('A sign shows a flame inside a red circle with a slash. What behaviour does it require?', ['Keep flames and ignition sources away', 'Light a fire in that area', 'Store paper beside heat', 'Ignore all labels'], 'Keep flames and ignition sources away', 'The prohibited-flame sign warns that ignition could cause serious harm.', 'Interpret both the flame symbol and the prohibition mark.', 'SAFETY_SIGN', 'analyse'),
      q('A learner receives a small cut during supervised work. Which sequence is safest?', ['Stop work, inform the supervisor, use the first-aid procedure, and record the incident', 'Hide the cut and continue using tools', 'Touch shared materials with the bleeding hand', 'Apply an unknown workshop chemical'], 'Stop work, inform the supervisor, use the first-aid procedure, and record the incident', 'The sequence prevents further harm and ensures appropriate care and follow-up.', 'Choose the process that first stops exposure and gets trained assistance.', 'MINOR_INJURY_RESPONSE', 'analyse')
    ]
  },
  {
    key: 'pre-technical-g7-computer-concepts', subjectId: 'pre_technical_studies', subjectName: 'Pre-Technical Studies', grade: 'Grade 7',
    strand: 'Foundations of Pre-Technical Studies', subStrand: 'Computer Concepts',
    title: 'Follow the data journey', shortTitle: 'Computer concepts',
    objective: 'Classify computer devices and explain the input, processing, output, storage, backup, and ergonomic cycle.', minutes: 10,
    sourceRef: source('pre_technical_studies', '15-21'),
    visual: { setting: 'computer_lab', elements: ['keyboard input', 'processor', 'monitor output', 'storage drive', 'backup shield'] },
    questions: [
      q('Which device is mainly used for input?', ['Keyboard', 'Monitor', 'Speaker', 'Projector'], 'Keyboard', 'A keyboard sends typed data and commands into a computer.', 'Ask whether information moves into or out of the system.', 'INPUT_DEVICE', 'recall'),
      q('What is the difference between data and information?', ['Data are raw facts; information is data processed into useful meaning', 'Data are always useful conclusions', 'Information cannot be stored', 'The words mean only computer hardware'], 'Data are raw facts; information is data processed into useful meaning', 'Processing organises or interprets data so it can support understanding and action.', 'Compare a list of scores with a calculated class average.', 'DATA_VS_INFORMATION', 'understand'),
      q('Which order shows the basic data-processing cycle?', ['Input, processing, output, storage', 'Output, storage, input, guessing', 'Storage, output, decoration, input', 'Processing, output, no input, no storage'], 'Input, processing, output, storage', 'Data enter, are processed, produce a result, and may be stored for later use.', 'Follow information from the user to a result and then preservation.', 'DATA_CYCLE_ORDER', 'apply'),
      q('Why is a backup different from simply saving a file on the same device?', ['A backup keeps another recoverable copy in a separate location or medium', 'A backup deletes the original immediately', 'Saving once guarantees the device cannot fail', 'A backup is only a new filename in the same folder'], 'A backup keeps another recoverable copy in a separate location or medium', 'A separate copy protects against loss of the original device or storage.', 'Think about what survives if the first storage location fails.', 'BACKUP_CONCEPT', 'analyse'),
      q('Which workstation setup best supports safe computer use?', ['Screen near eye level, supported posture, relaxed wrists, and regular breaks', 'Screen far to one side and shoulders twisted', 'Chair too high with feet unsupported', 'Continuous use for hours without changing position'], 'Screen near eye level, supported posture, relaxed wrists, and regular breaks', 'Good ergonomics reduces strain by supporting neutral posture and rest.', 'Evaluate the position of eyes, back, wrists, and feet together.', 'COMPUTER_ERGONOMICS', 'analyse')
    ]
  },

  {
    key: 'religious-education-g7-purpose', subjectId: 'religious_education', subjectName: 'Religious Education', grade: 'Grade 7',
    strand: 'Foundations of Religious Education', subStrand: 'Meaning and Importance of Religious Education',
    title: 'Values for responsible living', shortTitle: 'Why study religion?',
    objective: 'Explain how respectful study of religion can support self-understanding, moral reasoning, service, and peaceful community life.', minutes: 9,
    sourceRef: source('religious_education', '1'),
    visual: { setting: 'community', elements: ['school reflection circle', 'family care', 'community service', 'peaceful dialogue', 'value pathway'] },
    questions: [
      q('What is one purpose of Religious Education?', ['To develop understanding of faith, values, and responsible living', 'To force every learner to hold one belief', 'To rank classmates by religion', 'To replace respectful inquiry with rumours'], 'To develop understanding of faith, values, and responsible living', 'Religious Education can build knowledge, reflection, values, and respect for others.', 'Choose a purpose that supports learning and responsible conduct.', 'RELIGIOUS_EDUCATION_PURPOSE', 'recall'),
      q('How can Religious Education support moral reasoning?', ['It helps learners examine values, actions, and consequences', 'It gives permission to ignore evidence', 'It makes every difficult choice identical', 'It removes personal responsibility'], 'It helps learners examine values, actions, and consequences', 'Moral reasoning connects principles with the effects of possible choices.', 'Think about how a learner decides what is responsible in a real situation.', 'MORAL_REASONING', 'understand'),
      q('A learner finds a lost purse at school. Which action best applies responsible values?', ['Hand it to the authorised school office and explain where it was found', 'Keep the money and discard the purse', 'Share its contents with friends', 'Post the owner\'s private details online'], 'Hand it to the authorised school office and explain where it was found', 'Honesty, care, and respect for property guide the responsible action.', 'Choose the action that protects both the property and its owner.', 'VALUES_IN_ACTION', 'apply'),
      q('A service activity gives help but publicly embarrasses the people receiving it. What should be improved?', ['Protect dignity and privacy while meeting the real need', 'Take more photographs without permission', 'Make recipients compete for help', 'Stop listening to the community'], 'Protect dignity and privacy while meeting the real need', 'Responsible service combines compassion with dignity, consent, and respect.', 'Evaluate not only what is given but how people are treated.', 'DIGNITY_IN_SERVICE', 'analyse'),
      q('Which reflection best connects learning to daily conduct?', ['The value of honesty should shape how I report group results even when mistakes occurred', 'Values matter only during a lesson', 'Responsible choices never have consequences', 'Reflection means repeating words without action'], 'The value of honesty should shape how I report group results even when mistakes occurred', 'The reflection names a value and applies it to a specific decision.', 'Choose a link between principle and observable behaviour.', 'REFLECTIVE_APPLICATION', 'analyse')
    ]
  },
  {
    key: 'religious-education-g7-diversity', subjectId: 'religious_education', subjectName: 'Religious Education', grade: 'Grade 7',
    strand: 'Foundations of Religious Education', subStrand: 'Respect for Religious Diversity',
    title: 'Build bridges of respect', shortTitle: 'Religious diversity',
    objective: 'Use dignity, listening, accurate language, and inclusive action when people hold different religious or non-religious convictions.', minutes: 10,
    sourceRef: source('religious_education', '2'),
    visual: { setting: 'classroom', elements: ['inclusive planning circle', 'listening token', 'shared school project', 'accurate information card', 'respect bridge'] },
    questions: [
      q('Which value most directly supports peaceful interaction among people of different faiths?', ['Respect', 'Mockery', 'Exclusion', 'Stereotyping'], 'Respect', 'Respect recognises every person\'s dignity even when beliefs differ.', 'Look for the value that protects people while allowing difference.', 'DIVERSITY_VALUE', 'recall'),
      q('Why are stereotypes harmful in discussions about religion?', ['They replace individual understanding with unfair generalisations', 'They always provide complete evidence', 'They help every person feel included', 'They make respectful questions unnecessary'], 'They replace individual understanding with unfair generalisations', 'A stereotype can misrepresent people and damage trust.', 'Compare a broad assumption with learning from a person or reliable source.', 'RELIGIOUS_STEREOTYPE', 'understand'),
      q('A class event overlaps with a learner\'s important observance. What is the best first response?', ['Listen to the learner and explore a fair practical accommodation', 'Tell the learner their observance does not matter', 'Cancel every school activity permanently', 'Ask classmates to guess what the learner needs'], 'Listen to the learner and explore a fair practical accommodation', 'Respectful inclusion begins with accurate information and collaborative planning.', 'Do not assume; begin by listening to the person affected.', 'INCLUSIVE_ACCOMMODATION', 'apply'),
      q('A social post makes an insulting claim about a faith community. What should a learner do?', ['Do not forward it; check reliable information and report harmful content appropriately', 'Forward it so more people can judge', 'Add another insult', 'Treat popularity as proof'], 'Do not forward it; check reliable information and report harmful content appropriately', 'Responsible digital conduct avoids spreading harm and uses evidence and reporting channels.', 'Choose the response that limits harm and checks accuracy.', 'DIGITAL_RELIGIOUS_HARM', 'analyse'),
      q('Which plan makes a school dialogue most inclusive?', ['Agree on respectful rules, let participants describe their own traditions, and ask open questions', 'Let one group define every other group', 'Invite only people who already agree', 'Use jokes about beliefs as introductions'], 'Agree on respectful rules, let participants describe their own traditions, and ask open questions', 'The plan supports accuracy, voice, curiosity, and equal dignity.', 'Choose a process that avoids speaking for others.', 'INTERFAITH_DIALOGUE_PLAN', 'analyse')
    ]
  },
  {
    key: 'religious-education-g7-beliefs-practices', subjectId: 'religious_education', subjectName: 'Religious Education', grade: 'Grade 7',
    strand: 'Foundations of Religious Education', subStrand: 'Religious Beliefs and Practices',
    title: 'From belief to daily action', shortTitle: 'Beliefs & practices',
    objective: 'Distinguish beliefs, values, and practices and analyse how they may shape conduct while respecting diversity within traditions.', minutes: 10,
    sourceRef: source('religious_education', '3'),
    visual: { setting: 'home', elements: ['belief card', 'value compass', 'practice calendar', 'family action', 'community service'] },
    questions: [
      q('What is a religious belief?', ['A conviction about faith, meaning, or the sacred held within a tradition', 'Any rumour about another community', 'A compulsory opinion for every person', 'Only a building used for gatherings'], 'A conviction about faith, meaning, or the sacred held within a tradition', 'Beliefs express convictions and understandings within religious life.', 'Distinguish an idea or conviction from a place or an unverified claim.', 'BELIEF_DEFINITION', 'recall'),
      q('How is a practice different from a belief?', ['A practice is an action or observance; a belief is a held conviction', 'A practice is always private and a belief always public', 'A belief requires no meaning', 'There is never any relationship between them'], 'A practice is an action or observance; a belief is a held conviction', 'Practices may express beliefs and values through action.', 'Compare what a person holds to what a person does.', 'BELIEF_VS_PRACTICE', 'understand'),
      q('Which example best shows a value shaping daily conduct?', ['A learner values compassion and includes a classmate who is alone', 'A learner repeats a word but treats others cruelly', 'A learner judges a whole group from one person', 'A learner hides a harmful action behind a label'], 'A learner values compassion and includes a classmate who is alone', 'The action makes the stated value visible in an everyday relationship.', 'Choose the example where conduct matches the value.', 'VALUE_TO_CONDUCT', 'apply'),
      q('Two members of the same faith follow a practice differently. What is the fairest conclusion?', ['People within one tradition may interpret or observe practices differently', 'One person must not belong to the tradition', 'Every member must behave identically', 'An outsider should decide who is genuine'], 'People within one tradition may interpret or observe practices differently', 'Religious communities contain personal, family, and cultural diversity.', 'Avoid assuming a tradition has only one lived expression.', 'INTRARELIGIOUS_DIVERSITY', 'analyse'),
      q('Which investigation is most respectful and reliable?', ['Compare trusted sources and, with consent, ask practitioners open questions', 'Rely on one mocking video', 'Photograph private worship without permission', 'Decide the answer before gathering evidence'], 'Compare trusted sources and, with consent, ask practitioners open questions', 'Multiple reliable sources and consent improve accuracy and respect.', 'Choose a method that protects people and tests information.', 'RELIGION_INQUIRY_METHOD', 'analyse')
    ]
  },

  {
    key: 'social-g7-rationale', subjectId: 'social', subjectName: 'Social Studies', grade: 'Grade 7',
    strand: 'Foundations of Social Studies', subStrand: 'Rationale for Studying Social Studies',
    title: 'Read your community', shortTitle: 'Why Social Studies?',
    objective: 'Explain how Social Studies knowledge and inquiry help learners understand places, people, institutions, and community issues.', minutes: 9,
    sourceRef: source('social_studies', '1'),
    visual: { setting: 'community', elements: ['neighbourhood map', 'school', 'river', 'market', 'county office'] },
    questions: [
      q('What does Social Studies mainly investigate?', ['People, places, environments, institutions, and their relationships', 'Only multiplication facts', 'Only laboratory chemicals', 'Only musical notation'], 'People, places, environments, institutions, and their relationships', 'Social Studies connects human life with places, resources, history, and governance.', 'Look for a scope broad enough to include society and environment.', 'SOCIAL_STUDIES_SCOPE', 'recall'),
      q('Why is field observation useful in Social Studies?', ['It provides direct evidence about a place or activity', 'It guarantees one visit answers every question', 'It replaces ethical permission', 'It makes records unnecessary'], 'It provides direct evidence about a place or activity', 'Observation can reveal patterns that learners record and compare with other sources.', 'Think about what can be learned by carefully seeing and recording.', 'FIELD_OBSERVATION', 'understand'),
      q('A path to school floods after rain. Which Social Studies question is most useful?', ['How do drainage, settlement, and land use affect flooding along the route?', 'Which colour should the rain be?', 'Why should no evidence be collected?', 'How can we blame one person immediately?'], 'How do drainage, settlement, and land use affect flooding along the route?', 'The question connects environment and human activity in a way that can be investigated.', 'Choose a question about causes and relationships that evidence can test.', 'SOCIAL_INQUIRY_QUESTION', 'apply'),
      q('Learners interview residents about a market but speak only to one stall owner. What is the main weakness?', ['The evidence may not represent the different people affected', 'One opinion is always enough for a community study', 'Interviews cannot provide any evidence', 'The market location no longer matters'], 'The evidence may not represent the different people affected', 'A stronger inquiry includes varied, relevant perspectives and other sources.', 'Ask whose experiences are missing from the evidence.', 'REPRESENTATIVE_EVIDENCE', 'analyse'),
      q('Which plan best studies litter near a river?', ['Map litter sites, observe safely, interview with consent, compare records, and propose evidence-based action', 'Collect no evidence and choose a solution first', 'Enter dangerous water without supervision', 'Publish people\'s names without permission'], 'Map litter sites, observe safely, interview with consent, compare records, and propose evidence-based action', 'The plan combines spatial, observational, social, ethical, and action skills.', 'Choose the plan that gathers several kinds of evidence safely.', 'SOCIAL_STUDIES_INQUIRY', 'analyse')
    ]
  },
  {
    key: 'social-g7-careers', subjectId: 'social', subjectName: 'Social Studies', grade: 'Grade 7',
    strand: 'Foundations of Social Studies', subStrand: 'Career Opportunities in Social Studies',
    title: 'Careers that shape communities', shortTitle: 'Social careers',
    objective: 'Match Social Studies knowledge and inquiry skills to career roles and plan reliable career exploration.', minutes: 9,
    sourceRef: source('social_studies', '2'),
    visual: { setting: 'community', elements: ['field researcher', 'map maker', 'county planner', 'heritage officer', 'community organiser'] },
    questions: [
      q('Which career commonly uses maps and spatial data?', ['Cartographer or GIS specialist', 'A role chosen only by uniform colour', 'A job that never studies location', 'A task with no information'], 'Cartographer or GIS specialist', 'These careers create and interpret geographic information.', 'Match the main tool—maps—to the career task.', 'CAREER_MAP_SKILL', 'recall'),
      q('Why does a community planner need listening and research skills?', ['Plans should respond to evidence and the needs of different residents', 'Planning means deciding alone', 'Research prevents public participation', 'Listening removes the need for maps'], 'Plans should respond to evidence and the needs of different residents', 'Good planning combines technical evidence with meaningful participation.', 'Think about both the place being planned and the people who use it.', 'PLANNING_SKILLS', 'understand'),
      q('A learner enjoys interviewing elders and preserving local stories. Which pathway fits best?', ['Heritage, museum, or historical research work', 'A pathway selected without considering the interest', 'Work that destroys all records', 'A role that forbids listening'], 'Heritage, museum, or historical research work', 'Those pathways collect, evaluate, preserve, and communicate historical evidence.', 'Match the learner\'s activity to careers that handle community memory.', 'HERITAGE_CAREER', 'apply'),
      q('A career video is sponsored by one training college and promises guaranteed jobs. What should a learner do?', ['Compare duties, requirements, and opportunities using independent reliable sources', 'Accept every promise because it is a video', 'Choose immediately without checking entry requirements', 'Reject the career without further evidence'], 'Compare duties, requirements, and opportunities using independent reliable sources', 'Career decisions need corroborated information rather than a single promotional claim.', 'Evaluate the source\'s purpose and look for independent evidence.', 'CAREER_SOURCE_EVALUATION', 'analyse'),
      q('Which exploration plan is strongest?', ['Interview a practitioner, observe work where appropriate, research training, and reflect on interests and values', 'Pick the first title on a poster', 'Ask only about salary and ignore duties', 'Let stereotypes decide who can do the work'], 'Interview a practitioner, observe work where appropriate, research training, and reflect on interests and values', 'The plan combines direct insight, reliable research, and self-awareness.', 'Choose a process that investigates both the career and the learner\'s fit.', 'CAREER_EXPLORATION_PLAN', 'analyse')
    ]
  },
  {
    key: 'social-g7-career-stereotypes', subjectId: 'social', subjectName: 'Social Studies', grade: 'Grade 7',
    strand: 'Foundations of Social Studies', subStrand: 'Self Exploration and Career Choice',
    title: 'Choose beyond stereotypes', shortTitle: 'Fair career choices',
    objective: 'Identify and challenge gender stereotypes using interests, abilities, values, evidence, and fair opportunity.', minutes: 10,
    sourceRef: source('social_studies', '3'),
    visual: { setting: 'classroom', elements: ['career station', 'surveying tools', 'enterprise table', 'leadership board', 'stereotype rewrite cards'] },
    questions: [
      q('What is a gender stereotype about careers?', ['An unfair generalisation that a job suits only one gender', 'A verified list of job duties', 'A learner\'s personal training plan', 'A safety requirement for a tool'], 'An unfair generalisation that a job suits only one gender', 'A stereotype limits people using assumptions rather than individual evidence.', 'Look for a claim about a whole gender rather than a person\'s abilities.', 'CAREER_STEREOTYPE', 'recall'),
      q('Why can career stereotypes harm a community?', ['They can block capable people and reduce the range of skills available', 'They ensure every role gets the best worker', 'They make training more accurate', 'They create fair opportunity'], 'They can block capable people and reduce the range of skills available', 'Communities lose talent when opportunity is restricted without relevant evidence.', 'Think about what happens when skill is ignored.', 'STEREOTYPE_HARM', 'understand'),
      q('A classmate says, “Surveying is only for boys.” Which reply is strongest?', ['Surveying depends on training, accuracy, and interest, not gender', 'Yes, job labels decide ability', 'Nobody should study surveying', 'Only family tradition matters'], 'Surveying depends on training, accuracy, and interest, not gender', 'The response replaces a stereotype with relevant criteria for the work.', 'Focus on the skills and preparation the career actually requires.', 'STEREOTYPE_CHALLENGE', 'apply'),
      q('Two learners have equal relevant skills, but only one is invited because of gender. What principle is missing?', ['Fair opportunity based on relevant merit', 'Keeping decisions secret', 'Following stereotypes without evidence', 'Avoiding all selection criteria'], 'Fair opportunity based on relevant merit', 'Selection should use transparent, role-related evidence rather than gender.', 'Identify the fair criterion that should guide the invitation.', 'FAIR_OPPORTUNITY', 'analyse'),
      q('Which career-choice process best resists stereotypes?', ['Review interests and evidence of ability, research real duties, seek varied role models, and choose suitable training', 'Exclude careers associated with another gender', 'Choose from jokes and social posts', 'Let one person decide without discussion'], 'Review interests and evidence of ability, research real duties, seek varied role models, and choose suitable training', 'The process uses self-knowledge and reliable career evidence while widening possibilities.', 'Choose the plan that tests assumptions instead of obeying them.', 'STEREOTYPE_FREE_CHOICE', 'analyse')
    ]
  }
];

export const grade7LessonSeeds = defineCurriculumChapters(chapters);

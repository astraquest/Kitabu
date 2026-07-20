-- KICD Lower Primary curriculum coverage for the product-supported learning areas.
-- Sources: KICD Lower Primary Curriculum Designs, Volumes 1-4 (2017).
WITH curriculum_seed(
  grade_level,
  subject_id,
  subject_name,
  source_url,
  strands,
  sub_strands,
  objectives,
  inquiries
) AS (
  VALUES
    (
      'Grade 1', 'english', 'English',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-1-curriculum-designs-September-2017.pdf',
      ARRAY['Listening and Speaking', 'Listening and Speaking', 'Listening and Speaking'],
      ARRAY['Attentive Listening', 'Pronunciation and Vocabulary', 'Language Structures'],
      ARRAY[
        'Listen attentively during conversations, respond to simple one-directional instructions, and value attentive listening for effective communication.',
        'Recognize and pronounce familiar English sounds and use age-appropriate vocabulary clearly in everyday communication.',
        'Use simple language structures to communicate familiar ideas, needs, and experiences in complete spoken sentences.'
      ],
      ARRAY['What do good listeners do when someone is speaking?', 'How do clear sounds and familiar words help us communicate?', 'How can we arrange words to share a clear idea?']
    ),
    (
      'Grade 2', 'english', 'English',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-1-curriculum-designs-September-2017.pdf',
      ARRAY['Listening and Speaking', 'Listening and Speaking', 'Listening and Speaking'],
      ARRAY['Attentive Listening', 'Pronunciation and Vocabulary', 'Language Structures'],
      ARRAY[
        'Listen attentively, follow oral information and multi-step classroom directions, and respond appropriately in familiar contexts.',
        'Articulate grade-appropriate sounds and use new vocabulary accurately when speaking about familiar people, places, and events.',
        'Construct meaningful sentences with appropriate word order and language patterns for effective oral communication.'
      ],
      ARRAY['How can we show that we understood an oral message?', 'How does accurate pronunciation make meaning clearer?', 'What makes a spoken sentence complete and meaningful?']
    ),
    (
      'Grade 3', 'english', 'English',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-1-curriculum-designs-September-2017.pdf',
      ARRAY['Listening and Speaking', 'Listening and Speaking', 'Listening and Speaking'],
      ARRAY['Attentive Listening', 'Pronunciation and Vocabulary', 'Language Structures'],
      ARRAY[
        'Listen for key ideas and details, follow oral directions, and respond relevantly and respectfully during conversations.',
        'Pronounce grade-appropriate words accurately and select vocabulary that fits familiar social and learning situations.',
        'Use increasingly varied sentence structures to organize thoughts and communicate experiences, needs, and feelings clearly.'
      ],
      ARRAY['Which details help us understand what a speaker means?', 'How can word choice and pronunciation improve a message?', 'How can sentences be joined to express a complete thought?']
    ),
    (
      'Grade 1', 'kiswahili', 'Kiswahili',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-1-curriculum-designs-September-2017.pdf',
      ARRAY['Karibu Darasani', 'Karibu Darasani', 'Karibu Darasani'],
      ARRAY['Kusikiliza na Kuzungumza: Maamkuzi', 'Kusikiliza na Kuzungumza: Maagizo', 'Kusikiliza na Kuzungumza: Msamiati'],
      ARRAY[
        'Kutambua maneno ya maamkuzi, kuamkua na kuitikia salamu, na kuthamini umuhimu wa salamu katika mawasiliano.',
        'Kutambua, kutoa na kufuata maagizo mepesi yanayotumiwa darasani na kuthamini umuhimu wake katika maisha ya kila siku.',
        'Kutambua na kutumia majina ya vifaa vinavyopatikana darasani ili kuimarisha mawasiliano ya kila siku.'
      ],
      ARRAY['Tunatumia maneno gani katika salamu?', 'Ni maagizo gani tunayofuata darasani?', 'Ni vifaa gani vinavyopatikana darasani?']
    ),
    (
      'Grade 2', 'kiswahili', 'Kiswahili',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-1-curriculum-designs-September-2017.pdf',
      ARRAY['Shuleni', 'Shuleni', 'Shuleni'],
      ARRAY['Sauti na Majina ya Herufi za Kiswahili', 'Maamkuzi ya Nyakati za Siku', 'Msamiati wa Shuleni'],
      ARRAY[
        'Kutambua na kutamka sauti na majina ya herufi za Kiswahili na kuzitumia kusoma na kuandika maneno rahisi.',
        'Kutambua na kutumia maamkuzi yanayofaa asubuhi, mchana na jioni katika mawasiliano ya heshima.',
        'Kutambua, kusoma na kutumia msamiati unaohusiana na mazingira na vifaa vya shule katika sentensi.'
      ],
      ARRAY['Sauti na herufi hutusaidiaje kusoma maneno?', 'Tunaamkuana vipi katika nyakati tofauti za siku?', 'Ni maneno gani tunayotumia kuzungumzia shule?']
    ),
    (
      'Grade 3', 'kiswahili', 'Kiswahili',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-1-curriculum-designs-September-2017.pdf',
      ARRAY['Shambani', 'Shambani', 'Shambani'],
      ARRAY['Sauti Mbili Zinazotamkwa Pamoja', 'Msamiati wa Shambani', 'Kusikiliza na Kuzungumza: Masimulizi'],
      ARRAY[
        'Kutambua, kutamka, kusoma na kuandika silabi na maneno yenye sauti mbili zinazotamkwa pamoja.',
        'Kutambua na kutumia msamiati wa shughuli na vifaa vya shambani katika maneno na sentensi sahihi.',
        'Kusikiliza masimulizi kwa makini, kutambua mawazo muhimu, kujibu maswali na kusimulia matukio kwa mpangilio.'
      ],
      ARRAY['Sauti mbili huunganishwaje katika silabi na maneno?', 'Ni vifaa na shughuli gani tunazopata shambani?', 'Tunakumbukaje na kusimulia matukio kwa mpangilio?']
    ),
    (
      'Grade 1', 'mathematics', 'Mathematics',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/volume-2-curriculum-designs-September-2017.pdf',
      ARRAY['Numbers', 'Numbers', 'Numbers'],
      ARRAY['Number Concept', 'Whole Numbers', 'Addition'],
      ARRAY[
        'Sort, match, order and make patterns with objects, recite number names to 50, and represent numbers 1-30 using concrete objects.',
        'Count, read, write, compare and order whole numbers within the Grade 1 range using objects, symbols and number patterns.',
        'Combine groups of objects and add whole numbers in familiar daily situations using concrete materials and number symbols.'
      ],
      ARRAY['How can we group, order and count objects?', 'How can we show and compare whole numbers?', 'What happens when two groups are put together?']
    ),
    (
      'Grade 2', 'mathematics', 'Mathematics',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/volume-2-curriculum-designs-September-2017.pdf',
      ARRAY['Numbers', 'Numbers', 'Numbers'],
      ARRAY['Number Concept', 'Whole Numbers', 'Fractions'],
      ARRAY[
        'Read and represent numbers 1-100 using symbols, concrete objects and familiar groups in the environment.',
        'Count forward and backward to 100, identify place value to hundreds, and complete number patterns using twos, fives and tens.',
        'Recognize and represent halves and quarters by sharing familiar objects and shapes into equal parts.'
      ],
      ARRAY['How can we find the number of objects in a group?', 'How do we get the next number in a pattern?', 'How can one whole be shared into equal parts?']
    ),
    (
      'Grade 3', 'mathematics', 'Mathematics',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/volume-2-curriculum-designs-September-2017.pdf',
      ARRAY['Numbers', 'Numbers', 'Numbers'],
      ARRAY['Number Concept', 'Whole Numbers', 'Fractions'],
      ARRAY[
        'Read, represent and use Grade 3 numbers accurately in symbols, concrete models and familiar problem-solving contexts.',
        'Use place value, number patterns, comparison and ordering to work confidently with whole numbers in daily situations.',
        'Identify, compare and use common fractions as equal parts of objects, shapes and groups in practical situations.'
      ],
      ARRAY['How can different models represent the same number?', 'How does place value help us read and compare numbers?', 'How can we tell whether fractional parts are equal?']
    ),
    (
      'Grade 1', 'environmental', 'Environmental',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/volume-2-curriculum-designs-September-2017.pdf',
      ARRAY['Environment and Its Resources', 'Environment and Its Resources', 'Environment and Its Resources'],
      ARRAY['Weather and Sky', 'Water', 'Soil'],
      ARRAY[
        'Observe and describe the day and night sky and identify common weather conditions with curiosity and care.',
        'Identify familiar sources and uses of water and practise safe, responsible use of water at home and school.',
        'Observe common types and uses of soil and handle soil safely during simple environmental activities.'
      ],
      ARRAY['What do we see in the sky and how is the weather today?', 'Where does water come from and how do we use it safely?', 'What can we observe and do with soil?']
    ),
    (
      'Grade 2', 'environmental', 'Environmental',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/volume-2-curriculum-designs-September-2017.pdf',
      ARRAY['Environment and Its Resources', 'Environment and Its Resources', 'Environment and Its Resources'],
      ARRAY['Weather', 'Water', 'Soil'],
      ARRAY[
        'Describe weather conditions, respond safely, record conditions with symbols, and interpret simple weather messages.',
        'Explain why water is stored, identify safe storage methods, and store water appropriately to prevent health risks.',
        'Explore soil properties and uses and practise responsible ways of caring for soil in the local environment.'
      ],
      ARRAY['How can we respond to, record and communicate weather?', 'Why and how should water be stored safely?', 'How can we identify, use and care for soil?']
    ),
    (
      'Grade 3', 'environmental', 'Environmental',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/volume-2-curriculum-designs-September-2017.pdf',
      ARRAY['Environment and Its Resources', 'Environment and Its Resources', 'Environment and Its Resources'],
      ARRAY['Weather', 'Water', 'Soil'],
      ARRAY[
        'Observe, record and interpret changing weather conditions and select safe responses for people and the environment.',
        'Identify water sources and conservation practices and explain how to protect water from waste and contamination.',
        'Compare soil characteristics, explain useful roles of soil, and apply practical ways of conserving it.'
      ],
      ARRAY['What can weather records tell us?', 'How can we keep water safe and use it responsibly?', 'How do soil properties affect its use and care?']
    ),
    (
      'Grade 1', 'cre', 'CRE',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-3-curriculum-designs-September-2017.pdf',
      ARRAY['Creation', 'Creation', 'Creation'],
      ARRAY['Self-Awareness', 'My Family', 'Creation of Plants'],
      ARRAY[
        'Recognize oneself as uniquely created in the image of God, use one''s name for identity, and appreciate personal worth.',
        'Identify family members, appreciate the family as part of God''s plan, and show love, respect and responsibility at home.',
        'Recognize God as creator of plants, identify familiar plants, and demonstrate care and appreciation for creation.'
      ],
      ARRAY['Who created you and why are you special?', 'Who are the members of your family and how do you care for them?', 'Who created plants and how should we care for them?']
    ),
    (
      'Grade 2', 'cre', 'CRE',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-3-curriculum-designs-September-2017.pdf',
      ARRAY['Creation', 'Creation', 'Creation'],
      ARRAY['Self-Awareness', 'My Family', 'Creation of the World'],
      ARRAY[
        'Appreciate personal gifts and abilities as part of God''s creation and use them responsibly in daily life.',
        'Recognize family relationships and practise love, obedience, sharing and responsibility for harmonious living.',
        'Describe selected parts of the creation story and show responsibility in caring for living and non-living things.'
      ],
      ARRAY['How can we use our gifts responsibly?', 'How do Christian values strengthen family relationships?', 'What did God create and how can we care for it?']
    ),
    (
      'Grade 3', 'cre', 'CRE',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-3-curriculum-designs-September-2017.pdf',
      ARRAY['Creation', 'Creation', 'Creation'],
      ARRAY['Self-Awareness', 'My Family', 'Adam and Eve'],
      ARRAY[
        'Appreciate being created in God''s image, manage thoughts and feelings, and make choices that reflect Christian values.',
        'Identify nuclear and extended family relationships, draw a family tree, and respect responsible family leadership.',
        'Retell the creation and disobedience of Adam and Eve and explain why obedience supports good relationships at home and school.'
      ],
      ARRAY['How do our choices reflect who God created us to be?', 'What does a family tree show?', 'What can the story of Adam and Eve teach about obedience?']
    ),
    (
      'Grade 1', 'ire', 'IRE',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-3-curriculum-designs-September-2017.pdf',
      ARRAY['Qur''an', 'Qur''an', 'Pillars of Iman'],
      ARRAY['Arabic Alphabet', 'Selected Surah', 'Belief in Allah'],
      ARRAY[
        'Pronounce and identify Arabic letters, read simple Arabic words, and write letters from right to left as readiness for Qur''an recitation.',
        'Recite selected short Surah accurately, state their simple meaning, and appreciate using their teachings in daily life.',
        'Recognize Allah as the Creator and demonstrate love, gratitude and care for His creation.'
      ],
      ARRAY['Why do we learn the Arabic alphabet?', 'What teachings do we learn from selected Surah?', 'How do we show belief in and gratitude to Allah?']
    ),
    (
      'Grade 2', 'ire', 'IRE',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-3-curriculum-designs-September-2017.pdf',
      ARRAY['Qur''an', 'Qur''an', 'Pillars of Iman'],
      ARRAY['Arabic Alphabet', 'Selected Surah', 'Belief in Allah''s Books and Prophets'],
      ARRAY[
        'Join and pronounce Arabic letters accurately in simple words to strengthen readiness for Qur''an reading and writing.',
        'Recite selected Surah accurately, explain age-appropriate teachings, and apply them in familiar situations.',
        'Name selected revealed books and prophets and show respect for the guidance Allah gave through them.'
      ],
      ARRAY['How are Arabic letters joined to form words?', 'How can teachings from selected Surah guide our behaviour?', 'Why did Allah send books and prophets?']
    ),
    (
      'Grade 3', 'ire', 'IRE',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/Volume-3-curriculum-designs-September-2017.pdf',
      ARRAY['Qur''an', 'Pillars of Iman', 'Siirah'],
      ARRAY['Selected Surah', 'Belief in Allah''s Angels and Books', 'Early Life of Prophet Muhammad'],
      ARRAY[
        'Recite selected Surah accurately, describe their key teachings, and demonstrate those teachings in daily choices.',
        'Describe the role of Allah''s angels and revealed books at an age-appropriate level and appreciate divine guidance.',
        'Retell selected events from the early life of Prophet Muhammad and identify values that learners can practise.'
      ],
      ARRAY['What guidance do selected Surah give us?', 'What do Muslims believe about Allah''s angels and books?', 'What values can we learn from the early life of Prophet Muhammad?']
    ),
    (
      'Grade 1', 'hygiene_nutrition', 'Hygiene and Nutrition',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/volume-2-curriculum-designs-September-2017.pdf',
      ARRAY['Health Practices', 'Health Practices', 'Health Practices'],
      ARRAY['Healthy Habits', 'Care of the Teeth', 'Use of Medicine'],
      ARRAY[
        'Identify and practise habits that prevent illness and promote the wellbeing of self and others.',
        'Identify materials and steps for cleaning teeth and practise regular oral care to keep teeth healthy.',
        'Recognize that medicine should be used only with guidance from a responsible adult and handled and stored safely.'
      ],
      ARRAY['Which habits help us stay healthy?', 'How and why should we care for our teeth?', 'Who should guide a child when medicine is needed?']
    ),
    (
      'Grade 2', 'hygiene_nutrition', 'Hygiene and Nutrition',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/volume-2-curriculum-designs-September-2017.pdf',
      ARRAY['Health Practices', 'Health Practices', 'Health Practices'],
      ARRAY['Importance of Good Health', 'Oral Hygiene', 'Use of Rooms and Household Equipment'],
      ARRAY[
        'Explain and practise health habits that support physical wellbeing, cleanliness, safe eating, rest and activity.',
        'Identify habits that promote or damage healthy teeth and maintain a regular record of responsible tooth care.',
        'Identify common rooms and equipment in a home and use age-appropriate household items safely and responsibly.'
      ],
      ARRAY['Why is good health important in daily life?', 'Which habits help teeth remain healthy?', 'How do we use rooms and household equipment safely?']
    ),
    (
      'Grade 3', 'hygiene_nutrition', 'Hygiene and Nutrition',
      'https://kicd.ac.ke/wp-content/uploads/2017/10/volume-2-curriculum-designs-September-2017.pdf',
      ARRAY['Health Practices', 'Health Practices', 'Health Practices'],
      ARRAY['Healthy Habits', 'Oral Hygiene', 'Cleaning the Classroom'],
      ARRAY[
        'Select, explain and consistently practise healthy habits that promote personal and community wellbeing.',
        'Identify common oral-health problems and apply safe preventive habits and adult-supported responses.',
        'Identify safe cleaning materials and demonstrate responsible steps for keeping the classroom clean and healthy.'
      ],
      ARRAY['How do daily habits affect our wellbeing?', 'How can common oral-health problems be prevented?', 'What steps and materials help us clean a classroom safely?']
    ),
    (
      'Grade 1', 'creative_activities', 'Creative Activities',
      'https://kicd.ac.ke/wp-content/uploads/2018/02/Volume-4-curriculum-designs-final-Dec-2017C-min.pdf',
      ARRAY['Basic Movement Skills', 'Drawing', 'Performing'],
      ARRAY['Locomotor Skill: Walking', 'Line', 'Songs'],
      ARRAY[
        'Perform walking in different directions, pathways and levels while observing rules for balance, coordination and safety.',
        'Identify and draw straight, curved, wavy and zigzag lines and appreciate one''s own and others'' artwork.',
        'Identify and sing simple songs in unison, keep a steady beat, and observe proper etiquette for the national anthem.'
      ],
      ARRAY['In how many safe ways can we walk?', 'Where can we find and draw different types of lines?', 'Why and how do people sing different songs?']
    ),
    (
      'Grade 2', 'creative_activities', 'Creative Activities',
      'https://kicd.ac.ke/wp-content/uploads/2018/02/Volume-4-curriculum-designs-final-Dec-2017C-min.pdf',
      ARRAY['Basic Movement Skills', 'Drawing', 'Performing'],
      ARRAY['Locomotor Skill: Hopping', 'Forms', 'Songs'],
      ARRAY[
        'Perform hopping in varied directions and pathways with balance, coordination, safe play and respect for rules.',
        'Identify simple forms and suitable tools and draw forms from the physical or digital environment for self-expression.',
        'Sing age-appropriate songs accurately in unison and simple rounds and perform the first two national-anthem verses with proper etiquette.'
      ],
      ARRAY['How can we hop safely in different ways?', 'How can observed forms be represented in a drawing?', 'How do singers keep pitch, rhythm and their part in a song?']
    ),
    (
      'Grade 3', 'creative_activities', 'Creative Activities',
      'https://kicd.ac.ke/wp-content/uploads/2018/02/Volume-4-curriculum-designs-final-Dec-2017C-min.pdf',
      ARRAY['Basic Movement Skills', 'Drawing', 'Performing'],
      ARRAY['Locomotor Skill: Skipping', 'Animal Forms', 'Songs'],
      ARRAY[
        'Perform skipping in varied directions, pathways and levels with coordination, endurance, safe play and teamwork.',
        'Observe and draw simple animal forms using appropriate tools and discuss and appreciate completed artwork.',
        'Sing varied songs with accurate pitch, rhythm and expression, sustain a part in a round, and observe national-anthem etiquette.'
      ],
      ARRAY['How can we skip safely with control and balance?', 'What features help us draw a recognizable animal form?', 'How do musical elements help a group sing expressively together?']
    )
),
chapters AS (
  SELECT
    seed.grade_level,
    seed.subject_id,
    seed.subject_name,
    seed.source_url,
    item.position::integer,
    seed.strands[item.position] AS strand,
    seed.sub_strands[item.position] AS sub_strand,
    seed.objectives[item.position] AS objective,
    seed.inquiries[item.position] AS inquiry
  FROM curriculum_seed seed
  CROSS JOIN LATERAL generate_subscripts(seed.strands, 1) AS item(position)
),
upserted_strands AS (
  INSERT INTO curriculum_strands (
    grade_level,
    subject_id,
    subject_name,
    number,
    title,
    sub_title,
    position
  )
  SELECT
    grade_level,
    subject_id,
    subject_name,
    position::text || '.0',
    strand,
    objective,
    position
  FROM chapters
  ON CONFLICT (grade_level, subject_id, position) DO UPDATE
  SET subject_name = EXCLUDED.subject_name,
      number = EXCLUDED.number,
      title = EXCLUDED.title,
      sub_title = EXCLUDED.sub_title,
      updated_at = NOW()
  RETURNING id, grade_level, subject_id, position
),
target_strands AS (
  SELECT id, grade_level, subject_id, position
  FROM upserted_strands
  UNION
  SELECT strand.id, strand.grade_level, strand.subject_id, strand.position
  FROM curriculum_strands strand
  JOIN chapters chapter
    ON chapter.grade_level = strand.grade_level
   AND chapter.subject_id = strand.subject_id
   AND chapter.position = strand.position
)
INSERT INTO curriculum_sub_strands (
  strand_id,
  number,
  title,
  type,
  description,
  position,
  outcomes,
  inquiry_questions,
  pages
)
SELECT
  strand.id,
  chapter.position::text || '.1',
  chapter.sub_strand,
  CASE chapter.position WHEN 1 THEN 'knowledge' WHEN 2 THEN 'skill' ELSE 'competence' END,
  chapter.objective,
  1,
  jsonb_build_array(jsonb_build_object('id', 'outcome-1', 'text', chapter.objective)),
  jsonb_build_array(jsonb_build_object('id', 'inquiry-1', 'text', chapter.inquiry)),
  jsonb_build_array(jsonb_build_object(
    'title', chapter.sub_strand,
    'content', chapter.objective,
    'sourceLabel', 'KICD Lower Primary Curriculum Design',
    'sourceUrl', chapter.source_url
  ))
FROM chapters chapter
JOIN target_strands strand
  ON strand.grade_level = chapter.grade_level
 AND strand.subject_id = chapter.subject_id
 AND strand.position = chapter.position
ON CONFLICT (strand_id, position) DO UPDATE
SET number = EXCLUDED.number,
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    description = EXCLUDED.description,
    outcomes = EXCLUDED.outcomes,
    inquiry_questions = EXCLUDED.inquiry_questions,
    pages = EXCLUDED.pages,
    updated_at = NOW();

export interface QuizBattleQuestion {
  id: string;
  subject: string;
  prompt: string;
  options: string[];
  answer: string;
}

export const QUIZ_BATTLE_BANK: Record<string, QuizBattleQuestion[]> = {
  'Grade 4': [
    {
      id: 'g4-math-1',
      subject: 'Mathematics',
      prompt: 'What is 9 x 6?',
      options: ['45', '54', '56', '63'],
      answer: '54',
    },
    {
      id: 'g4-eng-1',
      subject: 'English',
      prompt: 'Choose the correct plural of "child".',
      options: ['childs', 'children', 'childes', 'childrens'],
      answer: 'children',
    },
    {
      id: 'g4-sci-1',
      subject: 'Science',
      prompt: 'Which part of a plant makes food?',
      options: ['Root', 'Leaf', 'Stem', 'Flower'],
      answer: 'Leaf',
    },
  ],
  'Grade 6': [
    {
      id: 'g6-math-1',
      subject: 'Mathematics',
      prompt: 'What is 12 x 8?',
      options: ['86', '92', '96', '108'],
      answer: '96',
    },
    {
      id: 'g6-eng-1',
      subject: 'English',
      prompt: 'Which sentence is correct?',
      options: ['She go home.', 'She goes home.', 'She going home.', 'She gone home.'],
      answer: 'She goes home.',
    },
    {
      id: 'g6-sci-1',
      subject: 'Science',
      prompt: 'Which organ pumps blood around the body?',
      options: ['Lungs', 'Heart', 'Kidney', 'Stomach'],
      answer: 'Heart',
    },
    {
      id: 'g6-kis-1',
      subject: 'Kiswahili',
      prompt: '"Kitabu" in English means:',
      options: ['Desk', 'Book', 'School', 'Pen'],
      answer: 'Book',
    },
  ],
  'Grade 9': [
    {
      id: 'g9-math-1',
      subject: 'Mathematics',
      prompt: 'Solve: 3x + 4 = 19.',
      options: ['3', '4', '5', '6'],
      answer: '5',
    },
    {
      id: 'g9-sci-1',
      subject: 'Integrated Science',
      prompt: 'What is the SI unit of force?',
      options: ['Joule', 'Newton', 'Watt', 'Pascal'],
      answer: 'Newton',
    },
    {
      id: 'g9-eng-1',
      subject: 'English',
      prompt: 'A comparison using "like" or "as" is called a:',
      options: ['Metaphor', 'Simile', 'Noun', 'Verb'],
      answer: 'Simile',
    },
  ],
  'Form 4': [
    {
      id: 'f4-math-1',
      subject: 'Mathematics',
      prompt: 'If sin 30 degrees = x, what is x?',
      options: ['0', '0.5', '1', '2'],
      answer: '0.5',
    },
    {
      id: 'f4-bio-1',
      subject: 'Biology',
      prompt: 'Where does gaseous exchange occur in the lungs?',
      options: ['Trachea', 'Alveoli', 'Bronchi', 'Diaphragm'],
      answer: 'Alveoli',
    },
    {
      id: 'f4-eng-1',
      subject: 'English',
      prompt: "A story's central message is its:",
      options: ['Theme', 'Setting', 'Plot twist', 'Character'],
      answer: 'Theme',
    },
  ],
};

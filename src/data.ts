export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export type MissionStatus = 'published' | 'draft'

export type Mission = {
  id: number
  title: string
  description: string
  category: string
  level: Level
  xp: number
  icon: string
  duration: string
  status: MissionStatus
  completed: boolean
  tasks: MissionTask[]
}

export type MissionTask = {
  id: number
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export const missions: Mission[] = [
  {
    id: 1,
    title: 'Present Simple',
    description: 'Проверь знания Present Simple и закрепи основные правила.',
    category: 'Грамматика',
    level: 'A1',
    xp: 20,
    icon: '📘',
    duration: '5 мин',
    status: 'published',
    completed: false,
    tasks: [
      {
        id: 1,
        question: 'She ___ to school every day.',
        options: ['go', 'goes', 'going', 'gone'],
        correctAnswer: 'goes',
        explanation:
          'С местоимениями he, she и it в Present Simple к глаголу обычно добавляется -s.',
      },
      {
        id: 2,
        question: 'They ___ football on Saturdays.',
        options: ['plays', 'play', 'playing', 'played'],
        correctAnswer: 'play',
        explanation:
          'С местоимением they используется основная форма глагола без окончания -s.',
      },
      {
        id: 3,
        question: '___ he like coffee?',
        options: ['Do', 'Does', 'Is', 'Are'],
        correctAnswer: 'Does',
        explanation:
          'В вопросах Present Simple с he, she и it используется вспомогательный глагол does.',
      },
    ],
  },

  {
    id: 2,
    title: 'Travel Vocabulary',
    description: 'Выучи полезные английские слова для путешествий.',
    category: 'Словарный запас',
    level: 'A2',
    xp: 30,
    icon: '🌍',
    duration: '7 мин',
    status: 'published',
    completed: false,
    tasks: [
      {
        id: 1,
        question: 'Как переводится слово “luggage”?',
        options: ['Билет', 'Багаж', 'Самолёт', 'Паспорт'],
        correctAnswer: 'Багаж',
        explanation: 'Luggage означает багаж.',
      },
      {
        id: 2,
        question: 'Как переводится “boarding pass”?',
        options: [
          'Посадочный талон',
          'Чемодан',
          'Вокзал',
          'Регистрация',
        ],
        correctAnswer: 'Посадочный талон',
        explanation:
          'Boarding pass — документ, который позволяет пассажиру пройти на посадку.',
      },
    ],
  },

  {
    id: 3,
    title: 'Past Simple Challenge',
    description: 'Потренируй правильные и неправильные глаголы.',
    category: 'Грамматика',
    level: 'A2',
    xp: 35,
    icon: '⏳',
    duration: '8 мин',
    status: 'published',
    completed: false,
    tasks: [
      {
        id: 1,
        question: 'Yesterday I ___ to the cinema.',
        options: ['go', 'went', 'gone', 'going'],
        correctAnswer: 'went',
        explanation:
          'Went — форма Past Simple неправильного глагола go.',
      },
      {
        id: 2,
        question: 'She ___ her homework last night.',
        options: ['finish', 'finishes', 'finished', 'finishing'],
        correctAnswer: 'finished',
        explanation:
          'Для правильного глагола finish в Past Simple добавляется окончание -ed.',
      },
    ],
  },

  {
    id: 4,
    title: 'Everyday English',
    description: 'Потренируй английские выражения из повседневной жизни.',
    category: 'Разговорный английский',
    level: 'B1',
    xp: 40,
    icon: '💬',
    duration: '10 мин',
    status: 'published',
    completed: false,
    tasks: [
      {
        id: 1,
        question: 'Какой вариант лучше подходит для вежливой просьбы?',
        options: [
          'Give me that.',
          'Could you help me, please?',
          'You help me.',
          'Help.',
        ],
        correctAnswer: 'Could you help me, please?',
        explanation:
          'Could you... please? — распространённая вежливая конструкция для просьбы.',
      },
    ],
  },

  {
    id: 5,
    title: 'Future Mission',
    description: 'Новая миссия, которую администратор пока не опубликовал.',
    category: 'Грамматика',
    level: 'B1',
    xp: 50,
    icon: '🚀',
    duration: '10 мин',
    status: 'draft',
    completed: false,
    tasks: [],
  },
]
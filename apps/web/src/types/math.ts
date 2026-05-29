export interface MathConcept {
  id: string;
  name: string;
  definition: string;
  formula?: string;
  example?: string;
  solution?: string;
  hints: string[];
  order: number;
}

export interface MathTopic {
  id: string;
  title: string;
  description?: string;
  subject: string;
  lessonType?: string;
  textbook?: string;
  grade: number;
  level: string;
  isPublic: boolean;
  concepts: MathConcept[];
  _count?: { concepts: number; exercises: number };
  creator: { id?: string; name: string };
}

export interface MathQuestion {
  id: string;
  content: string;
  imageUrl?: string;
  options?: string[];
  answer: any;
  solution?: string;
  hints: string[];
  difficulty: number;
  order: number;
  points: number;
}

export interface MathExercise {
  id: string;
  title: string;
  description?: string;
  type: string;
  subject: string;
  lessonType?: string;
  textbook?: string;
  grade: number;
  level?: string;
  timeLimit?: number;
  isPublic?: boolean;
  questions: MathQuestion[];
  _count?: { questions: number; attempts: number };
  creator: { name: string };
}

export interface MathImportAnalytics {
  totalLessons: number;
  validLessons: number;
  hallucinationCount: number;
  duplicateCount: number;
  repairCount: number;
  retryTotal: number;
  avgQualityScore: number;
  avgParserScore: number;
  droppedByQualityGate: number;
  textbook: string | null;
  grade: number | null;
}

export interface StudentMathProfile {
  userId: string;
  weakTopics: string[];
  strongTopics: string[];
  avgScore: number;
  totalAttempts: number;
  lastTopicType?: string;
}

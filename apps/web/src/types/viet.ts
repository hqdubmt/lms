export interface VietItem {
  id: string;
  word: string;
  meaning: string;
  example?: string;
  note?: string;
  imageUrl?: string;
  order: number;
}

export interface VietSet {
  id: string;
  title: string;
  description?: string;
  category: string;
  lessonType?: string;
  textbook?: string;
  grade: number;
  level: string;
  isPublic: boolean;
  items: VietItem[];
  _count?: { items: number; exercises: number };
  creator: { id?: string; name: string };
}

export interface VietQuestion {
  id: string;
  content: string;
  options?: string[];
  answer: any;
  explanation?: string;
  order: number;
  points: number;
}

export interface VietExercise {
  id: string;
  title: string;
  description?: string;
  type: string;
  category: string;
  lessonType?: string;
  grade: number;
  level?: string;
  passage?: string;
  timeLimit?: number;
  isPublic?: boolean;
  questions: VietQuestion[];
  _count?: { questions: number; attempts: number };
  creator: { name: string };
}

export interface VietImportAnalytics {
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

export interface StudentVietProfile {
  userId: string;
  weakTopics: string[];
  strongTopics: string[];
  avgScore: number;
  totalAttempts: number;
  lastTopicType?: string;
}

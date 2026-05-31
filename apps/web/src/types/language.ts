export interface VocabItem {
  id: string;
  word: string;
  translation: string;
  pronunciation?: string;
  example?: string;
  exampleTrans?: string;
  synonyms?: string[];
  hints?: string[];
  notes?: string;
  topic?: string;
  itemLevel?: string;
  audioUrl?: string;
  imageUrl?: string;
  order: number;
}

export interface VocabSet {
  id: string;
  title: string;
  language: string;
  level: string;
  isPublic?: boolean;
  description?: string;
  items: VocabItem[];
  parentId?: string | null;
  parent?: { id: string; title: string } | null;
  children?: VocabSet[];
  exercises?: { id: string; title: string; type: string; isPublic: boolean }[];
  _count?: { items: number; children?: number };
  creator: { id?: string; name: string };
  progresses?: { wordsLearned: number }[];
}

export interface LangQuestion {
  id: string;
  content: string;
  audioUrl?: string;
  imageUrl?: string;
  options?: string[];
  answer: any;
  explanation?: string;
  points: number;
  order: number;
}

export interface LangExercise {
  id: string;
  title: string;
  type: string;
  language: string;
  level: string;
  description?: string;
  timeLimit?: number;
  questions: LangQuestion[];
  _count?: { questions: number; attempts: number };
  creator: { name: string };
}

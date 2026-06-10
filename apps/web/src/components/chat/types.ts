export interface Source {
  lesson: string;
  topic: string;
}

export interface QuizQ {
  type: 'mcq';
  num: number;
  text: string;
  options: { key: string; text: string }[];
  answer: string;
}

export interface QuizQTF {
  type: 'tf';
  num: number;
  text: string;
  answer: boolean;
}

export interface QuizQFill {
  type: 'fill';
  num: number;
  text: string;
  answer: string;
}

export interface QuizQMatch {
  type: 'match';
  num: number;
  text: string;
  colA: { num: number; text: string }[];
  colB: { key: string; text: string }[];
  answer: Record<number, string>;
}

export type AnyQuizQ = QuizQ | QuizQTF | QuizQFill | QuizQMatch;

export interface KnowledgeGap {
  weak: string[];
  strong: string[];
}

export interface Recommendation {
  lesson?: { id: string; title: string; courseTitle: string };
  quiz?: { id: string; title: string };
  exercise?: string;
  reasons: string[];
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  error?: boolean;
  sources?: Source[];
  suggestions?: string[];
  langIntent?: string | null;
  validationWarnings?: string[] | null;
  activeAgents?: string[];
  timestamp?: number;
  latencyMs?: number;
  provider?: string;
  subject?: string;
  mode?: string;
}

export type Subject = 'math' | 'language' | 'viet' | 'general';
export type Mode = 'tutor' | 'exercise' | 'quiz' | 'voice';


export interface SpeakingResult {
  transcript: string;
  score: number;
  feedback: string;
  corrections: string[];
  encouragement: string;
}

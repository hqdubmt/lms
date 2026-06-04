export interface Source {
  lesson: string;
  topic: string;
}

export interface QuizQ {
  num: number;
  text: string;
  options: { key: string; text: string }[];
  answer: string;
}

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
}

export type Subject = 'math' | 'language' | 'viet' | 'general';
export type Mode = 'tutor' | 'exercise' | 'homework' | 'quiz' | 'voice';

export interface SpeakingResult {
  transcript: string;
  score: number;
  feedback: string;
  corrections: string[];
  encouragement: string;
}

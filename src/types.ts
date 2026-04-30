export interface ExerciseRecord {
  id: string;
  type: 'shadowing' | 'roleplay' | 'describe' | 'tutor-session';
  startedAt: number;
  completedAt: number;
  score: number;
  transcript: string;
  targetText?: string;
  feedback?: string;
}

export interface DailyProgress {
  date: string;
  exercises: number;
  avgScore: number;
  streak: number;
}

export interface UserSettings {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'tech';
  ttsVoice?: string;
  preferredExercise: 'shadowing' | 'roleplay';
  openAiKey?: string;
}

export interface RolePlayScenario {
  id: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'tech';
  category: 'daily' | 'travel' | 'work' | 'social' | 'tech';
  titleIt: string;
  titleEn: string;
  systemPrompt: string;
  firstMessage: string;
  vocabulary: string[];
}

export interface ShadowingPhrase {
  id: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'tech';
  text: string;
  translation: string;
  tip?: string;
}

export interface Correction {
  original: string;
  corrected: string;
  issues: string[];
  severity: 'minor' | 'major';
}

export interface Evaluation {
  fluencyScore: number;
  grammarIssues: { issue: string; suggestion: string }[];
  vocabularyScore: number;
  pronunciationNotes: string;
  levelEstimate: string;
  encouragement: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  correction?: Correction;
  evaluation?: Evaluation;
  timestamp: number;
}

export interface TutorSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  topic: string;
  messages: ConversationMessage[];
  avgFluencyScore: number;
}

export interface UserMemory {
  summary: string;
  level: string;
  recurrentErrors: string[];
  topicsDiscussed: string[];
  totalMessages: number;
  lastSessionAt: number;
}

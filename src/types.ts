export interface ExerciseRecord {
  id: string;
  type: 'shadowing' | 'roleplay' | 'describe';
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

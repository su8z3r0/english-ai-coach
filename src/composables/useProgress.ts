import { openDB, type DBSchema } from 'idb';
import type { ExerciseRecord, DailyProgress, UserSettings, TutorSession, UserMemory } from '../types';

interface CoachDB extends DBSchema {
  records: {
    key: string;
    value: ExerciseRecord;
    indexes: { 'by-date': string };
  };
  sessions: {
    key: string;
    value: TutorSession;
    indexes: { 'by-date': string };
  };
  settings: {
    key: 'user';
    value: UserSettings;
  };
  memory: {
    key: 'user';
    value: UserMemory;
  };
}

const DB_NAME = 'english-coach-db';
const DB_VERSION = 3;

let dbPromise: ReturnType<typeof openDB<CoachDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CoachDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id' });
          recordStore.createIndex('by-date', 'completedAt');
          db.createObjectStore('settings');
        }
        if (oldVersion < 2) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('by-date', 'startedAt');
        }
        if (oldVersion < 3) {
          db.createObjectStore('memory');
        }
      },
    });
  }
  return dbPromise;
}

export type { DailyProgress, UserSettings };

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function saveRecord(record: ExerciseRecord): Promise<void> {
  const db = await getDB();
  await db.put('records', deepClone(record));
}

export async function getRecords(): Promise<ExerciseRecord[]> {
  const db = await getDB();
  return db.getAll('records');
}

export async function getRecordsByDateRange(start: number, end: number): Promise<ExerciseRecord[]> {
  const db = await getDB();
  const index = db.transaction('records').store.index('by-date');
  const records: ExerciseRecord[] = [];
  let cursor = await index.openCursor(IDBKeyRange.bound(start, end));
  while (cursor) {
    records.push(cursor.value);
    cursor = await cursor.continue();
  }
  return records;
}

export async function getDailyProgress(): Promise<DailyProgress[]> {
  const records = await getRecords();
  const byDate = new Map<string, ExerciseRecord[]>();

  for (const r of records) {
    const date = new Date(r.completedAt).toISOString().slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(r);
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  const result: DailyProgress[] = [];
  let streak = 0;
  let prevDate: string | null = null;

  for (const date of sortedDates) {
    const dayRecords = byDate.get(date)!;
    const avgScore = Math.round(dayRecords.reduce((s, r) => s + r.score, 0) / dayRecords.length);

    if (prevDate) {
      const diff = (new Date(date).getTime() - new Date(prevDate).getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else streak = 1;
    } else {
      streak = 1;
    }
    prevDate = date;

    result.push({
      date,
      exercises: dayRecords.length,
      avgScore,
      streak,
    });
  }

  return result;
}

export async function loadSettings(): Promise<UserSettings> {
  const db = await getDB();
  const stored = await db.get('settings', 'user');
  return stored || {
    level: 'A1',
    preferredExercise: 'shadowing',
  };
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings, 'user');
}

// ============== Tutor Sessions ==============
export async function saveSession(session: TutorSession): Promise<void> {
  const db = await getDB();
  await db.put('sessions', deepClone(session));
}

export async function getSessions(): Promise<TutorSession[]> {
  const db = await getDB();
  return db.getAll('sessions');
}

export async function getSessionsByDateRange(start: number, end: number): Promise<TutorSession[]> {
  const db = await getDB();
  const index = db.transaction('sessions').store.index('by-date');
  const sessions: TutorSession[] = [];
  let cursor = await index.openCursor(IDBKeyRange.bound(start, end));
  while (cursor) {
    sessions.push(cursor.value);
    cursor = await cursor.continue();
  }
  return sessions;
}

export async function getRecurrentErrors(): Promise<{ issue: string; count: number }[]> {
  const sessions = await getSessions();
  const counts = new Map<string, number>();
  for (const s of sessions) {
    for (const m of s.messages) {
      if (m.correction?.issues) {
        for (const issue of m.correction.issues) {
          const key = issue.split(':')[0]?.trim() || issue;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
      if (m.evaluation?.grammarIssues) {
        for (const g of m.evaluation.grammarIssues) {
          const key = g.issue.split(':')[0]?.trim() || g.issue;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
    }
  }
  return Array.from(counts.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export async function getActiveSession(): Promise<TutorSession | null> {
  const db = await getDB();
  const all = await db.getAll('sessions');
  // Sessione attiva = quella senza endedAt, piu' recente
  const active = all.filter(s => !s.endedAt).sort((a, b) => b.startedAt - a.startedAt)[0];
  return active || null;
}

export async function endSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const session = await db.get('sessions', sessionId);
  if (session) {
    session.endedAt = Date.now();
    await db.put('sessions', session);
  }
}

export async function loadMemory(): Promise<UserMemory | null> {
  const db = await getDB();
  const stored = await db.get('memory', 'user');
  return stored || null;
}

export async function saveMemory(memory: UserMemory): Promise<void> {
  const db = await getDB();
  await db.put('memory', deepClone(memory), 'user');
}

export async function getLevelProgress(): Promise<{ level: string; sessions: number; avgScore: number }[]> {
  const sessions = await getSessions();
  const byLevel = new Map<string, { count: number; totalScore: number }>();
  for (const s of sessions) {
    for (const m of s.messages) {
      if (m.evaluation?.levelEstimate) {
        const lvl = m.evaluation.levelEstimate;
        const prev = byLevel.get(lvl) || { count: 0, totalScore: 0 };
        prev.count++;
        prev.totalScore += m.evaluation.fluencyScore;
        byLevel.set(lvl, prev);
      }
    }
  }
  return Array.from(byLevel.entries()).map(([level, data]) => ({
    level,
    sessions: data.count,
    avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
  }));
}

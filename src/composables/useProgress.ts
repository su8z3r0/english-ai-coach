import { openDB, type DBSchema } from 'idb';
import type { ExerciseRecord, DailyProgress, UserSettings } from '../types';

interface CoachDB extends DBSchema {
  records: {
    key: string;
    value: ExerciseRecord;
    indexes: { 'by-date': string };
  };
  settings: {
    key: 'user';
    value: UserSettings;
  };
}

const DB_NAME = 'english-coach-db';
const DB_VERSION = 1;

let dbPromise: ReturnType<typeof openDB<CoachDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CoachDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const recordStore = db.createObjectStore('records', { keyPath: 'id' });
        recordStore.createIndex('by-date', 'completedAt');
        db.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
}

export type { DailyProgress, UserSettings };

export async function saveRecord(record: ExerciseRecord): Promise<void> {
  const db = await getDB();
  await db.put('records', record);
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

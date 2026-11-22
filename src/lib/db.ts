import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Word, ReviewLog } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

let instance: Database.Database | null = null;

export function createSchema(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY,
      char TEXT NOT NULL,
      keyword TEXT NOT NULL DEFAULT '',
      meaning TEXT NOT NULL,
      sentence TEXT NOT NULL,
      source TEXT,
      translation TEXT,
      lesson TEXT,
      grade TEXT,
      familiarity INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_words_char ON words(char);
    CREATE INDEX IF NOT EXISTS idx_words_grade ON words(grade);
    CREATE TABLE IF NOT EXISTS review_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wordId INTEGER NOT NULL REFERENCES words(id),
      mode TEXT NOT NULL CHECK (mode IN ('choice','fill')),
      result TEXT NOT NULL CHECK (result IN ('correct','wrong','unknown')),
      userAnswer TEXT,
      overridden INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_logs_word ON review_logs(wordId);
  `);
}

/** 获取数据库单例（测试可传 :memory: 或临时路径） */
export function getDb(filePath: string = DB_PATH): Database.Database {
  if (instance && filePath === DB_PATH) return instance;
  if (filePath !== DB_PATH) {
    const d = new Database(filePath);
    d.pragma("journal_mode = WAL");
    createSchema(d);
    return d;
  }
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  instance = new Database(DB_PATH);
  instance.pragma("journal_mode = WAL");
  createSchema(instance);
  return instance;
}

export function rowToWord(r: Record<string, unknown>): Word {
  return r as unknown as Word;
}

export function rowToLog(r: Record<string, unknown>): ReviewLog {
  return r as unknown as ReviewLog;
}

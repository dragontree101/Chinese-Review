import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Database as DB } from "better-sqlite3";
import { parseLine, mergeWord, type RawVocabEntry } from "../lib/english/parse";
import { remapReviewLogs, type OldLogRow } from "../lib/english/log-remap";
import { createSchema } from "../lib/db";

const ROOT = process.cwd();
const SUBMODULE_DIR = path.join(ROOT, "third_party", "english-vocabulary");

/** 待导入的词库文件（第一阶段：初中 + 高中） */
const SOURCES = [
  { level: "初中", file: "初中.jsonl" },
  { level: "高中", file: "高中.jsonl" },
] as const;

interface ImportStats {
  file: string;
  lines: number;
}

/** 读取重导前的旧词条映射与作答记录（表不存在时返回空） */
function loadOldHistory(
  db: DB,
): { oldIdToWord: Map<number, string>; oldLogs: OldLogRow[] } {
  const hasTable = (name: string): boolean =>
    !!db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
      .get(name);
  const oldIdToWord = new Map<number, string>();
  const oldLogs: OldLogRow[] = [];
  if (hasTable("e_words")) {
    const rows = db
      .prepare("SELECT id, word FROM e_words")
      .all() as unknown as Array<{ id: number; word: string }>;
    for (const r of rows) oldIdToWord.set(r.id, r.word);
  }
  if (hasTable("e_review_logs")) {
    const logs = db
      .prepare(
        "SELECT wordId, mode, result, userAnswer, overridden, createdAt FROM e_review_logs",
      )
      .all() as unknown as OldLogRow[];
    oldLogs.push(...logs);
  }
  return { oldIdToWord, oldLogs };
}

function main(): void {
  const dbPath = path.join(ROOT, "data", "app.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  // 保留旧作答历史（按词名迁移，词库重排/升级不丢记录）
  const { oldIdToWord, oldLogs } = loadOldHistory(db);

  // 分词分组：同一单词在两库中的所有来源行归为一组
  const groups = new Map<string, RawVocabEntry[]>();
  const fileStats: ImportStats[] = [];

  for (const src of SOURCES) {
    const filePath = path.join(SUBMODULE_DIR, "full_line_jsonl", "full", "正序", src.file);
    if (!existsSync(filePath)) {
      throw new Error(
        `词库数据文件不存在: ${src.file}。请先执行: git submodule update --init third_party/english-vocabulary`,
      );
    }
    const lines = readFileSync(filePath, "utf-8").split("\n");
    let count = 0;
    for (const line of lines) {
      const entry = parseLine(line);
      if (!entry) continue;
      count++;
      const list = groups.get(entry.headWord) ?? [];
      list.push(entry);
      groups.set(entry.headWord, list);
    }
    fileStats.push({ file: src.file, lines: count });
  }

  // 合并去重
  const merged = [...groups.entries()]
    .map(([headWord, entries]) => mergeWord(headWord, entries))
    .filter((w) => w !== null);

  // 重建英语表（只动 e_* 表，不碰文言文数据）
  db.exec("DROP TABLE IF EXISTS e_review_logs; DROP TABLE IF EXISTS e_words;");
  createSchema(db);

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO e_words (word, level, usphone, ukphone, meanings, sentences, phrases, createdAt, updatedAt)
    VALUES (@word, @level, @usphone, @ukphone, @meanings, @sentences, @phrases, @createdAt, @updatedAt)
  `);
  const newWordToId = new Map<string, number>();
  db.transaction((words: NonNullable<ReturnType<typeof mergeWord>>[]) => {
    for (const w of words) {
      const info = insert.run({
        word: w.word,
        level: w.level,
        usphone: w.usphone,
        ukphone: w.ukphone,
        meanings: JSON.stringify(w.meanings),
        sentences: JSON.stringify(w.sentences),
        phrases: JSON.stringify(w.phrases),
        createdAt: now,
        updatedAt: now,
      });
      newWordToId.set(w.word, Number(info.lastInsertRowid));
    }
  })(merged);

  // 迁移旧作答记录到新 id
  const remapped = remapReviewLogs(oldLogs, oldIdToWord, newWordToId);
  const insertLog = db.prepare(
    `INSERT INTO e_review_logs (wordId, mode, result, userAnswer, overridden, createdAt)
     VALUES (@wordId, @mode, @result, @userAnswer, @overridden, @createdAt)`,
  );
  db.transaction((logs: OldLogRow[]) => {
    for (const l of logs) insertLog.run(l);
  })(remapped);

  const levelCount = { 初中: 0, 高中: 0 } as Record<string, number>;
  for (const w of merged) levelCount[w.level]++;

  console.log(`初中文件行数: ${fileStats[0].lines}`);
  console.log(`高中文件行数: ${fileStats[1].lines}`);
  console.log(`去重后唯一词数: ${merged.length}`);
  console.log(`初中: ${levelCount["初中"]} / 高中: ${levelCount["高中"]}`);
  console.log(`迁移作答记录: ${remapped.length} 条（旧记录共 ${oldLogs.length} 条）`);
  db.close();
}

main();

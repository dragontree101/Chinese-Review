import type { Database } from "better-sqlite3";
import type { StatSummary, StatRow, TrendRow, WordErrorRow, WordWithErrors } from "./types";

interface CountRow {
  result: string;
  c: number;
}

const EMPTY: StatSummary = {
  total: 0,
  reviewed: 0,
  correct: 0,
  wrong: 0,
  unknown: 0,
  accuracy: 0,
  errorRate: 0,
  unknownRate: 0,
};

function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

/** 总体统计：比率按作答次数计算（一次作答一条日志） */
export function getSummary(db: Database): StatSummary {
  const total =
    db.prepare("SELECT COUNT(*) AS c FROM words").get() as { c: number };
  const reviewed = db
    .prepare("SELECT COUNT(DISTINCT wordId) AS c FROM review_logs")
    .get() as { c: number };
  if (reviewed.c === 0) return { ...EMPTY, total: total.c };
  const counts = db
    .prepare("SELECT result, COUNT(*) AS c FROM review_logs GROUP BY result")
    .all() as unknown as CountRow[];
  const get = (k: string): number =>
    counts.find((r) => r.result === k)?.c ?? 0;
  const correct = get("correct");
  const wrong = get("wrong");
  const unknown = get("unknown");
  const logTotal = correct + wrong + unknown;
  return {
    total: total.c,
    reviewed: reviewed.c,
    correct,
    wrong,
    unknown,
    accuracy: ratio(correct, logTotal),
    errorRate: ratio(wrong, logTotal),
    unknownRate: ratio(unknown, logTotal),
  };
}

/** 分维度聚合 SQL（维度列由调用方传入，均为 words 表内的文本列） */
function aggregate(db: Database, column: string, limit?: number): StatRow[] {
  const limitSql = limit ? `LIMIT ${Math.floor(limit)}` : "";
  const rows = db
    .prepare(
      `SELECT w.${column} AS key,
              COUNT(*) AS answered,
              SUM(CASE WHEN l.result='correct' THEN 1 ELSE 0 END) AS correct,
              SUM(CASE WHEN l.result='wrong' THEN 1 ELSE 0 END) AS wrong,
              SUM(CASE WHEN l.result='unknown' THEN 1 ELSE 0 END) AS unknown
       FROM review_logs l JOIN words w ON w.id = l.wordId
       WHERE w.${column} IS NOT NULL
       GROUP BY w.${column}
       ORDER BY (correct * 1.0 / answered) ASC, answered DESC
       ${limitSql}`,
    )
    .all() as unknown as Array<{
    key: string;
    answered: number;
    correct: number;
    wrong: number;
    unknown: number;
  }>;
  return rows.map((r) => ({
    key: r.key,
    total: r.answered,
    correct: r.correct,
    wrong: r.wrong,
    unknown: r.unknown,
    accuracy: ratio(r.correct, r.answered),
  }));
}

export function getByGrade(db: Database): StatRow[] {
  return aggregate(db, "grade");
}

export function getBySource(db: Database): StatRow[] {
  return aggregate(db, "source");
}

export function getByChar(db: Database, limit = 20): StatRow[] {
  return aggregate(db, "char", limit);
}

/**
 * 错误词条排行（句子粒度）：有答错或「不知道」记录的词条，按错误次数降序。
 * 一个字有多个含义词条，错误发生在具体词条上，此函数给出比按字更精确的薄弱点。
 */
export function getWrongEntries(db: Database, limit = 20): WordErrorRow[] {
  const rows = db
    .prepare(
      `SELECT w.id AS wordId,
              w.char,
              w.meaning,
              w.sentence,
              COUNT(*) AS answered,
              SUM(CASE WHEN l.result='wrong' THEN 1 ELSE 0 END) AS wrong,
              SUM(CASE WHEN l.result='unknown' THEN 1 ELSE 0 END) AS unknown
       FROM review_logs l JOIN words w ON w.id = l.wordId
       GROUP BY w.id
       HAVING wrong + unknown > 0
       ORDER BY (wrong + unknown) DESC, answered DESC, w.id ASC
       LIMIT ?`,
    )
    .all(Math.floor(limit)) as unknown as Array<{
    wordId: number;
    char: string;
    meaning: string;
    sentence: string;
    answered: number;
    wrong: number;
    unknown: number;
  }>;
  return rows.map((r) => ({
    wordId: r.wordId,
    char: r.char,
    meaning: r.meaning,
    sentence: r.sentence,
    wrong: r.wrong,
    unknown: r.unknown,
    total: r.answered,
  }));
}

/** 按字查询全部词条并携带错误计数（LEFT JOIN 保证零记录词条在列，错多在前） */
export function getWordErrorsByChar(
  db: Database,
  char: string,
): WordWithErrors[] {
  return db
    .prepare(
      `SELECT w.*, w.id AS wordId,
              COALESCE(SUM(CASE WHEN l.result='wrong' THEN 1 ELSE 0 END), 0) AS wrong,
              COALESCE(SUM(CASE WHEN l.result='unknown' THEN 1 ELSE 0 END), 0) AS unknown,
              COUNT(l.id) AS total
       FROM words w LEFT JOIN review_logs l ON l.wordId = w.id
       WHERE w.char = ?
       GROUP BY w.id
       ORDER BY wrong DESC, unknown DESC, w.id ASC`,
    )
    .all(char) as unknown as WordWithErrors[];
}

/** 近 N 天趋势（本地时区按日聚合，只含有记录的日期） */
export function getTrend(db: Database, days = 7): TrendRow[] {
  const rows = db
    .prepare(
      `SELECT strftime('%m-%d', createdAt, 'localtime') AS date,
              SUM(CASE WHEN result='correct' THEN 1 ELSE 0 END) AS correct,
              SUM(CASE WHEN result='wrong' THEN 1 ELSE 0 END) AS wrong,
              SUM(CASE WHEN result='unknown' THEN 1 ELSE 0 END) AS unknown
       FROM review_logs
       WHERE createdAt >= datetime('now', 'localtime', ?)
       GROUP BY date
       ORDER BY date ASC`,
    )
    .all(`-${Math.floor(days)} days`) as unknown as TrendRow[];
  return rows;
}

import type { Database } from "better-sqlite3";
import type { StatSummary, StatRow, TrendRow } from "../types";

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
    db.prepare("SELECT COUNT(*) AS c FROM e_words").get() as { c: number };
  const reviewed = db
    .prepare("SELECT COUNT(DISTINCT wordId) AS c FROM e_review_logs")
    .get() as { c: number };
  if (reviewed.c === 0) return { ...EMPTY, total: total.c };
  const counts = db
    .prepare("SELECT result, COUNT(*) AS c FROM e_review_logs GROUP BY result")
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

/** 按学段聚合（level 是 e_words 的列，走 SQL 聚合；正确率升序） */
export function getByLevel(db: Database): StatRow[] {
  const rows = db
    .prepare(
      `SELECT w.level AS key,
              COUNT(*) AS answered,
              SUM(CASE WHEN l.result='correct' THEN 1 ELSE 0 END) AS correct,
              SUM(CASE WHEN l.result='wrong' THEN 1 ELSE 0 END) AS wrong,
              SUM(CASE WHEN l.result='unknown' THEN 1 ELSE 0 END) AS unknown
       FROM e_review_logs l JOIN e_words w ON w.id = l.wordId
       GROUP BY w.level
       ORDER BY (correct * 1.0 / answered) ASC, answered DESC`,
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

interface InitialAgg {
  answered: number;
  correct: number;
  wrong: number;
  unknown: number;
}

/** 按首字母聚合（首字母非列，JS 聚合；正确率升序、作答数降序） */
export function getByInitial(db: Database): StatRow[] {
  const agg = new Map<string, InitialAgg>();
  const rows = db
    .prepare(
      `SELECT w.word, l.result FROM e_review_logs l JOIN e_words w ON w.id = l.wordId`,
    )
    .all() as unknown as Array<{ word: string; result: string }>;
  for (const r of rows) {
    const key = (r.word[0] ?? "").toUpperCase();
    if (!key) continue;
    const a = agg.get(key) ?? { answered: 0, correct: 0, wrong: 0, unknown: 0 };
    a.answered++;
    if (r.result === "correct") a.correct++;
    else if (r.result === "wrong") a.wrong++;
    else if (r.result === "unknown") a.unknown++;
    agg.set(key, a);
  }
  return [...agg.entries()]
    .map(([key, a]) => ({
      key,
      total: a.answered,
      correct: a.correct,
      wrong: a.wrong,
      unknown: a.unknown,
      accuracy: ratio(a.correct, a.answered),
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

/** 近 N 天趋势（本地时区按日聚合，只含有记录的日期） */
export function getTrend(db: Database, days = 7): TrendRow[] {
  const rows = db
    .prepare(
      `SELECT strftime('%m-%d', createdAt, 'localtime') AS date,
              SUM(CASE WHEN result='correct' THEN 1 ELSE 0 END) AS correct,
              SUM(CASE WHEN result='wrong' THEN 1 ELSE 0 END) AS wrong,
              SUM(CASE WHEN result='unknown' THEN 1 ELSE 0 END) AS unknown
       FROM e_review_logs
       WHERE createdAt >= datetime('now', 'localtime', ?)
       GROUP BY date
       ORDER BY date ASC`,
    )
    .all(`-${Math.floor(days)} days`) as unknown as TrendRow[];
  return rows;
}

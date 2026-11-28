import type { Database } from "better-sqlite3";

/**
 * SRS 间隔重复（固定阶梯式）。
 * 状态不落库：从作答日志实时重放推导，两个模块以表名参数复用。
 * 阶梯：level 0..6；答对升级（封顶毕业），答错/不知道归零；
 * dueAt = 最后一次作答的本地日 + 间隔天数 的当天 00:00（本地时区）。
 */
export const SRS_GRADUATED = 6;
/** 索引 = level（0..5），单位天；level 6 毕业，不再出题 */
export const SRS_INTERVALS = [1, 1, 2, 4, 7, 15];

export interface SrsState {
  level: number;
  graduated: boolean;
  /** 毕业或从未作答为 null；否则为本地日 00:00 的 ISO 串 */
  dueAt: string | null;
  isNew: boolean;
}

type SrsLog = { result: "correct" | "wrong" | "unknown"; createdAt: string };

export type SrsLogsTable = "review_logs" | "e_review_logs";
export type SrsWordsTable = "words" | "e_words";

/** 本地零点 */
function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** 重放单个词条的日志推导状态（logs 内部按 createdAt 升序重放；「判我对」就地覆盖的最终结果直接生效） */
export function computeSrsState(logs: SrsLog[]): SrsState {
  if (logs.length === 0) {
    return { level: 0, graduated: false, dueAt: null, isNew: true };
  }
  const sorted = [...logs].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
  let level = 0;
  for (const log of sorted) {
    level = log.result === "correct" ? Math.min(level + 1, SRS_GRADUATED) : 0;
  }
  const graduated = level === SRS_GRADUATED;
  const dueAt = graduated
    ? null
    : addDays(
        localMidnight(new Date(sorted[sorted.length - 1].createdAt)),
        SRS_INTERVALS[level],
      ).toISOString();
  return { level, graduated, dueAt, isNew: false };
}

function loadSrsLogs(db: Database, logsTable: SrsLogsTable): SrsLogRow[] {
  return db
    .prepare(
      `SELECT wordId, result, createdAt FROM ${logsTable}
       ORDER BY wordId ASC, createdAt ASC`,
    )
    .all() as unknown as SrsLogRow[];
}

interface SrsLogRow {
  wordId: number;
  result: "correct" | "wrong" | "unknown";
  createdAt: string;
}

/** 全库状态：wordId → SrsState（只含有日志的词） */
export function getAllSrsStates(
  db: Database,
  logsTable: SrsLogsTable,
): Map<number, SrsState> {
  const byWord = new Map<number, SrsLog[]>();
  for (const row of loadSrsLogs(db, logsTable)) {
    const list = byWord.get(row.wordId) ?? [];
    list.push({ result: row.result, createdAt: row.createdAt });
    byWord.set(row.wordId, list);
  }
  const states = new Map<number, SrsState>();
  for (const [wordId, logs] of byWord) {
    states.set(wordId, computeSrsState(logs));
  }
  return states;
}

/** 单词条状态（作答响应与判我对覆盖后重算用） */
export function getSrsStateForWord(
  db: Database,
  logsTable: SrsLogsTable,
  wordId: number,
): SrsState {
  const rows = db
    .prepare(
      `SELECT result, createdAt FROM ${logsTable} WHERE wordId = ? ORDER BY createdAt ASC`,
    )
    .all(wordId) as unknown as Array<{ result: SrsLog["result"]; createdAt: string }>;
  return computeSrsState(
    rows.map((r) => ({ result: r.result, createdAt: r.createdAt })),
  );
}

/** due 选题：到期（按 dueAt 升序，最久未到期优先）封顶 cap 全出 → 新词随机补齐至 minBatch；不引入未到期词 */
export function pickDueWords(
  db: Database,
  wordsTable: SrsWordsTable,
  logsTable: SrsLogsTable,
  opts?: { cap?: number; minBatch?: number; now?: Date },
): { ids: number[]; dueCount: number; newCount: number } {
  const cap = opts?.cap ?? 30;
  const minBatch = opts?.minBatch ?? 10;
  const nowIso = (opts?.now ?? new Date()).toISOString();
  const states = getAllSrsStates(db, logsTable);

  const due: Array<{ id: number; dueAt: string }> = [];
  const fresh: number[] = [];
  for (const row of db.prepare(`SELECT id FROM ${wordsTable}`).all() as unknown as Array<{ id: number }>) {
    const st = states.get(row.id);
    if (!st) {
      fresh.push(row.id);
      continue;
    }
    if (st.graduated || st.dueAt === null) continue;
    if (st.dueAt <= nowIso) due.push({ id: row.id, dueAt: st.dueAt });
  }
  due.sort((a, b) => (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0));

  const selected = due.slice(0, cap).map((d) => d.id);
  const newCount = Math.min(
    Math.max(0, minBatch - selected.length),
    fresh.length,
  );
  if (newCount > 0) {
    for (let i = fresh.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
    }
    selected.push(...fresh.slice(0, newCount));
  }
  return { ids: selected, dueCount: due.length, newCount };
}

export interface SrsProgress {
  unlearned: number;
  learning: number;
  graduated: number;
  /** 长 7，索引 = level（毕业计入 [6]） */
  byLevel: number[];
  dueCount: number;
}

/** 掌握度分桶 + 到期计数（复习设置页与统计页共用） */
export function getSrsProgress(
  db: Database,
  wordsTable: SrsWordsTable,
  logsTable: SrsLogsTable,
  now: Date = new Date(),
): SrsProgress {
  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM ${wordsTable}`).get() as { c: number }
  ).c;
  const states = getAllSrsStates(db, logsTable);
  const nowIso = now.toISOString();
  const byLevel = new Array(SRS_GRADUATED + 1).fill(0);
  let learning = 0;
  let graduated = 0;
  let dueCount = 0;
  for (const st of states.values()) {
    byLevel[st.level]++;
    if (st.graduated) {
      graduated++;
      continue;
    }
    learning++;
    if (st.dueAt !== null && st.dueAt <= nowIso) dueCount++;
  }
  return { unlearned: total - states.size, learning, graduated, byLevel, dueCount };
}

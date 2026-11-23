import type { Database } from "better-sqlite3";
import type { EQuizRule, EnglishWord, Meaning } from "./types";
import { rowToEnglishWord } from "./types";

/** 释义列表 → 单行文本：`pos. tran` 用「；」连接，pos 为空只输出 tran */
export function formatMeanings(meanings: Meaning[]): string {
  return meanings
    .map((m) => (m.pos ? `${m.pos}. ${m.tran}` : m.tran))
    .join("；");
}

/** 选择题 */
export interface ChoiceQuestion {
  word: EnglishWord;
  options: string[];
  answer: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 填空题判定：去首尾空白 + 忽略大小写后精确匹配 */
export function judgeEnglishFill(word: EnglishWord, input: string): boolean {
  return input.trim().toLowerCase() === word.word.toLowerCase();
}

/** 选择题干扰项：其他词的释义文本，去重且不含正确答案；不足时允许少于 n */
export function pickDistractors(
  all: EnglishWord[],
  target: EnglishWord,
  n = 3,
): string[] {
  const answer = formatMeanings(target.meanings);
  const candidates = shuffle(
    all
      .filter((w) => w.id !== target.id && w.meanings.length > 0)
      .map((w) => formatMeanings(w.meanings)),
  );
  const result: string[] = [];
  for (const m of candidates) {
    if (result.length >= n) break;
    if (m !== answer && !result.includes(m)) result.push(m);
  }
  return result;
}

/** 组装选择题（options 含正确答案，已打乱） */
export function buildChoiceQuestion(
  word: EnglishWord,
  distractors: string[],
): ChoiceQuestion {
  const answer = formatMeanings(word.meanings);
  return {
    word,
    options: shuffle([answer, ...distractors]),
    answer,
  };
}

function loadAll(db: Database): EnglishWord[] {
  const rows = db.prepare("SELECT * FROM e_words").all() as unknown as Array<
    Record<string, unknown>
  >;
  return rows.map(rowToEnglishWord).filter((w) => w.meanings.length > 0);
}

interface WeakRow {
  wordId: number;
  err: number;
  n: number;
}

/** 按规则选取一批词条（仅返回有释义的词） */
export function pickWords(
  db: Database,
  rule: EQuizRule,
  value: string,
  count: number,
): EnglishWord[] {
  const all = loadAll(db);
  switch (rule) {
    case "level":
      return shuffle(all.filter((w) => w.level === value)).slice(0, count);
    case "initial": {
      const letter = value.trim().toUpperCase();
      return shuffle(
        all.filter((w) => (w.word[0] ?? "").toUpperCase() === letter),
      ).slice(0, count);
    }
    case "weakness": {
      const weak = db
        .prepare(
          `SELECT wordId, SUM(CASE WHEN result != 'correct' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS err,
                  COUNT(*) AS n
           FROM e_review_logs GROUP BY wordId`,
        )
        .all() as unknown as WeakRow[];
      const byId = new Map(all.map((w) => [w.id, w]));
      const reviewed = weak
        .filter((r) => byId.has(r.wordId))
        .sort((a, b) => b.err - a.err || b.n - a.n)
        .map((r) => byId.get(r.wordId)!);
      const logged = new Set(weak.map((r) => r.wordId));
      const fresh = shuffle(all.filter((w) => !logged.has(w.id)));
      return [...reviewed, ...fresh].slice(0, count);
    }
    case "random":
    default:
      return shuffle(all).slice(0, count);
  }
}

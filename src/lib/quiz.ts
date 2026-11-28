import type { Database } from "better-sqlite3";
import type { Word } from "./types";
import { wordInitial } from "./pinyin";

export type QuizRule =
  | "due"
  | "random"
  | "grade"
  | "initial"
  | "keyword"
  | "frequency"
  | "weakness";

/** 选择题 */
export interface ChoiceQuestion {
  word: Word;
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

/**
 * 填空题判定：双向包含。
 * 输入与含义按分隔符拆出的关键词归一化（去空白标点、剥离「同X」「为动」等注释）后，
 * 互相包含即判对。
 */
export function judgeFill(meaning: string, input: string): boolean {
  const norm = (s: string): string => s.replace(/[\s\p{P}]+/gu, "");
  const inp = norm(input);
  if (!inp) return false;
  const keywords = meaning
    .split(/[，、；;,\s]+/)
    .map(norm)
    .filter(Boolean);
  for (const raw of keywords) {
    let core = raw.replace(/^[同通](?=.)/, "");
    // 纯语法注释部分不参与判定
    if (/^(为动|使动|意动|名词|动词|形容词|数词作动词)$/.test(core)) continue;
    if (core.includes(inp) || inp.includes(core)) return true;
  }
  return false;
}

/** 选择题干扰项：优先同字其他含义，不足时从其他字随机补足；去重且不含正确答案 */
export function pickDistractors(
  all: Word[],
  target: Word,
  n = 3,
): string[] {
  const sameChar = shuffle(
    all
      .filter((w) => w.char === target.char && w.meaning !== target.meaning)
      .map((w) => w.meaning),
  );
  const others = shuffle(
    all
      .filter((w) => w.char !== target.char && w.meaning !== target.meaning)
      .map((w) => w.meaning),
  );
  const result: string[] = [];
  for (const m of [...sameChar, ...others]) {
    if (result.length >= n) break;
    if (!result.includes(m)) result.push(m);
  }
  return result;
}

/** 组装选择题（options 含正确答案，已打乱） */
export function buildChoiceQuestion(
  word: Word,
  distractors: string[],
): ChoiceQuestion {
  return {
    word,
    options: shuffle([word.meaning, ...distractors]),
    answer: word.meaning,
  };
}

function loadAll(db: Database): Word[] {
  return db.prepare("SELECT * FROM words").all() as unknown as Word[];
}

interface WeakRow {
  wordId: number;
  err: number;
  n: number;
}

/** 按规则选取一批词条 */
export function pickWords(
  db: Database,
  rule: QuizRule,
  value: string,
  count: number,
): Word[] {
  const all = loadAll(db);
  switch (rule) {
    case "grade":
      return shuffle(all.filter((w) => w.grade === value)).slice(0, count);
    case "initial": {
      const letter = value.trim().toUpperCase();
      return shuffle(all.filter((w) => wordInitial(w) === letter)).slice(
        0,
        count,
      );
    }
    case "keyword": {
      const kw = value.trim();
      if (!kw) return shuffle(all).slice(0, count);
      return shuffle(
        all.filter((w) => w.char.includes(kw) || w.meaning.includes(kw)),
      ).slice(0, count);
    }
    case "frequency": {
      const freq = new Map<string, number>();
      for (const w of all) freq.set(w.char, (freq.get(w.char) ?? 0) + 1);
      return shuffle(all)
        .sort((a, b) => (freq.get(b.char) ?? 0) - (freq.get(a.char) ?? 0))
        .slice(0, count);
    }
    case "weakness": {
      const weak = db
        .prepare(
          `SELECT wordId, SUM(CASE WHEN result != 'correct' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS err,
                  COUNT(*) AS n
           FROM review_logs GROUP BY wordId`,
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

import type { ReviewMode, ReviewResult } from "../types";

/** 学段档位：词库只区分初中 / 高中（取该词出现的最低学段） */
export type EnglishLevel = "初中" | "高中";

/** 一条释义（词性 + 中文释义） */
export interface Meaning {
  pos: string;
  tran: string;
}

/** 一条例句（英文 + 中文翻译） */
export interface SentencePair {
  en: string;
  cn: string;
}

/** 一条短语搭配（英文 + 中文） */
export interface Phrase {
  en: string;
  cn: string;
}

/** 英语词条表 */
export interface EnglishWord {
  id: number;
  /** 单词本身（wordHead） */
  word: string;
  /** 学段 */
  level: EnglishLevel;
  /** 美式音标 */
  usphone: string | null;
  /** 英式音标 */
  ukphone: string | null;
  /** 释义列表 */
  meanings: Meaning[];
  /** 例句列表 */
  sentences: SentencePair[];
  /** 短语列表 */
  phrases: Phrase[];
  createdAt: string;
  updatedAt: string;
}

export type EReviewMode = ReviewMode;
export type EReviewResult = ReviewResult;

/** 英语作答记录（一次作答一条；「判我对」就地更新 result 并置 overridden=1） */
export interface EReviewLog {
  id: number;
  wordId: number;
  mode: EReviewMode;
  result: EReviewResult;
  userAnswer: string | null;
  overridden: number;
  createdAt: string;
}

/** 英语出题规则 */
export type EQuizRule = "random" | "level" | "initial" | "weakness";

/** 出题接口返回的单题（fill 模式 answer 为 null，避免前端泄题） */
export interface EQuizItem {
  word: EnglishWord;
  /** 选择题选项；fill 模式为 null */
  options: string[] | null;
  /** 选择题正确答案；fill 模式为 null */
  answer: string | null;
}

/** 安全解析 JSON 列：非法或缺失一律回退空数组 */
function parseJsonArray<T>(raw: unknown): T[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

/** 数据库行 → EnglishWord（JSON TEXT 列安全解析） */
export function rowToEnglishWord(r: Record<string, unknown>): EnglishWord {
  return {
    id: r.id as number,
    word: r.word as string,
    level: r.level as EnglishLevel,
    usphone: (r.usphone as string | null) ?? null,
    ukphone: (r.ukphone as string | null) ?? null,
    meanings: parseJsonArray<Meaning>(r.meanings),
    sentences: parseJsonArray<SentencePair>(r.sentences),
    phrases: parseJsonArray<Phrase>(r.phrases),
    createdAt: r.createdAt as string,
    updatedAt: r.updatedAt as string,
  };
}

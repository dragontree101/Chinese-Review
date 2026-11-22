/** 年级档位：初中三档 + 拓展（高中及课外篇目）；null 表示无出处（成语、词语、无括号条目） */
export type Grade = "七年级" | "八年级" | "九年级" | "拓展";

/** 词条表 */
export interface Word {
  id: number;
  /** 字（如「哀」） */
  char: string;
  /** 原始 keyword，承载多音字读音（如「辟(bì)」）与词形变体 */
  keyword: string;
  /** 含义（如「悲伤，悲哀，哀叹，哀悼」） */
  meaning: string;
  /** 例句原文（末尾括号含出处） */
  sentence: string;
  /** 出处（句末括号内书名），无出处为 null；成语条目为「成语」 */
  source: string | null;
  /** 例句白话翻译（AI 初稿，可编辑） */
  translation: string | null;
  /** 课文 */
  lesson: string | null;
  /** 年级档位 */
  grade: Grade | null;
  /** 原始数据 familiarity 字段，保留不参与逻辑 */
  familiarity: number;
  createdAt: string;
  updatedAt: string;
}

export type ReviewMode = "choice" | "fill";
export type ReviewResult = "correct" | "wrong" | "unknown";

/** 作答记录（一次作答一条；「判我对」就地更新 result 并置 overridden=1） */
export interface ReviewLog {
  id: number;
  wordId: number;
  mode: ReviewMode;
  result: ReviewResult;
  userAnswer: string | null;
  overridden: number;
  createdAt: string;
}

/** 词条编辑请求允许修改的字段 */
export interface WordPatch {
  translation?: string | null;
  lesson?: string | null;
  grade?: Grade | null;
  source?: string | null;
  meaning?: string;
}

/** 统计汇总 */
export interface StatSummary {
  total: number;
  reviewed: number;
  correct: number;
  wrong: number;
  unknown: number;
  accuracy: number;
  errorRate: number;
  unknownRate: number;
}

/** 分维度统计行 */
export interface StatRow {
  key: string;
  total: number;
  correct: number;
  wrong: number;
  unknown: number;
  accuracy: number;
}

/** 近 N 天趋势行 */
export interface TrendRow {
  date: string;
  correct: number;
  wrong: number;
  unknown: number;
}

/** 出题接口返回的单题（word 含 meaning 供答题后展示正确答案） */
export interface QuizItem {
  word: Word;
  /** 选择题选项；fill 模式为 null */
  options: string[] | null;
  /** 选择题正确答案；fill 模式为 null */
  answer: string | null;
  /** 相同含义的其他例句 */
  similar: string[];
}

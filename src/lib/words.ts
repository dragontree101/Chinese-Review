import type { Database } from "better-sqlite3";
import type { Grade, Word } from "./types";

/** 手动添加词条的输入（char/meaning 必填，其余可选） */
export interface WordInput {
  char: string;
  meaning: string;
  /** 例句（可空；建议补充以便复习时展示语境） */
  sentence?: string;
  /** 读音标注（如「辟(bì)」），缺省与 char 相同 */
  keyword?: string;
  source?: string | null;
  translation?: string | null;
  lesson?: string | null;
  grade?: Grade | null;
}

/** 生成下一个词条 id（现有最大 id + 1；空表为 1） */
export function nextWordId(db: Database): number {
  const row = db.prepare("SELECT MAX(id) AS m FROM words").get() as {
    m: number | null;
  };
  return (row.m ?? 0) + 1;
}

/** 手动添加词条（id 自增、时间戳即时生成），返回完整 Word */
export function createWord(db: Database, input: WordInput): Word {
  const now = new Date().toISOString();
  const id = nextWordId(db);
  db.prepare(
    `INSERT INTO words (id, char, keyword, meaning, sentence, source, translation, lesson, grade, familiarity, createdAt, updatedAt)
     VALUES (@id, @char, @keyword, @meaning, @sentence, @source, @translation, @lesson, @grade, 0, @createdAt, @updatedAt)`,
  ).run({
    id,
    char: input.char.trim(),
    keyword: input.keyword?.trim() || input.char.trim(),
    meaning: input.meaning.trim(),
    sentence: input.sentence?.trim() || "",
    source: input.source ?? null,
    translation: input.translation ?? null,
    lesson: input.lesson ?? null,
    grade: input.grade ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return db.prepare("SELECT * FROM words WHERE id = ?").get(id) as unknown as Word;
}

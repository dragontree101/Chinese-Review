import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { createSchema } from "../db";
import { createWord, getWordsByChar, nextWordId } from "../words";
import type { WordInput } from "../words";

function db(): Database.Database {
  const d = new Database(":memory:");
  createSchema(d);
  return d;
}

function seed(d: Database.Database, id: number, char: string): void {
  d.prepare(
    `INSERT INTO words (id, char, keyword, meaning, sentence, source, translation, lesson, grade, familiarity, createdAt, updatedAt)
     VALUES (?, ?, ?, '含义', '例句', NULL, NULL, NULL, NULL, 0, '2026-01-01', '2026-01-01')`,
  ).run(id, char, char);
}

describe("nextWordId", () => {
  it("空表返回 1", () => {
    expect(nextWordId(db())).toBe(1);
  });

  it("现有最大 id 为 1333 时返回 1334", () => {
    const d = db();
    seed(d, 1, "哀");
    seed(d, 1333, "龠");
    expect(nextWordId(d)).toBe(1334);
  });
});

describe("createWord", () => {
  it("插入词条并返回完整 Word（id 自增、时间戳生成）", () => {
    const d = db();
    seed(d, 1333, "龠");
    const input: WordInput = {
      char: "曩",
      meaning: "从前，以往",
      sentence: "曩与吾祖居者（《捕蛇者说》）",
    };
    const w = createWord(d, input);
    expect(w.id).toBe(1334);
    expect(w.char).toBe("曩");
    expect(w.keyword).toBe("曩");
    expect(w.createdAt).toBe(w.updatedAt);
    expect(w.grade).toBeNull();
    const row = d.prepare("SELECT COUNT(*) AS c FROM words").get() as { c: number };
    expect(row.c).toBe(2);
  });

  it("可选字段（出处/课文/年级/翻译/读音）正常写入", () => {
    const d = db();
    const w = createWord(d, {
      char: "曩",
      meaning: "从前",
      sentence: "曩者（《史记》）",
      source: "史记",
      lesson: "陈涉世家",
      grade: "九年级",
      translation: "从前。",
      keyword: "曩(nǎng)",
    });
    expect(w.source).toBe("史记");
    expect(w.lesson).toBe("陈涉世家");
    expect(w.grade).toBe("九年级");
    expect(w.translation).toBe("从前。");
    expect(w.keyword).toBe("曩(nǎng)");
  });
});

describe("getWordsByChar", () => {
  it("精确等值匹配：只返回 char 完全相等的词条，id 升序", () => {
    const d = db();
    seed(d, 1, "哀");
    seed(d, 2, "哀");
    // id 3 的含义中含「哀」，但 char 为「爱」，不得被带出
    d.prepare(
      `INSERT INTO words (id, char, keyword, meaning, sentence, source, translation, lesson, grade, familiarity, createdAt, updatedAt)
       VALUES (3, '爱', '爱', '哀伤', '例句', NULL, NULL, NULL, NULL, 0, '2026-01-01', '2026-01-01')`,
    ).run();
    const result = getWordsByChar(d, "哀");
    expect(result.map((w) => w.id)).toEqual([1, 2]);
    expect(result.every((w) => w.char === "哀")).toBe(true);
  });

  it("无匹配返回空数组", () => {
    const d = db();
    seed(d, 1, "哀");
    expect(getWordsByChar(d, "不存在")).toEqual([]);
  });
});

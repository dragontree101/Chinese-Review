import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { getSummary, getByLevel, getByInitial, getTrend, getWrongWords } from "../stats";
import { createSchema } from "../../db";

const now = "2026-11-23T00:00:00.000Z";

/** 测试用内存库：建表并插入英语词条与作答记录 */
function seedDb(
  words: Array<{ word: string; level: "初中" | "高中" }>,
  logs: Array<{ word: string; result: string; createdAt?: string }> = [],
): Database.Database {
  const db = new Database(":memory:");
  createSchema(db);
  const ids = new Map<string, number>();
  const stmt = db.prepare(
    `INSERT INTO e_words (word, level, usphone, ukphone, meanings, sentences, phrases, createdAt, updatedAt)
     VALUES (?, ?, NULL, NULL, '[]', '[]', '[]', ?, ?)`,
  );
  words.forEach((w) => {
    const info = stmt.run(w.word, w.level, now, now);
    ids.set(w.word, Number(info.lastInsertRowid));
  });
  const logStmt = db.prepare(
    `INSERT INTO e_review_logs (wordId, mode, result, userAnswer, overridden, createdAt)
     VALUES (?, 'choice', ?, NULL, 0, ?)`,
  );
  logs.forEach((l) => {
    logStmt.run(ids.get(l.word), l.result, l.createdAt ?? now);
  });
  return db;
}

describe("getSummary", () => {
  it("空库返回全 0 汇总", () => {
    const s = getSummary(seedDb([]));
    expect(s).toEqual({
      total: 0,
      reviewed: 0,
      correct: 0,
      wrong: 0,
      unknown: 0,
      accuracy: 0,
      errorRate: 0,
      unknownRate: 0,
    });
  });

  it("按作答次数计算正确率/错误率/未知率", () => {
    const db = seedDb(
      [
        { word: "apple", level: "初中" },
        { word: "banana", level: "初中" },
        { word: "pear", level: "高中" },
      ],
      [
        { word: "apple", result: "correct" },
        { word: "banana", result: "wrong" },
        { word: "banana", result: "unknown" },
      ],
    );
    const s = getSummary(db);
    expect(s.total).toBe(3);
    expect(s.reviewed).toBe(2);
    expect(s.correct).toBe(1);
    expect(s.wrong).toBe(1);
    expect(s.unknown).toBe(1);
    expect(s.accuracy).toBeCloseTo(1 / 3);
    expect(s.errorRate).toBeCloseTo(1 / 3);
    expect(s.unknownRate).toBeCloseTo(1 / 3);
  });
});

describe("getByLevel", () => {
  it("按学段聚合，正确率升序", () => {
    const db = seedDb(
      [
        { word: "apple", level: "初中" },
        { word: "banana", level: "初中" },
        { word: "pear", level: "高中" },
      ],
      [
        { word: "apple", result: "wrong" },
        { word: "banana", result: "correct" },
        { word: "pear", result: "correct" },
      ],
    );
    const rows = getByLevel(db);
    expect(rows.map((r) => r.key)).toEqual(["初中", "高中"]);
    expect(rows[0].accuracy).toBeCloseTo(0.5);
    expect(rows[1].accuracy).toBe(1);
  });
});

describe("getByInitial", () => {
  it("按首字母分组（大小写归一），错与不知分别计数，无记录的字母不出现", () => {
    const db = seedDb(
      [
        { word: "Apple", level: "初中" },
        { word: "banana", level: "初中" },
        { word: "pear", level: "高中" },
      ],
      [
        { word: "Apple", result: "wrong" },
        { word: "Apple", result: "unknown" },
        { word: "banana", result: "correct" },
      ],
    );
    const rows = getByInitial(db);
    expect(rows.map((r) => r.key)).toEqual(["A", "B"]);
    expect(rows[0].total).toBe(2);
    expect(rows[0].wrong).toBe(1);
    expect(rows[0].unknown).toBe(1);
    expect(rows[0].accuracy).toBe(0);
    expect(rows[1].accuracy).toBe(1);
    expect(rows.some((r) => r.key === "P")).toBe(false);
  });
});

describe("getWrongWords", () => {
  it("按单词列出有错误记录的词与错误次数，全对的词不出现，按错误次数降序", () => {
    const db = seedDb(
      [
        { word: "apple", level: "初中" },
        { word: "banana", level: "初中" },
        { word: "sophisticated", level: "高中" },
      ],
      [
        { word: "apple", result: "wrong" },
        { word: "apple", result: "wrong" },
        { word: "apple", result: "unknown" },
        { word: "sophisticated", result: "unknown" },
        { word: "banana", result: "correct" },
        { word: "banana", result: "correct" },
      ],
    );
    const rows = getWrongWords(db, 20);
    expect(rows.map((r) => r.key)).toEqual(["apple", "sophisticated"]);
    expect(rows[0].total).toBe(3);
    expect(rows[0].correct).toBe(0);
    expect(rows[0].wrong).toBe(2);
    expect(rows[0].unknown).toBe(1);
    expect(rows[0].accuracy).toBe(0);
    expect(rows[1].total).toBe(1);
    expect(rows[1].unknown).toBe(1);
  });

  it("无错误记录时返回空数组", () => {
    expect(getWrongWords(seedDb([{ word: "apple", level: "初中" }]))).toEqual([]);
  });

  it("limit 截断", () => {
    const db = seedDb(
      [
        { word: "apple", level: "初中" },
        { word: "pear", level: "高中" },
      ],
      [
        { word: "apple", result: "wrong" },
        { word: "pear", result: "wrong" },
      ],
    );
    expect(getWrongWords(db, 1)).toHaveLength(1);
  });
});

describe("getTrend", () => {
  it("按日聚合，只含有记录的日期", () => {
    const db = seedDb(
      [{ word: "apple", level: "初中" }],
      [
        { word: "apple", result: "correct", createdAt: "2026-11-22T10:00:00.000Z" },
        { word: "apple", result: "wrong", createdAt: "2026-11-22T11:00:00.000Z" },
        { word: "apple", result: "correct", createdAt: "2026-11-23T09:00:00.000Z" },
      ],
    );
    const rows = getTrend(db, 7);
    expect(rows).toHaveLength(2);
    expect(rows[0].correct).toBe(1);
    expect(rows[0].wrong).toBe(1);
    expect(rows[1].correct).toBe(1);
    expect(rows[1].wrong).toBe(0);
  });
});

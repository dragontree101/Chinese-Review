import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { createSchema } from "../db";
import {
  getSummary,
  getByGrade,
  getBySource,
  getByChar,
  getTrend,
  getWrongEntries,
  getWordErrorsByChar,
} from "../stats";
import type { Word } from "../types";

function seedDb(): Database.Database {
  const db = new Database(":memory:");
  createSchema(db);
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const words = [
    { id: 1, char: "安", grade: "七年级", lesson: "论语" },
    { id: 2, char: "兵", grade: "九年级", lesson: "曹刿论战" },
    { id: 3, char: "爱", grade: "九年级", lesson: "曹刿论战" },
  ] as const;
  const insert = db.prepare(
    `INSERT INTO words (id, char, keyword, meaning, sentence, source, translation, lesson, grade, familiarity, createdAt, updatedAt)
     VALUES (@id, @char, @char, '含义', '例句（《${"测试"}》）', @source, NULL, @lesson, @grade, 0, @t, @t)`,
  );
  for (const w of words) {
    insert.run({
      id: w.id,
      char: w.char,
      grade: w.grade,
      lesson: w.lesson,
      source: w.id === 3 ? "曹刿论战" : "拓展书",
      t: new Date(now).toISOString(),
    });
  }
  const log = db.prepare(
    `INSERT INTO review_logs (wordId, mode, result, userAnswer, overridden, createdAt)
     VALUES (@wordId, 'choice', @result, NULL, 0, @createdAt)`,
  );
  const at = (offsetDays: number): string =>
    new Date(now - offsetDays * day).toISOString();
  // word1：1 对 1 错；word2：1 不知道；word3：今天 1 对
  log.run({ wordId: 1, result: "correct", createdAt: at(3) });
  log.run({ wordId: 1, result: "wrong", createdAt: at(3) });
  log.run({ wordId: 2, result: "unknown", createdAt: at(2) });
  log.run({ wordId: 3, result: "correct", createdAt: at(0) });
  return db;
}

describe("getSummary", () => {
  it("按作答次数统计正确/错误/不知道", () => {
    const s = getSummary(seedDb());
    expect(s.total).toBe(3);
    expect(s.reviewed).toBe(3);
    expect(s.correct).toBe(2);
    expect(s.wrong).toBe(1);
    expect(s.unknown).toBe(1);
    expect(s.accuracy).toBeCloseTo(0.5); // 2/4
    expect(s.errorRate).toBeCloseTo(0.25);
    expect(s.unknownRate).toBeCloseTo(0.25);
  });

  it("无作答记录时各比率为 0，不产生 NaN", () => {
    const db = new Database(":memory:");
    createSchema(db);
    const s = getSummary(db);
    expect(s.total).toBe(0);
    expect(s.reviewed).toBe(0);
    expect(s.accuracy).toBe(0);
    expect(s.errorRate).toBe(0);
    expect(s.unknownRate).toBe(0);
  });
});

describe("getByGrade / getBySource / getByChar", () => {
  it("按年级聚合，无年级的词不计入", () => {
    const rows = getByGrade(seedDb());
    const q1 = rows.find((r) => r.key === "七年级")!;
    const q9 = rows.find((r) => r.key === "九年级")!;
    expect(q1.correct + q1.wrong + q1.unknown).toBe(2);
    expect(q9.correct + q9.wrong + q9.unknown).toBe(2);
  });

  it("按出处聚合", () => {
    const rows = getBySource(seedDb());
    const a = rows.find((r) => r.key === "曹刿论战")!;
    expect(a.correct + a.wrong + a.unknown).toBe(1); // 只有 word3
    const b = rows.find((r) => r.key === "拓展书")!;
    expect(b.correct + b.wrong + b.unknown).toBe(3); // word1×2 + word2×1
    expect(rows.every((r) => r.key !== null)).toBe(true);
  });

  it("按字聚合并按正确率升序（最弱在前）", () => {
    const rows = getByChar(seedDb(), 20);
    expect(rows).toHaveLength(3);
    expect(rows[0].accuracy).toBeLessThanOrEqual(rows[rows.length - 1].accuracy);
    const an = rows.find((r) => r.key === "安")!;
    expect(an.accuracy).toBeCloseTo(0.5);
  });
});

describe("getTrend", () => {
  it("只含最近 7 天有记录的日期，按日聚合", () => {
    const rows = getTrend(seedDb(), 7);
    expect(rows).toHaveLength(3); // 3天前/2天前/今天 各一天
    expect(rows.every((r) => /^\d{2}-\d{2}$/.test(r.date))).toBe(true);
    const sum = rows.reduce(
      (acc, r) => acc + r.correct + r.wrong + r.unknown,
      0,
    );
    expect(sum).toBe(4);
  });
});

describe("「判我对」口径", () => {
  it("就地覆盖后该次作答计为 correct，不产生双份记录", () => {
    const db = seedDb();
    db.prepare(
      `UPDATE review_logs SET result='correct', overridden=1 WHERE wordId=2`,
    ).run();
    const s = getSummary(db);
    expect(s.correct).toBe(3);
    expect(s.unknown).toBe(0);
    // 作答总次数不变
    expect(s.correct + s.wrong + s.unknown).toBe(4);
    void (0 as unknown as Word);
  });
});

describe("getWrongEntries / getWordErrorsByChar", () => {
  /** 造词条（char 可重复，模拟多义字多条） */
  function seedEntry(
    db: Database.Database,
    id: number,
    char: string,
    meaning: string,
  ): void {
    db.prepare(
      `INSERT INTO words (id, char, keyword, meaning, sentence, source, translation, lesson, grade, familiarity, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, '例句句子', NULL, NULL, NULL, NULL, 0, '2026-01-01', '2026-01-01')`,
    ).run(id, char, char, meaning);
  }

  function seedLog(
    db: Database.Database,
    wordId: number,
    result: "correct" | "wrong" | "unknown",
  ): void {
    db.prepare(
      `INSERT INTO review_logs (wordId, mode, result, userAnswer, overridden, createdAt)
       VALUES (?, 'choice', ?, NULL, 0, '2026-06-01T10:00:00.000Z')`,
    ).run(wordId, result);
  }

  /** A1=哀 错2对1；A2=哀 不知1；B=爱 全对3；C=乐 无日志 */
  function seedErrorDb(): Database.Database {
    const db = new Database(":memory:");
    createSchema(db);
    seedEntry(db, 1, "哀", "悲伤");
    seedEntry(db, 2, "哀", "哀悼");
    seedEntry(db, 3, "爱", "爱护");
    seedEntry(db, 4, "乐", "快乐");
    seedLog(db, 1, "wrong");
    seedLog(db, 1, "wrong");
    seedLog(db, 1, "correct");
    seedLog(db, 2, "unknown");
    seedLog(db, 3, "correct");
    seedLog(db, 3, "correct");
    seedLog(db, 3, "correct");
    return db;
  }

  it("getWrongEntries 只含有错误记录的词条，按错误次数降序", () => {
    const rows = getWrongEntries(seedErrorDb());
    expect(rows.map((r) => r.wordId)).toEqual([1, 2]);
    expect(rows[0]).toMatchObject({
      wordId: 1,
      char: "哀",
      meaning: "悲伤",
      sentence: "例句句子",
      wrong: 2,
      unknown: 0,
      total: 3,
    });
    expect(rows[1]).toMatchObject({ wordId: 2, wrong: 0, unknown: 1, total: 1 });
  });

  it("getWrongEntries 同错误次数按作答总数降序、再按 wordId 升序", () => {
    const db = new Database(":memory:");
    createSchema(db);
    seedEntry(db, 1, "甲", "义一");
    seedEntry(db, 2, "乙", "义二");
    seedEntry(db, 3, "丙", "义三");
    // 1 和 2 各错 1 次；2 多作答一次全对 → 2 在 1 前
    seedLog(db, 1, "wrong");
    seedLog(db, 2, "wrong");
    seedLog(db, 2, "correct");
    seedLog(db, 3, "correct");
    const rows = getWrongEntries(db);
    expect(rows.map((r) => r.wordId)).toEqual([2, 1]);
  });

  it("getWordErrorsByChar 返回该字全部词条（含零记录），错多在前", () => {
    const db = seedErrorDb();
    seedEntry(db, 5, "哀", "怜悯"); // 无任何日志
    const rows = getWordErrorsByChar(db, "哀");
    expect(rows.map((r) => r.wordId)).toEqual([1, 2, 5]);
    expect(rows[0]).toMatchObject({ wrong: 2, unknown: 0, total: 3 });
    expect(rows[1]).toMatchObject({ wrong: 0, unknown: 1, total: 1 });
    expect(rows[2]).toMatchObject({ wrong: 0, unknown: 0, total: 0 });
    expect(rows[2].meaning).toBe("怜悯");
  });

  it("getWordErrorsByChar 其他字的词条不出现", () => {
    const rows = getWordErrorsByChar(seedErrorDb(), "乐");
    expect(rows.map((r) => r.wordId)).toEqual([4]);
    expect(rows[0].total).toBe(0);
  });
});

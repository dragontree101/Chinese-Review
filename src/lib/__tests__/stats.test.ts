import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { createSchema } from "../db";
import {
  getSummary,
  getByGrade,
  getBySource,
  getByChar,
  getTrend,
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

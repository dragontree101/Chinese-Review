import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { createSchema } from "../db";
import {
  SRS_INTERVALS,
  computeSrsState,
  getAllSrsStates,
  getSrsStateForWord,
  pickDueWords,
  getSrsProgress,
} from "../srs";

/** 本地时区构造日期（保证测试与时区无关：构造与断言同用本地日界） */
function localIso(y: number, m: number, d: number, hour = 0): string {
  return new Date(y, m - 1, d, hour, 0, 0, 0).toISOString();
}

function localMidnightIso(y: number, m: number, d: number): string {
  return localIso(y, m, d, 0);
}

type SrsLog = { result: "correct" | "wrong" | "unknown"; createdAt: string };

function seedWord(db: Database.Database, id: number): void {
  db.prepare(
    `INSERT INTO words (id, char, keyword, meaning, sentence, source, translation, lesson, grade, familiarity, createdAt, updatedAt)
     VALUES (?, '测', '测', '含义', '例句', NULL, NULL, NULL, NULL, 0, '2026-01-01', '2026-01-01')`,
  ).run(id);
}

function seedLog(
  db: Database.Database,
  wordId: number,
  result: "correct" | "wrong" | "unknown",
  createdAt: string,
): void {
  db.prepare(
    `INSERT INTO review_logs (wordId, mode, result, userAnswer, overridden, createdAt)
     VALUES (?, 'choice', ?, NULL, 0, ?)`,
  ).run(wordId, result, createdAt);
}

describe("computeSrsState", () => {
  it("连对升级：两次答对 level=2，dueAt=最后作答日+2 天", () => {
    const logs: SrsLog[] = [
      { result: "correct", createdAt: localIso(2026, 6, 1, 21) },
      { result: "correct", createdAt: localIso(2026, 6, 2, 21) },
    ];
    const st = computeSrsState(logs);
    expect(st.level).toBe(2);
    expect(st.graduated).toBe(false);
    expect(st.dueAt).toBe(localMidnightIso(2026, 6, 4)); // 6/2 + SRS_INTERVALS[2]=2 天
  });

  it("答错归零：先对后错 level=0，次日到期", () => {
    const logs: SrsLog[] = [
      { result: "correct", createdAt: localIso(2026, 6, 1) },
      { result: "wrong", createdAt: localIso(2026, 6, 3, 21) },
    ];
    const st = computeSrsState(logs);
    expect(st.level).toBe(0);
    expect(st.dueAt).toBe(localMidnightIso(2026, 6, 4));
  });

  it("不知道同答错处理", () => {
    const st = computeSrsState([
      { result: "correct", createdAt: localIso(2026, 6, 1) },
      { result: "unknown", createdAt: localIso(2026, 6, 2) },
    ]);
    expect(st.level).toBe(0);
    expect(st.graduated).toBe(false);
  });

  it("连对 6 次毕业封顶：graduated=true、dueAt=null", () => {
    const logs: SrsLog[] = [1, 2, 3, 4, 5, 6].map((d) => ({
      result: "correct" as const,
      createdAt: localIso(2026, 6, d),
    }));
    const st = computeSrsState(logs);
    expect(st.level).toBe(6);
    expect(st.graduated).toBe(true);
    expect(st.dueAt).toBeNull();
  });

  it("「判我对」覆盖后的 correct 计入升级", () => {
    const logs: SrsLog[] = [
      { result: "wrong", createdAt: localIso(2026, 6, 1) },
      // 判我对就地覆盖后 result 已是 correct
      { result: "correct", createdAt: localIso(2026, 6, 2) },
    ];
    const st = computeSrsState(logs);
    expect(st.level).toBe(1);
    expect(st.graduated).toBe(false);
  });

  it("无日志：isNew=true、dueAt=null", () => {
    const st = computeSrsState([]);
    expect(st.isNew).toBe(true);
    expect(st.level).toBe(0);
    expect(st.dueAt).toBeNull();
  });

  it("跨自然日到期：6/1 21:30 答对 → 6/2 00:00 起到期（间隔 SRS_INTERVALS[1]=1 天）", () => {
    const st = computeSrsState([
      { result: "correct", createdAt: localIso(2026, 6, 1, 21) },
    ]);
    expect(st.level).toBe(1);
    expect(st.dueAt).toBe(localMidnightIso(2026, 6, 2));
    expect(SRS_INTERVALS[1]).toBe(1);
  });

  it("答错的词次日才到期（当下不算到期）", () => {
    const now = new Date(2026, 5, 1, 23, 0);
    const st = computeSrsState([
      { result: "wrong", createdAt: localIso(2026, 6, 1, 21) },
    ]);
    expect(st.dueAt).toBe(localMidnightIso(2026, 6, 2));
    // 判定到期与否由调用方比较 dueAt <= now：此处 dueAt > now
    expect(st.dueAt! > now.toISOString()).toBe(true);
  });
});

describe("getAllSrsStates / getSrsStateForWord", () => {
  it("有日志词进入 Map，零日志词不在 Map 中", () => {
    const db = new Database(":memory:");
    createSchema(db);
    seedWord(db, 1);
    seedWord(db, 2);
    seedLog(db, 1, "wrong", localIso(2026, 6, 1));
    const map = getAllSrsStates(db, "review_logs");
    expect(map.size).toBe(1);
    expect(map.get(1)?.level).toBe(0);
    expect(map.has(2)).toBe(false);
    expect(getSrsStateForWord(db, "review_logs", 2).isNew).toBe(true);
    expect(getSrsStateForWord(db, "review_logs", 1).isNew).toBe(false);
  });

  it("日志顺序无关：乱序插入按 createdAt 重放", () => {
    const db = new Database(":memory:");
    createSchema(db);
    seedWord(db, 1);
    seedLog(db, 1, "wrong", localIso(2026, 6, 5)); // 后插入但时间在前
    seedLog(db, 1, "correct", localIso(2026, 6, 6));
    const st = getSrsStateForWord(db, "review_logs", 1);
    expect(st.level).toBe(1);
  });
});

describe("pickDueWords", () => {
  it("含到期词与新词，不含未到期词；新词补齐到 minBatch", () => {
    const db = new Database(":memory:");
    createSchema(db);
    seedWord(db, 1); // 到期：6/7 答错 → dueAt 6/8
    seedWord(db, 2); // 未到期：6/10 答对 → dueAt 6/11
    for (let i = 3; i <= 14; i++) seedWord(db, i); // 12 个新词
    const now = new Date(2026, 5, 10, 8, 0);
    seedLog(db, 1, "wrong", localIso(2026, 6, 7));
    seedLog(db, 2, "correct", localIso(2026, 6, 10, 7));
    const r = pickDueWords(db, "words", "review_logs", { now });
    expect(r.ids).toContain(1);
    expect(r.ids).not.toContain(2);
    expect(r.ids.length).toBe(10); // 到期 1 + 新词 9，补到 minBatch
    expect(r.dueCount).toBe(1);
    expect(r.newCount).toBe(9);
  });

  it("到期词封顶 30：35 个到期 → ids 30、dueCount 35、不补新词", () => {
    const db = new Database(":memory:");
    createSchema(db);
    for (let i = 1; i <= 35; i++) {
      seedWord(db, i);
      seedLog(db, i, "wrong", localIso(2026, 6, 7));
    }
    const now = new Date(2026, 5, 10, 8, 0);
    const r = pickDueWords(db, "words", "review_logs", { now });
    expect(r.ids.length).toBe(30);
    expect(r.dueCount).toBe(35);
    expect(r.newCount).toBe(0);
  });

  it("到期词足够（≥minBatch）时不补新词", () => {
    const db = new Database(":memory:");
    createSchema(db);
    for (let i = 1; i <= 12; i++) {
      seedWord(db, i);
      seedLog(db, i, "wrong", localIso(2026, 6, 7));
    }
    const now = new Date(2026, 5, 10, 8, 0);
    const r = pickDueWords(db, "words", "review_logs", { now });
    expect(r.ids.length).toBe(12);
    expect(r.dueCount).toBe(12);
    expect(r.newCount).toBe(0);
  });

  it("无任何到期与新词时返回空", () => {
    const db = new Database(":memory:");
    createSchema(db);
    seedWord(db, 1);
    // 未到期词
    seedLog(db, 1, "correct", localIso(2026, 6, 10));
    const now = new Date(2026, 5, 10, 8, 0);
    const r = pickDueWords(db, "words", "review_logs", { now });
    expect(r.ids).toEqual([]);
    expect(r.dueCount).toBe(0);
    expect(r.newCount).toBe(0);
  });
});

describe("getSrsProgress", () => {
  it("分桶计数正确，毕业词不计入 dueCount", () => {
    const db = new Database(":memory:");
    createSchema(db);
    for (let i = 1; i <= 5; i++) seedWord(db, i);
    seedLog(db, 1, "wrong", localIso(2026, 6, 7)); // level 0，到期（6/8 ≤ now）
    seedLog(db, 2, "correct", localIso(2026, 6, 10)); // level 1，未到期（6/11）
    for (let d = 1; d <= 6; d++) seedLog(db, 3, "correct", localIso(2026, 6, d)); // 毕业
    // 4、5 无日志 → 未学
    const now = new Date(2026, 5, 10, 8, 0);
    const p = getSrsProgress(db, "words", "review_logs", now);
    expect(p.unlearned).toBe(2);
    expect(p.learning).toBe(2);
    expect(p.graduated).toBe(1);
    expect(p.byLevel).toEqual([1, 1, 0, 0, 0, 0, 1]);
    expect(p.dueCount).toBe(1);
  });
});

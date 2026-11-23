import { describe, it, expect } from "vitest";
import { remapReviewLogs, type OldLogRow } from "../log-remap";

const log = (over: Partial<OldLogRow>): OldLogRow => ({
  wordId: 1,
  mode: "choice",
  result: "correct",
  userAnswer: null,
  overridden: 0,
  createdAt: "2026-11-23T00:00:00.000Z",
  ...over,
});

describe("remapReviewLogs", () => {
  it("按词名把旧 wordId 迁移到新 id", () => {
    const oldLogs = [
      log({ wordId: 10 }),
      log({ wordId: 20, result: "wrong", mode: "fill", userAnswer: "x" }),
    ];
    const r = remapReviewLogs(
      oldLogs,
      new Map([
        [10, "apple"],
        [20, "pear"],
      ]),
      new Map([
        ["apple", 100],
        ["pear", 200],
      ]),
    );
    expect(r).toEqual([
      log({ wordId: 100 }),
      log({ wordId: 200, result: "wrong", mode: "fill", userAnswer: "x" }),
    ]);
  });

  it("词条已不存在时对应日志丢弃", () => {
    const r = remapReviewLogs(
      [log({ wordId: 10 }), log({ wordId: 99 })],
      new Map([
        [10, "apple"],
        [99, "ghost-word"],
      ]),
      new Map([["apple", 100]]),
    );
    expect(r).toEqual([log({ wordId: 100 })]);
  });

  it("旧映射缺失的 wordId（脏数据）安全丢弃不报错", () => {
    const r = remapReviewLogs(
      [log({ wordId: 42 })],
      new Map(),
      new Map([["apple", 100]]),
    );
    expect(r).toEqual([]);
  });
});

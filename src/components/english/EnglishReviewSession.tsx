"use client";

import { useState } from "react";
import EnglishReviewSetup, { type EReviewConfig } from "./EnglishReviewSetup";
import EnglishQuestionCard from "./EnglishQuestionCard";
import SessionSummary from "../SessionSummary";
import type { EQuizItem, EReviewResult } from "@/lib/english/types";

type Phase = "setup" | "question" | "summary";

interface Feedback {
  result: EReviewResult;
  overrideDone?: boolean;
}

const EMPTY_STATS = { correct: 0, wrong: 0, unknown: 0 };

async function postReview(
  body: Record<string, unknown>,
): Promise<{ result: EReviewResult; logId: number }> {
  const res = await fetch("/api/english/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`提交作答失败: ${res.status}`);
  return (await res.json()) as { result: EReviewResult; logId: number };
}

/** 英语复习主流程：设置单 → 逐题作答 → 小结 */
export default function EnglishReviewSession() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<"choice" | "fill">("choice");
  const [questions, setQuestions] = useState<EQuizItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastLogId, setLastLogId] = useState<number | null>(null);

  async function start(config: EReviewConfig) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/english/quiz?rule=${config.rule}&value=${encodeURIComponent(config.value)}&count=${config.count}&mode=${config.mode}`,
      );
      if (!res.ok) throw new Error(`取题失败: ${res.status}`);
      const data = (await res.json()) as { questions: EQuizItem[] };
      if (data.questions.length === 0) {
        setError("没有符合条件的单词，换一个规则试试");
        return;
      }
      setQuestions(data.questions);
      setMode(config.mode);
      setIdx(0);
      setStats(EMPTY_STATS);
      setFeedback(null);
      setPhase("question");
    } catch (e) {
      setError(e instanceof Error ? e.message : "取题失败");
    } finally {
      setLoading(false);
    }
  }

  function applyResult(result: EReviewResult) {
    setStats((s) => ({ ...s, [result]: s[result] + 1 }));
  }

  async function submitChoice(option: string) {
    const item = questions[idx];
    const result: EReviewResult = option === item.answer ? "correct" : "wrong";
    try {
      await postReview({
        wordId: item.word.id,
        mode: "choice",
        result,
        input: option,
      });
    } catch {
      setError("提交失败，请重试");
      return;
    }
    applyResult(result);
    setFeedback({ result });
  }

  async function submitFill(input: string) {
    const item = questions[idx];
    try {
      const r = await postReview({
        wordId: item.word.id,
        mode: "fill",
        input,
      });
      applyResult(r.result);
      setLastLogId(r.logId);
      setFeedback({ result: r.result });
    } catch {
      setError("提交失败，请重试");
    }
  }

  async function markUnknown() {
    const item = questions[idx];
    try {
      await postReview({ wordId: item.word.id, mode, result: "unknown" });
    } catch {
      setError("提交失败，请重试");
      return;
    }
    applyResult("unknown");
    setFeedback({ result: "unknown" });
  }

  async function overrideCorrect() {
    if (lastLogId === null) return;
    try {
      await postReview({ overrideLogId: lastLogId });
    } catch {
      setError("覆盖失败，请重试");
      return;
    }
    setStats((s) => ({ ...s, wrong: s.wrong - 1, correct: s.correct + 1 }));
    setFeedback((f) => (f ? { ...f, result: "correct", overrideDone: true } : f));
  }

  function next() {
    if (idx + 1 >= questions.length) {
      setPhase("summary");
    } else {
      setIdx(idx + 1);
      setFeedback(null);
    }
  }

  if (phase === "setup") {
    return (
      <div className="space-y-3">
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="py-10 text-center text-gray-500">取题中……</p>
        ) : (
          <EnglishReviewSetup onStart={start} />
        )}
      </div>
    );
  }

  if (phase === "summary") {
    return (
      <SessionSummary
        correct={stats.correct}
        wrong={stats.wrong}
        unknown={stats.unknown}
        total={questions.length}
        statsHref="/english/stats"
        onRestart={() => setPhase("setup")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      <EnglishQuestionCard
        item={questions[idx]}
        index={idx}
        total={questions.length}
        mode={mode}
        feedback={feedback}
        onSelectOption={submitChoice}
        onSubmitFill={submitFill}
        onUnknown={markUnknown}
        onOverrideCorrect={overrideCorrect}
      />
      {feedback && (
        <div className="text-center">
          <button
            onClick={next}
            className="rounded bg-blue-600 px-8 py-2.5 font-medium text-white"
          >
            {idx + 1 >= questions.length ? "查看小结" : "下一题"}
          </button>
        </div>
      )}
    </div>
  );
}

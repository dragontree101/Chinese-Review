"use client";

import { useState } from "react";
import EnglishReviewSetup, { type EReviewConfig } from "./EnglishReviewSetup";
import EnglishQuestionCard from "./EnglishQuestionCard";
import SessionSummary from "../SessionSummary";
import type { EQuizItem, EReviewResult } from "@/lib/english/types";

type Phase = "setup" | "question" | "summary";

/** 作答响应携带的 SRS 状态（服务端权威） */
interface SrsResponse {
  prevLevel: number;
  level: number;
  graduated: boolean;
  nextIntervalDays: number | null;
}

interface Feedback {
  result: EReviewResult;
  overrideDone?: boolean;
  /** 填空题判定后由服务端返回的正确拼写 */
  correctWord?: string;
  srsHint?: string;
}

const EMPTY_STATS = { correct: 0, wrong: 0, unknown: 0 };

async function postReview(
  body: Record<string, unknown>,
): Promise<{
  result: EReviewResult;
  logId: number;
  correctWord?: string;
  srs?: SrsResponse;
}> {
  const res = await fetch("/api/english/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`提交作答失败: ${res.status}`);
  return (await res.json()) as {
    result: EReviewResult;
    logId: number;
    correctWord?: string;
    srs?: SrsResponse;
  };
}

/** 由 SRS 状态派生轻提示文案（前端不复制间隔表逻辑） */
function srsHintFor(result: EReviewResult, srs: SrsResponse): string {
  if (srs.graduated) return "🎉 毕业！这个词以后不再出现在智能复习里";
  if (result === "correct") {
    return `连对 ${srs.level} 次，${srs.nextIntervalDays} 天后见`;
  }
  return "明日再见";
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
  /** 每题最新一次 SRS 变化（判我对时替换该题条目，避免小结双计） */
  const [srsDeltas, setSrsDeltas] = useState<Record<number, SrsResponse>>({});

  function recordSrs(idx: number, srs: SrsResponse | undefined): void {
    if (!srs) return;
    setSrsDeltas((d) => ({ ...d, [idx]: srs }));
  }

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
      setSrsDeltas({});
      setLastLogId(null);
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
      const r = await postReview({
        wordId: item.word.id,
        mode: "choice",
        result,
        input: option,
      });
      recordSrs(idx, r.srs);
      setFeedback({ result, srsHint: r.srs ? srsHintFor(result, r.srs) : undefined });
    } catch {
      setError("提交失败，请重试");
      return;
    }
    applyResult(result);
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
      recordSrs(idx, r.srs);
      setFeedback({
        result: r.result,
        correctWord: r.correctWord,
        srsHint: r.srs ? srsHintFor(r.result, r.srs) : undefined,
      });
    } catch {
      setError("提交失败，请重试");
    }
  }

  async function markUnknown() {
    const item = questions[idx];
    try {
      const r = await postReview({ wordId: item.word.id, mode, result: "unknown" });
      recordSrs(idx, r.srs);
      setFeedback({ result: "unknown", srsHint: r.srs ? srsHintFor("unknown", r.srs) : undefined });
    } catch {
      setError("提交失败，请重试");
      return;
    }
    applyResult("unknown");
  }

  async function overrideCorrect() {
    if (lastLogId === null) return;
    try {
      const r = await postReview({ overrideLogId: lastLogId });
      recordSrs(idx, r.srs); // 替换该题原有变化量，小结不双计
      if (r.srs) {
        setFeedback((f) =>
          f
            ? { ...f, result: "correct", overrideDone: true, srsHint: srsHintFor("correct", r.srs!) }
            : f,
        );
      } else {
        setFeedback((f) => (f ? { ...f, result: "correct", overrideDone: true } : f));
      }
    } catch {
      setError("覆盖失败，请重试");
      return;
    }
    setStats((s) => ({ ...s, wrong: s.wrong - 1, correct: s.correct + 1 }));
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
    // 由每题最新 SRS 变化聚合小结（判我对以替换后的为准）
    let promoted = 0;
    let demoted = 0;
    let graduated = 0;
    for (const s of Object.values(srsDeltas)) {
      if (s.graduated && s.prevLevel < 6) graduated++;
      else if (s.level > s.prevLevel && s.level < 6) promoted++;
      else if (s.level < s.prevLevel) demoted++;
    }
    const srsSummary =
      promoted + demoted + graduated > 0
        ? { promoted, demoted, graduated }
        : undefined;
    return (
      <SessionSummary
        correct={stats.correct}
        wrong={stats.wrong}
        unknown={stats.unknown}
        total={questions.length}
        statsHref="/english/stats"
        srsSummary={srsSummary}
        onRestart={() => setPhase("setup")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      {/* key 按题号重挂：切题时重置答题输入等组件内状态 */}
      <EnglishQuestionCard
        key={idx}
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

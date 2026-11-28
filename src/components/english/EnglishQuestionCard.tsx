"use client";

import { useState } from "react";
import type { EQuizItem } from "@/lib/english/types";
import type { EReviewResult } from "@/lib/english/types";
import { formatMeanings } from "@/lib/english/quiz";

interface Feedback {
  result: EReviewResult;
  overrideDone?: boolean;
  /** 填空题判定后由服务端返回的正确拼写 */
  correctWord?: string;
  srsHint?: string;
}

interface Props {
  item: EQuizItem;
  index: number;
  total: number;
  mode: "choice" | "fill";
  /** 已提交后的反馈；null 表示未作答 */
  feedback: Feedback | null;
  onSelectOption: (option: string) => void;
  onSubmitFill: (input: string) => void;
  onUnknown: () => void;
  onOverrideCorrect: () => void;
}

/** 英语单题卡片：单词 + 音标 + 答题 + 即时反馈 */
export default function EnglishQuestionCard({
  item,
  index,
  total,
  mode,
  feedback,
  onSelectOption,
  onSubmitFill,
  onUnknown,
  onOverrideCorrect,
}: Props) {
  const { word, options } = item;
  const [input, setInput] = useState("");
  const answered = feedback !== null;

  const resultStyle = (opt: string): string => {
    if (!answered || mode !== "choice") return "border-gray-300 bg-white hover:bg-gray-50";
    if (opt === item.answer) return "border-green-600 bg-green-50 text-green-800";
    return "border-gray-300 bg-white opacity-60";
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          第 {index + 1} / {total} 题
        </span>
        <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">{word.level}</span>
      </div>

      {/* 填空题（中译英）不展示单词与音标——单词即答案 */}
      {mode === "choice" && (
        <div className="text-center">
          <div className="text-5xl font-bold tracking-wide">{word.word}</div>
          <p className="mt-2 text-sm text-gray-500">
            {word.usphone && <span className="mr-3">美 /{word.usphone}/</span>}
            {word.ukphone && <span>英 /{word.ukphone}/</span>}
          </p>
        </div>
      )}

      {mode === "choice" && options && (
        <div className="grid gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              disabled={answered}
              onClick={() => onSelectOption(opt)}
              className={`rounded border px-4 py-2.5 text-left ${resultStyle(opt)}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {mode === "fill" && (
        <div className="text-center">
          <p className="mb-3 text-lg">{formatMeanings(word.meanings)}</p>
          <div className="flex gap-2">
            <input
              value={input}
              disabled={answered}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim() && !answered) onSubmitFill(input);
              }}
              placeholder="输入对应的英文单词"
              className="flex-1 rounded border border-gray-300 px-3 py-2 disabled:bg-gray-50"
            />
            <button
              disabled={answered || !input.trim()}
              onClick={() => onSubmitFill(input)}
              className="rounded bg-blue-600 px-5 text-white disabled:opacity-40"
            >
              提交
            </button>
          </div>
        </div>
      )}

      {!answered && (
        <button
          onClick={onUnknown}
          className="w-full rounded border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
        >
          不知道
        </button>
      )}

      {answered && (
        <div
          className={`rounded p-4 text-center ${
            feedback!.result === "correct"
              ? "bg-green-50 text-green-800"
              : feedback!.result === "unknown"
                ? "bg-gray-100 text-gray-700"
                : "bg-red-50 text-red-800"
          }`}
        >
          <p className="font-medium">
            {feedback!.result === "correct"
              ? "✓ 答对了"
              : feedback!.result === "unknown"
                ? "已标记为「不知道」"
                : "✗ 答错了"}
          </p>
          <p className="mt-1">
            正确拼写：<strong>{feedback!.correctWord ?? word.word}</strong>
          </p>
          {feedback!.srsHint && (
            <p className="mt-1 text-sm opacity-80">{feedback!.srsHint}</p>
          )}
          <p className="mt-1">{formatMeanings(word.meanings)}</p>
          {word.sentences.length > 0 && (
            <ul className="mt-2 space-y-1 text-left text-sm text-gray-600">
              {word.sentences.map((s) => (
                <li key={s.en}>
                  · {s.en}
                  {s.cn && <span className="text-gray-400">（{s.cn}）</span>}
                </li>
              ))}
            </ul>
          )}
          {feedback!.result === "wrong" && mode === "fill" && !feedback!.overrideDone && (
            <button
              onClick={onOverrideCorrect}
              className="mt-2 rounded border border-gray-400 px-3 py-1 text-sm text-gray-700"
            >
              判我对
            </button>
          )}
        </div>
      )}
    </div>
  );
}

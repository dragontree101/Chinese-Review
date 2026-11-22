"use client";

import { useState } from "react";
import type { QuizItem } from "@/lib/types";
import type { ReviewResult } from "@/lib/types";

interface Props {
  item: QuizItem;
  index: number;
  total: number;
  mode: "choice" | "fill";
  /** 已提交后的反馈；null 表示未作答 */
  feedback: { result: ReviewResult; overrideDone?: boolean } | null;
  onSelectOption: (option: string) => void;
  onSubmitFill: (input: string) => void;
  onUnknown: () => void;
  onOverrideCorrect: () => void;
}

/** 单题卡片：字 + 例句 + 答题 + 即时反馈 */
export default function QuestionCard({
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
  const { word, options, similar } = item;
  const [input, setInput] = useState("");
  const [showSimilar, setShowSimilar] = useState(false);
  const answered = feedback !== null;

  const pronunciation =
    word.keyword !== word.char ? `（${word.keyword.slice(word.char.length)}）` : "";

  const resultStyle = (opt: string): string => {
    if (!answered || mode !== "choice") return "border-gray-300 bg-white hover:bg-gray-50";
    const isAnswer = opt === item.answer;
    const isPicked = opt === feedback!.result;
    void isPicked;
    if (isAnswer) return "border-green-600 bg-green-50 text-green-800";
    return "border-gray-300 bg-white opacity-60";
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          第 {index + 1} / {total} 题
        </span>
        <span>
          {word.grade ?? "无年级"}
          {word.lesson ? ` · ${word.lesson}` : ""}
        </span>
      </div>

      <div className="text-center">
        <div className="text-6xl font-bold tracking-widest">
          {word.char}
          <span className="text-2xl font-normal text-gray-500">{pronunciation}</span>
        </div>
        <p className="mt-3 text-lg">{word.sentence}</p>
        <button
          onClick={() => setShowSimilar((v) => !v)}
          className="mt-2 text-sm text-blue-600"
        >
          {showSimilar ? "收起" : "相同含义的句子"}（{similar.length}）
        </button>
        {showSimilar && (
          <ul className="mt-1 space-y-1 text-left text-sm text-gray-600">
            {similar.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        )}
      </div>

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
        <div className="flex gap-2">
          <input
            value={input}
            disabled={answered}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim() && !answered) onSubmitFill(input);
            }}
            placeholder="输入这句话中该字的含义"
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
            正确含义：<strong>{word.meaning}</strong>
          </p>
          {word.translation && (
            <p className="mt-1 text-sm">译文：{word.translation}</p>
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

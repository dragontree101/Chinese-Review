"use client";

import { useState } from "react";
import type { EQuizRule } from "@/lib/english/types";

export const RULE_LABELS: Array<{ value: EQuizRule; label: string }> = [
  { value: "random", label: "随机" },
  { value: "level", label: "按学段" },
  { value: "initial", label: "按首字母" },
  { value: "weakness", label: "错误率优先（薄弱点）" },
];

export const LEVELS = ["初中", "高中"] as const;
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export interface EReviewConfig {
  rule: EQuizRule;
  value: string;
  mode: "choice" | "fill";
  count: number;
}

interface Props {
  onStart: (config: EReviewConfig) => void;
}

/** 英语复习前的出题设置单 */
export default function EnglishReviewSetup({ onStart }: Props) {
  const [rule, setRule] = useState<EQuizRule>("random");
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"choice" | "fill">("choice");
  const [count, setCount] = useState(10);

  const needsValue = rule === "level" || rule === "initial";

  return (
    <div className="mx-auto max-w-md space-y-5 rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold">开始复习</h2>

      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">出题规则</span>
        <select
          value={rule}
          onChange={(e) => {
            setRule(e.target.value as EQuizRule);
            setValue("");
          }}
          className="w-full rounded border border-gray-300 px-3 py-2"
        >
          {RULE_LABELS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      {needsValue && (
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">
            {rule === "level" ? "选择学段" : "选择首字母"}
          </span>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">请选择</option>
            {(rule === "level" ? LEVELS : LETTERS).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      )}

      <div>
        <span className="mb-1 block text-sm text-gray-600">题型</span>
        <div className="flex gap-2">
          {(
            [
              ["choice", "选择题（英译中）"],
              ["fill", "填空题（中译英）"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded border px-3 py-2 ${
                mode === m
                  ? "border-blue-500 bg-blue-50 font-medium text-blue-700"
                  : "border-gray-300 bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">题目数量</span>
        <input
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(e) =>
            setCount(Math.min(50, Math.max(1, Number(e.target.value) || 10)))
          }
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
      </label>

      <button
        onClick={() => onStart({ rule, value, mode, count })}
        disabled={needsValue && !value.trim()}
        className="w-full rounded bg-blue-600 px-4 py-2.5 font-medium text-white disabled:opacity-40"
      >
        开始
      </button>
    </div>
  );
}

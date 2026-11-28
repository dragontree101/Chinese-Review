"use client";

import { useEffect, useState } from "react";
import CountInput from "./CountInput";
import type { QuizRule } from "@/lib/quiz";

export const RULE_LABELS: Array<{ value: QuizRule; label: string }> = [
  { value: "due", label: "智能复习（到期优先）" },
  { value: "random", label: "随机" },
  { value: "grade", label: "按年级" },
  { value: "initial", label: "按拼音首字母" },
  { value: "keyword", label: "按关键字" },
  { value: "frequency", label: "按频率（多义字优先）" },
  { value: "weakness", label: "错误率优先（薄弱点）" },
];

export const GRADES = ["七年级", "八年级", "九年级", "拓展"] as const;

export interface ReviewConfig {
  rule: QuizRule;
  value: string;
  mode: "choice" | "fill";
  count: number;
}

interface Props {
  onStart: (config: ReviewConfig) => void;
}

/** 复习前的出题设置单 */
export default function ReviewSetup({ onStart }: Props) {
  const [rule, setRule] = useState<QuizRule>("due");
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"choice" | "fill">("choice");
  const [count, setCount] = useState(10);
  const [srsInfo, setSrsInfo] = useState<{
    dueCount: number;
    unlearned: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/srs/progress")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ dueCount: number; unlearned: number }>;
      })
      .then(setSrsInfo)
      .catch(() => setSrsInfo(null));
  }, []);

  const needsValue = rule === "grade" || rule === "initial" || rule === "keyword";

  return (
    <div className="mx-auto max-w-md space-y-5 rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold">开始复习</h2>

      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">出题规则</span>
        <select
          value={rule}
          onChange={(e) => {
            setRule(e.target.value as QuizRule);
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
            {rule === "grade"
              ? "选择年级"
              : rule === "initial"
                ? "输入首字母"
                : "输入关键字（字或含义）"}
          </span>
          {rule === "grade" ? (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="">请选择</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={rule === "initial" ? "A" : "如：兵 / 兵器"}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          )}
        </label>
      )}

      <div>
        <span className="mb-1 block text-sm text-gray-600">题型</span>
        <div className="flex gap-2">
          {(
            [
              ["choice", "选择题"],
              ["fill", "填空题"],
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

      {rule === "due" ? (
        <div className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">
          今日到期 {srsInfo ? srsInfo.dueCount : "…"} 个 · 新词{" "}
          {srsInfo ? srsInfo.unlearned : "…"} 个
        </div>
      ) : (
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">题目数量</span>
          <CountInput value={count} onChange={setCount} />
        </label>
      )}

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

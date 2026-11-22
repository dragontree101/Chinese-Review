"use client";

import type { StatSummary } from "@/lib/types";

interface Props {
  summary: StatSummary;
}

const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;

/** 顶部五张统计卡片 */
export default function StatCards({ summary }: Props) {
  const cards = [
    { label: "正确率", value: pct(summary.accuracy), color: "text-green-600" },
    { label: "错误率", value: pct(summary.errorRate), color: "text-red-600" },
    {
      label: "不知道率",
      value: pct(summary.unknownRate),
      color: "text-gray-600",
    },
    {
      label: "已复习",
      value: `${summary.reviewed}/${summary.total}`,
      color: "text-blue-600",
    },
    {
      label: "答对次数",
      value: String(summary.correct),
      color: "text-blue-600",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg bg-white p-4 text-center shadow">
          <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          <p className="mt-1 text-sm text-gray-500">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

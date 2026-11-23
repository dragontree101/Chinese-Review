"use client";

import type { StatRow } from "@/lib/types";

interface Props {
  byLevel: StatRow[];
  byInitial: StatRow[];
}

const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;

function StatTable({
  title,
  rows,
  showAccuracyAsc,
}: {
  title: string;
  rows: StatRow[];
  showAccuracyAsc?: boolean;
}) {
  const list = showAccuracyAsc
    ? [...rows].sort((a, b) => a.accuracy - b.accuracy)
    : rows;
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-2 text-sm font-medium text-gray-700">{title}</h3>
      {list.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">暂无数据</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-1">{title.includes("学段") ? "学段" : "首字母"}</th>
              <th className="pb-1 text-right">作答</th>
              <th className="pb-1 text-right">对</th>
              <th className="pb-1 text-right">错</th>
              <th className="pb-1 text-right">不知</th>
              <th className="pb-1 text-right">正确率</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.key} className="border-t border-gray-100">
                <td className="py-1.5 font-medium">{r.key}</td>
                <td className="py-1.5 text-right">{r.total}</td>
                <td className="py-1.5 text-right text-green-700">{r.correct}</td>
                <td className="py-1.5 text-right text-red-700">{r.wrong}</td>
                <td className="py-1.5 text-right text-gray-600">{r.unknown}</td>
                <td className="py-1.5 text-right">{pct(r.accuracy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** 英语统计的两个维度表 */
export default function EnglishStatTables({ byLevel, byInitial }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StatTable title="按学段" rows={byLevel} />
      <StatTable title="按首字母（最弱在前）" rows={byInitial} showAccuracyAsc />
    </div>
  );
}

"use client";

import type { StatRow } from "@/lib/types";

interface Props {
  byChar: StatRow[];
  byGrade: StatRow[];
  bySource: StatRow[];
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
              <th className="pb-1">{title.includes("按字") ? "字" : title.includes("年级") ? "年级" : "出处"}</th>
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

/** 三个维度的统计表 */
export default function StatTables({ byChar, byGrade, bySource }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatTable title="按字排行（最弱在前）" rows={byChar} showAccuracyAsc />
      <StatTable title="按年级" rows={byGrade} />
      <StatTable title="按出处" rows={bySource} />
    </div>
  );
}

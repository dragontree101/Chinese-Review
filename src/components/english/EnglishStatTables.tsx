"use client";

import { useState } from "react";
import type { StatRow } from "@/lib/types";
import EnglishWordDetailDialog from "./EnglishWordDetailDialog";

interface Props {
  byLevel: StatRow[];
  byInitial: StatRow[];
  /** 错误单词排行（有答错或「不知道」记录的词，按错误次数降序） */
  byWord: StatRow[];
}

const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;

function keyLabel(title: string): string {
  if (title.includes("学段")) return "学段";
  if (title.includes("首字母")) return "首字母";
  return "单词";
}

function StatTable({
  title,
  rows,
  showAccuracyAsc,
  onSelectWord,
}: {
  title: string;
  rows: StatRow[];
  showAccuracyAsc?: boolean;
  /** 传入后每行可点击，查看单词详情 */
  onSelectWord?: (word: string) => void;
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
              <th className="pb-1">{keyLabel(title)}</th>
              <th className="pb-1 text-right">作答</th>
              <th className="pb-1 text-right">对</th>
              <th className="pb-1 text-right">错</th>
              <th className="pb-1 text-right">不知</th>
              <th className="pb-1 text-right">正确率</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const cell = (
                <>
                  <td className="py-1.5 font-medium">{r.key}</td>
                  <td className="py-1.5 text-right">{r.total}</td>
                  <td className="py-1.5 text-right text-green-700">{r.correct}</td>
                  <td className="py-1.5 text-right text-red-700">{r.wrong}</td>
                  <td className="py-1.5 text-right text-gray-600">{r.unknown}</td>
                  <td className="py-1.5 text-right">{pct(r.accuracy)}</td>
                </>
              );
              if (!onSelectWord) {
                return (
                  <tr key={r.key} className="border-t border-gray-100">
                    {cell}
                  </tr>
                );
              }
              return (
                <tr
                  key={r.key}
                  onClick={() => onSelectWord(r.key)}
                  className="cursor-pointer border-t border-gray-100 hover:bg-blue-50"
                >
                  {cell}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** 英语统计的三个维度表；错误单词表可点击查看详情 */
export default function EnglishStatTables({ byLevel, byInitial, byWord }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <StatTable
          title="错误单词（错误次数最多在前）"
          rows={byWord}
          onSelectWord={setSelected}
        />
        <StatTable title="按学段" rows={byLevel} />
        <StatTable title="按首字母（最弱在前）" rows={byInitial} showAccuracyAsc />
      </div>
      {selected && (
        <EnglishWordDetailDialog
          word={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

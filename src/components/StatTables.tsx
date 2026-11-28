"use client";

import { useState } from "react";
import type { StatRow, WordErrorRow } from "@/lib/types";
import CharDetailDialog from "./CharDetailDialog";
import WordErrorDialog from "./WordErrorDialog";

/** 句子预览：超过 max 字截断加省略号 */
function preview(text: string, max = 18): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

interface Props {
  byChar: StatRow[];
  byGrade: StatRow[];
  bySource: StatRow[];
  /** 错误句子排行（按词条聚合，错误次数最多在前） */
  byWord: WordErrorRow[];
}

const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;

function StatTable({
  title,
  rows,
  showAccuracyAsc,
  onSelectChar,
}: {
  title: string;
  rows: StatRow[];
  showAccuracyAsc?: boolean;
  /** 传入后每行可点击，查看字详情 */
  onSelectChar?: (char: string) => void;
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
              if (!onSelectChar) {
                return (
                  <tr key={r.key} className="border-t border-gray-100">
                    {cell}
                  </tr>
                );
              }
              return (
                <tr
                  key={r.key}
                  onClick={() => onSelectChar(r.key)}
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

/** 三个维度的统计表 + 错误句子排行；按字排行与错误句子排行可点击 */
export default function StatTables({
  byChar,
  byGrade,
  bySource,
  byWord,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<WordErrorRow | null>(
    null,
  );
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <StatTable
          title="按字排行（最弱在前）"
          rows={byChar}
          showAccuracyAsc
          onSelectChar={setSelected}
        />
        <StatTable title="按年级" rows={byGrade} />
        <StatTable title="按出处" rows={bySource} />
      </div>
      <ErrorEntriesTable rows={byWord} onSelectRow={setSelectedError} />
      {selected && (
        <CharDetailDialog char={selected} onClose={() => setSelected(null)} />
      )}
      {selectedError && (
        <WordErrorDialog
          row={selectedError}
          onClose={() => setSelectedError(null)}
        />
      )}
    </>
  );
}

/** 错误句子排行：行 = 字 + 句子预览 + 错误次数，点击看词条详情 */
function ErrorEntriesTable({
  rows,
  onSelectRow,
}: {
  rows: WordErrorRow[];
  onSelectRow: (row: WordErrorRow) => void;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-2 text-sm font-medium text-gray-700">
        错误句子排行（错误次数最多在前，点击查看详情）
      </h3>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">
          暂无错误记录，继续加油
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-1">字</th>
              <th className="pb-1">句子</th>
              <th className="pb-1 text-right">错</th>
              <th className="pb-1 text-right">不知</th>
              <th className="pb-1 text-right">作答</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.wordId}
                onClick={() => onSelectRow(r)}
                className="cursor-pointer border-t border-gray-100 hover:bg-blue-50"
              >
                <td className="py-1.5 font-medium">{r.char}</td>
                <td className="py-1.5 text-gray-600">{preview(r.sentence)}</td>
                <td className="py-1.5 text-right text-red-700">{r.wrong}</td>
                <td className="py-1.5 text-right text-gray-600">{r.unknown}</td>
                <td className="py-1.5 text-right">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

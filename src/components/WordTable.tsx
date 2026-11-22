"use client";

import { useState } from "react";
import type { Word } from "@/lib/types";

interface Props {
  words: Word[];
  total: number;
  page: number;
  pageSize: number;
  onQueryChange: (q: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (w: Word) => void;
}

function EmptyMark({ value }: { value: string | null }) {
  return value ? (
    <>{value}</>
  ) : (
    <span className="text-gray-300">待补</span>
  );
}

/** 词条列表：搜索 + 分页 + 行展开显示相同含义句子入口 */
export default function WordTable({
  words,
  total,
  page,
  pageSize,
  onQueryChange,
  onPageChange,
  onEdit,
}: Props) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onQueryChange(e.target.value);
        }}
        placeholder="搜索字 / 含义 / 例句 / 出处 / 课文 / 年级"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="px-3 py-2">字</th>
              <th className="px-3 py-2">含义</th>
              <th className="px-3 py-2">例句</th>
              <th className="px-3 py-2">出处</th>
              <th className="px-3 py-2">课文</th>
              <th className="px-3 py-2">年级</th>
              <th className="px-3 py-2">翻译</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {words.map((w) => (
              <tr key={w.id} className="border-t border-gray-100 align-top">
                <td className="px-3 py-2 font-semibold">{w.char}</td>
                <td className="max-w-40 px-3 py-2">{w.meaning}</td>
                <td
                  className="max-w-56 cursor-pointer px-3 py-2"
                  onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                  title="点击展开相同含义的句子"
                >
                  {w.sentence}
                  {expanded === w.id && (
                    <span className="mt-1 block text-xs text-gray-400">
                      （详情见编辑对话框中的「相同含义」提示）
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <EmptyMark value={w.source} />
                </td>
                <td className="px-3 py-2">
                  <EmptyMark value={w.lesson} />
                </td>
                <td className="px-3 py-2">
                  <EmptyMark value={w.grade} />
                </td>
                <td className="max-w-40 px-3 py-2">
                  <EmptyMark value={w.translation} />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onEdit(w)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                  >
                    编辑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          共 {total} 条 · 第 {page}/{pages} 页
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            上一页
          </button>
          <button
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

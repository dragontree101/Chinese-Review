"use client";

import { useEffect, useState } from "react";
import type { WordErrorRow, WordWithErrors } from "@/lib/types";
import { keywordReading } from "@/lib/pinyin";

interface Props {
  /** 要查看的错误词条行（来自错误句子排行） */
  row: WordErrorRow;
  onClose: () => void;
}

/** 错误词条详情弹窗：完整词条信息 + 错误摘要 */
export default function WordErrorDialog({ row, onClose }: Props) {
  const [entry, setEntry] = useState<WordWithErrors | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/words?char=${encodeURIComponent(row.char)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`加载失败: ${r.status}`);
        return r.json() as Promise<{ items: WordWithErrors[] }>;
      })
      .then((d) => setEntry(d.items.find((w) => w.id === row.wordId) ?? null))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "加载失败"),
      );
  }, [row.char, row.wordId]);

  // 词条随后被人工变更等极端情形下，回退展示排行行自带数据
  const meaning = entry?.meaning ?? row.meaning;
  const sentence = entry?.sentence ?? row.sentence;
  const keyword = entry?.keyword ?? row.char;
  const translation = entry?.translation ?? null;
  const source = entry?.source ?? null;
  const lesson = entry?.lesson ?? null;
  const grade = entry?.grade ?? null;
  const reading = entry ? keywordReading(keyword, entry.char) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold">{row.char}</h3>
            {reading && (
              <span className="text-sm text-gray-500">读音：{reading}</span>
            )}
          </div>
          <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">
            错 {row.wrong} · 不知 {row.unknown} · 共作答 {row.total}
          </span>
        </div>

        {error ? (
          <p className="mt-4 py-4 text-center text-sm text-red-600">{error}</p>
        ) : (
          <>
            <p className="mt-4 font-medium">{meaning}</p>
            {sentence && <p className="mt-1 text-sm">{sentence}</p>}
            {translation && (
              <p className="mt-1 text-sm text-gray-400">{translation}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[source, lesson, grade].map(
                (tag) =>
                  tag && (
                    <span
                      key={tag}
                      className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {tag}
                    </span>
                  ),
              )}
            </div>
          </>
        )}

        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="rounded bg-blue-600 px-8 py-2 font-medium text-white"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

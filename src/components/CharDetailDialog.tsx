"use client";

import { useEffect, useState } from "react";
import type { Word } from "@/lib/types";

interface Props {
  /** 要查看的字（来自统计页按字排行） */
  char: string;
  onClose: () => void;
}

/** 字详情弹窗：该字下全部词条（含义、例句、白话翻译、课文/年级/出处） */
export default function CharDetailDialog({ char, onClose }: Props) {
  const [items, setItems] = useState<Word[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/words?char=${encodeURIComponent(char)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`加载失败: ${r.status}`);
        return r.json() as Promise<{ items: Word[] }>;
      })
      .then((d) => setItems(d.items))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "加载失败"),
      );
  }, [char]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {error ? (
          <p className="py-6 text-center text-sm text-red-600">{error}</p>
        ) : !items ? (
          <p className="py-6 text-center text-sm text-gray-500">加载中……</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">未找到词条</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <h3 className="text-3xl font-bold">{char}</h3>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                共 {items.length} 条含义
              </span>
            </div>

            <div className="mt-4">
              {items.map((w, i) => (
                <div
                  key={w.id}
                  className={i > 0 ? "mt-4 border-t border-gray-100 pt-4" : ""}
                >
                  {w.keyword !== w.char && (
                    <p className="text-sm text-gray-500">读音：{w.keyword}</p>
                  )}
                  <p className="font-medium">{w.meaning}</p>
                  {w.sentence && (
                    <p className="mt-1 text-sm">{w.sentence}</p>
                  )}
                  {w.translation && (
                    <p className="mt-1 text-sm text-gray-400">
                      {w.translation}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[w.source, w.lesson, w.grade].map(
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
                </div>
              ))}
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

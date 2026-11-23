"use client";

import { useEffect, useState } from "react";
import { formatMeanings } from "@/lib/english/quiz";
import type { EnglishWord } from "@/lib/english/types";

interface Props {
  /** 要查看的单词（来自错误单词排行表） */
  word: string;
  onClose: () => void;
}

/** 错误单词详情弹窗：释义 + 例句 + 短语 */
export default function EnglishWordDetailDialog({ word, onClose }: Props) {
  const [detail, setDetail] = useState<EnglishWord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/english/words/${encodeURIComponent(word)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`加载失败: ${r.status}`);
        return r.json() as Promise<EnglishWord>;
      })
      .then(setDetail)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "加载失败"),
      );
  }, [word]);

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
        ) : !detail ? (
          <p className="py-6 text-center text-sm text-gray-500">加载中……</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <h3 className="text-2xl font-bold">{detail.word}</h3>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {detail.level}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {detail.usphone && <span className="mr-3">美 /{detail.usphone}/</span>}
              {detail.ukphone && <span>英 /{detail.ukphone}/</span>}
            </p>

            <div className="mt-4">
              <h4 className="mb-1 text-sm font-medium text-gray-700">释义</h4>
              <p className="text-base">{formatMeanings(detail.meanings)}</p>
            </div>

            {detail.sentences.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-1 text-sm font-medium text-gray-700">例句</h4>
                <ul className="space-y-1.5 text-sm">
                  {detail.sentences.map((s) => (
                    <li key={s.en}>
                      · {s.en}
                      {s.cn && <span className="text-gray-400">（{s.cn}）</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.phrases.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-1 text-sm font-medium text-gray-700">短语</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {detail.phrases.map((p) => (
                    <li key={p.en}>
                      · {p.en}
                      {p.cn && <span className="text-gray-400">（{p.cn}）</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

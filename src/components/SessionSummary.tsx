"use client";

import Link from "next/link";

interface Props {
  correct: number;
  wrong: number;
  unknown: number;
  total: number;
  /** 「查看统计」跳转链接，默认文言文统计页 */
  statsHref?: string;
  /** SRS 小结（升级/归零/毕业词数），无则不显示 */
  srsSummary?: { promoted: number; demoted: number; graduated: number };
  onRestart: () => void;
}

/** 一轮复习结束的小结 */
export default function SessionSummary({
  correct,
  wrong,
  unknown,
  total,
  statsHref = "/stats",
  srsSummary,
  onRestart,
}: Props) {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg bg-white p-8 text-center shadow">
      <h2 className="text-xl font-semibold">本轮完成</h2>
      <p className="text-sm text-gray-500">共 {total} 题</p>
      <div className="flex justify-center gap-6 py-4">
        <div>
          <p className="text-3xl font-bold text-green-600">{correct}</p>
          <p className="text-sm text-gray-500">答对</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-red-600">{wrong}</p>
          <p className="text-sm text-gray-500">答错</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-600">{unknown}</p>
          <p className="text-sm text-gray-500">不知道</p>
        </div>
      </div>
      {srsSummary && (
        <p className="text-sm text-gray-500">
          本次升级 {srsSummary.promoted} · 归零 {srsSummary.demoted} · 毕业{" "}
          {srsSummary.graduated}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onRestart}
          className="flex-1 rounded bg-blue-600 px-4 py-2.5 font-medium text-white"
        >
          再来一轮
        </button>
        <Link
          href={statsHref}
          className="flex-1 rounded border border-gray-300 px-4 py-2.5 leading-8 text-gray-700"
        >
          查看统计
        </Link>
      </div>
    </div>
  );
}

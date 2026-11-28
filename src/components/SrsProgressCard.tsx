"use client";

import type { SrsProgress } from "@/lib/srs";

interface Props {
  /** null 时显示加载占位 */
  progress: SrsProgress | null;
}

/** 七个等级的展示标签（与 SRS_INTERVALS 对应） */
const LEVEL_LABELS = ["今日", "1 天", "2 天", "4 天", "7 天", "15 天", "毕业"];

/** 掌握度分桶卡片：未学/学习中/毕业 + 七级条形分布 */
export default function SrsProgressCard({ progress }: Props) {
  const max = progress ? Math.max(1, ...progress.byLevel) : 1;
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-3 text-sm font-medium text-gray-700">掌握进度</h3>
      {!progress ? (
        <p className="py-4 text-center text-sm text-gray-400">加载中……</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-500">
                {progress.unlearned}
              </p>
              <p className="text-xs text-gray-500">未学</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {progress.learning}
              </p>
              <p className="text-xs text-gray-500">学习中</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {progress.graduated}
              </p>
              <p className="text-xs text-gray-500">已毕业</p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            {progress.byLevel.map((n, level) => (
              <div key={level} className="flex items-center gap-2 text-xs">
                <span className="w-10 shrink-0 text-gray-500">
                  {LEVEL_LABELS[level]}
                </span>
                <div className="h-3 flex-1 rounded bg-gray-100">
                  <div
                    className={`h-3 rounded ${level === 6 ? "bg-green-500" : "bg-blue-400"}`}
                    style={{ width: `${(n / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-gray-600">{n}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

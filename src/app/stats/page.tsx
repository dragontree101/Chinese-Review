"use client";

import { useEffect, useState } from "react";
import StatCards from "@/components/StatCards";
import TrendChart from "@/components/TrendChart";
import StatTables from "@/components/StatTables";
import type { StatRow, StatSummary, TrendRow, WordErrorRow } from "@/lib/types";

interface StatsData {
  summary: StatSummary;
  byGrade: StatRow[];
  bySource: StatRow[];
  byChar: StatRow[];
  byWord: WordErrorRow[];
  trend: TrendRow[];
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => {
        if (!r.ok) throw new Error(`加载失败: ${r.status}`);
        return r.json() as Promise<StatsData>;
      })
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "加载失败"),
      );
  }, []);

  if (error) return <p className="py-10 text-center text-red-600">{error}</p>;
  if (!data) return <p className="py-10 text-center text-gray-500">加载中……</p>;

  return (
    <div className="space-y-4">
      <StatCards summary={data.summary} />
      <TrendChart trend={data.trend} />
      <StatTables
        byChar={data.byChar}
        byGrade={data.byGrade}
        bySource={data.bySource}
        byWord={data.byWord}
      />
    </div>
  );
}

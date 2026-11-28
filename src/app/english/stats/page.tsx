"use client";

import { useEffect, useState } from "react";
import StatCards from "@/components/StatCards";
import TrendChart from "@/components/TrendChart";
import EnglishStatTables from "@/components/english/EnglishStatTables";
import SrsProgressCard from "@/components/SrsProgressCard";
import type { SrsProgress } from "@/lib/srs";
import type { StatRow, StatSummary, TrendRow } from "@/lib/types";

interface StatsData {
  summary: StatSummary;
  byLevel: StatRow[];
  byInitial: StatRow[];
  byWord: StatRow[];
  trend: TrendRow[];
}

export default function EnglishStatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [srs, setSrs] = useState<SrsProgress | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/english/stats")
      .then((r) => {
        if (!r.ok) throw new Error(`加载失败: ${r.status}`);
        return r.json() as Promise<StatsData>;
      })
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "加载失败"),
      );
    fetch("/api/english/srs/progress")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<SrsProgress>;
      })
      .then(setSrs)
      .catch(() => setSrs(null));
  }, []);

  if (error) return <p className="py-10 text-center text-red-600">{error}</p>;
  if (!data) return <p className="py-10 text-center text-gray-500">加载中……</p>;

  return (
    <div className="space-y-4">
      <StatCards summary={data.summary} />
      <TrendChart trend={data.trend} />
      <EnglishStatTables
        byLevel={data.byLevel}
        byInitial={data.byInitial}
        byWord={data.byWord}
      />
      <SrsProgressCard progress={srs} />
    </div>
  );
}

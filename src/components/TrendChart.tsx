"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendRow } from "@/lib/types";

interface Props {
  trend: TrendRow[];
}

/** 近 7 天作答趋势折线图 */
export default function TrendChart({ trend }: Props) {
  if (trend.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 text-center text-gray-400 shadow">
        近 7 天还没有作答记录
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-2 text-sm font-medium text-gray-700">近 7 天趋势</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Legend />
            <Line
              name="答对"
              dataKey="correct"
              stroke="#16a34a"
              strokeWidth={2}
            />
            <Line
              name="答错"
              dataKey="wrong"
              stroke="#dc2626"
              strokeWidth={2}
            />
            <Line
              name="不知道"
              dataKey="unknown"
              stroke="#6b7280"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

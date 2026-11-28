import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  getSummary,
  getByGrade,
  getBySource,
  getByChar,
  getTrend,
  getWrongEntries,
} from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/stats 总体 + 分维度 + 趋势 */
export function GET(): NextResponse {
  const db = getDb();
  return NextResponse.json({
    summary: getSummary(db),
    byGrade: getByGrade(db),
    bySource: getBySource(db),
    byChar: getByChar(db),
    byWord: getWrongEntries(db, 20),
    trend: getTrend(db, 7),
  });
}

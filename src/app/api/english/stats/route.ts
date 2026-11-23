import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  getSummary,
  getByLevel,
  getByInitial,
  getWrongWords,
  getTrend,
} from "@/lib/english/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/english/stats 总体 + 分维度 + 趋势 */
export function GET(): NextResponse {
  const db = getDb();
  return NextResponse.json({
    summary: getSummary(db),
    byLevel: getByLevel(db),
    byInitial: getByInitial(db),
    byWord: getWrongWords(db, 20),
    trend: getTrend(db, 7),
  });
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSrsProgress } from "@/lib/srs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/english/srs/progress 掌握度分桶 + 今日到期数（复习设置页与统计页共用） */
export function GET(): NextResponse {
  const db = getDb();
  return NextResponse.json(getSrsProgress(db, "e_words", "e_review_logs"));
}

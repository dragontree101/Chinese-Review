import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createWord, type WordInput } from "@/lib/words";
import type { Word } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/words?page=1&pageSize=20&q= 关键字搜索（字/含义/例句/出处/课文/年级） */
export function GET(req: NextRequest): NextResponse {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "20") || 20));
  const q = (sp.get("q") ?? "").trim();

  const db = getDb();
  const where = q
    ? `WHERE char LIKE @q OR meaning LIKE @q OR sentence LIKE @q
         OR source LIKE @q OR lesson LIKE @q OR grade LIKE @q OR keyword LIKE @q`
    : "";
  const params = { q: `%${q}%` };
  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM words ${where}`).get(params) as {
      c: number;
    }
  ).c;
  const items = db
    .prepare(
      `SELECT * FROM words ${where}
       ORDER BY id ASC LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize }) as unknown as Word[];
  return NextResponse.json({ items, total });
}

/** POST /api/words 手动添加词条（char/meaning 必填） */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as WordInput;
  if (!body.char?.trim() || !body.meaning?.trim()) {
    return NextResponse.json({ error: "字与含义为必填" }, { status: 400 });
  }
  const word = createWord(getDb(), body);
  return NextResponse.json({ item: word }, { status: 201 });
}

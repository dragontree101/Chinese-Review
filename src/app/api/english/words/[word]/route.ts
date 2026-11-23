import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { rowToEnglishWord } from "@/lib/english/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/english/words/[word] 按单词取详情（释义/例句/短语） */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ word: string }> },
): Promise<NextResponse> {
  const { word } = await params;
  const target = decodeURIComponent(word).trim();
  if (!target) {
    return NextResponse.json({ error: "缺少 word" }, { status: 400 });
  }
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM e_words WHERE word = ?")
    .get(target) as Record<string, unknown> | undefined;
  if (!row) {
    return NextResponse.json({ error: "词条不存在" }, { status: 404 });
  }
  return NextResponse.json(rowToEnglishWord(row));
}

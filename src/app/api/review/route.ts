import { NextRequest, NextResponse } from "next/server";
import { getDb, rowToWord } from "@/lib/db";
import { judgeFill } from "@/lib/quiz";
import type { ReviewMode, ReviewResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReviewBody {
  wordId?: number;
  mode?: ReviewMode;
  /** 客户端给出的结果（选择题/不知道/「判我对」覆盖后的重判） */
  result?: ReviewResult;
  /** 填空题输入（由服务端判定结果） */
  input?: string;
  /** 「判我对」：就地覆盖原记录 */
  overrideLogId?: number;
}

const MODES: ReviewMode[] = ["choice", "fill"];
const RESULTS: ReviewResult[] = ["correct", "wrong", "unknown"];

/** POST /api/review 写作答记录；填空可传 input 由服务端判定；支持判我对覆盖 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as ReviewBody;
  const db = getDb();

  if (body.overrideLogId !== undefined) {
    const info = db
      .prepare(
        `UPDATE review_logs SET result='correct', overridden=1 WHERE id=@id`,
      )
      .run({ id: body.overrideLogId });
    if (info.changes === 0) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, result: "correct" });
  }

  if (!body.wordId || !body.mode || !MODES.includes(body.mode)) {
    return NextResponse.json({ error: "缺少 wordId/mode" }, { status: 400 });
  }

  let result = body.result;
  if (body.input !== undefined && body.result === undefined) {
    const row = db
      .prepare("SELECT * FROM words WHERE id = ?")
      .get(body.wordId) as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json({ error: "词条不存在" }, { status: 404 });
    }
    result = judgeFill(rowToWord(row).meaning, body.input) ? "correct" : "wrong";
  }
  if (!result || !RESULTS.includes(result)) {
    return NextResponse.json({ error: "无效 result" }, { status: 400 });
  }

  const info = db
    .prepare(
      `INSERT INTO review_logs (wordId, mode, result, userAnswer, overridden, createdAt)
       VALUES (@wordId, @mode, @result, @userAnswer, 0, @createdAt)`,
    )
    .run({
      wordId: body.wordId,
      mode: body.mode,
      result,
      userAnswer: body.input ?? null,
      createdAt: new Date().toISOString(),
    });
  return NextResponse.json({
    ok: true,
    result,
    logId: Number(info.lastInsertRowid),
  });
}

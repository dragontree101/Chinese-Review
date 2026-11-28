import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { rowToEnglishWord } from "@/lib/english/types";
import { judgeEnglishFill } from "@/lib/english/quiz";
import { getSrsStateForWord, SRS_INTERVALS } from "@/lib/srs";
import type { EReviewMode, EReviewResult } from "@/lib/english/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 组装响应携带的 SRS 状态（服务端权威，前端不复制间隔表逻辑） */
function srsPayload(
  db: ReturnType<typeof getDb>,
  wordId: number,
  prevLevel: number,
): {
  prevLevel: number;
  level: number;
  graduated: boolean;
  nextIntervalDays: number | null;
} {
  const next = getSrsStateForWord(db, "e_review_logs", wordId);
  return {
    prevLevel,
    level: next.level,
    graduated: next.graduated,
    nextIntervalDays: next.graduated ? null : SRS_INTERVALS[next.level],
  };
}

interface ReviewBody {
  wordId?: number;
  mode?: EReviewMode;
  /** 客户端给出的结果（选择题/不知道/「判我对」覆盖后的重判） */
  result?: EReviewResult;
  /** 填空题输入（由服务端判定结果） */
  input?: string;
  /** 「判我对」：就地覆盖原记录 */
  overrideLogId?: number;
}

const MODES: EReviewMode[] = ["choice", "fill"];
const RESULTS: EReviewResult[] = ["correct", "wrong", "unknown"];

/** POST /api/english/review 写作答记录；填空可传 input 由服务端判定；支持判我对覆盖 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as ReviewBody;
  const db = getDb();

  if (body.overrideLogId !== undefined) {
    const row = db
      .prepare("SELECT wordId FROM e_review_logs WHERE id = ?")
      .get(body.overrideLogId) as { wordId: number } | undefined;
    if (!row) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    const prevLevel = getSrsStateForWord(db, "e_review_logs", row.wordId).level;
    const info = db
      .prepare(
        `UPDATE e_review_logs SET result='correct', overridden=1 WHERE id=@id`,
      )
      .run({ id: body.overrideLogId });
    if (info.changes === 0) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      result: "correct",
      srs: srsPayload(db, row.wordId, prevLevel),
    });
  }

  if (!body.wordId || !body.mode || !MODES.includes(body.mode)) {
    return NextResponse.json({ error: "缺少 wordId/mode" }, { status: 400 });
  }

  let result = body.result;
  let correctWord: string | undefined;
  if (body.input !== undefined && body.result === undefined) {
    const row = db
      .prepare("SELECT * FROM e_words WHERE id = ?")
      .get(body.wordId) as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json({ error: "词条不存在" }, { status: 404 });
    }
    const w = rowToEnglishWord(row);
    // 填空题响应带正确拼写（出题时已脱敏，前端作答后展示用）
    correctWord = w.word;
    result = judgeEnglishFill(w, body.input) ? "correct" : "wrong";
  }
  if (!result || !RESULTS.includes(result)) {
    return NextResponse.json({ error: "无效 result" }, { status: 400 });
  }

  const prevLevel = getSrsStateForWord(db, "e_review_logs", body.wordId).level;
  const info = db
    .prepare(
      `INSERT INTO e_review_logs (wordId, mode, result, userAnswer, overridden, createdAt)
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
    ...(correctWord !== undefined ? { correctWord } : {}),
    srs: srsPayload(db, body.wordId, prevLevel),
  });
}

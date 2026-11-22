import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Grade, WordPatch } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRADES: Grade[] = ["七年级", "八年级", "九年级", "拓展"];

/** PATCH /api/words/[id] 编辑词条字段（translation/lesson/grade/source/meaning） */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const wordId = Number(id);
  if (!Number.isInteger(wordId)) {
    return NextResponse.json({ error: "无效 id" }, { status: 400 });
  }
  const body = (await req.json()) as WordPatch;

  if (body.grade !== undefined && body.grade !== null && !GRADES.includes(body.grade)) {
    return NextResponse.json({ error: "无效年级" }, { status: 400 });
  }
  if (body.meaning !== undefined && !body.meaning.trim()) {
    return NextResponse.json({ error: "含义不能为空" }, { status: 400 });
  }

  const fields: Partial<WordPatch> = {};
  for (const key of ["translation", "lesson", "grade", "source", "meaning"] as const) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return NextResponse.json({ error: "无可更新字段" }, { status: 400 });
  }

  const db = getDb();
  const setSql = keys.map((k) => `${k} = @${k}`).join(", ");
  const info = db
    .prepare(
      `UPDATE words SET ${setSql}, updatedAt = @updatedAt WHERE id = @id`,
    )
    .run({ ...fields, updatedAt: new Date().toISOString(), id: wordId });
  if (info.changes === 0) {
    return NextResponse.json({ error: "词条不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

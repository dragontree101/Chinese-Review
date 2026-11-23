import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { rowToEnglishWord } from "@/lib/english/types";
import { pickWords, pickDistractors, buildChoiceQuestion } from "@/lib/english/quiz";
import type { EQuizItem, EQuizRule, EnglishWord } from "@/lib/english/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RULES: EQuizRule[] = ["random", "level", "initial", "weakness"];

/** GET /api/english/quiz?rule=random&value=&count=10&mode=choice|fill */
export function GET(req: NextRequest): NextResponse {
  const sp = req.nextUrl.searchParams;
  const rule = (sp.get("rule") ?? "random") as EQuizRule;
  if (!RULES.includes(rule)) {
    return NextResponse.json({ error: "无效出题规则" }, { status: 400 });
  }
  const mode = sp.get("mode") === "fill" ? "fill" : "choice";
  const value = sp.get("value") ?? "";
  const count = Math.min(50, Math.max(1, Number(sp.get("count") ?? "10") || 10));

  const db = getDb();
  const words = pickWords(db, rule, value, count);
  const all = (
    db.prepare("SELECT * FROM e_words").all() as unknown as Array<
      Record<string, unknown>
    >
  ).map(rowToEnglishWord) as EnglishWord[];

  const questions: EQuizItem[] = words.map((w) => {
    if (mode === "fill") {
      return { word: w, options: null, answer: null };
    }
    const q = buildChoiceQuestion(w, pickDistractors(all, w, 3));
    return { word: w, options: q.options, answer: q.answer };
  });

  return NextResponse.json({ questions });
}

import { NextRequest, NextResponse } from "next/server";
import { getDb, rowToWord } from "@/lib/db";
import { pickWords, pickDistractors, buildChoiceQuestion } from "@/lib/quiz";
import { groupByCharMeaning } from "@/lib/import-helpers";
import type { QuizRule } from "@/lib/quiz";
import type { Word } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RULES: QuizRule[] = [
  "random",
  "grade",
  "initial",
  "keyword",
  "frequency",
  "weakness",
];

interface QuizResponseItem {
  word: Word;
  /** 选择题选项（fill 模式为 null） */
  options: string[] | null;
  /** 选择题正确答案（fill 模式为 null，避免前端泄题） */
  answer: string | null;
  /** 相同含义的其他例句 */
  similar: string[];
}

/** GET /api/quiz?rule=random&value=&count=10&mode=choice|fill */
export function GET(req: NextRequest): NextResponse {
  const sp = req.nextUrl.searchParams;
  const rule = (sp.get("rule") ?? "random") as QuizRule;
  if (!RULES.includes(rule)) {
    return NextResponse.json({ error: "无效出题规则" }, { status: 400 });
  }
  const mode = sp.get("mode") === "fill" ? "fill" : "choice";
  const value = sp.get("value") ?? "";
  const count = Math.min(50, Math.max(1, Number(sp.get("count") ?? "10") || 10));

  const db = getDb();
  const words = pickWords(db, rule, value, count);
  const all = db.prepare("SELECT * FROM words").all() as unknown as Word[];
  const similarMap = groupByCharMeaning(
    all.map((w) => ({
      id: w.id,
      char: w.char,
      meaning: w.meaning,
      sentence: w.sentence,
    })),
  );

  const questions: QuizResponseItem[] = words.map((w) => {
    const row = db.prepare("SELECT * FROM words WHERE id = ?").get(w.id) as
      | Record<string, unknown>
      | undefined;
    const word = row ? rowToWord(row) : w;
    const similar = similarMap[w.id] ?? [];
    if (mode === "fill") {
      return { word, options: null, answer: null, similar };
    }
    const q = buildChoiceQuestion(word, pickDistractors(all, word, 3));
    return { word, options: q.options, answer: q.answer, similar };
  });

  return NextResponse.json({ questions });
}

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { parseSource } from "../lib/import-helpers";
import { lookupTextbook } from "../lib/textbook-map";
import { createSchema } from "../lib/db";

/** default.json 原始条目 */
interface RawEntry {
  id: number;
  char: string;
  keyword: string;
  meaning: string;
  sentence: string;
  familiarity: number;
}

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "data", "app.db");
const TRANSLATIONS_PATH = path.join(ROOT, "data", "translations.json");

function loadTranslations(): Record<string, string> {
  if (!existsSync(TRANSLATIONS_PATH)) return {};
  return JSON.parse(readFileSync(TRANSLATIONS_PATH, "utf-8")) as Record<
    string,
    string
  >;
}

function main(): void {
  const rawPath = path.join(ROOT, "default.json");
  const raw = JSON.parse(readFileSync(rawPath, "utf-8")) as RawEntry[];
  const translations = loadTranslations();

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec("DROP TABLE IF EXISTS review_logs; DROP TABLE IF EXISTS words;");
  createSchema(db);

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO words (id, char, keyword, meaning, sentence, source, translation, lesson, grade, familiarity, createdAt, updatedAt)
    VALUES (@id, @char, @keyword, @meaning, @sentence, @source, @translation, @lesson, @grade, @familiarity, @createdAt, @updatedAt)
  `);

  const tx = db.transaction((entries: RawEntry[]) => {
    for (const e of entries) {
      const info = lookupTextbook(e.sentence);
      insert.run({
        id: e.id,
        char: e.char,
        keyword: e.keyword ?? e.char,
        meaning: e.meaning,
        sentence: e.sentence,
        source: parseSource(e.sentence),
        translation: translations[e.sentence] ?? null,
        lesson: info?.lesson ?? null,
        grade: info?.grade ?? null,
        familiarity: e.familiarity ?? 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
  tx(raw);

  const total = raw.length;
  const withSource = raw.filter((e) => parseSource(e.sentence) !== null).length;
  const withTranslation = raw.filter(
    (e) => translations[e.sentence] !== undefined,
  ).length;
  const withGrade = raw.filter((e) => lookupTextbook(e.sentence)?.grade).length;

  const lines = [
    `总条数: ${total}`,
    `source 解析率: ${((withSource / total) * 100).toFixed(1)}% (${withSource}/${total})`,
    `年级覆盖: ${((withGrade / total) * 100).toFixed(1)}% (${withGrade}/${total})`,
    `翻译初稿覆盖率: ${((withTranslation / total) * 100).toFixed(1)}% (${withTranslation}/${total})`,
  ];
  for (const l of lines) console.log(l);
  db.close();
}

main();

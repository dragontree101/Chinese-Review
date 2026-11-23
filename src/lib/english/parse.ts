import type { EnglishLevel, Meaning, Phrase, SentencePair } from "./types";

/** 词库 jsonl 一行解析出的原始条目（仅保留导入所需字段） */
export interface RawVocabEntry {
  bookId: string;
  headWord: string;
  usphone: string | null;
  ukphone: string | null;
  trans: Array<{ pos: string; tranCn: string }>;
  sentences: Array<{ sContent: string; sCn: string }>;
  phrases: Array<{ pContent: string; pCn: string }>;
}

/** 合并去重后的词条（待写入 e_words） */
export interface ParsedWord {
  word: string;
  level: EnglishLevel;
  usphone: string | null;
  ukphone: string | null;
  meanings: Meaning[];
  sentences: SentencePair[];
  phrases: Phrase[];
}

/** 词库行的顶层 JSON 形状 */
interface RawLine {
  headWord?: unknown;
  bookId?: unknown;
  content?: {
    word?: {
      content?: {
        usphone?: unknown;
        ukphone?: unknown;
        trans?: unknown;
        sentence?: { sentences?: unknown };
        phrase?: { phrases?: unknown };
      };
    };
  };
}

/** 解析 jsonl 一行；空行、坏 JSON、结构缺失返回 null */
export function parseLine(line: string): RawVocabEntry | null {
  if (!line.trim()) return null;
  let raw: RawLine;
  try {
    raw = JSON.parse(line) as RawLine;
  } catch {
    return null;
  }
  const c = raw.content?.word?.content;
  if (typeof raw.headWord !== "string" || typeof raw.bookId !== "string" || !c) {
    return null;
  }
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v : null;
  const trans = Array.isArray(c.trans)
    ? c.trans
        .map(
          (t): { pos: string; tranCn: string } | null => {
            const e = t as { pos?: unknown; tranCn?: unknown };
            return typeof e.tranCn === "string"
              ? { pos: typeof e.pos === "string" ? e.pos : "", tranCn: e.tranCn }
              : null;
          },
        )
        .filter((t): t is { pos: string; tranCn: string } => t !== null)
    : [];
  const sentences = Array.isArray(c.sentence?.sentences)
    ? c.sentence!.sentences.map((s): { sContent: string; sCn: string } => {
        const e = s as { sContent?: unknown; sCn?: unknown };
        return {
          sContent: typeof e.sContent === "string" ? e.sContent : "",
          sCn: typeof e.sCn === "string" ? e.sCn : "",
        };
      })
    : [];
  const phrases = Array.isArray(c.phrase?.phrases)
    ? c.phrase!.phrases.map((p): { pContent: string; pCn: string } => {
        const e = p as { pContent?: unknown; pCn?: unknown };
        return {
          pContent: typeof e.pContent === "string" ? e.pContent : "",
          pCn: typeof e.pCn === "string" ? e.pCn : "",
        };
      })
    : [];
  return {
    bookId: raw.bookId,
    headWord: raw.headWord,
    usphone: str(c.usphone),
    ukphone: str(c.ukphone),
    trans,
    sentences,
    phrases,
  };
}

/** 学段推导：任一来源书编号以 ChuZhong 开头 → 初中，否则高中 */
export function levelFromBookIds(bookIds: string[]): EnglishLevel {
  return bookIds.some((b) => b.startsWith("ChuZhong")) ? "初中" : "高中";
}

/** 合并同一单词的多条来源行：释义/例句/短语并集去重，保持首次出现顺序 */
export function mergeWord(
  headWord: string,
  entries: RawVocabEntry[],
): ParsedWord | null {
  const meanings: Meaning[] = [];
  const seenMeaning = new Set<string>();
  const sentences: SentencePair[] = [];
  const seenSentence = new Set<string>();
  const phrases: Phrase[] = [];
  const seenPhrase = new Set<string>();
  let usphone: string | null = null;
  let ukphone: string | null = null;

  for (const e of entries) {
    for (const t of e.trans) {
      const tran = t.tranCn.trim();
      if (!tran) continue;
      const key = `${t.pos}|${tran}`;
      if (!seenMeaning.has(key)) {
        seenMeaning.add(key);
        meanings.push({ pos: t.pos, tran });
      }
    }
    for (const s of e.sentences) {
      const en = s.sContent.trim();
      if (!en || seenSentence.has(en)) continue;
      seenSentence.add(en);
      sentences.push({ en, cn: s.sCn.trim() });
    }
    for (const p of e.phrases) {
      const en = p.pContent.trim();
      if (!en || seenPhrase.has(en)) continue;
      seenPhrase.add(en);
      phrases.push({ en, cn: p.pCn.trim() });
    }
    usphone = usphone ?? e.usphone;
    ukphone = ukphone ?? e.ukphone;
  }

  if (meanings.length === 0) return null;
  return {
    word: headWord,
    level: levelFromBookIds(entries.map((e) => e.bookId)),
    usphone,
    ukphone,
    meanings,
    sentences,
    phrases,
  };
}

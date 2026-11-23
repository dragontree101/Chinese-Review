/** 重导前的旧作答记录行（不含 id，迁移后由新表自增） */
export interface OldLogRow {
  wordId: number;
  mode: string;
  result: string;
  userAnswer: string | null;
  overridden: number;
  createdAt: string;
}

/**
 * 重灌词库时按词名迁移作答记录：
 * 旧 wordId → 旧词名 → 新 id；词条已不存在或映射缺失的日志丢弃。
 */
export function remapReviewLogs(
  oldLogs: OldLogRow[],
  oldIdToWord: Map<number, string>,
  newWordToId: Map<string, number>,
): OldLogRow[] {
  const result: OldLogRow[] = [];
  for (const l of oldLogs) {
    const word = oldIdToWord.get(l.wordId);
    if (word === undefined) continue;
    const newId = newWordToId.get(word);
    if (newId === undefined) continue;
    result.push({ ...l, wordId: newId });
  }
  return result;
}

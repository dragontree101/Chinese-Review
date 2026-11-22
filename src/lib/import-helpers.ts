/**
 * 例句工具：出处解析、同字同含义分组
 */

/** 从例句解析出处：取句末括号内容。无括号/括号内无书名返回 null；成语返回「成语」 */
export function parseSource(sentence: string): string | null {
  const m = sentence.match(/[（(]([^（）()]*)[）)]\s*$/);
  if (!m) return null;
  const inner = m[1];
  if (inner.includes("成语")) return "成语";
  // 必须含书名号（「（词语）」这类括注不算出处）
  if (!/[《〈]/.test(inner)) return null;
  // 归一化：剥离书名号与空白，保留后缀（如〈指南录〉后序 → 指南录后序）
  return inner.replace(/[《》〈〉\s]/g, "");
}

/** 同字同含义分组：id → 其他同组例句列表（排除自身，保持插入顺序） */
export function groupByCharMeaning(
  rows: Array<{ id: number; char: string; meaning: string; sentence: string }>,
): Record<number, string[]> {
  const groups = new Map<string, string[]>();
  for (const r of rows) {
    const key = `${r.char}\u0000${r.meaning}`;
    const list = groups.get(key);
    if (list) list.push(r.sentence);
    else groups.set(key, [r.sentence]);
  }
  const result: Record<number, string[]> = {};
  for (const r of rows) {
    const key = `${r.char}\u0000${r.meaning}`;
    result[r.id] = (groups.get(key) ?? []).filter((s) => s !== r.sentence);
  }
  return result;
}

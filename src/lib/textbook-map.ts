import type { Grade } from "./types";
import { parseSource } from "./import-helpers";

/**
 * 统编初中语文教材文言篇目映射（键为归一化后的书名）。
 * 未收录的篇目一律归入「拓展」档（lesson 即篇目名）。
 */
const JUNIOR_MAP: Record<string, { grade: Grade; lesson: string }> = {
  // 七年级
  论语: { grade: "七年级", lesson: "论语" },
  孙权劝学: { grade: "七年级", lesson: "孙权劝学" },
  木兰诗: { grade: "七年级", lesson: "木兰诗" },
  卖油翁: { grade: "七年级", lesson: "卖油翁" },
  陋室铭: { grade: "七年级", lesson: "陋室铭" },
  爱莲说: { grade: "七年级", lesson: "爱莲说" },
  狼: { grade: "七年级", lesson: "狼" },
  卖炭翁: { grade: "七年级", lesson: "卖炭翁" },
  为学: { grade: "七年级", lesson: "为学" },
  扁鹊见蔡桓公: { grade: "七年级", lesson: "扁鹊见蔡桓公" },
  口技: { grade: "七年级", lesson: "口技" },
  诫子书: { grade: "七年级", lesson: "诫子书" },
  河中石兽: { grade: "七年级", lesson: "河中石兽" },
  // 八年级
  三峡: { grade: "八年级", lesson: "三峡" },
  与朱元思书: { grade: "八年级", lesson: "与朱元思书" },
  记承天寺夜游: { grade: "八年级", lesson: "记承天寺夜游" },
  愚公移山: { grade: "八年级", lesson: "愚公移山" },
  桃花源记: { grade: "八年级", lesson: "桃花源记" },
  小石潭记: { grade: "八年级", lesson: "小石潭记" },
  核舟记: { grade: "八年级", lesson: "核舟记" },
  大道之行也: { grade: "八年级", lesson: "大道之行也" },
  周亚夫军细柳: { grade: "八年级", lesson: "周亚夫军细柳" },
  答谢中书书: { grade: "八年级", lesson: "答谢中书书" },
  // 九年级
  岳阳楼记: { grade: "九年级", lesson: "岳阳楼记" },
  醉翁亭记: { grade: "九年级", lesson: "醉翁亭记" },
  湖心亭看雪: { grade: "九年级", lesson: "湖心亭看雪" },
  出师表: { grade: "九年级", lesson: "出师表" },
  鱼我所欲也: { grade: "九年级", lesson: "鱼我所欲也" },
  送东阳马生序: { grade: "九年级", lesson: "送东阳马生序" },
  曹刿论战: { grade: "九年级", lesson: "曹刿论战" },
  邹忌讽齐王纳谏: { grade: "九年级", lesson: "邹忌讽齐王纳谏" },
  陈涉世家: { grade: "九年级", lesson: "陈涉世家" },
  隆中对: { grade: "九年级", lesson: "隆中对" },
  孟子: { grade: "九年级", lesson: "孟子" },
  左传: { grade: "九年级", lesson: "左传" },
};

export interface TextbookInfo {
  grade: Grade | null;
  lesson: string | null;
}

/**
 * 由例句推断年级与课文：
 * - 初中篇目 → 对应学段与课文（支持「史记·陈涉世家」式前缀）
 * - 成语/词语/无出处 → grade 与 lesson 均为 null
 * - 其余有出处的 → 「拓展」档，lesson 为篇目名
 */
export function lookupTextbook(sentence: string): TextbookInfo | null {
  const source = parseSource(sentence);
  if (source === null) return null;
  if (source === "成语") return { grade: null, lesson: null };
  const hit = JUNIOR_MAP[source] ?? JUNIOR_MAP[source.replace(/^史记·/, "")];
  if (hit) return { grade: hit.grade, lesson: hit.lesson };
  return { grade: "拓展", lesson: source };
}

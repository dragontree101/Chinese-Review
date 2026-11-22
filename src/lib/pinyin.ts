import { pinyin } from "pinyin-pro";
import type { Word } from "./types";

/** 单字拼音首字母（大写） */
export function getInitial(char: string): string {
  const p = pinyin(char, { pattern: "first", toneType: "none", type: "string" });
  return (p || char[0]).toUpperCase();
}

/** 读音括注正则：keyword 中括号内的拼音（如「辟(bì)」，含带声调字母） */
const READING_RE = /[（(]([\p{Script=Latin}ü:]+)[）)]/u;

/**
 * 提取 keyword 中的读音注解（不含括号）。
 * keyword 可能是读音注解（辟(bì)）也可能是词形（安得）——
 * 仅当括号内是拼音字母时才视为读音，否则返回 null。
 */
export function keywordReading(keyword: string, char: string): string | null {
  if (!keyword || keyword === char) return null;
  const m = keyword.match(READING_RE);
  return m ? m[1] : null;
}

/**
 * 词条的首字母：优先用 keyword 括号中的读音（多音字如「辟(bì)」），
 * 无读音标注时退回 pinyin-pro 对字本身的注音。
 */
export function wordInitial(w: Word): string {
  const reading = keywordReading(w.keyword, w.char);
  if (reading) return reading[0].toUpperCase();
  return getInitial(w.char);
}

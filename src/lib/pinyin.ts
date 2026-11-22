import { pinyin } from "pinyin-pro";
import type { Word } from "./types";

/** 单字拼音首字母（大写） */
export function getInitial(char: string): string {
  const p = pinyin(char, { pattern: "first", toneType: "none", type: "string" });
  return (p || char[0]).toUpperCase();
}

/**
 * 词条的首字母：优先用 keyword 括号中的读音（多音字如「辟(bì)」），
 * 无读音标注时退回 pinyin-pro 对字本身的注音。
 */
export function wordInitial(w: Word): string {
  const m = w.keyword.match(/[（(]([a-zA-Zü:]+)[）)]/);
  if (m) return m[1][0].toUpperCase();
  return getInitial(w.char);
}

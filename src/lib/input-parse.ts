/** 把用户输入的题目数量文本解析为夹取后的整数；空/非法回退 fallback */
export function clampCount(
  raw: string,
  min = 1,
  max = 50,
  fallback = 10,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || raw.trim() === "") return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
